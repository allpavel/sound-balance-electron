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

import {
	type ClassificationPlan,
	classifyTracks,
} from "@renderer/db/import/classifyTracks";
import type {
	ExistingTrackRef,
	ProgressEmitter,
	TrackBatchDatabase,
} from "@renderer/db/types";
import { checkStorageHeadroom, chunkedAnyOf } from "@renderer/db/utils/dbUtils";
import {
	assertBatchPayloadSize,
	assertBatchUniqueness,
	assertReferentialIntegrity,
	assertTrackInput,
	calculateBatchPayloadSize,
	dedupeByFilePath,
	describeThrownValue,
	gatherReferencedCollectionIds,
	isNonEmptyString,
	mapStorageWriteError,
} from "@renderer/db/utils/trackRepositoryUtils";
import { ImportAbortedError, TrackValidationError } from "@shared/errors";
import type { IngestionMetadata, Metadata } from "@shared/schemas/track.schema";
import type { AddManyProgress, AddManyResult } from "@shared/types";
import { chunkArray } from "@shared/utils";
import { createRootIssue } from "@shared/validators";
import type { EntityTable } from "dexie";

/**
 * Looks up existing tracks by `filePath` and projects each match to an
 * {@link ExistingTrackRef} (id + collectionIds). Single pass per chunk:
 * `anyOf(chunk).each(...)` hydrates rows transiently and retains only the
 * compact projection, so there is one request per chunk (not two) and no
 * full-row retention.
 *
 * Every `filePath` that reaches this function has been normalized by
 * {@link filePathSchema} at the schema boundary, so the `&filePath` index
 * and the input keys agree.
 *
 * @param filePaths   - Already-normalized filePaths to look up. Duplicates
 *                      are handled gracefully (the same row appears once).
 * @param tracksTable - The Dexie `EntityTable` for tracks.
 * @returns A map of `filePath → ExistingTrackRef`. Empty when `filePaths`
 *          is empty or no matches are found.
 */
async function fetchExistingTrackRefs(
	filePaths: readonly string[],
	tracksTable: EntityTable<Metadata, "id">,
): Promise<Map<string, ExistingTrackRef>> {
	const result = new Map<string, ExistingTrackRef>();

	if (filePaths.length === 0) {
		return result;
	}

	await chunkedAnyOf(tracksTable, "filePath", filePaths, (row) => {
		if (isNonEmptyString(row.filePath)) {
			result.set(row.filePath, {
				id: row.id,
				collectionIds: row.collectionIds,
			});
		}
	});

	return result;
}

/**
 * Persists a classification plan within a transaction. Write order is
 * artworks → tracks bulkAdd → tracks bulkUpdate — artwork-before-track
 * preserves the abort semantics (if bulkUpdate fails, both artworks and
 * tracks are rolled back by the transaction).
 */
async function persistClassification(
	plan: ClassificationPlan,
	db: TrackBatchDatabase,
): Promise<AddManyResult> {
	if (plan.artworksToSave.length > 0) {
		await db.artworks.bulkAdd([...plan.artworksToSave]);
	}

	const addedIds: string[] = [];
	if (plan.toAdd.length > 0) {
		const rawKeys = await db.tracks.bulkAdd([...plan.toAdd], {
			allKeys: true,
		});
		if (Array.isArray(rawKeys)) {
			for (const key of rawKeys) {
				if (typeof key === "string") {
					addedIds.push(key);
				}
			}
		}
	}

	if (plan.toUpdate.length > 0) {
		await db.tracks.bulkUpdate([...plan.toUpdate]);
	}

	return {
		added: addedIds,
		merged: plan.mergedIds,
		skipped: plan.skippedIds,
	};
}

/**
 * Processes a single batch of tracks within its own IndexedDB transaction.
 *
 * @param tracks             - Parsed, validated, normalized ingestion tracks.
 * @param targetCollectionId - The collection to assign to new/merged tracks.
 * @returns A partial {@link AddManyResult} for this batch.
 * @throws Re-throws domain errors; maps storage errors via
 *         {@link mapStorageWriteError}.
 */
async function processBatch(
	tracks: readonly IngestionMetadata[],
	targetCollectionId: string,
	db: TrackBatchDatabase,
): Promise<AddManyResult> {
	return db.transaction(
		"rw",
		db.tracks,
		db.artworks,
		db.collections,
		async (): Promise<AddManyResult> => {
			// Step 1: re-assert referential integrity (atomic with the writes).
			const batchCollectionIds = gatherReferencedCollectionIds(
				tracks,
				targetCollectionId,
			);
			await assertReferentialIntegrity(
				[...batchCollectionIds],
				db.collections,
				"tracks.batch.collectionIds",
			);

			// Step 2: look up existing tracks by filePath.
			const filePaths = tracks.map((t) => t.filePath);
			const existingByFilePath = await fetchExistingTrackRefs(
				filePaths,
				db.tracks,
			);

			// Step 3: classify (pure — no I/O).
			const plan = classifyTracks(
				tracks,
				existingByFilePath,
				targetCollectionId,
			);

			// Step 4: persist (artworks → tracks → bulkUpdate).
			return persistClassification(plan, db);
		},
	);
}

/**
 * Validates the tracks array and parses each element.
 * Throws on non-array; returns [] for empty.
 */
export function validateAndParseTracks(
	tracks: readonly unknown[],
): IngestionMetadata[] {
	if (!Array.isArray(tracks)) {
		throw new TrackValidationError("tracks", [
			createRootIssue("invalid_type", "Tracks must be an array"),
		]);
	}
	const parsed: IngestionMetadata[] = [];
	for (const [index, track] of tracks.entries()) {
		parsed.push(assertTrackInput(track, index));
	}
	return parsed;
}

/**
 * Pre-flight: payload size, headroom, id-uniqueness, filePath dedupe, RI fast-fail.
 */
export async function runPreflightChecks(
	parsedTracks: readonly IngestionMetadata[],
	targetCollectionId: string,
	db: TrackBatchDatabase,
): Promise<{
	dedupedTracks: readonly IngestionMetadata[];
	preSkipped: readonly string[];
}> {
	const payloadSize = calculateBatchPayloadSize(parsedTracks);
	assertBatchPayloadSize(payloadSize);
	await checkStorageHeadroom(payloadSize);

	assertBatchUniqueness({
		items: parsedTracks,
		getKey: (t) => t.id,
		fieldPath: (i) => `tracks[${i}].id`,
		label: "id",
	});

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

	return { dedupedTracks, preSkipped };
}

/**
 * Batch loop with signal, progress, and error-wrapping into ImportAbortedError.
 */
export async function executeImportBatches(params: {
	dedupedTracks: readonly IngestionMetadata[];
	batchSize: number;
	targetCollectionId: string;
	signal: AbortSignal | undefined;
	progressEmitter: ProgressEmitter;
	preSkipped: readonly string[];
	total: number;
	db: TrackBatchDatabase;
}): Promise<AddManyResult> {
	const {
		dedupedTracks,
		batchSize,
		targetCollectionId,
		signal,
		progressEmitter,
		preSkipped,
		total,
		db,
	} = params;
	const batches = chunkArray(dedupedTracks, batchSize);
	const allAdded: string[] = [];
	const allMerged: string[] = [];
	const allSkipped: string[] = [...preSkipped];
	let processed = preSkipped.length;

	try {
		for (const batch of batches) {
			if (signal?.aborted) {
				throw new ImportAbortedError(
					`Import cancelled by the caller after ${processed} of ${total} tracks`,
					{ added: allAdded, merged: allMerged, skipped: allSkipped },
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
		return { added: allAdded, merged: allMerged, skipped: allSkipped };
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
	}
}

export { fetchExistingTrackRefs, processBatch };
