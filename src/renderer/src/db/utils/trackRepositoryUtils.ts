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
import type { FilePathDedupeResult, ProgressEmitter } from "@renderer/db/types";
import {
	ANYOF_CHUNK_SIZE,
	MAX_BATCH_PAYLOAD_SIZE,
	MAX_LOGGED_ERROR_NAME_LENGTH,
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
	AddManyOptions,
	IngestionMetadata,
	Metadata,
	TrackChanges,
} from "@shared/schemas/track.schema";
import type { AddManyProgress, AddManyProgressCallback } from "@shared/types";
import {
	chunkArray,
	isLegalStatusTransition,
	sanitizeControlChars,
} from "@shared/utils";
import {
	safeParseAddManyOptions,
	safeParseTrack,
	safeParseTrackChanges,
	type ValidationResult,
} from "@shared/validators";
import type { EntityTable, IndexableType } from "dexie";
import type { CollectionType } from "@/types";

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
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
 * Precedence (first matching rule wins):
 * 1. **Domain re-throw** — `TrackValidationError` / `ConflictError` /
 *    `ReferentialIntegrityError` are re-thrown verbatim (no wrapping).
 * 2. **`inner` unwrap** — if the error has a non-null `inner` property,
 *    recurse on it (the inner error wins over the outer error's own `name`).
 * 3. **Top-level `name`** — `QuotaExceededError` → `StorageCapacityError`;
 *    `ConstraintError` → `ConflictError`; `InvalidStateError` /
 *    `AbortError` / `UnknownError` / `VersionError` / `NotFoundError` →
 *    `StorageUnavailableError`.
 * 4. **`failures[]` scan** — first matching failure wins (same name mapping
 *    as rule 3).
 * 5. **Identity re-throw** — unknown errors are re-thrown by identity.
 *
 * @param error - The caught unknown error value.
 * @throws {StorageCapacityError|ConflictError|StorageUnavailableError} Mapped
 *         domain errors (rules 2–4).
 * @throws {TrackValidationError|ConflictError|ReferentialIntegrityError}
 *         Re-thrown domain errors (rule 1, verbatim).
 * @throws {unknown} Re-thrown by identity (rule 5, no match).
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
 * @param params.items     – The batch to inspect.
 * @param params.getKey    – Pure extractor returning the uniqueness key.
 * @param params.fieldPath – Template for the error context, e.g. `"tracks[{i}].id"`.
 * @param params.label     – Human-readable noun for the message, e.g. `"id"`.
 * @param params.context   – Message prefix, default `"Batch"`. Use `"Updates"`
 *                           for `updateMany` so the phrasing survives.
 *
 * @throws {ConflictError} On the first duplicate detected.
 */
function assertBatchUniqueness<T>(params: {
	items: readonly T[];
	getKey: (item: T) => string;
	fieldPath: (index: number) => string;
	label: string;
	context?: string;
}): void {
	const { items, getKey, fieldPath, label, context = "Batch" } = params;
	const seen = new Set<string>();
	for (const [index, item] of items.entries()) {
		const key = getKey(item);
		if (seen.has(key)) {
			throw new ConflictError(
				`Batch contains duplicate ${sanitizeControlChars(label)}: "${sanitizeControlChars(key)}" at ${sanitizeControlChars(fieldPath(index))}`,
			);
		}
		seen.add(key);
	}
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
	const existingIds = new Set<string>();

	await chunkedAnyOf(collectionsTable, "id", idsToCheck, (row) => {
		if (row.id) {
			existingIds.add(row.id);
		}
	});

	const missing = idsToCheck.filter((id) => !existingIds.has(id));
	if (missing.length > 0) {
		const display = missing
			.slice(0, MAX_DISPLAY_MISSING)
			.map(sanitizeControlChars)
			.join(", ");
		const suffix =
			missing.length > MAX_DISPLAY_MISSING
				? ` (and ${missing.length - MAX_DISPLAY_MISSING} more)`
				: "";
		throw new ReferentialIntegrityError(
			`${sanitizeControlChars(context)}: Referenced collection(s) do not exist: ${display}${suffix}`,
		);
	}
}

/**
 * Generic parse-or-throw boundary helper.
 *
 * @typeParam T - The parsed output type of the schema.
 * @param parse   - A `safeParseX` validator from `@shared/validators`.
 * @param context - Location prefix for the thrown error (e.g. `"tracks[0]"`).
 * @param input   - Untrusted input to validate.
 * @returns The parsed, schema-validated data.
 * @throws {TrackValidationError} When validation fails. Carries the full
 *         structured issue list — no issues are discarded.
 */
function assertParsed<T>(
	parse: (input: unknown) => ValidationResult<T>,
	context: string,
	input: unknown,
): T {
	const result = parse(input);
	if (!result.success) {
		throw new TrackValidationError(context, result.issues);
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
function assertTrackInput(track: unknown, index: number): IngestionMetadata {
	return assertParsed(safeParseTrack, `tracks[${index}]`, track);
}

/**
 * Asserts that the untrusted `addMany` options satisfy
 * {@link addManyOptionsSchema}.
 *
 * Rejects (does not clamp) invalid `batchSize` / `onProgress`
 * at the trust boundary, throwing {@link TrackValidationError} carrying the
 * structured issues from the schema. Callers receive the validated options
 * with `batchSize` guaranteed to be an integer in `[1, MAX_IMPORT_BATCH_SIZE]`
 * and `onProgress` guaranteed to be a function (or `undefined`).
 *
 * @param options - Untrusted options payload (UI/Redux → data layer).
 * @returns The schema-validated options.
 * @throws {TrackValidationError} When validation fails.
 */
function assertAddManyOptions(options: unknown): AddManyOptions {
	return assertParsed(safeParseAddManyOptions, "options", options);
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
	const validated = assertParsed(safeParseTrackChanges, context, changes);
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

	if (changes.status === "failed") {
		patch.reason = changes.reason;
	} else {
		patch.reason = undefined;
	}

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
 * Gathers the set of collection ids referenced by a batch/import: the target
 * collection plus every track's `collectionIds`. Pure; no I/O.
 *
 * @param tracks              - Parsed, validated ingestion tracks.
 * @param targetCollectionId - The target collection of this import/batch.
 * @returns The referenced collection-id set (always includes the target).
 */
function gatherReferencedCollectionIds(
	tracks: readonly IngestionMetadata[],
	targetCollectionId: string,
): Set<string> {
	const ids = new Set<string>();
	ids.add(targetCollectionId);
	for (const track of tracks) {
		if (Array.isArray(track.collectionIds)) {
			for (const cid of track.collectionIds) {
				if (isNonEmptyString(cid)) {
					ids.add(cid);
				}
			}
		}
	}
	return ids;
}

/**
 * First-wins deduplication of ingestion tracks by normalized `filePath`.
 *
 * Once {@link trackBaseSchema} normalizes `filePath` at parse time,
 * case-variant duplicates within a single import payload collapse onto
 * the same canonical key. Rather than aborting the whole import
 * with a `ConflictError` (the previous strict `assertBatchUniqueness` behavior),
 * this helper keeps the first occurrence and reports the rest
 * as `skipped` — the same outcome channel already used for tracks that exist in the database.
 * This tolerates noisy scanner output (symlink re-resolution, re-scans, case-renames)
 * without losing data and without aborting a long-running import.
 *
 * Duplicate `id`s remain a hard {@link ConflictError} (asserted separately
 * by {@link assertBatchUniqueness} on the `id` key): two ingestion tracks
 * claiming the same primary key is a genuine integrity violation, not a
 * case-folding artifact, and must not be silently folded.
 *
 * The function is pure and total: it performs no I/O, does not touch the
 * database, and preserves input order for the surviving tracks. It relies
 * on the schema-enforced precondition that every `track.filePath` is
 * already normalized (see {@link filePathSchema}).
 *
 * @param tracks - Parsed, schema-validated ingestion tracks whose
 *                 `filePath` values are already normalized by
 *                 {@link filePathSchema}.
 * @returns The deduped unique tracks and the IDs folded into them.
 */
function dedupeByFilePath(
	tracks: readonly IngestionMetadata[],
): FilePathDedupeResult {
	const seen = new Set<string>();
	const unique: IngestionMetadata[] = [];
	const skipped: string[] = [];
	for (const track of tracks) {
		if (seen.has(track.filePath)) {
			skipped.push(track.id);
			continue;
		}
		seen.add(track.filePath);
		unique.push(track);
	}
	return { unique, skipped };
}

/**
 * Derives a log-safe, length-bounded descriptor for a thrown value.
 *
 * @param error - The caught unknown value from a callback invocation or a
 *                mid-import failure.
 * @returns A sanitized, truncated name safe for diagnostic logs.
 */
function describeThrownValue(error: unknown): string {
	const name = isErrorWithName(error) ? error.name : "unknown";
	return sanitizeControlChars(name).slice(0, MAX_LOGGED_ERROR_NAME_LENGTH);
}

/**
 * Creates the failure-isolated progress emitter for an `addMany` import.
 *
 * The callback contract (synchronous, non-throwing, lightweight,
 * renderer-local) is documented on {@link AddManyProgressCallback}.
 *
 * @param onProgress - The schema-validated callback (may be `undefined`,
 *   in which case both emitter operations are no-ops and the hot path
 *   carries no try/catch or closure bookkeeping).
 * @returns A {@link ProgressEmitter} bound to this single import.
 */
function createProgressEmitter(
	onProgress: AddManyProgressCallback | undefined,
): ProgressEmitter {
	if (onProgress === undefined) {
		return { emit: (): void => {}, flush: (): void => {} };
	}
	const callback: AddManyProgressCallback = onProgress;
	let failureCount = 0;
	let firstFailureLogged = false;

	return {
		emit(progress: AddManyProgress): void {
			try {
				callback(progress);
			} catch (callbackError: unknown) {
				failureCount += 1;
				if (!firstFailureLogged) {
					firstFailureLogged = true;
					// biome-ignore lint/suspicious/noConsole: Intentional diagnostic for a throwing onProgress callback; sanitized and truncated output only (error name, never message); logged once per import.
					console.warn(
						"[tracksRepository.addMany] onProgress callback threw; continuing import. Further callback failures are suppressed and summarized on completion.",
						{
							processed: progress.processed,
							total: progress.total,
							errorName: describeThrownValue(callbackError),
						},
					);
				}
			}
		},
		flush(): void {
			if (failureCount > 1) {
				// biome-ignore lint/suspicious/noConsole: Terminal diagnostic summary; pure counts only — no attacker-influenceable content.
				console.warn(
					"[tracksRepository.addMany] onProgress callback failed repeatedly during this import; every failure was isolated (see the first warning for detail)",
					{
						totalFailures: failureCount,
						suppressedAfterFirst: failureCount - 1,
					},
				);
			}
		},
	};
}

/**
 * Chunks `keys` and iterates matching rows via Dexie's `anyOf().each()`.
 * Single request per chunk; no `toArray()` materialization — the visitor
 * receives each row transiently. Use this instead of hand-rolling
 * `chunkArray` + `anyOf().primaryKeys()/.each()` at each call site.
 *
 * @typeParam T - The Dexie table's row type.
 * @param table - The Dexie `Table` (or `EntityTable`) to query.
 * @param index - The indexed property name (e.g., `"id"`, `"filePath"`).
 * @param keys  - The keys to look up (chunked internally at `ANYOF_CHUNK_SIZE`).
 * @param visit - Visitor called once per matching row.
 */
async function chunkedAnyOf<
	T,
	KeyProp extends keyof T = Extract<keyof T, string>,
>(
	table: EntityTable<T, KeyProp>,
	index: string,
	keys: readonly IndexableType[],
	visit: (row: T) => void,
): Promise<void> {
	if (keys.length === 0) return;
	const chunks = chunkArray(keys, ANYOF_CHUNK_SIZE);
	for (const chunk of chunks) {
		await table.where(index).anyOf(chunk).each(visit);
	}
}

export {
	applyGuardedTrackUpdate,
	areCollectionIdsEqual,
	assertAddManyOptions,
	assertBatchPayloadSize,
	assertBatchUniqueness,
	assertParsed,
	assertReferentialIntegrity,
	assertTrackInput,
	calculateBatchPayloadSize,
	chunkedAnyOf,
	createProgressEmitter,
	dedupeByFilePath,
	describeThrownValue,
	gatherReferencedCollectionIds,
	isErrorWithName,
	isNonEmptyString,
	isPlainObject,
	mapStorageWriteError,
	normalizeCollectionIds,
	shouldApplyUpdate,
	uniqueTracks,
	validateTrackChanges,
};
