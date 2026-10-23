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

import { ANYOF_CHUNK_SIZE } from "@shared/constants";
import { StorageCapacityError } from "@shared/errors";
import { chunkArray } from "@shared/utils";
import type { EntityTable, IndexableType } from "dexie";

/**
 * Type guard to safely identify legacy base64 picture objects during migration.
 */
export function isLegacyPicture(pic: unknown): pic is {
	format: string;
	data: string;
	description?: string;
	name?: string;
} {
	return (
		typeof pic === "object" &&
		pic !== null &&
		"data" in pic &&
		typeof (pic as Record<string, unknown>).data === "string"
	);
}

/**
 * Requests persistent storage to prevent eviction of large datasets.
 * Should be called at application startup.
 */
export async function requestPersistentStorage(): Promise<boolean> {
	if (
		typeof navigator !== "undefined" &&
		navigator.storage &&
		navigator.storage.persist
	) {
		return await navigator.storage.persist();
	}
	return false;
}

/**
 * Checks if there is sufficient storage headroom for a large import operation.
 * @param requiredBytes - The estimated size of the incoming payload.
 * @throws {StorageCapacityError} If available storage is less than required.
 */
export async function checkStorageHeadroom(
	requiredBytes: number,
): Promise<void> {
	if (
		typeof navigator !== "undefined" &&
		navigator.storage &&
		navigator.storage.estimate
	) {
		const estimate = await navigator.storage.estimate();
		const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
		if (available < requiredBytes) {
			throw new StorageCapacityError(
				`Insufficient storage. Required: ${requiredBytes}, Available: ${available}`,
			);
		}
	}
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
export async function chunkedAnyOf<
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

/** Type guard: narrows an unknown value to `IndexableType`. */
function isIndexableKey(value: unknown): value is IndexableType {
	return (
		typeof value === "string" ||
		typeof value === "number" ||
		value instanceof Date ||
		value instanceof ArrayBuffer ||
		ArrayBuffer.isView(value)
	);
}

/**
 * Chunks `keys` and collects matching primary keys via Dexie's
 * `anyOf().primaryKeys()`. Index-only traversal — no row deserialization.
 * Use this for existence checks where only the key matters.
 *
 * @typeParam T - The Dexie table's row type.
 * @param table - The Dexie `EntityTable` to query.
 * @param index - The indexed property name.
 * @param keys  - The keys to look up (chunked internally at `ANYOF_CHUNK_SIZE`).
 * @returns Collected primary keys of all matching rows.
 */
export async function chunkedAnyOfKeys<
	T,
	KeyProp extends keyof T = Extract<keyof T, string>,
>(
	table: EntityTable<T, KeyProp>,
	index: string,
	keys: readonly IndexableType[],
): Promise<IndexableType[]> {
	if (keys.length === 0) return [];
	const result: IndexableType[] = [];
	const chunks = chunkArray(keys, ANYOF_CHUNK_SIZE);
	for (const chunk of chunks) {
		const found = await table.where(index).anyOf(chunk).primaryKeys();
		for (const key of found) {
			if (isIndexableKey(key)) {
				result.push(key);
			}
		}
	}
	return result;
}
