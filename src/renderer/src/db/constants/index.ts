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

export const DATABASE_NAME = "AudioDB";
export const SYSTEM_COLLECTION_ID = "all";

/**
 * Maximum number of missing collection IDs to display in the error message.
 */
export const MAX_DISPLAY_MISSING = 5;

/**
 * IndexedDB store definitions per schema version.
 */
export const TRACKS_STORES_V1 = {
	tracks: "id, &filePath, *collectionIds, selected",
	settings: "id",
	collections: "id",
} as const;

export const TRACKS_STORES_V2 = {
	...TRACKS_STORES_V1,
	artworks: "id",
} as const;
