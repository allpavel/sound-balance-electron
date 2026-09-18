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

import type { Issue, ValidationIssue } from "@shared/validators";

type Expected = readonly (string | number)[];

/**
 * Total, allocation-free structural equality for two issue paths.
 *
 * @internal
 */
function isPathEqual(actual: unknown, expected: Expected): boolean {
	if (!Array.isArray(actual)) return false;

	if (actual.length !== expected.length) return false;

	for (let i = 0; i < actual.length; i++) {
		if (actual[i] !== expected[i]) return false;
	}
	return true;
}

/**
 * Composable path predicate.
 *
 * @internal
 */
function matchesPath(expectedPath: Expected): (issue: Issue) => boolean {
	return (issue) => isPathEqual(issue.path, expectedPath);
}

/**
 * Checks whether any issue targets the exact given path.
 *
 * @remarks
 * Matching is exact and segment-wise: **segment order is significant**, `[]`
 * matches root-level issues, and no prefix/substring matching occurs —
 * `["global"]` never matches `["global", "concurrency"]`. The function is
 * issue-order agnostic (scans with `.some`) and version-safe because the
 * comparison is structural, not serialization-based.
 *
 * @param issues - Issues to inspect, typically `result.error?.issues ?? []`.
 * @param expectedPath - Exact path segments, e.g. `["global", "concurrency"]`.
 * @returns `true` if at least one issue's `path` structurally equals `expectedPath`.
 *
 * @example
 * ```ts
 * const result = schema.safeParse(input);
 * expect(hasIssueWithPath(result.error?.issues ?? [], ["global", "concurrency"])).toBe(true);
 * ```
 */
export const hasIssueWithPath = (
	issues: ReadonlyArray<Issue>,
	expectedPath: Expected,
): boolean => issues.some(matchesPath(expectedPath));

/**
 * Checks whether any single issue matches both the exact path and the code.
 *
 * @remarks
 * Both conditions must hold on the **same** issue; they are not evaluated
 * independently across the collection.
 *
 * @param issues - Issues to inspect, typically `result.error?.issues ?? []`.
 * @param expectedPath - Exact path segments to match.
 * @param expectedCode - Required issue code, e.g. `"custom"`.
 * @returns `true` if at least one issue satisfies both criteria.
 *
 * @example
 * ```ts
 * expect(
 *   hasIssueWithPathAndCode(
 *     result.error?.issues ?? [], ["global", "outputDirectoryPath"], "custom",
 *   ),
 * ).toBe(true);
 */
export function hasIssueWithPathAndCode(
	issues: ReadonlyArray<Issue>,
	expectedPath: readonly (string | number)[],
	expectedCode: string,
): boolean {
	const pathMatches = matchesPath(expectedPath);
	return (
		issues.find(
			(issue) => pathMatches(issue) && issue.code === expectedCode,
		) !== undefined
	);
}

/**
 * Checks whether any flattened issue matches the exact dot-notation path.
 *
 * @remarks
 * Matching is exact string equality — `"global"` will not match
 * `"global.concurrency"`. **Caveat:** dot-joined paths are lossy — a schema
 * key literally containing `.` (e.g. a record key `"a.b"`) is indistinguishable
 * from nesting `["a", "b"]` after flattening. Treat this helper as a
 * compatibility shim for the validator layer's output format; prefer
 * segment-based matching wherever possible.
 *
 * @param issues - Flattened issues to inspect.
 * @param expectedPath - Dot-notation path, e.g. `"global.concurrency"`.
 * @returns `true` if at least one issue's `path` equals `expectedPath`.
 *
 * @example
 * ```ts
 * expect(hasIssueWithDotPath(issues, "global.concurrency")).toBe(true);
 * ```
 */
export function hasIssueWithDotPath(
	issues: ReadonlyArray<ValidationIssue>,
	expectedPath: string,
): boolean {
	return issues.some((issue) => issue.path === expectedPath);
}
