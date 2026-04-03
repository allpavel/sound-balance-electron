import { db } from "@renderer/db/db";
import type { Metadata } from "@/types";

export const tracksRepository = {
	async getAll(id: string): Promise<Metadata[]> {
		return await db.tracks.where("collectionIds").equals(id).toArray();
	},
	async getById(id: string) {
		const tracks = await db.tracks.where("id").equals(id).toArray();
		return tracks.length > 0 ? tracks[0] : undefined;
	},
	async addMany(
		tracks: Metadata[],
		{
			allKeys = true,
			targetCollectionId = "all",
		}: { allKeys?: boolean; targetCollectionId: string },
	): Promise<string | string[]> {
		const filePaths = tracks.map((track) => track.filePath);
		const existingTracks = await db.tracks
			.where("filePath")
			.anyOf(filePaths)
			.toArray();
		const existingMap = new Map(
			existingTracks.map((track) => [track.filePath, track]),
		);

		const toUpdate: { key: string; changes: Partial<Metadata> }[] = [];
		const toAdd: Metadata[] = [];

		for (const track of tracks) {
			const existingTrack = existingMap.get(track.filePath);

			if (existingTrack) {
				if (!existingTrack.collectionIds.includes(targetCollectionId)) {
					const newIds = [...existingTrack.collectionIds, targetCollectionId];
					toUpdate.push({
						key: existingTrack.id,
						changes: {
							collectionIds: newIds,
						},
					});
				}
			} else {
				if (targetCollectionId !== "all") {
					track.collectionIds.push("all", targetCollectionId);
				} else {
					track.collectionIds.push(targetCollectionId);
				}
				toAdd.push(track);
			}
		}

		const resultIds: string[] = [];

		await db.transaction("rw", db.tracks, async () => {
			if (toAdd.length > 0) {
				const addedIds = await db.tracks.bulkAdd(toAdd, { allKeys });
				resultIds.push(...addedIds);
			}
			if (toUpdate.length > 0) {
				await db.tracks.bulkUpdate(toUpdate);
			}
		});

		return resultIds;
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
