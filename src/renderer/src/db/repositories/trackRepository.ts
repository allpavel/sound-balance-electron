import { db } from "@renderer/db/db";
import type { Metadata } from "@/types";

export const tracksRepository = {
	async getAll(): Promise<Metadata[]> {
		return db.tracks.toArray();
	},
	async addMany(
		tracks: Metadata[],
		allKeys = true,
	): Promise<string | string[]> {
		return await db.tracks.bulkPut(tracks, { allKeys });
	},
	async update(id: string, changes: Partial<Metadata>): Promise<number> {
		return await db.tracks.update(id, changes);
	},
	async updateMany(updates: { id: string; changes: Partial<Metadata> }[]) {
		let total = 0;
		await db.transaction("rw", db.tracks, async () => {
			for (const { id, changes } of updates) {
				total += await db.tracks.update(id, changes);
			}
		});
		return total;
	},
	async remove(id: string): Promise<void> {
		await db.tracks.delete(id);
	},
	async removeMany(ids: string[]): Promise<void> {
		await db.tracks.bulkDelete(ids);
	},
};
