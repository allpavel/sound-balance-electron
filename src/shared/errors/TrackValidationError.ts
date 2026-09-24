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

import { formatValidationIssues } from "@shared/utils/formatValidationIssues";
import type { ValidationIssue } from "@shared/validators";

/**
 * Structured validation error carrying the full set of schema-authored issues.
 *
 * @example
 * ```ts
 * try {
 *   assertTrackInput(rawTrack, 0);
 * } catch (err) {
 *   if (err instanceof TrackValidationError) {
 *     for (const issue of err.issues) {
 *       console.warn(issue.pathString, issue.message);
 *     }
 *   }
 * }
 * ```
 */
export class TrackValidationError extends Error {
	/**
	 * Human-readable location prefix, e.g. `"tracks[3]"` or `"changes"`.
	 */
	readonly context: string;
	/**
	 * Complete, frozen list of validation issues.
	 */
	readonly issues: readonly ValidationIssue[];

	/**
	 * @param context - Location prefix for the error (e.g. `"tracks[0]"`).
	 * @param issues  - Structured issues from `safeParseTrack` / `safeParseTrackChanges`.
	 */
	constructor(context: string, issues: readonly ValidationIssue[]) {
		super(`${context}: ${formatValidationIssues(issues)}`);
		this.name = "TrackValidationError";
		this.context = context;
		this.issues = issues;
	}
}
