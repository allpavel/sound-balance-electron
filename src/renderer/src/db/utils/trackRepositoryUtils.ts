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

import { SYSTEM_COLLECTION_ID } from "@renderer/db/constants/constants";

import {
	collectionIdsSchema,
	type Metadata,
	targetCollectionIdSchema,
	trackInputSchema,
} from "@shared/schemas/track.schema";

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): boolean {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertTargetCollectionId(value: unknown): void {
	const result = targetCollectionIdSchema.safeParse(value);
	if (!result.success) {
		throw new Error("targetCollectionId must be a non-empty string");
	}
}

function assertCollectionIds(value: unknown, context: string): void {
	const result = collectionIdsSchema.safeParse(value);
	if (result.success) {
		return;
	}
	const path = result.error.issues[0]?.path ?? [];
	if (path.length === 0) {
		throw new Error(`${context}.collectionIds must be an array of strings`);
	}
	throw new Error(
		`${context}.collectionIds[${String(path[0])}] must be a non-empty string`,
	);
}

function assertTrackInput(track: unknown, index: number): void {
	const context = `tracks[${index}]`;
	if (!isPlainObject(track)) {
		throw new Error(`${context} must be an object`);
	}

	const result = trackInputSchema.safeParse(track);
	if (result.success) {
		return;
	}

	const [field, collectionIndex] = result.error.issues[0]?.path ?? [];

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
	throw new Error(`${context} is invalid`);
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

function normalizeTrackChanges(
	changes: Partial<Metadata>,
	context: string,
): Partial<Metadata> {
	if (changes.collectionIds === undefined) {
		return changes;
	}
	assertCollectionIds(changes.collectionIds, context);
	return {
		...changes,
		collectionIds: normalizeCollectionIds(
			changes.collectionIds,
			SYSTEM_COLLECTION_ID,
		),
	};
}

export {
	areCollectionIdsEqual,
	assertCollectionIds,
	assertTargetCollectionId,
	assertTrackInput,
	isNonEmptyString,
	isPlainObject,
	normalizeCollectionIds,
	normalizeTrackChanges,
	uniqueTracks,
};
