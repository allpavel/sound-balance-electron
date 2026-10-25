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
import {
	executeImportBatches,
	runPreflightChecks,
	validateAndParseTracks,
} from "@renderer/db/import";
import {
	applyGuardedTrackUpdate,
	assertAddManyOptions,
	assertBatchUniqueness,
	assertReferentialIntegrity,
	createProgressEmitter,
	isNonEmptyString,
	isPlainObject,
	uniqueTracks,
	validateTrackChanges,
} from "@renderer/db/utils/trackRepositoryUtils";
import { IMPORT_BATCH_SIZE, SYSTEM_COLLECTION_ID } from "@shared/constants";
import { TrackValidationError } from "@shared/errors";
import type { AddManyOptions, Metadata } from "@shared/schemas/track.schema";
import type { AddManyResult } from "@shared/types";
import { getAddManySummary } from "@shared/utils";
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
	 * Merge-lane collection semantics: when an existing row is found by `filePath`,
	 * the incoming track's `collectionIds` are **unioned** with
	 * the existing row's memberships. Existing IDs are preserved in their
	 * original order; new incoming IDs are appended; duplicates are folded.
	 * The system collection (`SYSTEM_COLLECTION_ID`) and the target collection
	 * are always ensured present via `normalizeCollectionIds`.
	 *
	 * The merge lane mutates `collectionIds` only — incoming metadata changes
	 * (title, duration, artwork, etc.) are ignored by design; the existing
	 * row's metadata remains authoritative. Collection-membership semantics
	 * are ratified by
	 * [ADR-0004](../../../../../docs/adr/ADR-0004-merge-lane-collection-union.md).
	 *
	 * **Error precedence:** Schema validation (step 2) runs to
	 * completion before cross-item integrity checks (step 3). A batch
	 * containing both a schema-invalid track and a duplicate `id` will
	 * always surface the `TrackValidationError` first, regardless of index
	 * ordering. This is intentional: structural validity is a prerequisite
	 * for meaningful cross-item analysis. See
	 * [ADR-0003](../../../../../docs/adr/ADR-0003-updatemany-error-precedence.md)
	 * for the analogous `updateMany` phased-validation contract.
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
		// Step 1: validate options.
		const validatedOptions = assertAddManyOptions(options);
		const targetCollectionId =
			validatedOptions.targetCollectionId ?? SYSTEM_COLLECTION_ID;
		const onProgress = validatedOptions.onProgress;
		const batchSize = validatedOptions.batchSize ?? IMPORT_BATCH_SIZE;
		const signal = validatedOptions.signal;
		const startedAt = Date.now();

		// Step 2: validate + parse tracks.
		const parsedTracks = validateAndParseTracks(tracks);
		if (parsedTracks.length === 0) {
			return { added: [], merged: [], skipped: [] };
		}

		// Step 3: pre-flight checks (payload, headroom, uniqueness, dedupe, RI).
		const { dedupedTracks, preSkipped } = await runPreflightChecks(
			parsedTracks,
			targetCollectionId,
			db,
		);

		// Step 4: execute batches (loop, signal, progress, abort wrapping).
		const progressEmitter = createProgressEmitter(onProgress);
		const total = parsedTracks.length;

		try {
			const { result, batchCount } = await executeImportBatches({
				dedupedTracks,
				batchSize,
				targetCollectionId,
				signal,
				progressEmitter,
				preSkipped,
				db,
			});

			// Step 5: completion telemetry.
			// biome-ignore lint/suspicious/noConsole: Intentional telemetry at import completion.
			console.info("[tracksRepository.addMany] import complete", {
				summary: getAddManySummary(result),
				durationMs: Date.now() - startedAt,
				batchCount,
				total,
			});

			return result;
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

		const validated: {
			id: string;
			raw: Record<string, unknown>;
			context: string;
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
			validated.push({ id: update.id, raw: update, context });
		}

		assertBatchUniqueness({
			items: validated,
			getKey: (u) => u.id,
			fieldPath: (i) => `updates[${i}].id`,
			label: "id",
			context: "Updates",
		});

		const normalizedUpdates = validated.map(({ id, raw, context }) => ({
			id,
			changes: validateTrackChanges(raw.changes, `${context}.changes`),
		}));

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
