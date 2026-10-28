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
import { pathToString } from "@shared/utils";
import type { Issue } from "@shared/validators";

type ParseSuccess<T> = { readonly success: true; readonly data: T };
type ParseFailure = {
	readonly success: false;
	readonly error: { readonly issues: ReadonlyArray<Issue> };
};
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/**
 * @internal
 * Renderer for RAW Zod
 */
function renderRawIssues(issues: ReadonlyArray<Issue>): string {
	return issues
		.map((issue) => {
			const message = issue.message ?? "Invalid input";
			const path = Array.isArray(issue.path) ? pathToString(issue.path) : "";
			return path.length > 0 ? `${path}: ${message}` : message;
		})
		.join("; ");
}

export function expectSuccess<T>(result: ParseResult<T>): T {
	if (result.success) return result.data;
	expect(
		result.error.issues,
		`safeParse unexpectedly failed: ${renderRawIssues(result.error.issues)}`,
	).toHaveLength(0);
	throw new Error("expected safeParse to succeed");
}

export function expectFailure(
	result: ParseResult<unknown>,
): ReadonlyArray<Issue> {
	expect(result.success).toBe(false);
	if (result.success) {
		throw new Error("expected safeParse to fail, but it succeeded");
	}
	return result.error.issues;
}
