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
import { v7 as uuidV7 } from "uuid";
import { vi } from "vitest";
import type { CollectionType, Metadata } from "@/types";

let uuidSeq = 0;
let seq = 0;

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

export function makeCollection(
	overrides: Partial<CollectionType> = {},
): CollectionType {
	seq += 1;
	return { id: `col-${seq}`, title: `Collection ${seq}`, ...overrides };
}

export function makeTrack(overrides: Partial<Metadata> = {}): Metadata {
	seq += 1;
	return {
		id: `track-${seq}`,
		filePath: `/music/track-${seq}.mp3`,
		collectionIds: ["all"],
		selected: 0,
		...overrides,
	} as Metadata;
}
