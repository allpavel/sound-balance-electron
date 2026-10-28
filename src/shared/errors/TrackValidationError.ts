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
 * Structured validation error carrying the full set of schema-authored
 * or synthetic issues.
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
	 * Indicates where in the payload the validation failure occurred.
	 */
	readonly context: string;
	/**
	 * Complete, frozen list of validation issues. Callers cannot mutate the
	 * array or its elements after construction.
	 */
	readonly issues: readonly ValidationIssue[];

	/**
	 * Constructs a `TrackValidationError` with a defensive copy of the
	 * issues list.
	 *
	 * @param context - Location prefix for the error (e.g. `"tracks[0]"`).
	 * @param issues  - Structured issues from `safeParseTrack` /
	 * `safeParseTrackChanges`, or a synthetic root issue  created
	 *  via {@link createRootIssue} for precondition failures that
	 *  do not originate from Zod schema validation.
	 */
	constructor(context: string, issues: readonly ValidationIssue[]) {
		const formatted = formatValidationIssues(issues);
		super(formatted.length === 0 ? context : `${context}: ${formatted}`);

		// Restore prototype chain for `instanceof` reliability
		// under down-leveled transpilation (ES5/Babel/SWC).
		Object.setPrototypeOf(this, TrackValidationError.prototype);
		this.name = "TrackValidationError";
		this.context = context;

		// The caller retains a reference to the source array and could
		// mutate it after the throw, retroactively altering this error's
		// payload. This spread copy breaks that reference alias and the
		// freeze makes any downstream mutation attempt a silent no-op
		// (or a hard throw in strict mode).
		this.issues = Object.freeze([...issues]);
	}

	/**
	 * Returns a sanitized plain-object representation suitable for IPC
	 * serialization or logging surfaces.
	 *
	 * The `stack` property and other `Error` internals are intentionally
	 * omitted to prevent leaking internal file paths across boundaries.
	 *
	 * @returns A plain object with `name`, `context`, and `issues`.
	 */
	toJSON(): {
		name: string;
		context: string;
		issues: readonly ValidationIssue[];
	} {
		return {
			name: this.name,
			context: this.context,
			issues: this.issues,
		};
	}
}
