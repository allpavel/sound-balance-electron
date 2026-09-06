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
import { deepMerge } from "./deepMerge";

describe("deepMerge", () => {
	describe("immutability and reference handling", () => {
		it("returns a new root object and does not mutate inputs", () => {
			const base = { a: 1, nested: { b: 2 } };
			const overrides = { nested: { c: 3 } };
			const baseSnapshot = JSON.parse(JSON.stringify(base));
			const overridesSnapshot = JSON.parse(JSON.stringify(overrides));
			const result = deepMerge(base, overrides);
			expect(result).not.toBe(base);
			expect(base).toEqual(baseSnapshot);
			expect(overrides).toEqual(overridesSnapshot);
		});

		it("creates new references for merged branches but shares references for untouched nested branches", () => {
			const base = { touched: { a: 1 }, untouched: { b: 2 } };
			const overrides = { touched: { a: 2 } };
			const result = deepMerge(base, overrides);
			expect(result.touched).not.toBe(base.touched);
			expect(result.untouched).toBe(base.untouched);
		});
	});

	describe("shallow merging and type-based overwriting", () => {
		it("preserves base keys not present in overrides and adds new override keys", () => {
			expect(deepMerge({ a: 1, b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
		});

		it("overwrites base primitives and null/undefined values", () => {
			const base = { str: "old", num: 1, bool: false, nil: null };
			const overrides = { str: "new", num: 2, bool: true, nil: undefined };
			expect(deepMerge(base, overrides)).toEqual({
				str: "new",
				num: 2,
				bool: true,
				nil: undefined,
			});
		});

		it("replaces arrays entirely instead of merging by index or concatenating", () => {
			const base = { tags: ["a", "b"], nested: { ids: [1, 2] } };
			const overrides = { tags: ["c"], nested: { ids: [3] } };
			expect(deepMerge(base, overrides)).toEqual({
				tags: ["c"],
				nested: { ids: [3] },
			});
		});

		it("overwrites objects with arrays and arrays with objects", () => {
			expect(deepMerge({ a: { x: 1 } }, { a: [1, 2] })).toEqual({ a: [1, 2] });
			expect(deepMerge({ a: [1, 2] }, { a: { x: 1 } })).toEqual({
				a: { x: 1 },
			});
		});
	});

	describe("recursive deep merging", () => {
		it("merges nested plain objects recursively across multiple levels", () => {
			const base = {
				user: {
					name: "Alice",
					settings: { theme: "dark", notifications: true },
				},
			};
			const overrides = {
				user: { settings: { theme: "light" }, age: 30 },
			};
			expect(deepMerge(base, overrides)).toEqual({
				user: {
					name: "Alice",
					age: 30,
					settings: { theme: "light", notifications: true },
				},
			});
		});

		it("overwrites a nested object when the override provides a primitive", () => {
			expect(
				deepMerge({ config: { retries: 3 } }, { config: "disabled" }),
			).toEqual({
				config: "disabled",
			});
		});

		it("overwrites a nested primitive when the override provides an object", () => {
			expect(
				deepMerge({ config: "disabled" }, { config: { retries: 3 } }),
			).toEqual({
				config: { retries: 3 },
			});
		});
	});

	describe("edge cases", () => {
		it("returns a shallow clone of base when overrides is empty", () => {
			const base = { a: 1, nested: { b: 2 } };
			const result = deepMerge(base, {});
			expect(result).toEqual(base);
			expect(result).not.toBe(base);
		});

		it("returns a shallow clone of overrides when base is empty", () => {
			const overrides = { a: 1, nested: { b: 2 } };
			const result = deepMerge({}, overrides);
			expect(result).toEqual(overrides);
		});
	});
});
