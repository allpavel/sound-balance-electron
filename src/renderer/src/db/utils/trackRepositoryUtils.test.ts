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

import { STATUS_VALUES, SYSTEM_COLLECTION_ID } from "@shared/constants";
import { TrackValidationError } from "@shared/errors";
import type { Metadata } from "@shared/schemas/track.schema";
import { makeTrack } from "@tests/factories";
import type { EntityTable } from "dexie";
import {
	applyGuardedTrackUpdate,
	areCollectionIdsEqual,
	assertTargetCollectionId,
	assertTrackInput,
	isPlainObject,
	normalizeCollectionIds,
	shouldApplyUpdate,
	uniqueTracks,
	validateTrackChanges,
} from "./trackRepositoryUtils";

function createTrackWithoutField(field: string): Record<string, unknown> {
	const track = makeTrack() as any;
	delete track[field];
	return track as any;
}

describe("trackRepositoryUtils", () => {
	describe("isPlainObject", () => {
		it.each([
			["empty object", {}],
			["object with id", { id: "track-1" }],
			["object with collectionIds", { collectionIds: ["all"] }],
		])("returns true for %s", (_desc, value) => {
			expect(isPlainObject(value)).toBe(true);
		});

		it("returns false for null", () => {
			expect(isPlainObject(null)).toBe(false);
		});

		it.each([
			["empty array", []],
			["non-empty array", ["all"]],
		])("returns false for %s", (_desc, value) => {
			expect(isPlainObject(value)).toBe(false);
		});

		it.each([
			["undefined", undefined],
			["string", "string"],
			["number", 123],
			["boolean", true],
		])("returns false for primitive: %s", (_desc, value) => {
			expect(isPlainObject(value)).toBe(false);
		});

		it("returns false for functions", () => {
			expect(isPlainObject(() => {})).toBe(false);
		});
	});

	describe("assertTargetCollectionId", () => {
		const errorMsg = "targetCollectionId must be a non-empty string";

		it.each([
			["custom collection id", "mix-1"],
			["system collection id", SYSTEM_COLLECTION_ID],
		])("accepts %s", (_desc, value) => {
			expect(() => assertTargetCollectionId(value)).not.toThrow();
		});

		it("rejects an empty string", () => {
			expect(() => assertTargetCollectionId("")).toThrow(errorMsg);
		});

		it("rejects a whitespace-only string", () => {
			expect(() => assertTargetCollectionId("   ")).toThrow(errorMsg);
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["number", 123],
			["array", []],
			["object", {}],
		])("rejects non-string value: %s", (_desc, value) => {
			expect(() => assertTargetCollectionId(value)).toThrow(errorMsg);
		});
	});

	describe("assertTrackInput", () => {
		it("accepts a valid track", () => {
			expect(() => assertTrackInput(makeTrack(), 0)).not.toThrow();
		});

		it.each(STATUS_VALUES)("accepts valid Status value: %s", (status) => {
			const overrides =
				status === "failed" ? { status, reason: "test error" } : { status };
			expect(() => assertTrackInput(makeTrack(overrides), 0)).not.toThrow();
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["string", "track"],
			["number", 123],
			["boolean", true],
			["array", []],
		])("rejects a non-object track: %s", (_desc, value) => {
			expect(() => assertTrackInput(value, 0)).toThrow(TrackValidationError);
		});

		it("includes the provided index in the error context", () => {
			try {
				assertTrackInput(null, 7);
				expect.unreachable("should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(TrackValidationError);
				expect((err as TrackValidationError).context).toBe("tracks[7]");
			}
		});

		it("rejects an empty id and reports the id path", () => {
			try {
				assertTrackInput(makeTrack({ id: "" }), 0);
				expect.unreachable("should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(TrackValidationError);
				const { issues } = err as TrackValidationError;
				expect(issues.some((i) => i.pathString === "id")).toBe(true);
			}
		});

		it("rejects a whitespace-only id", () => {
			expect(() => assertTrackInput(makeTrack({ id: "   " }), 0)).toThrow(
				TrackValidationError,
			);
		});

		it("rejects a non-string id", () => {
			expect(() => assertTrackInput(makeTrack({ id: 123 } as any), 0)).toThrow(
				TrackValidationError,
			);
		});

		it("rejects a missing id", () => {
			expect(() => assertTrackInput(createTrackWithoutField("id"), 0)).toThrow(
				TrackValidationError,
			);
		});

		it("rejects an empty file", () => {
			expect(() => assertTrackInput(makeTrack({ file: "" }), 0)).toThrow(
				TrackValidationError,
			);
		});

		it("rejects a whitespace-only file", () => {
			expect(() => assertTrackInput(makeTrack({ file: "   " }), 0)).toThrow(
				TrackValidationError,
			);
		});

		it("rejects a missing file", () => {
			expect(() =>
				assertTrackInput(createTrackWithoutField("file"), 0),
			).toThrow(TrackValidationError);
		});

		it("rejects an empty filePath", () => {
			expect(() => assertTrackInput(makeTrack({ filePath: "" }), 0)).toThrow(
				TrackValidationError,
			);
		});

		it("rejects a whitespace-only filePath", () => {
			expect(() => assertTrackInput(makeTrack({ filePath: "   " }), 0)).toThrow(
				TrackValidationError,
			);
		});

		it("rejects a missing filePath", () => {
			expect(() =>
				assertTrackInput(createTrackWithoutField("filePath"), 0),
			).toThrow(TrackValidationError);
		});

		it("rejects a missing status", () => {
			expect(() =>
				assertTrackInput(createTrackWithoutField("status"), 0),
			).toThrow(TrackValidationError);
		});

		it("rejects undefined status", () => {
			expect(() =>
				assertTrackInput(makeTrack({ status: undefined }), 0),
			).toThrow(TrackValidationError);
		});

		it.each([
			["unknown value", "done"],
			["empty string", ""],
			["whitespace-only", "   "],
			["number", 123],
			["null", null],
		])("rejects invalid status value: %s", (_desc, value) => {
			expect(() =>
				assertTrackInput(makeTrack({ status: value } as any), 0),
			).toThrow(TrackValidationError);
		});

		it.each([
			["number > 1", 2],
			["boolean", true],
			["string", "1"],
			["null", null],
			["undefined", undefined],
		])("rejects invalid selected value: %s", (_desc, value) => {
			expect(() =>
				assertTrackInput(makeTrack({ selected: value } as any), 0),
			).toThrow(TrackValidationError);
		});

		it("rejects a missing selected value", () => {
			expect(() =>
				assertTrackInput(createTrackWithoutField("selected"), 0),
			).toThrow(TrackValidationError);
		});

		it.each([
			[
				"string instead of array",
				SYSTEM_COLLECTION_ID as any,
				TrackValidationError,
			],
			["null instead of array", null as any, TrackValidationError],
			[
				"empty string in array",
				[SYSTEM_COLLECTION_ID, ""],
				TrackValidationError,
			],
		])(
			"rejects invalid collectionIds: %s",
			(_desc, collectionIds, expectedError) => {
				expect(() => assertTrackInput(makeTrack({ collectionIds }), 0)).toThrow(
					expectedError,
				);
			},
		);

		it("rejects a missing collectionIds value", () => {
			expect(() =>
				assertTrackInput(createTrackWithoutField("collectionIds"), 0),
			).toThrow(TrackValidationError);
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

		it.each([
			["undefined", undefined],
			["null", null],
			["string", "all"],
			["object", { id: "all" }],
		])("handles non-array current value safely: %s", (_desc, current) => {
			expect(normalizeCollectionIds(current, "mix-1")).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix-1",
			]);
		});

		it.each([
			["empty string", ""],
			["whitespace-only string", "   "],
		])("ignores an empty target collection id: %s", (_desc, targetId) => {
			expect(normalizeCollectionIds([], targetId)).toEqual([
				SYSTEM_COLLECTION_ID,
			]);
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

		it.each([
			[
				"two collections in different order",
				["mix-1", SYSTEM_COLLECTION_ID],
				[SYSTEM_COLLECTION_ID, "mix-1"],
			],
			[
				"three collections in different order",
				["preexisting", SYSTEM_COLLECTION_ID, "mix-1"],
				["mix-1", "preexisting", SYSTEM_COLLECTION_ID],
			],
		])(
			"returns true for the same unique ids regardless of order: %s",
			(_desc, current, next) => {
				expect(areCollectionIdsEqual(current, next)).toBe(true);
			},
		);

		it("returns true for two empty arrays", () => {
			expect(areCollectionIdsEqual([], [])).toBe(true);
		});

		it.each([
			["undefined", undefined],
			["null", null],
			["string", SYSTEM_COLLECTION_ID],
			["object", { id: SYSTEM_COLLECTION_ID }],
		])("returns false when current is not an array: %s", (_desc, current) => {
			expect(areCollectionIdsEqual(current, [SYSTEM_COLLECTION_ID])).toBe(
				false,
			);
		});

		it.each([
			[
				"current shorter than next",
				[SYSTEM_COLLECTION_ID],
				[SYSTEM_COLLECTION_ID, "mix-1"],
			],
			[
				"current longer than next",
				[SYSTEM_COLLECTION_ID, "mix-1"],
				[SYSTEM_COLLECTION_ID],
			],
		])("returns false when lengths differ: %s", (_desc, current, next) => {
			expect(areCollectionIdsEqual(current, next)).toBe(false);
		});

		it.each([
			["completely different values", [SYSTEM_COLLECTION_ID], ["mix-1"]],
			[
				"one value differs",
				[SYSTEM_COLLECTION_ID, "mix-1"],
				[SYSTEM_COLLECTION_ID, "mix-2"],
			],
		])("returns false when values differ: %s", (_desc, current, next) => {
			expect(areCollectionIdsEqual(current, next)).toBe(false);
		});

		it.each([
			[
				"same length with duplicates",
				[SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID],
				[SYSTEM_COLLECTION_ID, "mix-1"],
			],
			[
				"longer array with duplicates",
				[SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID, "mix-1"],
				[SYSTEM_COLLECTION_ID, "mix-1"],
			],
		])(
			"returns false when current contains duplicate ids: %s",
			(_desc, current, next) => {
				expect(areCollectionIdsEqual(current, next)).toBe(false);
			},
		);

		it.each([
			["number vs string", [123], ["123"]],
			["string vs number", ["123"], [123 as unknown as string]],
		])(
			"returns false when values differ by type: %s",
			(_desc, current, next) => {
				expect(areCollectionIdsEqual(current, next)).toBe(false);
			},
		);
	});

	describe("uniqueTracks", () => {
		it("returns tracks unchanged when ids are unique", () => {
			const first = makeTrack({ id: "t1" });
			const second = makeTrack({ id: "t2" });
			expect(uniqueTracks([first, second])).toEqual([first, second]);
		});

		it("keeps the last occurrence when duplicated ids are present", () => {
			const first = makeTrack({
				id: "t1",
				filePath: "/music/first.mp3",
			});
			const second = makeTrack({
				id: "t2",
				filePath: "/music/second.mp3",
			});
			const duplicate = makeTrack({
				id: "t1",
				filePath: "/music/duplicate.mp3",
			});
			const result = uniqueTracks([first, second, duplicate]);
			expect(result.map((track) => track.id)).toEqual(["t1", "t2"]);
			expect(result[0]?.filePath).toBe("/music/duplicate.mp3");
			expect(result[1]?.filePath).toBe("/music/second.mp3");
		});

		it("filters out tracks with empty ids", () => {
			const valid = makeTrack({ id: "t1" });
			const invalid = makeTrack({ id: "" });
			expect(uniqueTracks([invalid, valid])).toEqual([valid]);
		});

		it("filters out tracks with whitespace-only ids", () => {
			const valid = makeTrack({ id: "t1" });
			const invalid = makeTrack({ id: "   " });
			expect(uniqueTracks([invalid, valid])).toEqual([valid]);
		});

		it("returns an empty array for empty input", () => {
			expect(uniqueTracks([])).toEqual([]);
		});
	});

	describe("validateTrackChanges", () => {
		it("returns changes unchanged when collectionIds is undefined", () => {
			const changes = { selected: 1 } as any;
			expect(validateTrackChanges(changes, "changes")).toEqual(changes);
		});

		it("removes duplicate system collection ids", () => {
			expect(
				validateTrackChanges(
					{
						collectionIds: [SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID, "mix1"],
					},
					"changes",
				),
			).toEqual({
				collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
			});
		});

		it("adds the system collection id when missing", () => {
			expect(
				validateTrackChanges(
					{
						collectionIds: ["mix1"],
					},
					"changes",
				),
			).toEqual({
				collectionIds: ["mix1", SYSTEM_COLLECTION_ID],
			});
		});

		it("normalizes an empty collectionIds array to the system collection", () => {
			expect(
				validateTrackChanges(
					{
						collectionIds: [],
					},
					"changes",
				),
			).toEqual({
				collectionIds: [SYSTEM_COLLECTION_ID],
			});
		});

		it("rejects invalid collection ids and reports the precise indexed path", () => {
			try {
				validateTrackChanges(
					{ collectionIds: [SYSTEM_COLLECTION_ID, ""] },
					"changes",
				);
				expect.unreachable("should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(TrackValidationError);
				const { issues } = err as TrackValidationError;
				expect(
					issues.some((i) => i.path[0] === "collectionIds" && i.path[1] === 1),
				).toBe(true);
			}
		});

		it("rejects an empty changes object (no-op mutation)", () => {
			expect(() => validateTrackChanges({}, "changes")).toThrow(
				TrackValidationError,
			);
		});

		it("rejects status combined with fields", () => {
			expect(() =>
				validateTrackChanges({ status: "pending", selected: 1 }, "changes"),
			).toThrow(TrackValidationError);
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["string", "string"],
			["number", 42],
		])("rejects non-object input with a clear error: %s", (_desc, value) => {
			expect(() => validateTrackChanges(value, "changes")).toThrow(
				"changes must be a non-null object",
			);
		});

		it("rejects invalid selected values via schema validation", () => {
			expect(() => validateTrackChanges({ selected: 99 }, "changes")).toThrow(
				TrackValidationError,
			);
		});

		it("rejects failed status without reason", () => {
			expect(() =>
				validateTrackChanges({ status: "failed" }, "changes"),
			).toThrow(TrackValidationError);
		});

		it.each([
			["pending", { status: "pending" }],
			["processing", { status: "processing" }],
			["completed", { status: "completed" }],
			["failed with reason", { status: "failed", reason: "error" }],
		])("accepts valid status-only change: %s", (_desc, changes) => {
			expect(validateTrackChanges(changes, "changes")).toEqual(changes);
		});

		it.each([
			["processing", { status: "processing", seq: 1 }],
			["completed", { status: "completed", seq: 7 }],
			["failed with reason", { status: "failed", reason: "boom", seq: 3 }],
		])("accepts %s change with a valid seq", (_label, changes) => {
			expect(validateTrackChanges(changes, "changes")).toEqual(changes);
		});

		it("rejects seq 0 (must be >= 1)", () => {
			expect(() =>
				validateTrackChanges({ status: "processing", seq: 0 }, "changes"),
			).toThrow(TrackValidationError);
		});

		it.each([
			["negative", -1],
			["fractional", 1.5],
			["string", "2"],
			["null", null],
			["boolean", true],
		])("rejects %s seq", (_label, seq) => {
			expect(() =>
				validateTrackChanges({ status: "processing", seq }, "changes"),
			).toThrow(TrackValidationError);
		});

		it("rejects seq on the fields branch", () => {
			expect(() =>
				validateTrackChanges({ selected: 1, seq: 2 }, "changes"),
			).toThrow(TrackValidationError);
		});
	});

	describe("applyGuardedTrackUpdate", () => {
		let mockTable: any;

		beforeEach(() => {
			mockTable = {
				get: vi.fn(),
				update: vi.fn(),
			} as unknown as EntityTable<Metadata, "id">;
		});

		it("applies field-only changes without checking the state machine", async () => {
			vi.mocked(mockTable.update).mockResolvedValue(1);
			const result = await applyGuardedTrackUpdate(mockTable, "t1", {
				selected: 1,
			});
			expect(result).toBe(1);
			expect(mockTable.get).not.toHaveBeenCalled();
			expect(mockTable.update).toHaveBeenCalledWith("t1", { selected: 1 });
		});

		it("returns 0 if the track does not exist (idempotent no-op)", async () => {
			vi.mocked(mockTable.get).mockResolvedValue(undefined);
			const result = await applyGuardedTrackUpdate(mockTable, "missing", {
				status: "processing",
			});
			expect(result).toBe(0);
			expect(mockTable.update).not.toHaveBeenCalled();
		});

		it("returns 0 for an illegal state transition (e.g., completed -> pending)", async () => {
			vi.mocked(mockTable.get).mockResolvedValue({
				id: "t1",
				status: "completed",
			});
			const result = await applyGuardedTrackUpdate(mockTable, "t1", {
				status: "pending",
			});
			expect(result).toBe(0);
			expect(mockTable.update).not.toHaveBeenCalled();
		});

		it("applies a legal state transition and returns 1", async () => {
			vi.mocked(mockTable.get).mockResolvedValue({
				id: "t1",
				status: "pending",
			});
			vi.mocked(mockTable.update).mockResolvedValue(1);

			const result = await applyGuardedTrackUpdate(mockTable, "t1", {
				status: "processing",
			});
			expect(result).toBe(1);
			expect(mockTable.update).toHaveBeenCalledWith("t1", {
				status: "processing",
			});
		});

		it("returns 0 for a stale sequence number (out-of-order event)", async () => {
			vi.mocked(mockTable.get).mockResolvedValue({
				id: "t1",
				status: "processing",
				statusSeq: 5,
			});
			const result = await applyGuardedTrackUpdate(mockTable, "t1", {
				status: "completed",
				seq: 4,
			});
			expect(result).toBe(0);
			expect(mockTable.update).not.toHaveBeenCalled();
		});

		it("rejects an event whose seq equals the stored high-water mark (replay protection)", async () => {
			vi.mocked(mockTable.get).mockResolvedValue({
				id: "t1",
				status: "processing",
				statusSeq: 5,
			});
			const result = await applyGuardedTrackUpdate(mockTable, "t1", {
				status: "completed",
				seq: 5,
			});
			expect(result).toBe(0);
			expect(mockTable.update).not.toHaveBeenCalled();
		});

		it("applies update and advances statusSeq for a fresh sequence number", async () => {
			vi.mocked(mockTable.get).mockResolvedValue({
				id: "t1",
				status: "processing",
				statusSeq: 5,
			});
			vi.mocked(mockTable.update).mockResolvedValue(1);
			const result = await applyGuardedTrackUpdate(mockTable, "t1", {
				status: "completed",
				seq: 6,
			});
			expect(result).toBe(1);
			expect(mockTable.update).toHaveBeenCalledWith("t1", {
				status: "completed",
				reason: undefined,
				statusSeq: 6,
			});
		});

		it("does not advance statusSeq if the event lacks a seq (graceful degradation)", async () => {
			vi.mocked(mockTable.get).mockResolvedValue({
				id: "t1",
				status: "processing",
				statusSeq: 5,
			});
			vi.mocked(mockTable.update).mockResolvedValue(1);
			const result = await applyGuardedTrackUpdate(mockTable, "t1", {
				status: "completed",
			});

			expect(result).toBe(1);
			expect(mockTable.update).toHaveBeenCalledWith("t1", {
				status: "completed",
				reason: undefined,
			});
		});
	});

	describe("shouldApplyUpdate", () => {
		it("returns changes for field-only updates", () => {
			const track = makeTrack({ id: "t1" });
			expect(shouldApplyUpdate(track, { selected: 1 })).toEqual({
				selected: 1,
			});
		});

		it("returns null if track is undefined", () => {
			expect(shouldApplyUpdate(undefined, { status: "processing" })).toBeNull();
		});

		it("returns null for illegal state transition", () => {
			const track = makeTrack({ id: "t1", status: "completed" });
			expect(shouldApplyUpdate(track, { status: "pending" })).toBeNull();
		});

		it("returns null for stale sequence number", () => {
			const track = makeTrack({ id: "t1", status: "processing", statusSeq: 5 });
			expect(
				shouldApplyUpdate(track, { status: "completed", seq: 4 }),
			).toBeNull();
		});

		it("returns null for duplicate sequence number", () => {
			const track = makeTrack({ id: "t1", status: "processing", statusSeq: 5 });
			expect(
				shouldApplyUpdate(track, { status: "completed", seq: 5 }),
			).toBeNull();
		});

		it("returns patch with statusSeq for fresh sequence number", () => {
			const track = makeTrack({ id: "t1", status: "processing", statusSeq: 5 });
			expect(shouldApplyUpdate(track, { status: "completed", seq: 6 })).toEqual(
				{
					status: "completed",
					reason: undefined,
					statusSeq: 6,
				},
			);
		});

		it("does not advance statusSeq if event lacks seq", () => {
			const track = makeTrack({ id: "t1", status: "processing", statusSeq: 5 });
			expect(shouldApplyUpdate(track, { status: "completed" })).toEqual({
				status: "completed",
				reason: undefined,
			});
		});

		it("clears stale reason when transitioning from failed to processing", () => {
			const track = makeTrack({ id: "t1", status: "failed", reason: "boom" });
			expect(shouldApplyUpdate(track, { status: "processing" })).toEqual({
				status: "processing",
				reason: undefined,
			});
		});

		it("does not clear reason when transitioning to failed", () => {
			const track = makeTrack({ id: "t1", status: "processing" });
			expect(
				shouldApplyUpdate(track, { status: "failed", reason: "new boom" }),
			).toEqual({
				status: "failed",
				reason: "new boom",
			});
		});
	});
});
