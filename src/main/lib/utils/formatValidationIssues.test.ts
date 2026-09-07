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
import { formatValidationIssues } from "./formatValidationIssues";

describe("formatValidationIssues", () => {
	it("returns an empty string for an empty issue list", () => {
		expect(formatValidationIssues([])).toBe("");
	});

	it.each([
		[
			"a standard path and message",
			{ path: "global.concurrency", message: "Too small" },
			"global.concurrency: Too small",
		],
		[
			"an empty path (root-level issue)",
			{ path: "", message: "Invalid root payload" },
			": Invalid root payload",
		],
		[
			"an empty message",
			{ path: "audio.audioCodec", message: "" },
			"audio.audioCodec: ",
		],
	])("formats %s as 'path: message'", (_name, issue, expected) => {
		expect(formatValidationIssues([issue])).toBe(expected);
	});

	it("joins multiple issues with '; ' and preserves input order", () => {
		const issues = [
			{ path: "version", message: "Invalid" },
			{ path: "global.outputDirectoryPath", message: "Required" },
			{ path: "audio.audioCodec", message: "Unrecognized" },
		];
		expect(formatValidationIssues(issues)).toBe(
			"version: Invalid; global.outputDirectoryPath: Required; audio.audioCodec: Unrecognized",
		);
	});

	it("uses only path and message, ignoring additional ValidationIssue fields", () => {
		const issue: ValidationIssue = {
			path: "settings.global.concurrency",
			message: "Number must be greater than or equal to 1",
			code: "too_small",
		};
		expect(formatValidationIssues([issue])).toBe(
			"settings.global.concurrency: Number must be greater than or equal to 1",
		);
	});
});
