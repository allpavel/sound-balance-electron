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

import { isNonEmptyString, isPlainObject } from "./typeGuards";

describe("typeGuards", () => {
	describe("isNonEmptyString", () => {
		it.each([
			["a non-empty string", "hello", true],
			["a string with inner whitespace", "a b", true],
			["an empty string", "", false],
			["a whitespace-only string", "   ", false],
			["a tab/newline string", "\t\n", false],
			["null", null, false],
			["undefined", undefined, false],
			["a number", 42, false],
			["a boolean", true, false],
			["an array", ["a"], false],
			["an object", { a: 1 }, false],
		])("returns %s for %s", (_label, value, expected) => {
			expect(isNonEmptyString(value)).toBe(expected);
		});
	});

	describe("isPlainObject", () => {
		it.each([
			["an empty object", {}, true],
			["an object with properties", { id: "t1" }, true],
			["null", null, false],
			["undefined", undefined, false],
			["an empty array", [], false],
			["a non-empty array", [1, 2], false],
			["a string", "hello", false],
			["a number", 42, false],
			["a boolean", true, false],
			["a function", () => {}, false],
		])("returns %s for %s", (_label, value, expected) => {
			expect(isPlainObject(value)).toBe(expected);
		});
	});
});
