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

import type { SettingsForm } from "@types";
import Dexie, { type EntityTable } from "dexie";
import type { CollectionType, Metadata } from "@/types";

const db = new Dexie("AudioDB") as Dexie & {
	tracks: EntityTable<Metadata, "id">;
	settings: EntityTable<{ id: string; settings: SettingsForm }, "id">;
	collections: EntityTable<CollectionType, "id">;
};

db.version(1).stores({
	tracks: "id, *collectionIds",
});

db.version(2).stores({
	tracks: "id, *collectionIds",
	settings: "id",
});

db.version(3).stores({
	tracks: "id, *collectionIds",
	settings: "id",
	collections: "++id",
});

db.version(4).stores({
	tracks: "id, *collectionIds, selected",
	settings: "id",
	collections: "++id",
});

db.version(5).stores({
	tracks: "id, *collectionIds, selected",
	settings: "id",
	collections: "id",
});

db.version(6).stores({
	tracks: "id, filePath, *collectionIds, selected",
	settings: "id",
	collections: "id",
});

db.on("populate", (tx) => {
	tx.table("collections").add({
		id: "all",
		title: "All",
	});
});

export { db };
