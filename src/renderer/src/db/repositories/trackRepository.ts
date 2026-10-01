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

import { ANYOF_CHUNK_SIZE } from "@renderer/db/constants";
import { db } from "@renderer/db/db";
import {
	applyGuardedTrackUpdate,
	areCollectionIdsEqual,
	assertBatchUniqueness,
	assertReferentialIntegrity,
	assertTargetCollectionId,
	assertTrackInput,
	chunkArray,
	isNonEmptyString,
	isPlainObject,
	mapStorageWriteError,
	normalizeCollectionIds,
	uniqueTracks,
	validateTrackChanges,
} from "@renderer/db/utils/trackRepositoryUtils";
import { SYSTEM_COLLECTION_ID } from "@shared/constants";
import { TrackValidationError } from "@shared/errors";
import type { Metadata, TrackChanges } from "@shared/schemas/track.schema";
import type { AddManyResult } from "@shared/types";
import { createRootIssue } from "@shared/validators";

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

	/**
	 * Batch-inserts tracks, merging duplicates by `filePath` into the target
	 * collection.
	 *
	 * @param tracks – Array of track metadata objects to persist.
	 * @param options.targetCollectionId – Collection to assign (defaults to `"all"`).
	 * @returns A structured {@link AddManyResult} discriminating outcomes.
	 * @throws {TrackValidationError} On validation, uniqueness, or integrity failure.
	 * @throws {TrackValidationError} With code `"quota_exceeded"` on storage exhaustion.
	 */
	async addMany(
		tracks: Metadata[],
		{ targetCollectionId: rawId = SYSTEM_COLLECTION_ID } = {},
	): Promise<AddManyResult> {
		const targetCollectionId = assertTargetCollectionId(rawId);

		if (!Array.isArray(tracks)) {
			throw new TrackValidationError("tracks", [
				createRootIssue("invalid_type", "Tracks must be an array"),
			]);
		}
		if (tracks.length === 0) {
			return { added: [], merged: [], skipped: [] };
		}

		const parsedTracks: Metadata[] = [];

		for (const [index, track] of tracks.entries()) {
			const parsedTrack = assertTrackInput(track, index);
			parsedTracks.push(parsedTrack);
		}

		assertBatchUniqueness(
			parsedTracks,
			(t) => t.id,
			(i) => `tracks[${i}].id`,
			"duplicate_id",
			"id",
		);

		assertBatchUniqueness(
			parsedTracks,
			(t) => t.filePath,
			(i) => `tracks[${i}].filePath`,
			"duplicate_file_path",
			"filePath",
		);

		const referencedCollectionIds = new Set<string>();
		referencedCollectionIds.add(targetCollectionId);
		for (const track of parsedTracks) {
			if (Array.isArray(track.collectionIds)) {
				for (const cid of track.collectionIds) {
					if (isNonEmptyString(cid)) {
						referencedCollectionIds.add(cid);
					}
				}
			}
		}

		try {
			return await db.transaction(
				"rw",
				db.tracks,
				db.collections,
				async (): Promise<AddManyResult> => {
					if (referencedCollectionIds.size > 0) {
						await assertReferentialIntegrity(
							[...referencedCollectionIds],
							db.collections,
							"collectionIds",
						);
					}

					const filePaths = parsedTracks.map((t) => t.filePath);
					const filePathChunks = chunkArray(filePaths, ANYOF_CHUNK_SIZE);
					const existingByFilePath = new Map<string, Metadata>();

					for (const chunk of filePathChunks) {
						const rows = await db.tracks
							.where("filePath")
							.anyOf(chunk)
							.toArray();
						for (const row of rows) {
							if (isNonEmptyString(row.filePath)) {
								existingByFilePath.set(row.filePath, row);
							}
						}
					}

					const toAdd: Metadata[] = [];
					const toUpdate: { key: string; changes: Partial<Metadata> }[] = [];
					const mergedIds: string[] = [];
					const skippedIds: string[] = [];

					for (const track of parsedTracks) {
						const existingRow = existingByFilePath.get(track.filePath);

						if (existingRow) {
							const nextCollectionIds = normalizeCollectionIds(
								existingRow.collectionIds,
								targetCollectionId,
							);

							if (
								areCollectionIdsEqual(
									existingRow.collectionIds,
									nextCollectionIds,
								)
							) {
								skippedIds.push(existingRow.id);
							} else {
								toUpdate.push({
									key: existingRow.id,
									changes: { collectionIds: nextCollectionIds },
								});
								mergedIds.push(existingRow.id);
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
					const addedIds: string[] = [];

					if (toAdd.length > 0) {
						const rawKeys = await db.tracks.bulkAdd(toAdd, { allKeys: true });
						if (Array.isArray(rawKeys)) {
							for (const key of rawKeys) {
								if (typeof key === "string") {
									addedIds.push(key);
								}
							}
						}
					}
					if (toUpdate.length > 0) {
						await db.tracks.bulkUpdate(toUpdate);
					}
					return { added: addedIds, merged: mergedIds, skipped: skippedIds };
				},
			);
		} catch (error: unknown) {
			if (error instanceof TrackValidationError) {
				throw error;
			}
			mapStorageWriteError(error);
		}
	},

	async update(id: string, changes: unknown): Promise<number> {
		if (!isNonEmptyString(id)) {
			throw new TrackValidationError("id", [
				createRootIssue("invalid_type", "ID must be a non-empty string"),
			]);
		}
		const validated = validateTrackChanges(changes, "changes");
		if (!("status" in validated)) {
			return db.tracks.update(id, validated);
		}

		return db.transaction("rw", db.tracks, () =>
			applyGuardedTrackUpdate(db.tracks, id, validated),
		);
	},

	async updateMany(updates: unknown): Promise<number> {
		if (!Array.isArray(updates)) {
			throw new TrackValidationError("updates", [
				createRootIssue("invalid_type", "Updates must be an array"),
			]);
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
				throw new TrackValidationError(context, [
					createRootIssue("invalid_type", `${context} must be an object`),
				]);
			}
			if (!isNonEmptyString(update.id)) {
				throw new TrackValidationError(`${context}.id`, [
					createRootIssue(
						"invalid_type",
						`${context}.id must be a non-empty string`,
					),
				]);
			}
			if (seenIds.has(update.id)) {
				throw new TrackValidationError(`updates[${index}].id`, [
					createRootIssue(
						"duplicate_id",
						`Updates contains duplicate id: ${update.id}`,
					),
				]);
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
