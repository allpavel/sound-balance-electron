import type { CollectionType } from "@/types";
import { db } from "../db";

export const collectionsRepository = {
	async getAllCollections(): Promise<CollectionType[]> {
		return await db.collections.toArray();
	},
	async getCollectionById(id: number): Promise<CollectionType | undefined> {
		return await db.collections.get(id);
	},
	async addCollection(collection: CollectionType): Promise<number> {
		return await db.collections.add(collection);
	},
	async updateCollection(id: number, changes: Partial<CollectionType>) {
		return await db.collections.update(id, changes);
	},
	async deleteCollection(id: number): Promise<void> {
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
