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

import type { ExistingTrackRef, TrackBatchDatabase } from "@renderer/db/types";
import {
	areCollectionIdsEqual,
	assertReferentialIntegrity,
	chunkArray,
	gatherReferencedCollectionIds,
	isNonEmptyString,
	normalizeCollectionIds,
} from "@renderer/db/utils/trackRepositoryUtils";
import { ANYOF_CHUNK_SIZE } from "@shared/constants";
import type { IngestionMetadata, Metadata } from "@shared/schemas/track.schema";
import type { AddManyResult, Artwork } from "@shared/types";
import type { EntityTable } from "dexie";
import { v7 as uuidV7 } from "uuid";

/**
 * Looks up existing tracks by `filePath` and projects each match to an
 * {@link ExistingTrackRef} (id + collectionIds). Single pass per chunk:
 * `anyOf(chunk).each(...)` hydrates rows transiently and retains only the
 * compact projection, so there is one request per chunk (not two) and no
 * full-row retention.
 *
 * Every `filePath` that reaches this function has been normalized by
 * {@link filePathSchema} at the schema boundary, so the `&filePath` index
 * and the input keys agree.
 *
 * @param filePaths   - Already-normalized filePaths to look up. Duplicates
 *                      are handled gracefully (the same row appears once).
 * @param tracksTable - The Dexie `EntityTable` for tracks.
 * @returns A map of `filePath → ExistingTrackRef`. Empty when `filePaths`
 *          is empty or no matches are found.
 */
async function fetchExistingTrackRefs(
	filePaths: readonly string[],
	tracksTable: EntityTable<Metadata, "id">,
): Promise<Map<string, ExistingTrackRef>> {
	const result = new Map<string, ExistingTrackRef>();

	if (filePaths.length === 0) {
		return result;
	}

	const chunks = chunkArray(filePaths, ANYOF_CHUNK_SIZE);

	for (const chunk of chunks) {
		await tracksTable
			.where("filePath")
			.anyOf(chunk)
			.each((row) => {
				if (isNonEmptyString(row.filePath)) {
					result.set(row.filePath, {
						id: row.id,
						collectionIds: row.collectionIds,
					});
				}
			});
	}

	return result;
}

/**
 * Processes a single batch of tracks within its own IndexedDB transaction.
 *
 * @param tracks             - Parsed, validated, normalized ingestion tracks.
 * @param targetCollectionId - The collection to assign to new/merged tracks.
 * @returns A partial {@link AddManyResult} for this batch.
 * @throws Re-throws domain errors; maps storage errors via
 *         {@link mapStorageWriteError}.
 */
async function processBatch(
	tracks: readonly IngestionMetadata[],
	targetCollectionId: string,
	db: TrackBatchDatabase,
): Promise<AddManyResult> {
	return db.transaction(
		"rw",
		db.tracks,
		db.artworks,
		db.collections,
		async (): Promise<AddManyResult> => {
			const batchCollectionIds = gatherReferencedCollectionIds(
				tracks,
				targetCollectionId,
			);
			await assertReferentialIntegrity(
				[...batchCollectionIds],
				db.collections,
				"tracks.batch.collectionIds",
			);

			const filePaths = tracks.map((t) => t.filePath);
			const existingByFilePath = await fetchExistingTrackRefs(
				filePaths,
				db.tracks,
			);

			const toAdd: Metadata[] = [];
			const toUpdate: { key: string; changes: Partial<Metadata> }[] = [];
			const mergedIds: string[] = [];
			const skippedIds: string[] = [];
			const artworksToSave: Artwork[] = [];

			for (const track of tracks) {
				const existingRow = existingByFilePath.get(track.filePath);

				if (existingRow) {
					const nextCollectionIds = normalizeCollectionIds(
						existingRow.collectionIds,
						targetCollectionId,
					);

					if (
						areCollectionIdsEqual(existingRow.collectionIds, nextCollectionIds)
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
					const pictureIds: string[] = [];
					if (track.common?.picture) {
						for (const pic of track.common.picture) {
							const blob: Blob =
								pic.data instanceof Uint8Array
									? new Blob([pic.data], { type: pic.format })
									: pic.data;
							const id = uuidV7();
							artworksToSave.push({
								id,
								blob,
								format: pic.format,
								description: pic.description,
								name: pic.name,
							});
							pictureIds.push(id);
						}
					}

					toAdd.push({
						...track,
						common: {
							...track.common,
							picture: pictureIds,
						},
						collectionIds: normalizeCollectionIds(
							track.collectionIds,
							targetCollectionId,
						),
					});
				}
			}

			if (artworksToSave.length > 0) {
				await db.artworks.bulkAdd(artworksToSave);
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
}

export { fetchExistingTrackRefs, processBatch };
