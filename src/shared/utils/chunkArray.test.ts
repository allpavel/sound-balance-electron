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

import { chunkArray } from "./chunkArray";

describe("chunkArray", () => {
	it("returns [] for empty input", () => {
		expect(chunkArray([], 5)).toEqual([]);
	});

	it("partitions an exact multiple into equal chunks", () => {
		expect(chunkArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toEqual([
			[1, 2, 3, 4, 5],
			[6, 7, 8, 9, 10],
		]);
	});

	it("handles a remainder (last chunk is smaller)", () => {
		expect(chunkArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 5)).toEqual([
			[1, 2, 3, 4, 5],
			[6, 7, 8, 9, 10],
			[11],
		]);
	});

	it("size 1 → N chunks of 1", () => {
		expect(chunkArray(["a", "b", "c"], 1)).toEqual([["a"], ["b"], ["c"]]);
	});

	it("does not mutate the input", () => {
		const input = [1, 2, 3];
		chunkArray(input, 2);
		expect(input).toEqual([1, 2, 3]);
	});

	it.each([
		["NaN", Number.NaN],
		["Infinity", Number.POSITIVE_INFINITY],
		["fractional", 1.5],
		["zero", 0],
		["negative", -5],
		['string "3"', "3"],
	])("throws RangeError for size = %s", (_label, size) => {
		// @ts-expect-error deliberate: feeding a runtime-hostile value through
		// the number-typed `size` parameter to verify the runtime guard.
		expect(() => chunkArray([1, 2, 3], size)).toThrow(RangeError);
	});
});
