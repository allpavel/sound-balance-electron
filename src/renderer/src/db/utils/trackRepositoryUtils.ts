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

import {
	type Metadata,
	type TrackChanges,
	targetCollectionIdSchema,
} from "@shared/schemas/track.schema";
import { isLegalStatusTransition } from "@shared/utils";
import { safeParseTrack, safeParseTrackChanges } from "@shared/validators";
import { formatValidationIssues } from "@tests/utils";
import type { EntityTable } from "dexie";

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertTargetCollectionId(value: unknown): void {
	const result = targetCollectionIdSchema.safeParse(value);
	if (!result.success) {
		throw new Error("targetCollectionId must be a non-empty string");
	}
}

function assertTrackInput(track: unknown, index: number): Metadata {
	const context = `tracks[${index}]`;
	if (!isPlainObject(track)) {
		throw new Error(`${context} must be an object`);
	}

	const result = safeParseTrack(track);
	if (result.success) {
		return result.data;
	}

	const [field, collectionIndex] = (result.issues[0]?.path ?? "").split(".");

	if (field === "id") {
		throw new Error(`${context}.id must be a non-empty string`);
	}
	if (field === "file") {
		throw new Error(`${context}.file must be a non-empty string`);
	}
	if (field === "filePath") {
		throw new Error(`${context}.filePath must be a non-empty string`);
	}
	if (field === "status") {
		throw new Error(
			`${context}.status must be one of: pending, processing, completed, failed`,
		);
	}
	if (field === "selected") {
		throw new Error(`${context}.selected must be 0 or 1`);
	}
	if (field === "collectionIds") {
		if (collectionIndex === undefined) {
			throw new Error(`${context}.collectionIds must be an array of strings`);
		}
		throw new Error(
			`${context}.collectionIds[${String(collectionIndex)}] must be a non-empty string`,
		);
	}
	throw new Error(
		`${context} is invalid: ${formatValidationIssues(result.issues)}`,
	);
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

function validateTrackChanges(changes: unknown, context: string): TrackChanges {
	if (!isPlainObject(changes)) {
		throw new Error(`${context} must be a non-null object`);
	}

	const result = safeParseTrackChanges(changes);
	if (!result.success) {
		throw new Error(
			`${context} is invalid: ${formatValidationIssues(result.issues)}`,
		);
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
 * Applies a guarded track update, enforcing state machine legality and sequence monotonicity.
 *
 * This function acts as the final defensive layer (Defense in Depth) before persisting
 * status changes to IndexedDB. It evaluates two distinct guard layers:
 *
 * 1. **State Machine (Layer 1):** Validates that the requested status transition is legally
 *    permitted by the shared lifecycle matrix. Rejects backward edges, self-transitions
 *    (duplicates), and illegal skips.
 * 2. **Sequence Guard (Layer 2):** If the incoming event carries a Lamport logical clock
 *    sequence number (`seq`), it ensures the event is strictly newer than the persisted
 *    high-water mark (`statusSeq`).
 *
 * This function performs a read-check-write cycle. To prevent Time-of-Check to Time-of-Use
 * (TOCTOU) race conditions under concurrent mutations, it must be invoked inside a
 * Dexie `db.transaction("rw", ...)` boundary by the calling repository.
 *
 * @param tracksTable - The injected Dexie `EntityTable` for tracks. Injected via DI to
 *                      decouple the utility from the global `db` singleton and enable
 *                      fast, isolated unit testing.
 * @param id - The primary key (`id`) of the track to update.
 * @param changes - The shape-validated track mutation payload (`TrackChanges`).
 * @returns A promise resolving to `1` if the database was updated, or `0` if the update
 *          was gracefully rejected (missing row, illegal transition, or stale sequence).
 * @throws Only throws if the underlying Dexie `update` operation encounters an unexpected
 *         database error (e.g., disk I/O failure, ConstraintError on unique indexes).
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
	if (track === undefined) return 0;

	if (!isLegalStatusTransition(track.status, changes.status)) {
		return 0;
	}
	const currentSeq = track.statusSeq ?? 0;
	if (changes.seq !== undefined && changes.seq <= currentSeq) {
		return 0;
	}

	const { seq, ...statusPatch } = changes;
	const patch = {
		...statusPatch,
		...(seq !== undefined ? { statusSeq: seq } : {}),
	};
	return await tracksTable.update(id, patch as Partial<Metadata>);
}

export {
	applyGuardedTrackUpdate,
	areCollectionIdsEqual,
	assertTargetCollectionId,
	assertTrackInput,
	isNonEmptyString,
	isPlainObject,
	normalizeCollectionIds,
	uniqueTracks,
	validateTrackChanges,
};
