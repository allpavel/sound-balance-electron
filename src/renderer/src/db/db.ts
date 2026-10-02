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

import { DATABASE_NAME, SYSTEM_COLLECTION_ID } from "@renderer/db/constants";
import { isLegacyPicture } from "@renderer/db/utils/dbUtils";
import type { Metadata } from "@shared/schemas/track.schema";
import type { Artwork } from "@shared/types";
import Dexie, { type EntityTable } from "dexie";
import { v7 as uuidV7 } from "uuid";
import type { SettingsForm } from "@/src/shared/schemas/settings.schema";
import type { CollectionType } from "@/types";

const db = new Dexie(DATABASE_NAME) as Dexie & {
	tracks: EntityTable<Metadata, "id">;
	settings: EntityTable<{ id: string; settings: SettingsForm }, "id">;
	collections: EntityTable<CollectionType, "id">;
	artworks: EntityTable<Artwork, "id">;
};

db.version(1).stores({
	tracks: "id, &filePath, *collectionIds, selected",
	settings: "id",
	collections: "id",
});

db.version(2)
	.stores({
		tracks: "id, &filePath, *collectionIds, selected",
		settings: "id",
		collections: "id",
		artworks: "id",
	})
	.upgrade(async (tx) => {
		const tracks = await tx.table("tracks").toArray();
		for (const track of tracks) {
			if (track.common?.picture && Array.isArray(track.common.picture)) {
				const artworkIds: string[] = [];
				for (const pic of track.common.picture) {
					if (isLegacyPicture(pic)) {
						const base64Data = pic.data;
						const byteCharacters = atob(base64Data);
						const byteNumbers = new Array(byteCharacters.length);
						for (let i = 0; i < byteCharacters.length; i++) {
							byteNumbers[i] = byteCharacters.charCodeAt(i);
						}
						const byteArray = new Uint8Array(byteNumbers);
						const blob = new Blob([byteArray], { type: pic.format });
						const id = uuidV7();
						await tx.table("artworks").add({
							id,
							blob,
							format: pic.format,
							description: pic.description,
							name: pic.name,
						});
						artworkIds.push(id);
					} else if (typeof pic === "string") {
						artworkIds.push(pic);
					}
				}
				await tx.table("tracks").update(track.id, {
					common: {
						...track.common,
						picture: artworkIds,
					},
				});
			}
		}
	});

db.on("populate", (tx) => {
	tx.table("collections").add({
		id: SYSTEM_COLLECTION_ID,
		title: "All",
	});
});

export { db };
