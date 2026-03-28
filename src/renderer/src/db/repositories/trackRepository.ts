import { db } from "@renderer/db/db";
import type { Metadata } from "@/types";

export const tracksRepository = {
	async getAll(): Promise<Metadata[]> {
		return await db.tracks.toArray();
	},
	async getById(id: string) {
		const tracks = await db.tracks.where("id").equals(id).toArray();
		return tracks.length > 0 ? tracks[0] : undefined;
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
	async getSelectedTracks(): Promise<Metadata[]> {
		return await db.tracks.where("selected").equals(1).toArray();
	},
	async removeMany(): Promise<void> {
		await db.transaction("rw", db.tracks, async () => {
			const selectedTracksIds = await db.tracks
				.where("selected")
				.equals(1)
				.primaryKeys();
			await db.tracks.bulkDelete(selectedTracksIds);
		});
	},
};
