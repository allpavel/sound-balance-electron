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

import {
	type GuardedArtworks,
	type GuardedCollections,
	guardArtwork,
	guardArtworks,
	guardCollection,
	guardCollections,
	isStructurallyValidArtwork,
	isStructurallyValidCollection,
} from "./entityGuards";

describe("entityGuards", () => {
	describe("isStructurallyValidCollection", () => {
		it("accepts a valid collection", () => {
			expect(isStructurallyValidCollection({ id: "col-1", title: "Mix" })).toBe(
				true,
			);
		});

		it("accepts the system collection", () => {
			expect(isStructurallyValidCollection({ id: "all", title: "All" })).toBe(
				true,
			);
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["a string", "collection"],
			["a number", 42],
			["an array", []],
		])("rejects %s", (_label, value) => {
			expect(isStructurallyValidCollection(value)).toBe(false);
		});

		it("rejects a collection with empty id", () => {
			expect(isStructurallyValidCollection({ id: "", title: "Mix" })).toBe(
				false,
			);
		});

		it("rejects a collection with missing title", () => {
			expect(isStructurallyValidCollection({ id: "col-1" })).toBe(false);
		});

		it("rejects a collection with non-string title", () => {
			expect(isStructurallyValidCollection({ id: "col-1", title: 42 })).toBe(
				false,
			);
		});
	});

	describe("guardCollections", () => {
		it("returns all valid collections and quarantines corrupt ones", () => {
			const valid = { id: "col-1", title: "Mix" };
			const corrupt = { id: "col-2", title: 42 };
			const result: GuardedCollections = guardCollections([valid, corrupt]);
			expect(result.ok).toEqual([valid]);
			expect(result.quarantinedIds).toEqual(["col-2"]);
		});

		it("returns empty result for empty input", () => {
			expect(guardCollections([])).toEqual({ ok: [], quarantinedIds: [] });
		});
	});

	describe("guardCollection", () => {
		it("returns undefined silently for absent row", () => {
			expect(guardCollection(undefined, "missing")).toBeUndefined();
		});

		it("returns the valid row by reference", () => {
			const row = { id: "col-1", title: "Mix" };
			expect(guardCollection(row, "col-1")).toBe(row);
		});

		it("quarantines a corrupt row and returns undefined", () => {
			const corrupt = { id: "col-1", title: "" };
			expect(guardCollection(corrupt, "col-1")).toBeUndefined();
		});
	});

	describe("isStructurallyValidArtwork", () => {
		const validBlob = new Blob(["test"], { type: "image/png" });

		it("accepts a valid artwork", () => {
			expect(
				isStructurallyValidArtwork({
					id: "art-1",
					blob: validBlob,
					format: "image/png",
				}),
			).toBe(true);
		});

		it("accepts an artwork with optional description and name", () => {
			expect(
				isStructurallyValidArtwork({
					id: "art-1",
					blob: validBlob,
					format: "image/png",
					description: "Front cover",
					name: "cover.png",
				}),
			).toBe(true);
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["a string", "artwork"],
			["a number", 42],
		])("rejects %s", (_label, value) => {
			expect(isStructurallyValidArtwork(value)).toBe(false);
		});

		it("rejects an artwork with empty id", () => {
			expect(
				isStructurallyValidArtwork({
					id: "",
					blob: validBlob,
					format: "image/png",
				}),
			).toBe(false);
		});

		it("rejects an artwork where blob is not a Blob instance", () => {
			expect(
				isStructurallyValidArtwork({
					id: "art-1",
					blob: "not-a-blob",
					format: "image/png",
				}),
			).toBe(false);
		});

		it("rejects an artwork with empty format", () => {
			expect(
				isStructurallyValidArtwork({
					id: "art-1",
					blob: validBlob,
					format: "",
				}),
			).toBe(false);
		});

		it("rejects an artwork with non-string description", () => {
			expect(
				isStructurallyValidArtwork({
					id: "art-1",
					blob: validBlob,
					format: "image/png",
					description: 42,
				}),
			).toBe(false);
		});
	});

	describe("guardArtworks", () => {
		const validBlob = new Blob(["test"], { type: "image/png" });

		it("returns all valid artworks and quarantines corrupt ones", () => {
			const valid = { id: "art-1", blob: validBlob, format: "image/png" };
			const corrupt = { id: "art-2", blob: "not-a-blob", format: "image/png" };
			const result: GuardedArtworks = guardArtworks([valid, corrupt]);
			expect(result.ok).toEqual([valid]);
			expect(result.quarantinedIds).toEqual(["art-2"]);
		});

		it("returns empty result for empty input", () => {
			expect(guardArtworks([])).toEqual({ ok: [], quarantinedIds: [] });
		});
	});

	describe("guardArtwork", () => {
		const validBlob = new Blob(["test"], { type: "image/png" });

		it("returns undefined silently for absent row", () => {
			expect(guardArtwork(undefined, "missing")).toBeUndefined();
		});

		it("returns the valid row by reference", () => {
			const row = { id: "art-1", blob: validBlob, format: "image/png" };
			expect(guardArtwork(row, "art-1")).toBe(row);
		});

		it("quarantines a corrupt row and returns undefined", () => {
			const corrupt = { id: "art-1", blob: 42, format: "image/png" };
			expect(guardArtwork(corrupt, "art-1")).toBeUndefined();
		});
	});
});
