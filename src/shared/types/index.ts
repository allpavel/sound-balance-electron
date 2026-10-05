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

/**
 * Represents an album artwork image stored in the dedicated `artworks` table.
 *
 * @property id          - UUID v7 primary key.
 * @property blob        - The binary image data (stored efficiently as a Blob).
 * @property format      - MIME type of the image (e.g., "image/jpeg").
 * @property description - Optional descriptive text.
 * @property name        - Optional filename or identifier.
 */
export type Artwork = {
	id: string;
	blob: Blob;
	format: string;
	description?: string;
	name?: string;
};

/**
 * Discriminated outcome of a batch track insertion.
 *
 * @property added   – Primary keys of tracks that were newly inserted.
 * @property merged  – Primary keys of pre-existing tracks whose `collectionIds`
 *                     were mutated to include the target collection.
 * @property skipped – Primary keys of pre-existing tracks that already belonged
 *                     to the target collection (no mutation performed).
 */
export type AddManyResult = {
	added: string[];
	merged: string[];
	skipped: string[];
};

/**
 * Cumulative progress snapshot emitted by `addMany` after each batch
 * completes.
 *
 * All counts are **cumulative** (not per-batch) so callers can render
 * ratios directly without aggregation.
 *
 * @property processed - Number of input tracks processed so far (across all batches).
 * @property total     - Total number of input tracks in the import.
 * @property added     - Cumulative count of newly inserted tracks.
 * @property merged    - Cumulative count of tracks whose `collectionIds` were updated.
 * @property skipped   - Cumulative count of tracks already in the target collection (no-op).
 */
export type AddManyProgress = {
	readonly processed: number;
	readonly total: number;
	readonly added: number;
	readonly merged: number;
	readonly skipped: number;
};

/**
 * Callback invoked after each batch in `addMany` completes.
 *
 * Callers can use this to update a progress bar, compute outcome ratios
 * (e.g., `added / total`), or log telemetry for large imports.
 */
export type AddManyProgressCallback = (progress: AddManyProgress) => void;

/**
 * Final outcome summary computed from an {@link AddManyResult}.
 *
 * Provides pre-computed ratios for observability dashboards and toast
 * notifications. Produced by the `getAddManySummary` helper.
 *
 * @property total       - Sum of added + merged + skipped.
 * @property added       - Count of newly inserted tracks.
 * @property merged      - Count of updated tracks.
 * @property skipped     - Count of no-op tracks.
 * @property addedRatio  - `added / total` (0–1), or 0 when total is 0.
 * @property mergedRatio - `merged / total` (0–1), or 0 when total is 0.
 * @property skippedRatio - `skipped / total` (0–1), or 0 when total is 0.
 */
export type AddManySummary = {
	readonly total: number;
	readonly added: number;
	readonly merged: number;
	readonly skipped: number;
	readonly addedRatio: number;
	readonly mergedRatio: number;
	readonly skippedRatio: number;
};
