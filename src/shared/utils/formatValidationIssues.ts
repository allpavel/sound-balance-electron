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

import type { ValidationIssue } from "@shared/validators";

/**
 * Formats a list of structured validation issues into a single
 * human-readable string suitable for error messages and logs.
 *
 * @param issues - Frozen validation issues produced by `mapZodIssues`.
 * @returns Semicolon-delimited `path: message` pairs, or bare messages
 *          for root-level issues (empty path).
 *
 * @example
 * formatValidationIssues([
 *   { path: ["id"], pathString: "id", message: "Must not be empty", code: "too_small" },
 * ]) // → "id: Must not be empty"
 */
export function formatValidationIssues(
	issues: readonly ValidationIssue[],
): string {
	return issues
		.map((i) => (i.pathString ? `${i.pathString}: ${i.message}` : i.message))
		.join("; ");
}
