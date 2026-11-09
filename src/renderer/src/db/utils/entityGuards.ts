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

import { warnQuarantined } from "@renderer/db/utils/readGuard";
import { isNonEmptyString, isPlainObject } from "@renderer/db/utils/typeGuards";
import type { Artwork } from "@shared/types";
import type { CollectionType } from "@/types";

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/** Default scope tag for collection guard diagnostics. */
const DEFAULT_COLLECTION_SCOPE = "collectionsRepository.read";

/**
 * Outcome of guarding a batch of raw collection rows.
 *
 * @property ok             - Rows that passed the structural guard.
 * @property quarantinedIds - Log-safe descriptors of every rejected row.
 */
export type GuardedCollections = {
	readonly ok: CollectionType[];
	readonly quarantinedIds: readonly string[];
};

/**
 * Cheap structural type guard for a raw collection row.
 *
 * Validates the two fields every consumer dereferences: `id` and
 * `title`. Deep constraints (length caps, null-byte hygiene) remain
 * the schema's responsibility at the write boundary.
 *
 * @param row - Untrusted value read from IndexedDB.
 * @returns `true` when the row is safe to hand to UI/logic consumers.
 */
export function isStructurallyValidCollection(
	row: unknown,
): row is CollectionType {
	if (!isPlainObject(row)) return false;
	if (!isNonEmptyString(row.id)) return false;
	if (!isNonEmptyString(row.title)) return false;
	return true;
}

/**
 * Derives a log-safe descriptor for a quarantined collection row's id.
 * Mirrors the track guard's `describeRowId` pattern.
 *
 * @param row - The rejected row.
 * @returns A sanitized, bounded display id, or `"<no-id>"` when absent.
 */
function describeCollectionRowId(row: unknown): string {
	const rawId: unknown = isPlainObject(row) ? row.id : undefined;
	let display: string;
	if (typeof rawId === "string") {
		display = rawId.trim().length > 0 ? rawId : "<no-id>";
	} else if (rawId === undefined || rawId === null) {
		display = "<no-id>";
	} else {
		display = String(rawId);
	}
	return display.slice(0, 64);
}

/**
 * Partitions raw collection rows into guarded results and quarantined
 * descriptors.
 *
 * @param rows  - Untrusted rows exactly as the engine returned them.
 * @param scope - Operation tag for the quarantine warning.
 * @returns Valid collections plus the full quarantined-id list.
 */
export function guardCollections(
	rows: readonly unknown[],
	scope: string = DEFAULT_COLLECTION_SCOPE,
): GuardedCollections {
	const ok: CollectionType[] = [];
	const quarantinedIds: string[] = [];
	for (const row of rows) {
		if (isStructurallyValidCollection(row)) {
			ok.push(row);
		} else {
			quarantinedIds.push(describeCollectionRowId(row));
		}
	}
	warnQuarantined(quarantinedIds, scope);
	return { ok, quarantinedIds };
}

/**
 * Single-row variant of {@link guardCollections} for primary-key reads.
 *
 * @param row   - Untrusted row (or `undefined` when the key is absent).
 * @param id    - The requested primary key, used in the diagnostic.
 * @param scope - Operation tag for the quarantine warning.
 * @returns The guarded collection, or `undefined` when absent or quarantined.
 */
export function guardCollection(
	row: unknown,
	id: string,
	scope: string = DEFAULT_COLLECTION_SCOPE,
): CollectionType | undefined {
	if (row === undefined) return undefined;
	if (isStructurallyValidCollection(row)) return row;
	warnQuarantined([id.slice(0, 64)], scope);
	return undefined;
}

// ---------------------------------------------------------------------------
// Artworks
// ---------------------------------------------------------------------------

/** Default scope tag for artwork guard diagnostics. */
const DEFAULT_ARTWORK_SCOPE = "artworksRepository.read";

/**
 * Outcome of guarding a batch of raw artwork rows.
 *
 * @property ok             - Rows that passed the structural guard.
 * @property quarantinedIds - Log-safe descriptors of every rejected row.
 */
export type GuardedArtworks = {
	readonly ok: Artwork[];
	readonly quarantinedIds: readonly string[];
};

/**
 * Cheap structural type guard for a raw artwork row.
 *
 * Validates the fields every consumer dereferences: `id`, `blob`, and
 * `format`. Optional fields (`description`, `name`) are checked for
 * type correctness only when present.
 *
 * @param row - Untrusted value read from IndexedDB.
 * @returns `true` when the row is safe to hand to UI/logic consumers.
 */
export function isStructurallyValidArtwork(row: unknown): row is Artwork {
	if (!isPlainObject(row)) return false;
	if (!isNonEmptyString(row.id)) return false;
	if (!(row.blob instanceof Blob)) return false;
	if (!isNonEmptyString(row.format)) return false;
	if (row.description !== undefined && typeof row.description !== "string") {
		return false;
	}
	if (row.name !== undefined && typeof row.name !== "string") {
		return false;
	}
	return true;
}

/**
 * Derives a log-safe descriptor for a quarantined artwork row's id.
 *
 * @param row - The rejected row.
 * @returns A sanitized, bounded display id, or `"<no-id>"` when absent.
 */
function describeArtworkRowId(row: unknown): string {
	const rawId: unknown = isPlainObject(row) ? row.id : undefined;
	let display: string;
	if (typeof rawId === "string") {
		display = rawId.trim().length > 0 ? rawId : "<no-id>";
	} else if (rawId === undefined || rawId === null) {
		display = "<no-id>";
	} else {
		display = String(rawId);
	}
	return display.slice(0, 64);
}

/**
 * Partitions raw artwork rows into guarded results and quarantined
 * descriptors.
 *
 * @param rows  - Untrusted rows exactly as the engine returned them.
 * @param scope - Operation tag for the quarantine warning.
 * @returns Valid artworks plus the full quarantined-id list.
 */
export function guardArtworks(
	rows: readonly unknown[],
	scope: string = DEFAULT_ARTWORK_SCOPE,
): GuardedArtworks {
	const ok: Artwork[] = [];
	const quarantinedIds: string[] = [];
	for (const row of rows) {
		if (row === undefined) continue;
		if (isStructurallyValidArtwork(row)) {
			ok.push(row);
		} else {
			quarantinedIds.push(describeArtworkRowId(row));
		}
	}
	warnQuarantined(quarantinedIds, scope);
	return { ok, quarantinedIds };
}

/**
 * Single-row variant of {@link guardArtworks} for primary-key reads.
 *
 * @param row   - Untrusted row (or `undefined` when the key is absent).
 * @param id    - The requested primary key, used in the diagnostic.
 * @param scope - Operation tag for the quarantine warning.
 * @returns The guarded artwork, or `undefined` when absent or quarantined.
 */
export function guardArtwork(
	row: unknown,
	id: string,
	scope: string = DEFAULT_ARTWORK_SCOPE,
): Artwork | undefined {
	if (row === undefined) return undefined;
	if (isStructurallyValidArtwork(row)) return row;
	warnQuarantined([id.slice(0, 64)], scope);
	return undefined;
}
