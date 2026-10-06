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

import type { IngestionMetadata, Metadata } from "@shared/schemas/track.schema";
import type { AddManyProgressCallback, Artwork } from "@shared/types";
import type Dexie from "dexie";
import type { EntityTable } from "dexie";

/**
 * Structural type representing the minimal database shape required by
 * {@link processBatch} to execute a transactional batch write.
 */
export type TrackBatchDatabase = Pick<Dexie, "transaction"> & {
	readonly tracks: EntityTable<Metadata, "id">;
	readonly artworks: EntityTable<Artwork, "id">;
};

/**
 * Options for {@link tracksRepository.addMany}.
 *
 * @property targetCollectionId - Collection to assign (defaults to `"all"`).
 * @property onProgress        - Optional callback invoked after each batch
 *                               completes, receiving cumulative outcome counts
 *                               (PERF-4). The callback is synchronous and
 *                               should not perform heavy work.
 * @property batchSize          - Maximum tracks per transaction (PERF-3).
 *                               Defaults to {@link IMPORT_BATCH_SIZE} (500).
 *                               Each batch runs in its own IndexedDB
 *                               transaction to keep lock duration bounded.
 */
export type AddManyOptions = {
	readonly targetCollectionId?: string;
	readonly onProgress?: AddManyProgressCallback;
	readonly batchSize?: number;
};

/**
 * Outcome of first-wins deduplication of ingestion tracks by normalized
 * `filePath`.
 */
export type FilePathDedupeResult = {
	/** First-occurrence tracks in input order; subsequent case-variant
	 *  or exact duplicates are folded out of this list. */
	readonly unique: readonly IngestionMetadata[];
	/** IDs of the folded (duplicate) tracks, reported via the `skipped`
	 *  lane of {@link AddManyResult}. */
	readonly skipped: readonly string[];
};
