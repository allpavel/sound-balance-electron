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
import {
	applyGuardedTrackUpdate,
	areCollectionIdsEqual,
	assertTargetCollectionId,
	assertTrackInput,
	isNonEmptyString,
	isPlainObject,
	normalizeCollectionIds,
	uniqueTracks,
	validateTrackChanges,
} from "@renderer/db/utils/trackRepositoryUtils";
import { SYSTEM_COLLECTION_ID } from "@shared/constants";
import type { Metadata, TrackChanges } from "@shared/schemas/track.schema";

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
		{ targetCollectionId = SYSTEM_COLLECTION_ID } = {},
	): Promise<string[]> {
		assertTargetCollectionId(targetCollectionId);

		if (!Array.isArray(tracks)) {
			throw new Error("Tracks must be an array");
		}
		if (tracks.length === 0) {
			return [];
		}

		const parsedTracks: Metadata[] = [];
		const seenFilePaths = new Set<string>();

		for (const [index, track] of tracks.entries()) {
			const parsedTrack = assertTrackInput(track, index);
			const filePath = parsedTrack.filePath;
			if (seenFilePaths.has(filePath)) {
				throw new Error(`tracks contains duplicate filePath: ${filePath}`);
			}
			seenFilePaths.add(filePath);
			parsedTracks.push(parsedTrack);
		}

		const filePaths = parsedTracks.map((track) => track.filePath);

		return await db.transaction("rw", db.tracks, async () => {
			const existingTracks = await db.tracks
				.where("filePath")
				.anyOf(filePaths)
				.toArray();

			const existingByFilePath = new Map<string, Metadata>();

			for (const existingTrack of existingTracks) {
				if (isNonEmptyString(existingTrack.filePath)) {
					existingByFilePath.set(existingTrack.filePath, existingTrack);
				}
			}

			const toAdd: Metadata[] = [];
			const toUpdate: { key: string; changes: Partial<Metadata> }[] = [];

			for (const track of parsedTracks) {
				const existingRow = existingByFilePath.get(track.filePath);

				if (existingRow) {
					const nextCollectionIds = normalizeCollectionIds(
						existingRow.collectionIds,
						targetCollectionId,
					);
					if (
						!areCollectionIdsEqual(existingRow.collectionIds, nextCollectionIds)
					) {
						toUpdate.push({
							key: existingRow.id,
							changes: {
								collectionIds: nextCollectionIds,
							},
						});
					}
				} else {
					toAdd.push({
						...track,
						collectionIds: normalizeCollectionIds(
							track.collectionIds,
							targetCollectionId,
						),
					});
				}
			}

			const resultIds: string[] = [];

			if (toAdd.length > 0) {
				const addedIds = await db.tracks.bulkAdd(toAdd, { allKeys: true });
				const addedIdArray = Array.isArray(addedIds) ? addedIds : [addedIds];
				resultIds.push(...(addedIdArray as string[]));
			}

			if (toUpdate.length > 0) {
				await db.tracks.bulkUpdate(toUpdate);
			}
			return resultIds;
		});
	},

	async update(id: string, changes: unknown): Promise<number> {
		if (!isNonEmptyString(id)) {
			throw new Error("ID must be a non-empty string");
		}
		const validated = validateTrackChanges(changes, "changes");
		return db.transaction("rw", db.tracks, () =>
			applyGuardedTrackUpdate(db.tracks, id, validated),
		);
	},

	async updateMany(updates: unknown): Promise<number> {
		if (!Array.isArray(updates)) {
			throw new Error("Updates must be an array");
		}
		if (updates.length === 0) {
			return 0;
		}

		const seenIds = new Set<string>();
		const normalizedUpdates: {
			id: string;
			changes: TrackChanges;
		}[] = [];

		for (const [index, update] of updates.entries()) {
			const context = `updates[${index}]`;
			if (!isPlainObject(update)) {
				throw new Error(`${context} must be an object`);
			}
			if (!isNonEmptyString(update.id)) {
				throw new Error(`${context}.id must be a non-empty string`);
			}
			if (seenIds.has(update.id)) {
				throw new Error(`updates contains duplicate id: ${update.id}`);
			}
			seenIds.add(update.id);
			normalizedUpdates.push({
				id: update.id,
				changes: validateTrackChanges(update.changes, `${context}.changes`),
			});
		}

		let total = 0;
		await db.transaction("rw", db.tracks, async () => {
			for (const { id, changes } of normalizedUpdates) {
				total += await applyGuardedTrackUpdate(db.tracks, id, changes);
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
