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
import {
	ImportAbortedError,
	StorageUnavailableError,
	TrackValidationError,
} from "@shared/errors";
import type { IngestionMetadata, Metadata } from "@shared/schemas/track.schema";
import type { AddManyProgress, AddManyResult } from "@shared/types";
import { chunkArray, sanitizeControlChars } from "@shared/utils";
import { createRootIssue } from "@shared/validators";
import type { EntityTable } from "dexie";

/**
 * Aggregated outcome of a full batch execution.
 */
export type ImportExecutionOutcome = {
	/** Lane totals across all committed batches, including pre-skipped duplicates. */
	readonly result: AddManyResult;
	/** Number of transactions executed (batches the payload was partitioned into). */
	readonly batchCount: number;
};

/** Mutable lane accumulator; module-private, owned by `executeImportBatches`. */
type ImportLanes = {
	added: string[];
	merged: string[];
	skipped: string[];
};

/**
 * Single source of the lane-snapshot shape. Progress emission, caller-abort
 * errors, and failure wrapping all derive their `partial`/`progress` payloads
 * from this builder. [F-6] Previously three hand-rolled copies existed inside
 * the batch loop.
 *
 * The `partial` lanes reference the live accumulator arrays (no copy) — this
 * matches the documented {@link ImportAbortedError} contract: `partial`
 * reflects the committed state at throw time.
 *
 * @param lanes     - Live lane accumulator.
 * @param processed - Input tracks accounted for so far.
 * @param total     - Total parsed input tracks.
 * @returns The `partial` result and `progress` snapshot pair.
 */
function snapshotImportState(
	lanes: ImportLanes,
	processed: number,
	total: number,
): { partial: AddManyResult; progress: AddManyProgress } {
	return {
		partial: {
			added: lanes.added,
			merged: lanes.merged,
			skipped: lanes.skipped,
		},
		progress: {
			processed,
			total,
			added: lanes.added.length,
			merged: lanes.merged.length,
			skipped: lanes.skipped.length,
		},
	};
}

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
 * @internal Exported for tests; not part of the composition contract.
 * @param filePaths   - Already-normalized filePaths to look up. Duplicates
 *                      are handled gracefully (the same row appears once).
 * @param tracksTable - The Dexie `EntityTable` for tracks.
 * @returns A map of `filePath → ExistingTrackRef`. Empty when `filePaths`
 *          is empty or no matches are found.
 */
export async function fetchExistingTrackRefs(
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
 *
 * @throws {StorageUnavailableError} When `bulkAdd` returns a non-string key
 *         or a non-array key list (engine fault; the track schema
 *         guarantees string keys).
 */
export async function persistClassification(
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
				if (typeof key !== "string") {
					throw new StorageUnavailableError(
						`bulkAdd returned a non-string primary key (received ${typeof key}); ` +
							"the track schema guarantees string keys",
					);
				}
				addedIds.push(key);
			}
		} else {
			throw new StorageUnavailableError(
				`bulkAdd returned a non-array key list (received ${sanitizeControlChars(typeof rawKeys)}); ` +
					"expected an array of string keys when allKeys: true",
			);
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
export async function processBatch(
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
 *
 * @internal Pipeline building block — step 1 of the required call order
 * (see module header).
 * @param tracks - Untrusted caller payload.
 * @returns Parsed, schema-validated ingestion tracks ([] for empty input).
 * @throws {TrackValidationError} When `tracks` is not an array or any
 *         element fails schema parsing.
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
 * Pre-flight checks: payload size, storage headroom, id-uniqueness,
 * `filePath` first-wins dedupe, and the RI fast-fail. The RI check here is
 * non-authoritative — `processBatch` re-asserts it inside each transaction,
 * atomically with the writes (defense in depth).
 *
 * @internal Pipeline building block — step 2 of the required call order
 * (see module header).
 * @param parsedTracks       - Parsed, validated ingestion tracks.
 * @param targetCollectionId - Resolved, validated target collection id.
 * @param db                 - Database handle (injected for testability).
 * @returns The deduped tracks plus the ids folded by dedupe (they seed the
 *          `skipped` lane of the final result).
 * @throws {PayloadLimitExceededError} Payload exceeds the size cap.
 * @throws {StorageCapacityError} Insufficient storage headroom.
 * @throws {ConflictError} Duplicate `id` within the payload.
 * @throws {ReferentialIntegrityError} Payload references a missing collection.
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
 * Runs the batch loop: abort-signal checks between batches, one transaction
 * per batch via {@link processBatch}, progress emission, lane aggregation,
 * and failure wrapping into `ImportAbortedError`.
 *
 * @internal Pipeline building block — step 3 of the required call order
 * (see module header). Presumes {@link runPreflightChecks} has executed;
 * no validation is repeated here.
 * @param params.dedupedTracks      - First-wins deduped tracks to import.
 * @param params.batchSize          - Transaction size (schema-validated upstream).
 * @param params.targetCollectionId - Merge-target collection.
 * @param params.signal             - Optional cooperative cancellation, checked
 *                                    between batches.
 * @param params.progressEmitter    - Failure-isolated progress observer.
 * @param params.preSkipped         - Ids folded by payload dedupe (seed the
 *                                    `skipped` lane).
 * @param params.db                 - Database handle (injected for testability).
 * @returns The aggregated lanes plus the number of executed batches.
 * @throws {ImportAbortedError} On caller abort or any mapped storage/domain
 *         failure; carries `partial` + `progress` — retry is idempotent.
 */
export async function executeImportBatches(params: {
	dedupedTracks: readonly IngestionMetadata[];
	batchSize: number;
	targetCollectionId: string;
	signal: AbortSignal | undefined;
	progressEmitter: ProgressEmitter;
	preSkipped: readonly string[];
	db: TrackBatchDatabase;
}): Promise<ImportExecutionOutcome> {
	const {
		dedupedTracks,
		batchSize,
		targetCollectionId,
		signal,
		progressEmitter,
		preSkipped,
		db,
	} = params;
	const total = dedupedTracks.length + preSkipped.length;

	const batches = chunkArray(dedupedTracks, batchSize);
	const lanes: ImportLanes = {
		added: [],
		merged: [],
		skipped: [...preSkipped],
	};
	let processed = preSkipped.length;

	try {
		for (const batch of batches) {
			if (signal?.aborted) {
				const { partial, progress } = snapshotImportState(
					lanes,
					processed,
					total,
				);
				throw new ImportAbortedError(
					`Import cancelled by the caller after ${processed} of ${total} tracks`,
					partial,
					progress,
					new DOMException("Import cancelled", "AbortError"),
				);
			}
			const batchResult = await processBatch(batch, targetCollectionId, db);
			for (const id of batchResult.added) lanes.added.push(id);
			for (const id of batchResult.merged) lanes.merged.push(id);
			for (const id of batchResult.skipped) lanes.skipped.push(id);
			processed += batch.length;
			progressEmitter.emit(
				snapshotImportState(lanes, processed, total).progress,
			);
		}
		return {
			result: {
				added: lanes.added,
				merged: lanes.merged,
				skipped: lanes.skipped,
			},
			batchCount: batches.length,
		};
	} catch (error: unknown) {
		if (error instanceof ImportAbortedError) throw error;
		const { partial, progress } = snapshotImportState(lanes, processed, total);
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
