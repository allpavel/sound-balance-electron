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
import { makeIssue } from "@tests/factories";
import { TrackValidationError } from "./TrackValidationError";

describe("TrackValidationError", () => {
	describe("constructor — immutability and defense in depth", () => {
		it("defensively copies the issues array so caller mutations do not retroactively alter the error", () => {
			const source = [makeIssue("id", "Must not be empty")];
			const err = new TrackValidationError("tracks[0]", source);
			source.push(makeIssue("file", "Must not be empty"));
			source.length = 0;
			expect(err.issues).toHaveLength(1);
			expect(err.issues[0]?.pathString).toBe("id");
		});

		it("freezes the issues array so downstream mutation attempts are no-ops", () => {
			const err = new TrackValidationError("ctx", [
				makeIssue("id", "Must not be empty"),
			]);
			expect(Object.isFrozen(err.issues)).toBe(true);
		});

		it("freezes each issue's path array (already frozen by mapZodIssues, verified here)", () => {
			const err = new TrackValidationError("ctx", [
				makeIssue("common.picture.0.data", "Too large"),
			]);
			for (const issue of err.issues) {
				expect(Object.isFrozen(issue.path)).toBe(true);
			}
		});
	});

	describe("constructor — prototype chain and instanceof", () => {
		it("is a TrackValidationError (instanceof works across module boundaries)", () => {
			const err = new TrackValidationError("ctx", [
				makeIssue("id", "Must not be empty"),
			]);
			expect(err).toBeInstanceOf(TrackValidationError);
			expect(err).toBeInstanceOf(Error);
		});

		it("sets the correct name property", () => {
			const err = new TrackValidationError("ctx", [
				makeIssue("id", "Must not be empty"),
			]);
			expect(err.name).toBe("TrackValidationError");
		});
	});

	describe("constructor — message formatting", () => {
		it("produces 'context: formatted_issues' when issues are present", () => {
			const issues = [
				makeIssue("id", "Must not be empty"),
				makeIssue("file", "Must not be empty"),
			];
			const err = new TrackValidationError("tracks[0]", issues);
			expect(err.message).toBe(`tracks[0]: ${formatValidationIssues(issues)}`);
		});

		it("produces bare context without trailing ': ' when issues list is empty", () => {
			const err = new TrackValidationError("ctx", []);
			expect(err.message).toBe("ctx");
			expect(err.message).not.toContain(": ");
		});
	});

	describe("toJSON — IPC sanitization", () => {
		it("returns a plain object with name, context, and issues", () => {
			const issues = [makeIssue("id", "Must not be empty")];
			const err = new TrackValidationError("tracks[0]", issues);
			const json = err.toJSON();

			expect(json).toEqual({
				name: "TrackValidationError",
				context: "tracks[0]",
				issues,
			});
		});

		it("does not include stack or other Error internals", () => {
			const err = new TrackValidationError("ctx", [
				makeIssue("id", "Must not be empty"),
			]);
			const json = err.toJSON();
			expect(json).not.toHaveProperty("stack");
			expect(json).not.toHaveProperty("captureStackTrace");
		});
	});

	describe("context and issues fields", () => {
		it("exposes the context as a readonly property", () => {
			const err = new TrackValidationError("tracks[7]", [
				makeIssue("id", "Must not be empty"),
			]);
			expect(err.context).toBe("tracks[7]");
		});

		it("preserves the full issue list in the original order", () => {
			const issues = [
				makeIssue("id", "Must not be empty"),
				makeIssue("file", "Must not be empty"),
				makeIssue("filePath", "Must not be empty"),
			];
			const err = new TrackValidationError("tracks[0]", issues);
			expect(err.issues.map((i) => i.pathString)).toEqual([
				"id",
				"file",
				"filePath",
			]);
		});
	});
});
