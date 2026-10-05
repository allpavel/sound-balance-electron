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

import { MAX_DISPLAY_MISSING } from "@renderer/db/constants";
import type { TrackBatchDatabase } from "@renderer/db/types";
import {
	ANYOF_CHUNK_SIZE,
	MAX_BATCH_PAYLOAD_SIZE,
	SYSTEM_COLLECTION_ID,
} from "@shared/constants";
import {
	ConflictError,
	PayloadLimitExceededError,
	ReferentialIntegrityError,
	StorageCapacityError,
	StorageUnavailableError,
	TrackValidationError,
} from "@shared/errors";
import type {
	CollectionId,
	IngestionMetadata,
	Metadata,
	TrackChanges,
} from "@shared/schemas/track.schema";
import type { AddManyResult, Artwork } from "@shared/types";
import { isLegalStatusTransition } from "@shared/utils";
import {
	safeParseTargetCollectionId,
	safeParseTrack,
	safeParseTrackChanges,
} from "@shared/validators";
import type { EntityTable } from "dexie";
import { v7 as uuidV7 } from "uuid";
import type { CollectionType } from "@/types";

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Splits an array into consecutive sub-arrays of at most `size` elements.
 *
 * Used to keep IndexedDB `anyOf()` key arrays within engine-safe bounds
 * while preserving transactional atomicity.
 *
 * @typeParam T - Element type; inferred from the input array.
 * @param source - The array to partition. Not mutated.
 * @param size   - Maximum chunk length. Must be ≥ 1.
 * @returns An array of chunks. Empty input yields an empty array.
 *
 * @example
 * chunkArray([1,2,3,4,5], 2) // → [[1,2],[3,4],[5]]
 */
function chunkArray<T>(source: readonly T[], size: number): T[][] {
	if (size < 1) {
		throw new RangeError(`chunkArray: size must be ≥ 1, received ${size}`);
	}
	const chunks: T[][] = [];
	for (let offset = 0; offset < source.length; offset += size) {
		chunks.push(source.slice(offset, offset + size));
	}
	return chunks;
}

/**
 * Type guard to safely extract `name` and `message` from unknown error shapes.
 */
function isErrorWithName(
	error: unknown,
): error is { name: string; message: string } {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		typeof (error as Record<string, unknown>).name === "string"
	);
}

/**
 * Discriminates raw IndexedDB / Dexie errors into typed domain errors.
 *
 * @param error - The caught unknown error value.
 * @throws {@link TrackValidationError} A domain-specific, user-presentable error.
 * @throws {Error} Re-throws if the error is not a known storage failure.
 */
function mapStorageWriteError(error: unknown): never {
	if (
		error instanceof TrackValidationError ||
		error instanceof ConflictError ||
		error instanceof ReferentialIntegrityError
	) {
		throw error;
	}

	if (
		typeof error === "object" &&
		error !== null &&
		"inner" in error &&
		error.inner !== undefined &&
		error.inner !== null
	) {
		mapStorageWriteError(error.inner);
	}

	if (isErrorWithName(error)) {
		if (error.name === "QuotaExceededError") {
			throw new StorageCapacityError(
				"Storage quota exceeded. Free disk space or reduce embedded artwork size, then retry.",
			);
		}
		if (error.name === "ConstraintError") {
			throw new ConflictError(
				"A track with the same primary key or unique filePath already exists in the database.",
			);
		}
		if (
			[
				"InvalidStateError",
				"AbortError",
				"UnknownError",
				"VersionError",
				"NotFoundError",
			].includes(error.name)
		) {
			throw new StorageUnavailableError(
				`Database operation failed: ${error.message || error.name}`,
			);
		}
	}

	if (
		typeof error === "object" &&
		error !== null &&
		"failures" in error &&
		Array.isArray((error as Record<string, unknown>).failures)
	) {
		const failures: unknown[] = (error as { failures: unknown[] }).failures;
		for (const f of failures) {
			if (isErrorWithName(f)) {
				if (f.name === "QuotaExceededError") {
					throw new StorageCapacityError(
						"Storage quota exceeded during batch operation.",
					);
				}
				if (f.name === "ConstraintError") {
					throw new ConflictError(
						"One or more tracks collide with existing primary keys or unique filePaths.",
					);
				}
				if (
					[
						"InvalidStateError",
						"AbortError",
						"UnknownError",
						"VersionError",
						"NotFoundError",
					].includes(f.name)
				) {
					throw new StorageUnavailableError(
						`Database batch operation failed: ${f.message || f.name}`,
					);
				}
			}
		}
	}
	throw error;
}

/**
 * Asserts that a derived key is unique across a batch of items.
 *
 * @param items     – The batch to inspect.
 * @param getKey    – Pure extractor returning the uniqueness key for an item.
 * @param fieldPath – Template for the error context, e.g. `"tracks[{i}].filePath"`.
 * @param label     – Human-readable noun for the message, e.g. `"filePath"`.
 *
 * @throws {TrackValidationError} On the first duplicate detected.
 */
function assertBatchUniqueness<T>(
	items: readonly T[],
	getKey: (item: T) => string,
	fieldPath: (index: number) => string,
	label: string,
): void {
	const seen = new Set<string>();
	for (const [index, item] of items.entries()) {
		const key = getKey(item);
		if (seen.has(key)) {
			throw new ConflictError(
				`Batch contains duplicate ${label}: "${key}" at ${fieldPath(index)}`,
			);
		}
		seen.add(key);
	}
}

/**
 * Validates that the target collection ID is a non-empty string.
 *
 * @param value - Untrusted input to validate.
 * @throws {TrackValidationError} When validation fails. Carries the
 *         full structured issue list from `targetCollectionIdSchema`.
 */
function assertTargetCollectionId(value: unknown): CollectionId {
	const result = safeParseTargetCollectionId(value);
	if (!result.success) {
		throw new TrackValidationError("targetCollectionId", result.issues);
	}
	return result.data;
}

/**
 * Verifies that all collection IDs in the provided array exist in the database.
 *
 * @param collectionIds - Array of collection IDs to verify.
 * @param collectionsTable - Dexie EntityTable for collections.
 * @param context - Error context string for validation failures.
 * @throws {ReferentialIntegrityError} If any collection ID does not exist.
 */
async function assertReferentialIntegrity(
	collectionIds: readonly string[],
	collectionsTable: EntityTable<CollectionType, "id">,
	context: string,
): Promise<void> {
	if (collectionIds.length === 0) return;

	const referencedCollectionIds = new Set<string>(collectionIds);
	const idsToCheck = [...referencedCollectionIds];
	const chunks = chunkArray(idsToCheck, ANYOF_CHUNK_SIZE);
	const existingIds = new Set<string>();

	for (const chunk of chunks) {
		const keys = await collectionsTable.where("id").anyOf(chunk).primaryKeys();
		for (const key of keys) {
			if (typeof key === "string") {
				existingIds.add(key);
			}
		}
	}

	const missing = idsToCheck.filter((id) => !existingIds.has(id));
	if (missing.length > 0) {
		const display = missing.slice(0, MAX_DISPLAY_MISSING).join(", ");
		const suffix =
			missing.length > MAX_DISPLAY_MISSING
				? ` (and ${missing.length - MAX_DISPLAY_MISSING} more)`
				: "";
		throw new ReferentialIntegrityError(
			`${context}: Referenced collection(s) do not exist: ${display}${suffix}`,
		);
	}
}

/**
 * Validates a single track object against `trackInputSchema` and returns
 * the parsed `Metadata` on success.
 *
 * @param track - Untrusted input to validate.
 * @param index - Positional index for the error context prefix.
 * @returns The parsed, schema-validated `Metadata`.
 * @throws {TrackValidationError} When validation fails. Carries the full
 *         structured issue list — no issues are discarded.
 */
function assertTrackInput(track: unknown, index: number): IngestionMetadata {
	const context = `tracks[${index}]`;
	const result = safeParseTrack(track);
	if (!result.success) {
		throw new TrackValidationError(context, result.issues);
	}
	return result.data;
}

function normalizeCollectionIds(
	current: unknown,
	targetCollectionId: string,
): string[] {
	const result: string[] = [];
	const seen = new Set<string>();

	const addId = (id: unknown): void => {
		if (!isNonEmptyString(id)) {
			return;
		}
		if (seen.has(id)) {
			return;
		}
		seen.add(id);
		result.push(id);
	};

	if (Array.isArray(current)) {
		for (const id of current) {
			addId(id);
		}
	}

	addId(SYSTEM_COLLECTION_ID);
	addId(targetCollectionId);

	return result;
}

function areCollectionIdsEqual(
	current: unknown,
	next: readonly string[],
): boolean {
	if (!Array.isArray(current)) {
		return false;
	}
	if (current.length !== next.length) {
		return false;
	}
	return (
		new Set(current).size === next.length &&
		next.every((id) => current.includes(id))
	);
}

function uniqueTracks(tracks: Metadata[]): Metadata[] {
	const byId = new Map<string, Metadata>();
	for (const track of tracks) {
		if (isNonEmptyString(track.id)) {
			byId.set(track.id, track);
		}
	}
	return [...byId.values()];
}

/**
 * Validates a partial track mutation payload and normalises collectionIds.
 *
 * @param changes - Untrusted mutation payload.
 * @param context - Location prefix for error messages (e.g. `"changes"`).
 * @returns The validated and normalised `TrackChanges`.
 * @throws {TrackValidationError} When validation fails.
 */
function validateTrackChanges(changes: unknown, context: string): TrackChanges {
	const result = safeParseTrackChanges(changes);
	if (!result.success) {
		throw new TrackValidationError(context, result.issues);
	}

	const validated = result.data;
	if (
		!("collectionIds" in validated) ||
		validated.collectionIds === undefined
	) {
		return validated;
	}

	return {
		...validated,
		collectionIds: normalizeCollectionIds(
			validated.collectionIds,
			SYSTEM_COLLECTION_ID,
		),
	};
}

/**
 * Evaluates whether a track update should be applied based on state machine and sequence guards.
 * Returns the patch to apply if valid, or null if the update should be rejected.
 *
 * @param track - The current track state from the DB, or undefined if missing.
 * @param changes - The validated track changes payload.
 * @returns The partial patch to apply, or null if the update is rejected.
 */
function shouldApplyUpdate(
	track: Metadata | undefined,
	changes: TrackChanges,
): Partial<Metadata> | null {
	if (track === undefined) return null;

	if (!("status" in changes)) {
		return changes;
	}

	if (!isLegalStatusTransition(track.status, changes.status)) {
		return null;
	}

	const currentSeq = track.statusSeq ?? 0;
	if (
		"seq" in changes &&
		changes.seq !== undefined &&
		changes.seq <= currentSeq
	) {
		return null;
	}

	const patch: Record<string, unknown> = {
		status: changes.status,
	};

	// [FIX #2] Clear stale reason when leaving the failed state.
	if (changes.status === "failed") {
		patch.reason = changes.reason;
	} else {
		// Assigning undefined triggers Dexie/IndexedDB structured clone to remove the property.
		patch.reason = undefined;
	}

	// Apply sequence number if provided.
	if ("seq" in changes && changes.seq !== undefined) {
		patch.statusSeq = changes.seq;
	}

	return patch;
}

/**
 * Applies a guarded track update, enforcing state machine legality and sequence monotonicity.
 *
 * This function acts as the final defensive layer (Defense in Depth) before persisting
 * status changes to IndexedDB. It evaluates two distinct guard layers:
 * 1. State Machine: Validates status transition legality.
 * 2. Sequence Guard: Ensures event is strictly newer than persisted high-water mark.
 *
 * @param tracksTable - The injected Dexie EntityTable for tracks.
 * @param id - The primary key of the track to update.
 * @param changes - The shape-validated track mutation payload.
 * @returns A promise resolving to 1 if updated, or 0 if rejected.
 */
async function applyGuardedTrackUpdate(
	tracksTable: EntityTable<Metadata, "id">,
	id: string,
	changes: TrackChanges,
): Promise<number> {
	if (!("status" in changes)) {
		return await tracksTable.update(id, changes);
	}

	const track = await tracksTable.get(id);
	const patch = shouldApplyUpdate(track, changes);

	if (patch === null) return 0;

	return await tracksTable.update(id, patch);
}

/**
 * Calculates the total estimated payload size of a batch by summing artwork Blob/Uint8Array sizes.
 * @param tracks - The parsed ingestion metadata array.
 * @returns Total size in bytes.
 */
function calculateBatchPayloadSize(tracks: IngestionMetadata[]): number {
	let size = 0;
	for (const track of tracks) {
		if (track.common?.picture) {
			for (const pic of track.common.picture) {
				if (pic.data instanceof Blob) {
					size += pic.data.size;
				} else if (pic.data instanceof Uint8Array) {
					size += pic.data.byteLength;
				}
			}
		}
	}
	return size;
}

/**
 * Asserts that the batch payload size does not exceed the maximum allowed limit.
 * @param size - Total size in bytes.
 * @throws {PayloadLimitExceededError} If size exceeds `MAX_BATCH_PAYLOAD_SIZE`.
 */
function assertBatchPayloadSize(size: number): void {
	if (size > MAX_BATCH_PAYLOAD_SIZE) {
		throw new PayloadLimitExceededError(
			`Batch payload size ${size} exceeds maximum allowed ${MAX_BATCH_PAYLOAD_SIZE}`,
		);
	}
}

/**
 * Fetches existing tracks by `filePath` using the **keys-first strategy**.
 *
 * @param filePaths   - Array of (already-normalized) filePaths to look up.
 *                      Duplicates are handled gracefully (the same row
 *                      may appear once in the result map).
 * @param tracksTable - The Dexie `EntityTable` for tracks.
 * @returns Returns an empty map when `filePaths`
 *          is empty or no matches are found.
 */
async function fetchExistingTrackKeys(
	filePaths: readonly string[],
	tracksTable: EntityTable<Metadata, "id">,
): Promise<
	Map<
		string,
		{
			readonly id: string;
			readonly collectionIds: readonly string[];
		}
	>
> {
	const result = new Map<
		string,
		{
			readonly id: string;
			readonly collectionIds: readonly string[];
		}
	>();

	if (filePaths.length === 0) {
		return result;
	}

	const chunks = chunkArray(filePaths, ANYOF_CHUNK_SIZE);
	const existingIds: string[] = [];

	for (const chunk of chunks) {
		const keys = await tracksTable.where("filePath").anyOf(chunk).primaryKeys();
		for (const key of keys) {
			if (typeof key === "string") {
				existingIds.push(key);
			}
		}
	}

	if (existingIds.length === 0) {
		return result;
	}

	const rows = await tracksTable.bulkGet(existingIds);

	for (const row of rows) {
		if (row === undefined) continue;
		if (!isNonEmptyString(row.filePath)) continue;
		result.set(row.filePath, {
			id: row.id,
			collectionIds: row.collectionIds,
		});
	}

	return result;
}

/**
 * Processes a single batch of tracks within its own IndexedDB transaction.
 *
 * @param tracks              - Parsed, validated, normalized ingestion tracks.
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
		async (): Promise<AddManyResult> => {
			const filePaths = tracks.map((t) => t.filePath);
			const existingByFilePath = await fetchExistingTrackKeys(
				filePaths,
				db.tracks,
			);

			const toAdd: Metadata[] = [];
			const toUpdate: { key: string; changes: Partial<Metadata> }[] = [];
			const mergedIds: string[] = [];
			const skippedIds: string[] = [];
			const artworksToSave: Artwork[] = [];

			for (const track of tracks) {
				const existingRow = existingByFilePath.get(track.filePath);

				if (existingRow) {
					const nextCollectionIds = normalizeCollectionIds(
						existingRow.collectionIds,
						targetCollectionId,
					);

					if (
						areCollectionIdsEqual(existingRow.collectionIds, nextCollectionIds)
					) {
						skippedIds.push(existingRow.id);
					} else {
						toUpdate.push({
							key: existingRow.id,
							changes: { collectionIds: nextCollectionIds },
						});
						mergedIds.push(existingRow.id);
					}
				} else {
					const pictureIds: string[] = [];
					if (track.common?.picture) {
						for (const pic of track.common.picture) {
							const blob: Blob =
								pic.data instanceof Uint8Array
									? new Blob([pic.data], { type: pic.format })
									: pic.data;
							const id = uuidV7();
							artworksToSave.push({
								id,
								blob,
								format: pic.format,
								description: pic.description,
								name: pic.name,
							});
							pictureIds.push(id);
						}
					}

					toAdd.push({
						...track,
						common: {
							...track.common,
							picture: pictureIds,
						},
						collectionIds: normalizeCollectionIds(
							track.collectionIds,
							targetCollectionId,
						),
					});
				}
			}

			if (artworksToSave.length > 0) {
				await db.artworks.bulkAdd(artworksToSave);
			}

			const addedIds: string[] = [];
			if (toAdd.length > 0) {
				const rawKeys = await db.tracks.bulkAdd(toAdd, { allKeys: true });
				if (Array.isArray(rawKeys)) {
					for (const key of rawKeys) {
						if (typeof key === "string") {
							addedIds.push(key);
						}
					}
				}
			}

			if (toUpdate.length > 0) {
				await db.tracks.bulkUpdate(toUpdate);
			}

			return { added: addedIds, merged: mergedIds, skipped: skippedIds };
		},
	);
}

export {
	applyGuardedTrackUpdate,
	areCollectionIdsEqual,
	assertBatchPayloadSize,
	assertBatchUniqueness,
	assertReferentialIntegrity,
	assertTargetCollectionId,
	assertTrackInput,
	calculateBatchPayloadSize,
	chunkArray,
	fetchExistingTrackKeys,
	isErrorWithName,
	isNonEmptyString,
	isPlainObject,
	mapStorageWriteError,
	normalizeCollectionIds,
	processBatch,
	shouldApplyUpdate,
	uniqueTracks,
	validateTrackChanges,
};
