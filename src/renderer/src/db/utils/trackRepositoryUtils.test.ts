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

import { SYSTEM_COLLECTION_ID } from "@renderer/db/constants/constants";
import type { Metadata } from "@/types";
import {
	areCollectionIdsEqual,
	assertCollectionIds,
	assertTargetCollectionId,
	assertTrackInput,
	isNonEmptyString,
	isPlainObject,
	normalizeCollectionIds,
	uniqueTracks,
} from "./trackRepositoryUtils";

function createTrack(overrides: Record<string, unknown> = {}): Metadata {
	return {
		id: "track-1",
		filePath: "/music/track-1.mp3",
		collectionIds: [SYSTEM_COLLECTION_ID],
		selected: 0,
		...overrides,
	} as unknown as Metadata;
}

describe("trackRepositoryUtils", () => {
	describe("isNonEmptyString", () => {
		it("returns true for non-empty strings", () => {
			expect(isNonEmptyString("all")).toBe(true);
			expect(isNonEmptyString("mix-1")).toBe(true);
			expect(isNonEmptyString("  mix-1  ")).toBe(true);
		});

		it("returns false for empty strings", () => {
			expect(isNonEmptyString("")).toBe(false);
		});

		it("returns false for whitespace-only strings", () => {
			expect(isNonEmptyString("   ")).toBe(false);
			expect(isNonEmptyString("\t\n")).toBe(false);
		});

		it("returns false for non-string values", () => {
			expect(isNonEmptyString(null)).toBe(false);
			expect(isNonEmptyString(undefined)).toBe(false);
			expect(isNonEmptyString(0)).toBe(false);
			expect(isNonEmptyString(123)).toBe(false);
			expect(isNonEmptyString(true)).toBe(false);
			expect(isNonEmptyString([])).toBe(false);
			expect(isNonEmptyString({})).toBe(false);
			expect(isNonEmptyString(() => {})).toBe(false);
		});
	});

	describe("isPlainObject", () => {
		it("returns true for plain objects", () => {
			expect(isPlainObject({})).toBe(true);
			expect(isPlainObject({ id: "track-1" })).toBe(true);
			expect(isPlainObject({ collectionIds: ["all"] })).toBe(true);
		});

		it("returns false for null", () => {
			expect(isPlainObject(null)).toBe(false);
		});

		it("returns false for arrays", () => {
			expect(isPlainObject([])).toBe(false);
			expect(isPlainObject(["all"])).toBe(false);
		});

		it("returns false for primitives", () => {
			expect(isPlainObject(undefined)).toBe(false);
			expect(isPlainObject("string")).toBe(false);
			expect(isPlainObject(123)).toBe(false);
			expect(isPlainObject(true)).toBe(false);
		});

		it("returns false for functions", () => {
			expect(isPlainObject(() => {})).toBe(false);
		});
	});

	describe("assertTargetCollectionId", () => {
		const errorMsg = "targetCollectionId must be a non-empty string";

		it("accepts a non-empty string", () => {
			expect(() => assertTargetCollectionId("mix-1")).not.toThrow();
			expect(() =>
				assertTargetCollectionId(SYSTEM_COLLECTION_ID),
			).not.toThrow();
		});

		it("rejects an empty string", () => {
			expect(() => assertTargetCollectionId("")).toThrow(errorMsg);
		});

		it("rejects a whitespace-only string", () => {
			expect(() => assertTargetCollectionId("   ")).toThrow(errorMsg);
		});

		it("rejects non-string values", () => {
			expect(() => assertTargetCollectionId(null)).toThrow(errorMsg);
			expect(() => assertTargetCollectionId(undefined)).toThrow(errorMsg);
			expect(() => assertTargetCollectionId(123)).toThrow(errorMsg);
			expect(() => assertTargetCollectionId([])).toThrow(errorMsg);
			expect(() => assertTargetCollectionId({})).toThrow(errorMsg);
		});
	});

	describe("assertCollectionIds", () => {
		const errorMsg = "test.collectionIds must be an array of strings";
		const testIdErrorMsg = "test.collectionIds[1] must be a non-empty string";

		it("accepts undefined", () => {
			expect(() => assertCollectionIds(undefined, "test")).not.toThrow();
		});

		it("accepts an empty array", () => {
			expect(() => assertCollectionIds([], "test")).not.toThrow();
		});

		it("accepts an array of non-empty strings", () => {
			expect(() =>
				assertCollectionIds([SYSTEM_COLLECTION_ID, "mix-1"], "test"),
			).not.toThrow();
		});

		it("rejects a non-array value", () => {
			expect(() => assertCollectionIds(null, "test")).toThrow(errorMsg);
			expect(() => assertCollectionIds("all", "test")).toThrow(errorMsg);
			expect(() => assertCollectionIds(123, "test")).toThrow(errorMsg);
			expect(() => assertCollectionIds({ id: "all" }, "test")).toThrow(
				errorMsg,
			);
		});

		it("rejects an empty collection id", () => {
			expect(() =>
				assertCollectionIds([SYSTEM_COLLECTION_ID, ""], "test"),
			).toThrow(testIdErrorMsg);
		});

		it("rejects a whitespace-only collection id", () => {
			expect(() =>
				assertCollectionIds([SYSTEM_COLLECTION_ID, "   "], "test"),
			).toThrow(testIdErrorMsg);
		});

		it("rejects non-string collection ids", () => {
			expect(() =>
				assertCollectionIds([SYSTEM_COLLECTION_ID, 123], "test"),
			).toThrow(testIdErrorMsg);
			expect(() =>
				assertCollectionIds([SYSTEM_COLLECTION_ID, null], "test"),
			).toThrow(testIdErrorMsg);
			expect(() =>
				assertCollectionIds([SYSTEM_COLLECTION_ID, undefined], "test"),
			).toThrow(testIdErrorMsg);
		});
	});

	describe("assertTrackInput", () => {
		const nonObjErrorMsg = "tracks[0] must be an object";
		const nonEmptyStringErrMsg = "tracks[0].id must be a non-empty string";
		const filePathErrMsg = "tracks[0].filePath must be a non-empty string";

		it("accepts a valid track", () => {
			expect(() => assertTrackInput(createTrack(), 0)).not.toThrow();
		});

		it("accepts a track without collectionIds", () => {
			expect(() =>
				assertTrackInput(
					{
						id: "track-1",
						filePath: "/music/track-1.mp3",
					},
					0,
				),
			).not.toThrow();
		});

		it("accepts a track with undefined collectionIds", () => {
			expect(() =>
				assertTrackInput(
					{
						id: "track-1",
						filePath: "/music/track-1.mp3",
						collectionIds: undefined,
					},
					0,
				),
			).not.toThrow();
		});

		it("rejects a non-object track", () => {
			expect(() => assertTrackInput(null, 0)).toThrow(nonObjErrorMsg);
			expect(() => assertTrackInput(undefined, 0)).toThrow(nonObjErrorMsg);
			expect(() => assertTrackInput("track", 0)).toThrow(nonObjErrorMsg);
			expect(() => assertTrackInput(123, 0)).toThrow(nonObjErrorMsg);
			expect(() => assertTrackInput(true, 0)).toThrow(nonObjErrorMsg);
			expect(() => assertTrackInput([], 0)).toThrow(nonObjErrorMsg);
		});

		it("includes the provided index in the error context", () => {
			expect(() => assertTrackInput(null, 7)).toThrow(
				"tracks[7] must be an object",
			);
		});

		it("rejects an empty id", () => {
			expect(() =>
				assertTrackInput(
					{
						id: "",
						filePath: "/music/track-1.mp3",
					},
					0,
				),
			).toThrow(nonEmptyStringErrMsg);
		});

		it("rejects a whitespace-only id", () => {
			expect(() =>
				assertTrackInput(
					{
						id: "   ",
						filePath: "/music/track-1.mp3",
					},
					0,
				),
			).toThrow(nonEmptyStringErrMsg);
		});

		it("rejects a non-string id", () => {
			expect(() =>
				assertTrackInput(
					{
						id: 123,
						filePath: "/music/track-1.mp3",
					},
					0,
				),
			).toThrow(nonEmptyStringErrMsg);
		});

		it("rejects an empty filePath", () => {
			expect(() =>
				assertTrackInput(
					{
						id: "track-1",
						filePath: "",
					},
					0,
				),
			).toThrow(filePathErrMsg);
		});

		it("rejects a whitespace-only filePath", () => {
			expect(() =>
				assertTrackInput(
					{
						id: "track-1",
						filePath: "   ",
					},
					0,
				),
			).toThrow(filePathErrMsg);
		});

		it("rejects a non-string filePath", () => {
			expect(() =>
				assertTrackInput(
					{
						id: "track-1",
						filePath: 123,
					},
					0,
				),
			).toThrow(filePathErrMsg);
		});

		it("rejects invalid collectionIds", () => {
			expect(() =>
				assertTrackInput(
					{
						id: "track-1",
						filePath: "/music/track-1.mp3",
						collectionIds: SYSTEM_COLLECTION_ID,
					},
					0,
				),
			).toThrow("tracks[0].collectionIds must be an array of strings");

			expect(() =>
				assertTrackInput(
					{
						id: "track-1",
						filePath: "/music/track-1.mp3",
						collectionIds: null,
					},
					0,
				),
			).toThrow("tracks[0].collectionIds must be an array of strings");

			expect(() =>
				assertTrackInput(
					{
						id: "track-1",
						filePath: "/music/track-1.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID, ""],
					},
					0,
				),
			).toThrow("tracks[0].collectionIds[1] must be a non-empty string");
		});
	});

	describe("normalizeCollectionIds", () => {
		it("adds system and target collections when current is empty", () => {
			expect(normalizeCollectionIds([], "mix-1")).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix-1",
			]);
		});

		it("does not duplicate the system collection when target is the system collection", () => {
			expect(normalizeCollectionIds([], SYSTEM_COLLECTION_ID)).toEqual([
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("preserves existing valid collection ids and appends missing ones", () => {
			expect(normalizeCollectionIds(["preexisting"], "mix-1")).toEqual([
				"preexisting",
				SYSTEM_COLLECTION_ID,
				"mix-1",
			]);
		});

		it("keeps an existing target collection before the system collection if already present", () => {
			expect(normalizeCollectionIds(["mix-1"], "mix-1")).toEqual([
				"mix-1",
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("removes duplicate collection ids", () => {
			expect(
				normalizeCollectionIds(
					[SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID, "mix-1", "mix-1"],
					"mix-1",
				),
			).toEqual([SYSTEM_COLLECTION_ID, "mix-1"]);
		});

		it("removes empty and whitespace-only collection ids", () => {
			expect(
				normalizeCollectionIds(
					[SYSTEM_COLLECTION_ID, "", "   ", "mix-1"],
					"mix-1",
				),
			).toEqual([SYSTEM_COLLECTION_ID, "mix-1"]);
		});

		it("ignores non-string collection ids", () => {
			expect(
				normalizeCollectionIds(
					[SYSTEM_COLLECTION_ID, 123, null, undefined, "mix-1"],
					"mix-1",
				),
			).toEqual([SYSTEM_COLLECTION_ID, "mix-1"]);
		});

		it("handles non-array current values safely", () => {
			expect(normalizeCollectionIds(undefined, "mix-1")).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix-1",
			]);

			expect(normalizeCollectionIds(null, "mix-1")).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix-1",
			]);

			expect(normalizeCollectionIds("all", "mix-1")).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix-1",
			]);

			expect(normalizeCollectionIds({ id: "all" }, "mix-1")).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix-1",
			]);
		});

		it("ignores an empty target collection id if called without prior target validation", () => {
			expect(normalizeCollectionIds([], "")).toEqual([SYSTEM_COLLECTION_ID]);
			expect(normalizeCollectionIds([], "   ")).toEqual([SYSTEM_COLLECTION_ID]);
		});
	});

	describe("areCollectionIdsEqual", () => {
		it("returns true for identical arrays", () => {
			expect(
				areCollectionIdsEqual(
					[SYSTEM_COLLECTION_ID, "mix-1"],
					[SYSTEM_COLLECTION_ID, "mix-1"],
				),
			).toBe(true);
		});

		it("returns true for the same unique ids regardless of order", () => {
			expect(
				areCollectionIdsEqual(
					["mix-1", SYSTEM_COLLECTION_ID],
					[SYSTEM_COLLECTION_ID, "mix-1"],
				),
			).toBe(true);

			expect(
				areCollectionIdsEqual(
					["preexisting", SYSTEM_COLLECTION_ID, "mix-1"],
					["mix-1", "preexisting", SYSTEM_COLLECTION_ID],
				),
			).toBe(true);
		});

		it("returns true for two empty arrays", () => {
			expect(areCollectionIdsEqual([], [])).toBe(true);
		});

		it("returns false when current is not an array", () => {
			expect(areCollectionIdsEqual(undefined, [SYSTEM_COLLECTION_ID])).toBe(
				false,
			);
			expect(areCollectionIdsEqual(null, [SYSTEM_COLLECTION_ID])).toBe(false);
			expect(
				areCollectionIdsEqual(SYSTEM_COLLECTION_ID, [SYSTEM_COLLECTION_ID]),
			).toBe(false);
			expect(
				areCollectionIdsEqual({ id: SYSTEM_COLLECTION_ID }, [
					SYSTEM_COLLECTION_ID,
				]),
			).toBe(false);
		});

		it("returns false when lengths differ", () => {
			expect(
				areCollectionIdsEqual(
					[SYSTEM_COLLECTION_ID],
					[SYSTEM_COLLECTION_ID, "mix-1"],
				),
			).toBe(false);

			expect(
				areCollectionIdsEqual(
					[SYSTEM_COLLECTION_ID, "mix-1"],
					[SYSTEM_COLLECTION_ID],
				),
			).toBe(false);
		});

		it("returns false when values differ", () => {
			expect(areCollectionIdsEqual([SYSTEM_COLLECTION_ID], ["mix-1"])).toBe(
				false,
			);
			expect(
				areCollectionIdsEqual(
					[SYSTEM_COLLECTION_ID, "mix-1"],
					[SYSTEM_COLLECTION_ID, "mix-2"],
				),
			).toBe(false);
		});

		it("returns false when current contains duplicate ids", () => {
			expect(
				areCollectionIdsEqual(
					[SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID],
					[SYSTEM_COLLECTION_ID, "mix-1"],
				),
			).toBe(false);
			expect(
				areCollectionIdsEqual(
					[SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID, "mix-1"],
					[SYSTEM_COLLECTION_ID, "mix-1"],
				),
			).toBe(false);
		});

		it("returns false when values differ by type", () => {
			expect(areCollectionIdsEqual([123], ["123"])).toBe(false);
			expect(areCollectionIdsEqual(["123"], [123 as unknown as string])).toBe(
				false,
			);
		});
	});

	describe("uniqueTracks", () => {
		it("returns tracks unchanged when ids are unique", () => {
			const first = createTrack({ id: "t1" });
			const second = createTrack({ id: "t2" });
			expect(uniqueTracks([first, second])).toEqual([first, second]);
		});

		it("keeps the last occurrence when duplicated ids are present", () => {
			const first = createTrack({
				id: "t1",
				filePath: "/music/first.mp3",
			});
			const second = createTrack({
				id: "t2",
				filePath: "/music/second.mp3",
			});
			const duplicate = createTrack({
				id: "t1",
				filePath: "/music/duplicate.mp3",
			});
			const result = uniqueTracks([first, second, duplicate]);
			expect(result.map((track) => track.id)).toEqual(["t1", "t2"]);
			expect(result[0]?.filePath).toBe("/music/duplicate.mp3");
			expect(result[1]?.filePath).toBe("/music/second.mp3");
		});

		it("filters out tracks with empty ids", () => {
			const valid = createTrack({ id: "t1" });
			const invalid = createTrack({ id: "" });
			expect(uniqueTracks([invalid, valid])).toEqual([valid]);
		});

		it("filters out tracks with whitespace-only ids", () => {
			const valid = createTrack({ id: "t1" });
			const invalid = createTrack({ id: "   " });
			expect(uniqueTracks([invalid, valid])).toEqual([valid]);
		});

		it("returns an empty array for empty input", () => {
			expect(uniqueTracks([])).toEqual([]);
		});
	});
});
