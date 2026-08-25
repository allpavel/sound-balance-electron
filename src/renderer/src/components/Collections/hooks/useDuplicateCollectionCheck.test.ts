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

// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import type { CollectionType } from "@/types";
import { useDuplicateCollectionCheck } from "./useDuplicateCollectionCheck";

const createMockCollections = (): CollectionType[] => [
	{ id: "c1", title: "Rock" },
	{ id: "c2", title: "Pop" },
	{ id: "c3", title: "Jazz" },
	{ id: "c4", title: "  Classical  " },
	{ id: "c5", title: "Élément" },
];

describe("useDuplicateCollectionCheck", () => {
	let mockCollections: CollectionType[];

	beforeEach(() => {
		mockCollections = createMockCollections();
	});

	it("returns false when collections array is empty", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("Rock", []),
		);
		expect(result.current).toBe(false);
	});

	it.each([
		["undefined", undefined],
		["null", null],
		["empty string", ""],
		["whitespace-only string", "   "],
	])("returns false when title is %s", (_desc, title) => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck(title, mockCollections),
		);
		expect(result.current).toBe(false);
	});

	it("returns true for an exact match", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("Rock", mockCollections),
		);
		expect(result.current).toBe(true);
	});

	it("returns true for a case-insensitive match", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("rOcK", mockCollections),
		);
		expect(result.current).toBe(true);
	});

	it("returns true when title has leading or trailing whitespace", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("  Rock  ", mockCollections),
		);
		expect(result.current).toBe(true);
	});

	it("returns true when the existing collection title has leading or trailing whitespace", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("Classical", mockCollections),
		);
		expect(result.current).toBe(true);
	});

	it("returns true for a case-insensitive match with Unicode characters", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("élément", mockCollections),
		);
		expect(result.current).toBe(true);
	});

	it("returns false when the title does not match any collection", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("Metal", mockCollections),
		);
		expect(result.current).toBe(false);
	});

	it("returns false when the matching collection is excluded by ID", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("Rock", mockCollections, "c1"),
		);
		expect(result.current).toBe(false);
	});

	it("returns true when a match exists but a different collection is excluded by ID", () => {
		const { result } = renderHook(() =>
			useDuplicateCollectionCheck("Rock", mockCollections, "c2"),
		);
		expect(result.current).toBe(true);
	});
});
