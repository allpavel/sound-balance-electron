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

import type { ExistingTrackRef } from "@renderer/db/types";
import {
	areCollectionIdsEqual,
	normalizeCollectionIds,
} from "@renderer/db/utils/trackRepositoryUtils";
import type { IngestionMetadata, Metadata } from "@shared/schemas/track.schema";
import type { Artwork } from "@shared/types";
import { v7 as uuidV7 } from "uuid";

/**
 * The result of classifying a batch of tracks into add/merge/skip decisions
 * plus the artwork blobs to persist. Produced by {@link classifyTracks}.
 *
 * The plan holds **references** to the input tracks (spread for `toAdd`
 * to override `common.picture` with UUID refs), not deep copies.
 */
export interface ClassificationPlan {
	/** New tracks to `bulkAdd`, with artwork replaced by UUID refs. */
	readonly toAdd: readonly Metadata[];
	/** Existing tracks to `bulkUpdate` (collection-merge). */
	readonly toUpdate: readonly { key: string; changes: Partial<Metadata> }[];
	/** IDs of tracks whose `collectionIds` changed (the `merged` lane). */
	readonly mergedIds: readonly string[];
	/** IDs of tracks already in the target collection (the `skipped` lane). */
	readonly skippedIds: readonly string[];
	/** Artwork blobs extracted from new tracks (persisted separately). */
	readonly artworksToSave: readonly Artwork[];
}

/**
 * Classifies tracks into add/merge/skip decisions and extracts artwork.
 *
 * Decision table:
 * - Existing row, `collectionIds` already match → **skip** (no mutation).
 * - Existing row, `collectionIds` differ → **merge** (update collectionIds).
 * - No existing row → **add** (new track with normalized collectionIds +
 *   artwork extracted into `Artwork` entries with UUID refs).
 *
 * Artwork is extracted ONLY for new tracks (not for merged/skipped) —
 * this is the orphan-artwork regression guard.
 *
 * @param tracks             - Parsed, validated ingestion tracks.
 * @param existingByFilePath - Existing rows keyed by normalized filePath.
 * @param targetCollectionId - The collection to assign to new/merged tracks.
 * @returns The classification plan.
 */
export function classifyTracks(
	tracks: readonly IngestionMetadata[],
	existingByFilePath: ReadonlyMap<string, ExistingTrackRef>,
	targetCollectionId: string,
): ClassificationPlan {
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

			if (areCollectionIdsEqual(existingRow.collectionIds, nextCollectionIds)) {
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

	return { toAdd, toUpdate, mergedIds, skippedIds, artworksToSave };
}
