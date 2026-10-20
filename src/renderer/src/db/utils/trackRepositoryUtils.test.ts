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

import { db } from "@renderer/db/db";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import { resetDatabase } from "@renderer/utils/test-utils";
import { STATUS_VALUES, SYSTEM_COLLECTION_ID } from "@shared/constants";
import {
	ConflictError,
	ReferentialIntegrityError,
	StorageCapacityError,
	StorageUnavailableError,
	TrackValidationError,
} from "@shared/errors";
import type { Metadata } from "@shared/schemas/track.schema";
import type { AddManyProgress } from "@shared/types";
import { makeTrack } from "@tests/factories";
import type { EntityTable } from "dexie";
import {
	applyGuardedTrackUpdate,
	areCollectionIdsEqual,
	assertBatchUniqueness,
	assertTrackInput,
	createProgressEmitter,
	isPlainObject,
	mapStorageWriteError,
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

/**
 * Captures whatever `fn` throws (fn is typed `() => never` — it always throws).
 * Used so each test can assert the thrown value's type or identity.
 */
function captureThrown(fn: () => never): unknown {
	try {
		fn();
	} catch (e: unknown) {
		return e;
	}
	throw new Error("captureThrown: fn should have thrown");
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

	describe("assertBatchUniqueness", () => {
		it("replaces control characters in the duplicate key before interpolation", () => {
			const keyWithControl = "bad\u0001key";
			let caught: ConflictError | undefined;
			try {
				assertBatchUniqueness(
					[{ k: keyWithControl }, { k: keyWithControl }],
					(item: { k: string }) => item.k,
					(i: number) => `items[${i}].k`,
					"k",
				);
			} catch (e) {
				if (e instanceof ConflictError) caught = e;
			}
			expect(caught).toBeInstanceOf(ConflictError);
			expect(caught?.message).not.toContain("\u0001");
			expect(caught?.message).toContain("\uFFFD");
		});
	});

	describe("assertReferentialIntegrity", () => {
		beforeEach(async () => {
			await resetDatabase();
		});

		it("sanitizes control characters in missing collection ids", async () => {
			await db.collections.add({ id: "legit", title: "Legit" });
			// U+0001 passes nonEmptyStringSchema (only null bytes U+0000 are
			// rejected), so it reaches the RI check and the error message.
			const missingWithControl = "bad\u0001id";
			let caught: ReferentialIntegrityError | undefined;
			try {
				await tracksRepository.addMany(
					[makeTrack({ collectionIds: [missingWithControl] })],
					{ targetCollectionId: "legit" },
				);
			} catch (e) {
				if (e instanceof ReferentialIntegrityError) caught = e;
			}
			expect(caught).toBeInstanceOf(ReferentialIntegrityError);
			expect(caught?.message).not.toContain("\u0001");
			expect(caught?.message).toContain("\uFFFD");
		});

		it("sanitizes control characters in a duplicate update id (updateMany, F-14)", async () => {
			const idWithControl = "dup\u0001id";
			let caught: ConflictError | undefined;
			try {
				await tracksRepository.updateMany([
					{ id: idWithControl, changes: { selected: 1 } },
					{ id: idWithControl, changes: { selected: 0 } },
				]);
			} catch (e) {
				if (e instanceof ConflictError) caught = e;
			}
			expect(caught).toBeInstanceOf(ConflictError);
			expect(caught?.message).not.toContain("\u0001");
			expect(caught?.message).toContain("\uFFFD");
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
				TrackValidationError,
			);
		});

		it("rejects null input with Zod-authored invalid_type issue", () => {
			try {
				validateTrackChanges(null, "changes");
				expect.unreachable("should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(TrackValidationError);
				const issues = (err as TrackValidationError).issues;
				expect(issues.length).toBeGreaterThan(0);
				expect(issues.some((i) => i.code === "invalid_type")).toBe(true);
			}
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

	describe("mapStorageWriteError", () => {
		describe("rule 1 — domain re-throw (identity)", () => {
			it.each([
				["TrackValidationError", new TrackValidationError("ctx", [])],
				["ConflictError", new ConflictError("conflict")],
				["ReferentialIntegrityError", new ReferentialIntegrityError("ri")],
			])("re-throws %s by identity", (_label, err) => {
				expect(captureThrown(() => mapStorageWriteError(err))).toBe(err);
			});
		});

		describe("rule 2 — inner unwrap (inner wins)", () => {
			it("maps inner QuotaExceededError (outer name is ConstraintError) → StorageCapacityError", () => {
				const input = {
					name: "ConstraintError",
					inner: new DOMException("quota", "QuotaExceededError"),
				};
				expect(captureThrown(() => mapStorageWriteError(input))).toBeInstanceOf(
					StorageCapacityError,
				);
			});

			it("maps inner ConstraintError (outer name is QuotaExceededError) → ConflictError", () => {
				const input = {
					name: "QuotaExceededError",
					inner: new DOMException("constraint", "ConstraintError"),
				};
				expect(captureThrown(() => mapStorageWriteError(input))).toBeInstanceOf(
					ConflictError,
				);
			});

			it("recurses two levels deep (innermost wins)", () => {
				const input = {
					inner: { inner: new DOMException("abort", "AbortError") },
				};
				expect(captureThrown(() => mapStorageWriteError(input))).toBeInstanceOf(
					StorageUnavailableError,
				);
			});

			it.each<[string, unknown]>([
				["undefined", { inner: undefined }],
				["null", { inner: null }],
			])(
				"does not unwrap an `inner` that is %s (identity re-throw)",
				(_label, input) => {
					expect(captureThrown(() => mapStorageWriteError(input))).toBe(input);
				},
			);

			it("re-throws a domain error carrying an `inner` by identity (rule 1 precedes rule 2)", () => {
				const conflict = Object.assign(new ConflictError("conflict"), {
					inner: new DOMException("q", "QuotaExceededError"),
				});
				expect(captureThrown(() => mapStorageWriteError(conflict))).toBe(
					conflict,
				);
			});

			it("overflows the stack on a cyclic `inner` chain (documented hazard; depth bound pending)", () => {
				const cyclic: { inner?: unknown } = {};
				cyclic.inner = cyclic;
				expect(
					captureThrown(() => mapStorageWriteError(cyclic)),
				).toBeInstanceOf(RangeError);
			});
		});

		describe("rule 3 — top-level name", () => {
			it("QuotaExceededError → StorageCapacityError", () => {
				const err = new DOMException("q", "QuotaExceededError");
				expect(captureThrown(() => mapStorageWriteError(err))).toBeInstanceOf(
					StorageCapacityError,
				);
			});

			it("ConstraintError → ConflictError", () => {
				const err = new DOMException("c", "ConstraintError");
				expect(captureThrown(() => mapStorageWriteError(err))).toBeInstanceOf(
					ConflictError,
				);
			});

			it.each([
				"InvalidStateError",
				"AbortError",
				"UnknownError",
				"VersionError",
				"NotFoundError",
			])("%s → StorageUnavailableError", (name) => {
				const err = { name, message: `msg-${name}` };
				expect(captureThrown(() => mapStorageWriteError(err))).toBeInstanceOf(
					StorageUnavailableError,
				);
			});

			it.each<[string, unknown]>([
				["no name property", {}],
				["non-string name", { name: 42 }],
				["string input resembling a mapped name", "QuotaExceededError"],
			])("skips name mapping for %s (identity re-throw)", (_label, input) => {
				expect(captureThrown(() => mapStorageWriteError(input))).toBe(input);
			});

			it("falls back to the error name in the message when message is empty", () => {
				const thrown = captureThrown(() =>
					mapStorageWriteError({ name: "AbortError", message: "" }),
				);
				expect(thrown).toBeInstanceOf(StorageUnavailableError);
				if (thrown instanceof StorageUnavailableError) {
					expect(thrown.message).toBe("Database operation failed: AbortError");
				}
			});
		});

		describe("rule 4 — failures[] scan (first match wins)", () => {
			it("single QuotaExceededError failure → StorageCapacityError", () => {
				const input = {
					name: "BulkError",
					failures: [new DOMException("q", "QuotaExceededError")],
				};
				expect(captureThrown(() => mapStorageWriteError(input))).toBeInstanceOf(
					StorageCapacityError,
				);
			});

			it("pins first-match: Constraint before Quota in failures[] → ConflictError", () => {
				const input = {
					name: "BulkError",
					failures: [
						new DOMException("c", "ConstraintError"),
						new DOMException("q", "QuotaExceededError"),
					],
				};
				expect(captureThrown(() => mapStorageWriteError(input))).toBeInstanceOf(
					ConflictError,
				);
			});

			it("pins first-match: Quota before Constraint in failures[] → StorageCapacityError", () => {
				const input = {
					name: "BulkError",
					failures: [
						new DOMException("q", "QuotaExceededError"),
						new DOMException("c", "ConstraintError"),
					],
				};
				expect(captureThrown(() => mapStorageWriteError(input))).toBeInstanceOf(
					StorageCapacityError,
				);
			});

			it("re-throws by identity when `failures` is not an array", () => {
				const input = { name: "BulkError", failures: "not-an-array" };
				expect(captureThrown(() => mapStorageWriteError(input))).toBe(input);
			});

			it("re-throws by identity when `failures` is empty", () => {
				const input = { name: "BulkError", failures: [] };
				expect(captureThrown(() => mapStorageWriteError(input))).toBe(input);
			});

			it("skips non-error entries and maps the first matching failure", () => {
				const input = {
					name: "BulkError",
					failures: [
						null,
						"x",
						42,
						{ message: "no name property" },
						new DOMException("q", "QuotaExceededError"),
					],
				};
				expect(captureThrown(() => mapStorageWriteError(input))).toBeInstanceOf(
					StorageCapacityError,
				);
			});

			it("falls back to the failure's name in the message when its message is empty", () => {
				const input = {
					name: "BulkError",
					failures: [{ name: "UnknownError", message: "" }],
				};
				const thrown = captureThrown(() => mapStorageWriteError(input));
				expect(thrown).toBeInstanceOf(StorageUnavailableError);
				if (thrown instanceof StorageUnavailableError) {
					expect(thrown.message).toBe(
						"Database batch operation failed: UnknownError",
					);
				}
			});
		});

		describe("rule 5 — identity re-throw", () => {
			it("re-throws a TypeError by identity", () => {
				const err = new TypeError("unexpected");
				expect(captureThrown(() => mapStorageWriteError(err))).toBe(err);
			});

			it.each<[string, unknown]>([
				["null", null],
				["a number", 42],
				["undefined", undefined],
				["a boolean", false],
			])("re-throws %s by identity", (_label, input) => {
				expect(captureThrown(() => mapStorageWriteError(input))).toBe(input);
			});

			it("re-throws a failures[] with no matching names by identity", () => {
				const input = {
					name: "BulkError",
					failures: [{ name: "UnknownName" }],
				};
				expect(captureThrown(() => mapStorageWriteError(input))).toBe(input);
			});
		});
	});

	describe("createProgressEmitter", () => {
		const snapshot: AddManyProgress = {
			processed: 1,
			total: 3,
			added: 1,
			merged: 0,
			skipped: 0,
		};

		it("returns no-op emit/flush when onProgress is undefined", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const emitter = createProgressEmitter(undefined);
			emitter.emit(snapshot);
			emitter.flush();
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it("delivers the snapshot to a non-throwing callback; flush is a no-op", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const cb = vi.fn();
			const emitter = createProgressEmitter(cb);
			emitter.emit(snapshot);
			expect(cb).toHaveBeenCalledWith(snapshot);
			emitter.flush();
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it("logs the first callback failure once; suppresses subsequent; flush summarizes", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const throwing = vi.fn(() => {
				throw new Error("boom");
			});
			const emitter = createProgressEmitter(throwing);
			emitter.emit(snapshot);
			emitter.emit(snapshot);
			emitter.emit(snapshot);
			expect(throwing).toHaveBeenCalledTimes(3);
			expect(warnSpy).toHaveBeenCalledTimes(1);
			emitter.flush();
			expect(warnSpy).toHaveBeenCalledTimes(2);
			const summary = warnSpy.mock.calls[1]?.[1];
			expect(summary).toEqual(
				expect.objectContaining({ totalFailures: 3, suppressedAfterFirst: 2 }),
			);
		});

		it("flush after exactly one failure emits no summary (boundary: failureCount > 1)", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const emitter = createProgressEmitter(() => {
				throw new Error("boom");
			});
			emitter.emit(snapshot);
			expect(warnSpy).toHaveBeenCalledTimes(1); // the log-once warning
			emitter.flush();
			expect(warnSpy).toHaveBeenCalledTimes(1); // no summary at exactly one failure
		});

		it("emit never propagates a callback throw", () => {
			vi.spyOn(console, "warn").mockImplementation(() => {});
			const emitter = createProgressEmitter(() => {
				throw new Error("boom");
			});
			expect(() => emitter.emit(snapshot)).not.toThrow();
		});
	});
});
