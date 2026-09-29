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

import { SYSTEM_COLLECTION_ID } from "@shared/constants";
import { TrackValidationError } from "@shared/errors";
import type {
	CollectionId,
	Metadata,
	TrackChanges,
} from "@shared/schemas/track.schema";
import { isLegalStatusTransition } from "@shared/utils";
import {
	createRootIssue,
	safeParseTargetCollectionId,
	safeParseTrack,
	safeParseTrackChanges,
} from "@shared/validators";
import type { EntityTable } from "dexie";

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
 * Discriminates raw IndexedDB / Dexie errors into typed domain errors.
 *
 * @param error - The caught unknown error value.
 * @throws {TrackValidationError} A domain-specific, user-presentable error.
 * @throws {Error} Re-throws if the error is not a known storage failure.
 */
function mapStorageWriteError(error: unknown): never {
	if (error instanceof DOMException) {
		if (error.name === "QuotaExceededError") {
			throw new TrackValidationError("storage", [
				createRootIssue(
					"quota_exceeded",
					"Storage quota exceeded. Free disk space or reduce embedded artwork size, then retry.",
				),
			]);
		}
		if (error.name === "ConstraintError") {
			throw new TrackValidationError("id", [
				createRootIssue(
					"duplicate_id",
					"A track with the same primary key already exists in the database.",
				),
			]);
		}
	}
	if (
		typeof error === "object" &&
		error !== null &&
		"failures" in error &&
		Array.isArray((error as Record<string, unknown>).failures)
	) {
		const failures: unknown[] = (error as { failures: unknown[] }).failures;
		const constraintHit = failures.find(
			(f): f is DOMException =>
				f instanceof DOMException && f.name === "ConstraintError",
		);
		if (constraintHit) {
			throw new TrackValidationError("id", [
				createRootIssue(
					"duplicate_id",
					"One or more tracks collide with existing primary keys or unique filePaths.",
				),
			]);
		}
	}
	throw error;
}

/**
 * Asserts that a derived key is unique across a batch of items.
 *
 * Throws a {@link TrackValidationError} at the first duplicate occurrence,
 * pinpointing the exact index and field.
 *
 * @param items     – The batch to inspect.
 * @param getKey    – Pure extractor returning the uniqueness key for an item.
 * @param fieldPath – Template for the error context, e.g. `"tracks[{i}].filePath"`.
 * @param errorCode – Machine-readable issue code, e.g. `"duplicate_file_path"`.
 * @param label     – Human-readable noun for the message, e.g. `"filePath"`.
 *
 * @throws {TrackValidationError} On the first duplicate detected.
 */
function assertBatchUniqueness<T>(
	items: readonly T[],
	getKey: (item: T) => string,
	fieldPath: (index: number) => string,
	errorCode: string,
	label: string,
): void {
	const seen = new Set<string>();
	for (const [index, item] of items.entries()) {
		const key = getKey(item);
		if (seen.has(key)) {
			throw new TrackValidationError(fieldPath(index), [
				createRootIssue(
					errorCode,
					`Batch contains duplicate ${label}: "${key}" at index ${index}`,
				),
			]);
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
 * Validates a single track object against `trackInputSchema` and returns
 * the parsed `Metadata` on success.
 *
 * @param track - Untrusted input to validate.
 * @param index - Positional index for the error context prefix.
 * @returns The parsed, schema-validated `Metadata`.
 * @throws {TrackValidationError} When validation fails. Carries the full
 *         structured issue list — no issues are discarded.
 */
function assertTrackInput(track: unknown, index: number): Metadata {
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

export {
	applyGuardedTrackUpdate,
	areCollectionIdsEqual,
	assertBatchUniqueness,
	assertTargetCollectionId,
	assertTrackInput,
	chunkArray,
	isNonEmptyString,
	isPlainObject,
	mapStorageWriteError,
	normalizeCollectionIds,
	shouldApplyUpdate,
	uniqueTracks,
	validateTrackChanges,
};
