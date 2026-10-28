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

import { MAX_DISPLAY_MISSING } from "@renderer/db/constants";
import {
	isNonEmptyString,
	isPlainObject,
} from "@renderer/db/utils/trackRepositoryUtils";
import { STATUS_VALUES } from "@shared/constants";
import type { Metadata } from "@shared/schemas/track.schema";
import { sanitizeControlChars } from "@shared/utils";

/** O(1) status membership lookup. */
const STATUSES: ReadonlySet<string> = new Set(STATUS_VALUES);

/** Cap on a single quarantined id echoed into logs. */
const MAX_LOGGED_ID_LENGTH = 64;

/** Placeholder for corrupt rows whose `id` is itself unreadable. */
const NO_ID_PLACEHOLDER = "<no-id>";

/** Default log scope. */
const DEFAULT_SCOPE = "tracksRepository.read";

/**
 * Outcome of guarding a batch of raw rows.
 *
 * @property ok             - Rows that passed the structural guard,
 *                            deduplicated by `id` (last occurrence wins,
 *                            first-seen position kept).
 * @property quarantinedIds - Log-safe descriptors of every rejected row.
 *                            Complete list; only the *log* is capped at
 *                            {@link MAX_DISPLAY_MISSING} entries.
 */
export type GuardedTracks = {
	readonly ok: Metadata[];
	readonly quarantinedIds: readonly string[];
};

/**
 * Cheap structural type guard for a raw track row.
 *
 * Validates only top-level shape (fields consumers dereference directly).
 * Deep metadata conformance remains the responsibility of
 * `storedTrackSchema` at sweep/egress boundaries.
 *
 * @param row - Untrusted value read from IndexedDB.
 * @returns `true` when the row is safe to hand to UI/logic consumers.
 */
export function isStructurallyValidTrack(row: unknown): row is Metadata {
	if (!isPlainObject(row)) return false;
	if (!isNonEmptyString(row.id)) return false;
	if (!isNonEmptyString(row.file)) return false;
	if (!isNonEmptyString(row.filePath)) return false;
	if (typeof row.status !== "string" || !STATUSES.has(row.status)) {
		return false;
	}
	if (row.selected !== 0 && row.selected !== 1) return false;
	if (!Array.isArray(row.collectionIds)) return false;
	const collectionIds: readonly unknown[] = row.collectionIds;
	if (!collectionIds.every((cid) => typeof cid === "string")) return false;
	if (!isPlainObject(row.common)) return false;
	if (!isPlainObject(row.format)) return false;
	if (
		row.statusSeq !== undefined &&
		(typeof row.statusSeq !== "number" ||
			!Number.isInteger(row.statusSeq) ||
			row.statusSeq < 1)
	) {
		return false;
	}
	if (row.status === "failed" && typeof row.reason !== "string") return false;
	return true;
}

/**
 * Derives a log-safe descriptor for a quarantined row's id.
 *
 * @param row - The rejected row.
 * @returns A sanitized, bounded display id, or `"<no-id>"` when absent.
 */
function describeRowId(row: unknown): string {
	const rawId: unknown = isPlainObject(row) ? row.id : undefined;
	let display: string;
	if (typeof rawId === "string") {
		display = rawId.trim().length > 0 ? rawId : NO_ID_PLACEHOLDER;
	} else if (rawId === undefined || rawId === null) {
		display = NO_ID_PLACEHOLDER;
	} else {
		display = String(rawId);
	}
	return sanitizeControlChars(display).slice(0, MAX_LOGGED_ID_LENGTH);
}

/**
 * Emits the quarantine diagnostic once per guarded batch, only when
 * something was rejected.
 *
 * @param quarantinedIds - Descriptors of the rejected rows.
 * @param scope          - Repository operation tag for the log prefix.
 */
function warnQuarantined(
	quarantinedIds: readonly string[],
	scope: string,
): void {
	if (quarantinedIds.length === 0) return;
	// biome-ignore lint/suspicious/noConsole: Intentional read-path diagnostic; output is sanitized and count-capped.
	console.warn(`[${scope}] quarantined structurally invalid rows`, {
		count: quarantinedIds.length,
		ids: quarantinedIds.slice(0, MAX_DISPLAY_MISSING),
	});
}

/**
 * Partitions raw rows into guarded tracks and quarantined descriptors,
 * deduplicating valid rows by `id` in a single pass.
 *
 * Dedupe semantics: duplicate multi-entry-index matches fold to the last
 * occurrence at the first-seen position. Duplicates are an expected query
 * artifact, not corruption, so they are folded silently.
 *
 * Complexity: O(n) time, single loop, one `Map`.
 *
 * @param rows  - Untrusted rows exactly as the engine returned them.
 * @param scope - Repository operation tag used in the quarantine warning.
 * @returns Valid, deduplicated tracks plus the full quarantined-id list.
 */
export function guardTracks(
	rows: readonly unknown[],
	scope: string = DEFAULT_SCOPE,
): GuardedTracks {
	const byId = new Map<string, Metadata>();
	const quarantinedIds: string[] = [];
	for (const row of rows) {
		if (isStructurallyValidTrack(row)) {
			byId.set(row.id, row);
		} else {
			quarantinedIds.push(describeRowId(row));
		}
	}
	warnQuarantined(quarantinedIds, scope);
	return { ok: [...byId.values()], quarantinedIds };
}

/**
 * Single-row variant of {@link guardTracks} for primary-key reads.
 *
 * A missing row is a normal miss (silent `undefined`); a present but
 * corrupt row is quarantined with a warning naming the requested key,
 * then reported as `undefined`.
 *
 * @param row   - Untrusted row (or `undefined` when the key is absent).
 * @param id    - The requested primary key, used in the diagnostic.
 * @param scope - Repository operation tag used in the quarantine warning.
 * @returns The guarded row, or `undefined` when absent or quarantined.
 */
export function guardTrack(
	row: unknown,
	id: string,
	scope: string = DEFAULT_SCOPE,
): Metadata | undefined {
	if (row === undefined) return undefined;
	if (isStructurallyValidTrack(row)) return row;
	warnQuarantined(
		[sanitizeControlChars(id).slice(0, MAX_LOGGED_ID_LENGTH)],
		scope,
	);
	return undefined;
}
