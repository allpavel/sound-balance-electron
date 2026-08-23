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
import { db } from "@renderer/db/db";
import type { Metadata } from "@shared/schemas/track.schema";
import { v7 as uuidV7 } from "uuid";
import type { CollectionType } from "@/types";

let uuidSeq = 0;
let collectionSeq = 0;
let trackSeq = 0;

export function configureUuidMock(): void {
	uuidSeq = 0;
	// biome-ignore lint/suspicious/noExplicitAny: for tests only
	vi.mocked(uuidV7).mockImplementation(() => `mock-uuid-${++uuidSeq}` as any);
}

export async function resetDatabase(): Promise<void> {
	await db.tracks.clear();
	await db.collections.clear();
	await db.settings.clear();
	await db.collections.add({ id: "all", title: "All" });
}

export function resetSequences() {
	uuidSeq = 0;
	collectionSeq = 0;
	trackSeq = 0;
}

export async function resetTestState() {
	resetSequences();
	await resetDatabase();
	configureUuidMock();
}

export function makeCollection(
	overrides: Partial<CollectionType> = {},
): CollectionType {
	collectionSeq += 1;
	return {
		id: `col-${collectionSeq}`,
		title: `Collection ${collectionSeq}`,
		...overrides,
	};
}

export function makeTrack(overrides: Partial<Metadata> = {}): Metadata {
	trackSeq += 1;
	return {
		id: `track-${trackSeq}`,
		file: `track-${trackSeq}.mp3`,
		filePath: `/music/track-${trackSeq}.mp3`,
		status: "pending",
		selected: 0,
		collectionIds: [SYSTEM_COLLECTION_ID],
		common: {},
		format: {},
		...overrides,
	} as Metadata;
}
