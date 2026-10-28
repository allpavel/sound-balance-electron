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
	SYSTEM_COLLECTION_ID,
	SYSTEM_COLLECTION_TITLE,
} from "@shared/constants";
import { resetFactorySequences } from "@tests/factories";
import { v7 as uuidV7 } from "uuid";

let uuidSeq = 0;

export function configureUuidMock(): void {
	uuidSeq = 0;
	// biome-ignore lint/suspicious/noExplicitAny: for tests only
	vi.mocked(uuidV7).mockImplementation(() => `mock-uuid-${++uuidSeq}` as any);
}

/**
 * Resets every IndexedDB store the application writes to, then re-seeds the
 * protected system collection. Any new persistent store MUST be added here —
 * an omitted store leaks rows across tests.
 */
export async function resetDatabase(): Promise<void> {
	await db.tracks.clear();
	await db.collections.clear();
	await db.settings.clear();
	await db.artworks.clear();
	await db.collections.add({
		id: SYSTEM_COLLECTION_ID,
		title: SYSTEM_COLLECTION_TITLE,
	});
}

/**
 * Deletes and re-opens the database, triggering Dexie's `populate` hook.
 *
 * Required for tests that verify populate/migration behavior —
 * {@link resetDatabase} (clear + re-seed) cannot re-trigger `populate`
 * because it never destroys the database, only clears its stores.
 */
export async function recreateDatabase(): Promise<void> {
	db.close();
	await db.delete();
	await db.open();
}

export function resetSequences() {
	uuidSeq = 0;
	resetFactorySequences();
}

export async function resetTestState() {
	resetSequences();
	await resetDatabase();
	configureUuidMock();
}

/**
 * Seeds a collection row so that referential-integrity checks
 * pass for non-system collection IDs used in test inputs.
 *
 * @param id    – The collection primary key to insert.
 * @param title – Optional human-readable title; defaults to `"Collection <id>"`.
 */
export async function seedCollection(
	id: string,
	title?: string,
): Promise<void> {
	await db.collections.add({ id, title: title ?? `Collection ${id}` });
}
