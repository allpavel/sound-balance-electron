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

import { SYSTEM_COLLECTION_ID } from "@renderer/db/constants/constants";
import { db } from "@renderer/db/db";
import {
	isNonEmptyString,
	isPlainObject,
	uniqueTracks,
} from "@renderer/db/utils/trackRepositoryUtils";
import type { Metadata } from "@/types";

type TrackUpdate = {
	id: string;
	changes: Partial<Metadata>;
};

export const tracksRepository = {
	async getAll(id: string): Promise<Metadata[]> {
		if (!isNonEmptyString(id)) {
			return [];
		}
		const tracks = await db.tracks.where("collectionIds").equals(id).toArray();
		return uniqueTracks(tracks);
	},

	async getById(id: string) {
		if (!isNonEmptyString(id)) {
			return undefined;
		}
		return await db.tracks.get(id);
	},

	async addMany(
		tracks: Metadata[],
		{
			allKeys = true,
			targetCollectionId = SYSTEM_COLLECTION_ID,
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
				if (targetCollectionId !== SYSTEM_COLLECTION_ID) {
					track.collectionIds.push(SYSTEM_COLLECTION_ID, targetCollectionId);
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
		if (!isNonEmptyString(id)) {
			throw new Error("ID must be a non-empty string");
		}
		if (!isPlainObject(changes)) {
			throw new Error("Changes must be an object");
		}
		return await db.tracks.update(id, changes);
	},

	async updateMany(updates: { id: string; changes: Partial<Metadata> }[]) {
		if (!Array.isArray(updates)) {
			throw new Error("Updates must be an array");
		}
		if (updates.length === 0) {
			return 0;
		}

		const seenIds = new Set<string>();

		for (const [index, update] of updates.entries()) {
			const context = `updates[${index}]`;
			if (!isPlainObject(update)) {
				throw new Error(`${context} must be an object`);
			}
			const candidate = update as Partial<TrackUpdate>;
			if (!isNonEmptyString(candidate.id)) {
				throw new Error(`${context}.id must be a non-empty string`);
			}
			if (!isPlainObject(candidate.changes)) {
				throw new Error(`${context}.changes must be an object`);
			}
			if (seenIds.has(candidate.id)) {
				throw new Error(`updates contains duplicate id: ${candidate.id}`);
			}
			seenIds.add(candidate.id);
		}

		let total = 0;
		await db.transaction("rw", db.tracks, async () => {
			for (const { id, changes } of updates) {
				total += await db.tracks.update(id, changes);
			}
		});
		return total;
	},
	async remove(id: string): Promise<void> {
		if (!isNonEmptyString(id)) {
			throw new Error("ID must be a non-empty string");
		}
		await db.tracks.delete(id);
	},

	async getSelectedTracks(): Promise<Metadata[]> {
		const tracks = await db.tracks.where("selected").equals(1).toArray();
		return uniqueTracks(tracks);
	},

	async removeMany(): Promise<void> {
		await db.transaction("rw", db.tracks, async () => {
			const selectedTracksIds = await db.tracks
				.where("selected")
				.equals(1)
				.primaryKeys();
			if (selectedTracksIds.length > 0) {
				await db.tracks.bulkDelete(selectedTracksIds);
			}
		});
	},
};
