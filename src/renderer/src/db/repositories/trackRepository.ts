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
