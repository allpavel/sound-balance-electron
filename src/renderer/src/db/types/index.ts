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
import type { AddManyProgress, Artwork } from "@shared/types";
import type Dexie from "dexie";
import type { EntityTable } from "dexie";
import type { CollectionType } from "@/types";

/**
 * Structural type representing the minimal database shape required by
 * {@link processBatch} to execute a transactional batch write.
 */
export type TrackBatchDatabase = Pick<Dexie, "transaction"> & {
	readonly tracks: EntityTable<Metadata, "id">;
	readonly artworks: EntityTable<Artwork, "id">;
	readonly collections: EntityTable<CollectionType, "id">; // [F-05]
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

/**
 * A failure-isolated progress emitter for `addMany` observers.
 *
 * Produced by {@link createProgressEmitter}; consumed by `addMany`, which
 * calls {@link ProgressEmitter.emit} after each batch and
 * {@link ProgressEmitter.flush} exactly once from a `finally` block (so the
 * terminal summary is emitted on both the success and the abort path).
 */
export type ProgressEmitter = {
	/**
	 * Delivers a cumulative snapshot to the wrapped callback. A throwing
	 * callback is caught, counted, and reported per the log-once policy;
	 * `emit` never propagates observer failures into the import loop.
	 */
	readonly emit: (progress: AddManyProgress) => void;
	/**
	 * Logs the terminal summary of suppressed callback failures, if any.
	 * Must be invoked exactly once when the import loop finishes or aborts.
	 */
	readonly flush: () => void;
};
