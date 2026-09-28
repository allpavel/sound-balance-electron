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
import { pathToString } from "./pathToString";

describe("pathToString", () => {
	it("returns an empty string for an empty path (root-level issue)", () => {
		expect(pathToString([])).toBe("");
	});

	it("returns the segment as-is for a single-element path", () => {
		expect(pathToString(["id"])).toBe("id");
	});

	it("joins multiple string segments with dots", () => {
		expect(pathToString(["global", "concurrency"])).toBe("global.concurrency");
	});

	it("joins mixed string and number segments", () => {
		expect(pathToString(["tracks", 0, "status"])).toBe("tracks.0.status");
	});

	it("renders deeply nested array paths", () => {
		expect(pathToString(["common", "picture", 0, "data"])).toBe(
			"common.picture.0.data",
		);
	});

	it("renders symbol segments via Symbol.toString()", () => {
		const sym = Symbol("iterator");
		expect(pathToString([sym])).toBe("Symbol(iterator)");
	});

	it("renders mixed string, number, and symbol segments", () => {
		const sym = Symbol("custom");
		expect(pathToString(["fields", 2, sym])).toBe("fields.2.Symbol(custom)");
	});

	describe("control-character sanitization", () => {
		it("replaces null bytes in string segments with the replacement character", () => {
			expect(pathToString(["field\u0000name"])).toBe("field\uFFFDname");
		});

		it("replaces terminal escape sequences in string segments", () => {
			expect(pathToString(["field\u001B[2J"])).toBe("field\uFFFD[2J");
		});

		it("replaces DEL (U+007F) in string segments", () => {
			expect(pathToString(["field\u007Fname"])).toBe("field\uFFFDname");
		});

		it("does not modify clean segments (no allocation for safe input)", () => {
			expect(pathToString(["safe", "field", 0])).toBe("safe.field.0");
		});

		it("sanitizes only the affected segment in a multi-segment path", () => {
			expect(pathToString(["safe", "field\u0000x", 1])).toBe(
				"safe.field\uFFFDx.1",
			);
		});
	});
});
