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
import type { Metadata } from "@/types";

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): boolean {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertTargetCollectionId(value: unknown): void {
	if (!isNonEmptyString(value)) {
		throw new Error("targetCollectionId must be a non-empty string");
	}
}

function assertCollectionIds(value: unknown, context: string): void {
	if (value === undefined) {
		return;
	}
	if (!Array.isArray(value)) {
		throw new Error(`${context}.collectionIds must be an array of strings`);
	}
	for (const [index, collectionId] of value.entries()) {
		if (!isNonEmptyString(collectionId)) {
			throw new Error(
				`${context}.collectionIds[${index}] must be a non-empty string`,
			);
		}
	}
}

function assertTrackInput(track: unknown, index: number): void {
	const context = `tracks[${index}]`;
	if (!isPlainObject(track)) {
		throw new Error(`${context} must be an object`);
	}
	const candidate = track as Partial<Metadata>;
	if (!isNonEmptyString(candidate.id)) {
		throw new Error(`${context}.id must be a non-empty string`);
	}
	if (!isNonEmptyString(candidate.filePath)) {
		throw new Error(`${context}.filePath must be a non-empty string`);
	}
	assertCollectionIds(candidate.collectionIds, context);
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

export {
	areCollectionIdsEqual,
	assertCollectionIds,
	assertTargetCollectionId,
	assertTrackInput,
	isNonEmptyString,
	isPlainObject,
	normalizeCollectionIds,
	uniqueTracks,
};
