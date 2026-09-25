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

import { CONTROL_CHAR_PATTERN } from "@shared/constants";

/**
 * Replaces control characters in a string with the Unicode replacement
 * character (U+FFFD). This is idempotent — sanitizing an already-clean
 * string is a no-op — so it is safe to call at multiple layers without
 * double-encoding.
 *
 * @param value - The string to sanitize.
 * @returns The sanitized string, or the original string if no control
 *          characters were found (avoids unnecessary allocation).
 */
export function sanitizeControlChars(value: string): string {
	if (!CONTROL_CHAR_PATTERN.test(value)) return value;
	CONTROL_CHAR_PATTERN.lastIndex = 0;
	return value.replace(CONTROL_CHAR_PATTERN, "\uFFFD");
}

/**
 * Converts a structured validation path (array of `PropertyKey` segments)
 * into a human-readable dot-notation string.
 *
 * Segment order is significant: `["common", "picture", 0, "data"]` becomes
 * `"common.picture.0.data"`. Root-level (empty path) returns `""`.
 *
 * @param path - Frozen array of path segments from a `ValidationIssue`.
 * @returns Dot-joined path string, or empty string for root-level issues.
 *
 * @example
 * ```ts
 * pathToString(["global", "concurrency"]) // → "global.concurrency"
 * pathToString(["tracks", 0, "status"])   // → "tracks.0.status"
 * pathToString([])                         // → ""
 * ```
 */
export function pathToString(path: readonly PropertyKey[]): string {
	if (path.length === 0) return "";

	let result = "";
	for (let i = 0; i < path.length; i++) {
		if (i > 0) result += ".";
		const segment = path[i];
		if (typeof segment === "symbol") {
			result += sanitizeControlChars(segment.toString());
		} else {
			result += sanitizeControlChars(String(segment));
		}
	}
	return result;
}
