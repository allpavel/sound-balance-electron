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
import { v7 as uuidV7 } from "uuid";
import type { CollectionType } from "@/types";
import { db } from "../db";

export const collectionsRepository = {
	async getAllCollections(): Promise<CollectionType[]> {
		return await db.collections.toArray();
	},
	async getCollectionById(id: string): Promise<CollectionType | undefined> {
		return await db.collections.get(id);
	},
	async addCollection(collection: Omit<CollectionType, "id">): Promise<string> {
		const newCollection: CollectionType = {
			id: uuidV7(),
			title: collection.title,
		};
		return await db.collections.add(newCollection);
	},
	async updateCollection(id: string, changes: Partial<CollectionType>) {
		return await db.collections.update(id, changes);
	},
	async deleteCollection({
		id,
		deleteFromAllCollections = false,
	}: {
		id: string;
		deleteFromAllCollections: boolean;
	}): Promise<void> {
		if (deleteFromAllCollections) {
			await db.transaction("readwrite", db.collections, db.tracks, async () => {
				const trackIds = await db.tracks
					.where("collectionIds")
					.equals(id)
					.primaryKeys();
				if (trackIds.length > 0) {
					await db.tracks.bulkDelete(trackIds);
				}
				await db.collections.delete(id);
			});
		} else {
			await db.transaction("readwrite", db.collections, db.tracks, async () => {
				await db.tracks
					.where("collectionIds")
					.equals(id)
					.modify((track) => {
						track.collectionIds = track.collectionIds.filter(
							(collectionId) => collectionId !== id,
						);
					});
				await db.collections.delete(id);
			});
		}
	},
};
