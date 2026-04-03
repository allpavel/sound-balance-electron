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
	async deleteCollection(id: string): Promise<void> {
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
	},
};
