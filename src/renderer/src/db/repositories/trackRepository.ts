/*
 * sound-balance-electron
 * Copyright (C) 2026 Pavel Alloyarov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { db } from "@renderer/db/db";
import { processBatch } from "@renderer/db/import";
import { checkStorageHeadroom } from "@renderer/db/utils/dbUtils";
import {
	applyGuardedTrackUpdate,
	assertAddManyOptions,
	assertBatchPayloadSize,
	assertBatchUniqueness,
	assertReferentialIntegrity,
	assertTrackInput,
	calculateBatchPayloadSize,
	chunkArray,
	createProgressEmitter,
	dedupeByFilePath,
	describeThrownValue,
	gatherReferencedCollectionIds,
	isNonEmptyString,
	isPlainObject,
	mapStorageWriteError,
	uniqueTracks,
	validateTrackChanges,
} from "@renderer/db/utils/trackRepositoryUtils";
import { IMPORT_BATCH_SIZE, SYSTEM_COLLECTION_ID } from "@shared/constants";
import { ConflictError, TrackValidationError } from "@shared/errors";
import { ImportAbortedError } from "@shared/errors/domainErrors";
import type {
	AddManyOptions,
	IngestionMetadata,
	Metadata,
	TrackChanges,
} from "@shared/schemas/track.schema";
import type { AddManyProgress, AddManyResult } from "@shared/types";
import { getAddManySummary, sanitizeControlChars } from "@shared/utils";
import { createRootIssue } from "@shared/validators";

export const tracksRepository = {
	async getAll(id: string): Promise<Metadata[]> {
		if (!isNonEmptyString(id)) {
			return [];
		}
		const tracks = await db.tracks.where("collectionIds").equals(id).toArray();
		return uniqueTracks(tracks);
	},

	async getById(id: string) {
		if (!isNonEmptyString(id)) {
			return undefined;
		}
		return await db.tracks.get(id);
	},

	/**
	 * Batch-inserts tracks, merging duplicates by `filePath` into the target
	 * collection.
	 *
	 * Batches are atomic; the import is idempotent. On a mid-import failure
	 * (quota, a collection deleted mid-import, or `signal` abort) this throws
	 * {@link ImportAbortedError} carrying `partial` (committed counts from
	 * batches 1..k−1), `progress` (processed/total), and `cause`. Recovery
	 * is to re-run the import — prior `added` rows become `merged`/`skipped`
	 * by `filePath`. Pre-flight failures throw their native domain error
	 * directly (no partials — caller bug).
	 *
	 * Referential integrity is re-asserted inside each batch's transaction,
	 * atomically with the writes (the pre-flight check is a non-authoritative
	 * fast-fail).
	 *
	 * @param tracks – Untrusted array; each element is validated into
	 *   {@link IngestionMetadata} before any write.
	 * @param options – Untrusted, runtime-validated import options.
	 * @param options.targetCollectionId – Collection to assign (default `"all"`).
	 * @param options.batchSize – Max tracks per transaction (default
	 *   `IMPORT_BATCH_SIZE`, capped at `MAX_IMPORT_BATCH_SIZE`).
	 * @param options.onProgress – Synchronous, non-throwing observer invoked
	 *   after each batch with cumulative counts; a throw is isolated, not
	 *   propagated.
	 * @param options.signal – Coarse-grained cancellation checked between
	 *   batches; abort throws `ImportAbortedError` with the partials.
	 * @returns A structured {@link AddManyResult} discriminating outcomes.
	 * @throws {TrackValidationError} Pre-flight: invalid `options` or `tracks`.
	 * @throws {ConflictError} Pre-flight: duplicate `id` in the payload.
	 * @throws {ReferentialIntegrityError} Pre-flight: payload references a
	 *   non-existent collection.
	 * @throws {PayloadLimitExceededError} Pre-flight: payload exceeds the size cap.
	 * @throws {ImportAbortedError} Mid-import failure or cancellation — carries
	 *   `partial` + `progress` + `cause`; retry-safe.
	 */
	async addMany(
		tracks: readonly unknown[],
		options: AddManyOptions = {},
	): Promise<AddManyResult> {
		const validatedOptions = assertAddManyOptions(options);
		const targetCollectionId =
			validatedOptions.targetCollectionId ?? SYSTEM_COLLECTION_ID;
		const onProgress = validatedOptions.onProgress;
		const batchSize = validatedOptions.batchSize ?? IMPORT_BATCH_SIZE;
		const signal = validatedOptions.signal;
		const startedAt = Date.now();

		if (!Array.isArray(tracks)) {
			throw new TrackValidationError("tracks", [
				createRootIssue("invalid_type", "Tracks must be an array"),
			]);
		}
		if (tracks.length === 0) {
			return { added: [], merged: [], skipped: [] };
		}

		const parsedTracks: IngestionMetadata[] = [];

		for (const [index, track] of tracks.entries()) {
			const parsedTrack = assertTrackInput(track, index);
			parsedTracks.push(parsedTrack);
		}

		const payloadSize = calculateBatchPayloadSize(parsedTracks);
		assertBatchPayloadSize(payloadSize);
		await checkStorageHeadroom(payloadSize);

		assertBatchUniqueness(
			parsedTracks,
			(t) => t.id,
			(i) => `tracks[${i}].id`,
			"id",
		);

		const { unique: dedupedTracks, skipped: preSkipped } =
			dedupeByFilePath(parsedTracks);

		const collectionIds = gatherReferencedCollectionIds(
			dedupedTracks,
			targetCollectionId,
		);

		await assertReferentialIntegrity(
			[...collectionIds],
			db.collections,
			"tracks.collectionIds",
		);

		const batches = chunkArray(dedupedTracks, batchSize);
		const allAdded: string[] = [];
		const allMerged: string[] = [];
		const allSkipped: string[] = [...preSkipped];
		let processed = preSkipped.length;
		const total = parsedTracks.length;

		const progressEmitter = createProgressEmitter(onProgress);

		try {
			for (const batch of batches) {
				if (signal?.aborted) {
					throw new ImportAbortedError(
						`Import cancelled by the caller after ${processed} of ${total} tracks`,
						{
							added: allAdded,
							merged: allMerged,
							skipped: allSkipped,
						},
						{
							processed,
							total,
							added: allAdded.length,
							merged: allMerged.length,
							skipped: allSkipped.length,
						},
						new DOMException("Import cancelled", "AbortError"),
					);
				}

				const batchResult = await processBatch(batch, targetCollectionId, db);

				for (const id of batchResult.added) allAdded.push(id);
				for (const id of batchResult.merged) allMerged.push(id);
				for (const id of batchResult.skipped) allSkipped.push(id);
				processed += batch.length;

				progressEmitter.emit({
					processed,
					total,
					added: allAdded.length,
					merged: allMerged.length,
					skipped: allSkipped.length,
				});
			}

			const result: AddManyResult = {
				added: allAdded,
				merged: allMerged,
				skipped: allSkipped,
			};

			// biome-ignore lint/suspicious/noConsole: Intentional telemetry at import completion.
			console.info("[tracksRepository.addMany] import complete", {
				summary: getAddManySummary(result),
				durationMs: Date.now() - startedAt,
				batchCount: batches.length,
				total,
			});

			return result;
		} catch (error: unknown) {
			if (error instanceof ImportAbortedError) throw error;
			const partial: AddManyResult = {
				added: allAdded,
				merged: allMerged,
				skipped: allSkipped,
			};
			const progress: AddManyProgress = {
				processed,
				total,
				added: allAdded.length,
				merged: allMerged.length,
				skipped: allSkipped.length,
			};
			try {
				mapStorageWriteError(error);
			} catch (cause: unknown) {
				throw new ImportAbortedError(
					`Import aborted after ${processed} of ${total} tracks (cause: ${describeThrownValue(cause)})`,
					partial,
					progress,
					cause,
				);
			}
		} finally {
			progressEmitter.flush();
		}
	},

	async update(id: string, changes: unknown): Promise<number> {
		if (!isNonEmptyString(id)) {
			throw new TrackValidationError("id", [
				createRootIssue("invalid_type", "ID must be a non-empty string"),
			]);
		}
		const validated = validateTrackChanges(changes, "changes");
		if (!("status" in validated)) {
			const collectionIds = validated.collectionIds;
			if (collectionIds !== undefined) {
				return db.transaction("rw", db.tracks, db.collections, async () => {
					await assertReferentialIntegrity(
						collectionIds,
						db.collections,
						"changes.collectionIds",
					);
					return applyGuardedTrackUpdate(db.tracks, id, validated);
				});
			}
			return db.tracks.update(id, validated);
		}

		return db.transaction("rw", db.tracks, () =>
			applyGuardedTrackUpdate(db.tracks, id, validated),
		);
	},

	async updateMany(updates: unknown): Promise<number> {
		if (!Array.isArray(updates)) {
			throw new TrackValidationError("updates", [
				createRootIssue("invalid_type", "Updates must be an array"),
			]);
		}
		if (updates.length === 0) {
			return 0;
		}

		const seenIds = new Set<string>();
		const normalizedUpdates: {
			id: string;
			changes: TrackChanges;
		}[] = [];

		for (const [index, update] of updates.entries()) {
			const context = `updates[${index}]`;
			if (!isPlainObject(update)) {
				throw new TrackValidationError(context, [
					createRootIssue("invalid_type", `${context} must be an object`),
				]);
			}
			if (!isNonEmptyString(update.id)) {
				throw new TrackValidationError(`${context}.id`, [
					createRootIssue(
						"invalid_type",
						`${context}.id must be a non-empty string`,
					),
				]);
			}
			if (seenIds.has(update.id)) {
				throw new ConflictError(
					`Updates contains duplicate id: ${sanitizeControlChars(update.id)}`,
				);
			}
			seenIds.add(update.id);
			normalizedUpdates.push({
				id: update.id,
				changes: validateTrackChanges(update.changes, `${context}.changes`),
			});
		}

		const needsCollectionCheck = normalizedUpdates.some(
			(u) =>
				"collectionIds" in u.changes && u.changes.collectionIds !== undefined,
		);

		const transactionTables = needsCollectionCheck
			? [db.tracks, db.collections]
			: [db.tracks];

		let total = 0;
		await db.transaction("rw", transactionTables, async () => {
			for (const [index, { id, changes }] of normalizedUpdates.entries()) {
				if ("collectionIds" in changes && changes.collectionIds !== undefined) {
					const collectionIds = changes.collectionIds;
					await assertReferentialIntegrity(
						collectionIds,
						db.collections,
						`updates[${index}].changes.collectionIds`,
					);
				}
				total += await applyGuardedTrackUpdate(db.tracks, id, changes);
			}
		});
		return total;
	},

	async remove(id: string): Promise<void> {
		if (!isNonEmptyString(id)) {
			throw new TrackValidationError("id", [
				createRootIssue("invalid_type", "ID must be a non-empty string"),
			]);
		}
		await db.tracks.delete(id);
	},

	async getSelectedTracks(): Promise<Metadata[]> {
		const tracks = await db.tracks.where("selected").equals(1).toArray();
		return uniqueTracks(tracks);
	},

	async removeMany(): Promise<void> {
		await db.transaction("rw", db.tracks, async () => {
			const selectedTracksIds = await db.tracks
				.where("selected")
				.equals(1)
				.primaryKeys();
			if (selectedTracksIds.length > 0) {
				await db.tracks.bulkDelete(selectedTracksIds);
			}
		});
	},
};
