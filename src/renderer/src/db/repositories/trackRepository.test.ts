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
import { resetDatabase } from "@renderer/utils/test-utils/testFactories";
import { STATUS_VALUES, SYSTEM_COLLECTION_ID } from "@shared/constants";
import type { Metadata, Status } from "@shared/schemas/track.schema";
import { LEGAL_TRANSITION_EDGES } from "@shared/utils/isLegalStatusTransition";
import { makeTrack } from "@tests/factories";

// Seeds a row in the given status. "failed" requires a reason (schema
// invariant), supplied once here for the whole suite.
async function seedTrackWithStatus(id: string, status: Status): Promise<void> {
	const overrides = {
		status,
		...(status === "failed" ? { reason: "seed failure" } : {}),
	} as Partial<Metadata>;
	await db.tracks.add(makeTrack({ id, ...overrides }));
}

// Builds a shape-valid status-change payload for the target status.
function statusChange(to: Status, seq?: number): Record<string, unknown> {
	const base = seq === undefined ? { status: to } : { status: to, seq };
	return to === "failed" ? { ...base, reason: "processing failed" } : base;
}

describe("tracksRepository", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	describe("getAll", () => {
		it("returns only tracks whose collectionIds include the given id", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", collectionIds: [SYSTEM_COLLECTION_ID, "x"] }),
				makeTrack({ id: "t2", collectionIds: ["x"] }),
				makeTrack({ id: "t3", collectionIds: [SYSTEM_COLLECTION_ID] }),
			]);
			expect(
				(await tracksRepository.getAll(SYSTEM_COLLECTION_ID))
					.map((t) => t.id)
					.sort(),
			).toEqual(["t1", "t3"]);
		});

		it("returns an empty array when no tracks match", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", collectionIds: [SYSTEM_COLLECTION_ID] }),
			]);
			expect(await tracksRepository.getAll("none")).toEqual([]);
		});

		it("returns an empty array when the table is empty", async () => {
			expect(await tracksRepository.getAll(SYSTEM_COLLECTION_ID)).toEqual([]);
		});
	});

	describe("getById", () => {
		it("returns the track when it exists", async () => {
			await db.tracks.add(makeTrack({ id: "t1" }));
			expect(await tracksRepository.getById("t1")).toMatchObject({ id: "t1" });
		});

		it("returns undefined when no track matches", async () => {
			expect(await tracksRepository.getById("missing")).toBeUndefined();
		});
	});

	describe("addMany", () => {
		it("adds new tracks to the 'all' collection and returns their ids", async () => {
			const ids = await tracksRepository.addMany(
				[
					makeTrack({ id: "a", collectionIds: [] }),
					makeTrack({ id: "b", collectionIds: [] }),
				],
				{ targetCollectionId: SYSTEM_COLLECTION_ID },
			);
			expect(ids).toEqual(["a", "b"]);
			expect(
				(await db.tracks.toArray()).map((t) => t.collectionIds).sort(),
			).toEqual([[SYSTEM_COLLECTION_ID], [SYSTEM_COLLECTION_ID]]);
		});

		it("adds new tracks to a specific collection and auto-includes 'all'", async () => {
			await tracksRepository.addMany(
				[makeTrack({ id: "a", collectionIds: [] })],
				{ targetCollectionId: "mix1" },
			);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("preserves pre-existing collectionIds and appends 'all' + target", async () => {
			await tracksRepository.addMany(
				[makeTrack({ id: "a", collectionIds: ["preexisting"] })],
				{ targetCollectionId: "mix1" },
			);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				"preexisting",
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("appends targetCollectionId to an existing track that lacks it", async () => {
			await db.tracks.add(
				makeTrack({
					id: "a",
					filePath: "/music/a.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			const ids = await tracksRepository.addMany(
				[
					makeTrack({
						id: "a",
						filePath: "/music/a.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
				],
				{ targetCollectionId: "mix1" },
			);
			expect(ids).toEqual([]);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("does not modify an existing track that already has the targetCollectionId", async () => {
			await db.tracks.add(
				makeTrack({
					id: "a",
					filePath: "/music/a.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
			);
			const ids = await tracksRepository.addMany(
				[
					makeTrack({
						id: "a",
						filePath: "/music/a.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
					}),
				],
				{ targetCollectionId: "mix1" },
			);
			expect(ids).toEqual([]);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("handles a mixed batch: new, update, and no-op together", async () => {
			await db.tracks.add(
				makeTrack({
					id: "exists",
					filePath: "/music/exists.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await db.tracks.add(
				makeTrack({
					id: "noop",
					filePath: "/music/noop.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
			);

			const ids = await tracksRepository.addMany(
				[
					makeTrack({
						id: "new1",
						filePath: "/music/new1.mp3",
						collectionIds: [],
					}),
					makeTrack({
						id: "exists",
						filePath: "/music/exists.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
					makeTrack({
						id: "noop",
						filePath: "/music/noop.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
					}),
				],
				{ targetCollectionId: "mix1" },
			);

			expect(ids).toEqual(["new1"]);
			expect((await db.tracks.get("new1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect((await db.tracks.get("exists"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect((await db.tracks.get("noop"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("matches existing tracks by filePath, not by id", async () => {
			await db.tracks.add(
				makeTrack({
					id: "orig",
					filePath: "/music/same.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			const ids = await tracksRepository.addMany(
				[
					makeTrack({
						id: "different-id",
						filePath: "/music/same.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
				],
				{ targetCollectionId: "mix1" },
			);
			expect(ids).toEqual([]);
			const rows = await db.tracks.toArray();
			expect(rows).toHaveLength(1);
			expect(rows[0]?.id).toBe("orig");
			expect(rows[0]?.collectionIds).toEqual([SYSTEM_COLLECTION_ID, "mix1"]);
		});

		it("returns an empty array for an empty input and writes nothing", async () => {
			expect(
				await tracksRepository.addMany([], {
					targetCollectionId: SYSTEM_COLLECTION_ID,
				}),
			).toEqual([]);
			expect(await db.tracks.count()).toBe(0);
		});
	});

	describe("update", () => {
		it("applies partial changes and returns 1 when the track exists", async () => {
			await db.tracks.add(makeTrack({ id: "t1", selected: 0 }));
			expect(await tracksRepository.update("t1", { selected: 1 })).toBe(1);
			expect((await db.tracks.get("t1"))?.selected).toBe(1);
		});

		it("returns 0 when the track does not exist", async () => {
			expect(await tracksRepository.update("missing", { selected: 1 })).toBe(0);
		});

		it("rejects updating filePath to an existing one with a ConstraintError", async () => {
			await db.tracks.add(makeTrack({ id: "t1", filePath: "/music/a.mp3" }));
			await db.tracks.add(makeTrack({ id: "t2", filePath: "/music/b.mp3" }));
			await expect(
				tracksRepository.update("t2", { filePath: "/music/a.mp3" }),
			).rejects.toThrow(
				expect.objectContaining({
					failures: expect.arrayContaining([
						expect.objectContaining({ name: "ConstraintError" }),
					]),
				}),
			);
		});

		it("normalizes collectionIds changes and removes duplicate system collection ids", async () => {
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await tracksRepository.update("t1", {
				collectionIds: [SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID, "mix1"],
			});
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("adds the system collection id when collectionIds changes omit it", async () => {
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await tracksRepository.update("t1", {
				collectionIds: ["mix1"],
			});
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				"mix1",
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("does not modify collectionIds when changes do not include collectionIds", async () => {
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
			);
			await tracksRepository.update("t1", {
				selected: 1,
			});
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("rejects invalid collectionIds values in update changes", async () => {
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await expect(
				tracksRepository.update("t1", {
					collectionIds: [SYSTEM_COLLECTION_ID, ""],
				}),
			).rejects.toThrow("changes is invalid: collectionIds.1:");
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("rejects an empty changes object (no-op mutation)", async () => {
			await db.tracks.add(makeTrack({ id: "t1", selected: 0 }));
			await expect(tracksRepository.update("t1", {} as any)).rejects.toThrow(
				/at least one field/i,
			);
			expect((await db.tracks.get("t1"))?.selected).toBe(0);
		});

		it("rejects non-object changes with a clear error", async () => {
			await db.tracks.add(makeTrack({ id: "t1" }));
			await expect(tracksRepository.update("t1", null as any)).rejects.toThrow(
				"changes must be a non-null object",
			);
			await expect(
				tracksRepository.update("t1", "invalid" as any),
			).rejects.toThrow("changes must be a non-null object");
		});
	});

	describe("updateMany", () => {
		it("returns the count of successfully updated tracks", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 0 }),
				makeTrack({ id: "t2", selected: 0 }),
			]);
			const total = await tracksRepository.updateMany([
				{ id: "t1", changes: { selected: 1 } },
				{ id: "t2", changes: { selected: 1 } },
				{ id: "missing", changes: { selected: 1 } },
			]);
			expect(total).toBe(2);
			expect((await db.tracks.get("t1"))?.selected).toBe(1);
			expect((await db.tracks.get("t2"))?.selected).toBe(1);
		});

		it("returns 0 for an empty update list", async () => {
			expect(await tracksRepository.updateMany([])).toBe(0);
		});

		it("rejects updating filePath to an existing one with a ConstraintError", async () => {
			await db.tracks.add(makeTrack({ id: "t1", filePath: "/music/a.mp3" }));
			await db.tracks.add(makeTrack({ id: "t2", filePath: "/music/b.mp3" }));
			await db.tracks.add(makeTrack({ id: "t3", filePath: "/music/c.mp3" }));
			await expect(
				tracksRepository.updateMany([
					{ id: "t2", changes: { filePath: "/music/a.mp3" } },
					{ id: "t3", changes: { filePath: "/music/a.mp3" } },
				]),
			).rejects.toThrow(
				expect.objectContaining({
					failures: expect.arrayContaining([
						expect.objectContaining({ name: "ConstraintError" }),
					]),
				}),
			);
		});

		it("normalizes collectionIds changes and removes duplicate system collection ids", async () => {
			await db.tracks.bulkAdd([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
				makeTrack({
					id: "t2",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			await tracksRepository.updateMany([
				{
					id: "t1",
					changes: {
						collectionIds: [SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID, "mix1"],
					},
				},
				{
					id: "t2",
					changes: {
						collectionIds: ["mix2", "mix2"],
					},
				},
			]);
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect((await db.tracks.get("t2"))?.collectionIds).toEqual([
				"mix2",
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("does not modify collectionIds when updateMany changes do not include collectionIds", async () => {
			await db.tracks.bulkAdd([
				makeTrack({
					id: "t1",
					selected: 0,
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
				makeTrack({
					id: "t2",
					selected: 0,
					collectionIds: [SYSTEM_COLLECTION_ID, "mix2"],
				}),
			]);
			await tracksRepository.updateMany([
				{
					id: "t1",
					changes: { selected: 1 },
				},
				{
					id: "t2",
					changes: { selected: 1 },
				},
			]);
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect((await db.tracks.get("t2"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix2",
			]);
		});

		it("rejects invalid collectionIds values in updateMany changes", async () => {
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await expect(
				tracksRepository.updateMany([
					{
						id: "t1",
						changes: {
							collectionIds: [SYSTEM_COLLECTION_ID, ""],
						},
					},
				]),
			).rejects.toThrow("updates[0].changes is invalid: collectionIds.1:");
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("rejects an empty changes object in updateMany", async () => {
			await db.tracks.add(makeTrack({ id: "t1", selected: 0 }));
			await expect(
				tracksRepository.updateMany([{ id: "t1", changes: {} as any }]),
			).rejects.toThrow(/at least one field/i);
			expect((await db.tracks.get("t1"))?.selected).toBe(0);
		});
	});

	describe("remove", () => {
		it("deletes the track when it exists", async () => {
			await db.tracks.add(makeTrack({ id: "t1" }));
			await tracksRepository.remove("t1");
			expect(await db.tracks.get("t1")).toBeUndefined();
		});

		it("does not throw when the track does not exist", async () => {
			await expect(tracksRepository.remove("missing")).resolves.toBeUndefined();
		});
	});

	describe("getSelectedTracks", () => {
		it("returns only tracks with selected === 1", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 1 }),
				makeTrack({ id: "t2", selected: 0 }),
				makeTrack({ id: "t3", selected: 1 }),
			]);
			expect(
				(await tracksRepository.getSelectedTracks()).map((t) => t.id).sort(),
			).toEqual(["t1", "t3"]);
		});

		it("excludes tracks where selected is 0", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 0 }),
				makeTrack({ id: "t2", selected: 1 }),
				makeTrack({ id: "t3", selected: 0 }),
			]);
			expect(
				(await tracksRepository.getSelectedTracks()).map((t) => t.id).sort(),
			).toEqual(["t2"]);
		});

		it("excludes corrupted non-one selected values", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 1 }),
				makeTrack({ id: "t2", selected: 0 }),
				makeTrack({
					id: "t3",
					selected: 2 as unknown as Metadata["selected"],
				}),
				makeTrack({
					id: "t4",
					selected: null as unknown as Metadata["selected"],
				}),
				makeTrack({
					id: "t5",
					selected: undefined as unknown as Metadata["selected"],
				}),
			]);
			expect(
				(await tracksRepository.getSelectedTracks()).map((t) => t.id).sort(),
			).toEqual(["t1"]);
		});

		it("returns an empty array when none are selected", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 0 }),
				makeTrack({ id: "t2", selected: 0 }),
			]);
			expect(await tracksRepository.getSelectedTracks()).toEqual([]);
		});
	});

	describe("removeMany", () => {
		it("deletes all selected tracks and keeps the rest", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 1 }),
				makeTrack({ id: "t2", selected: 0 }),
				makeTrack({ id: "t3", selected: 1 }),
			]);
			await tracksRepository.removeMany();
			expect((await db.tracks.toArray()).map((t) => t.id).sort()).toEqual([
				"t2",
			]);
		});

		it("deletes nothing when no tracks are selected", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 0 }),
				makeTrack({ id: "t2", selected: 0 }),
			]);
			await tracksRepository.removeMany();
			expect(await db.tracks.count()).toBe(2);
		});

		it("succeeds on an empty table", async () => {
			await expect(tracksRepository.removeMany()).resolves.toBeUndefined();
			expect(await db.tracks.count()).toBe(0);
		});
	});

	describe("status transition guard (update)", () => {
		const transitionMatrix = STATUS_VALUES.flatMap((from) =>
			STATUS_VALUES.map((to) => ({
				from,
				to,
				legal: LEGAL_TRANSITION_EDGES.has(`${from}->${to}`),
			})),
		);

		it.each(transitionMatrix)("$from -> $to", async ({ from, to, legal }) => {
			await seedTrackWithStatus("t1", from);
			const result = await tracksRepository.update("t1", statusChange(to));
			const persisted = await db.tracks.get("t1");
			if (legal) {
				expect(result).toBe(1);
				expect(persisted?.status).toBe(to);
			} else {
				expect(result).toBe(0);
				expect(persisted?.status).toBe(from);
			}
		});

		it("persists the failure reason on processing -> failed", async () => {
			await seedTrackWithStatus("t1", "processing");
			await tracksRepository.update("t1", {
				status: "failed",
				reason: "FFmpeg crashed",
			});
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("failed");
			expect((track as any)?.reason).toBe("FFmpeg crashed");
		});

		it("persists the reason on the forward-skip pending -> failed", async () => {
			await seedTrackWithStatus("t1", "pending");
			await tracksRepository.update("t1", {
				status: "failed",
				reason: "input unreadable",
			});
			expect((await db.tracks.get("t1"))?.status).toBe("failed");
		});

		it("treats duplicate terminal events idempotently (completed twice)", async () => {
			await seedTrackWithStatus("t1", "processing");
			expect(await tracksRepository.update("t1", { status: "completed" })).toBe(
				1,
			);
			expect(await tracksRepository.update("t1", { status: "completed" })).toBe(
				0,
			);
			expect((await db.tracks.get("t1"))?.status).toBe("completed");
		});

		it("treats duplicate failed events idempotently", async () => {
			await seedTrackWithStatus("t1", "processing");
			const change = { status: "failed", reason: "boom" };
			expect(await tracksRepository.update("t1", change)).toBe(1);
			expect(await tracksRepository.update("t1", change)).toBe(0);
		});

		it("returns 0 for a status change on a missing track without throwing", async () => {
			await expect(
				tracksRepository.update("missing", { status: "processing" }),
			).resolves.toBe(0);
		});

		it("does not apply the guard to non-status field changes", async () => {
			await seedTrackWithStatus("t1", "completed");
			expect(await tracksRepository.update("t1", { selected: 1 })).toBe(1);
			const track = await db.tracks.get("t1");
			expect(track?.selected).toBe(1);
			expect(track?.status).toBe("completed");
		});

		it("leaves the row byte-identical when a transition is rejected", async () => {
			await seedTrackWithStatus("t1", "completed");
			const before = await db.tracks.get("t1");
			await tracksRepository.update("t1", { status: "pending" });
			expect(await db.tracks.get("t1")).toEqual(before);
		});

		it("clears stale reason when transitioning from failed to processing", async () => {
			await seedTrackWithStatus("t1", "failed");
			await tracksRepository.update("t1", { status: "processing" });
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("processing");
			expect(
				(track as { reason?: string } | undefined)?.reason,
			).toBeUndefined();
		});

		it("persists statusSeq across multiple updates", async () => {
			await seedTrackWithStatus("t1", "pending");
			await tracksRepository.update("t1", statusChange("processing", 1));
			await tracksRepository.update("t1", statusChange("completed", 2));
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("completed");
			expect(track?.statusSeq).toBe(2);
		});
	});

	describe("sequence guard (out-of-order status events)", () => {
		it("applies a legal transition carrying a higher seq and advances statusSeq", async () => {
			await seedTrackWithStatus("t1", "pending");
			expect(
				await tracksRepository.update("t1", statusChange("processing", 1)),
			).toBe(1);
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("processing");
			expect(track?.statusSeq).toBe(1);
		});

		it("discards an event whose seq equals the stored high-water mark", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 2 }),
			);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 2)),
			).toBe(0);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
		});

		it("discards an event whose seq is below the stored high-water mark", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 3 }),
			);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 1)),
			).toBe(0);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
		});

		it("keeps the high-water mark monotonic across mixed stale/fresh events", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 3 }),
			);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 2)),
			).toBe(0);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 4)),
			).toBe(1);
			expect((await db.tracks.get("t1"))?.statusSeq).toBe(4);
		});

		it("leaves statusSeq untouched when the event carries no seq", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 2 }),
			);
			expect(await tracksRepository.update("t1", { status: "completed" })).toBe(
				1,
			);
			expect((await db.tracks.get("t1"))?.statusSeq).toBe(2);
		});

		it("discards a late lower-seq processing arriving after completed committed", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 1 }),
			);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 2)),
			).toBe(1);
			expect(
				await tracksRepository.update("t1", statusChange("processing", 1)),
			).toBe(0);
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("completed");
			expect(track?.statusSeq).toBe(2);
		});

		it("resolves the concurrent completed/late-processing race deterministically", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 1 }),
			);
			const [completedResult, lateProcessingResult] = await Promise.all([
				tracksRepository.update("t1", statusChange("completed", 2)),
				tracksRepository.update("t1", statusChange("processing", 1)),
			]);
			expect(completedResult + lateProcessingResult).toBe(1);
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("completed");
			expect(track?.statusSeq).toBe(2);
		});

		it("cannot detect staleness without seq (documented degradation)", async () => {
			await db.tracks.add(makeTrack({ id: "t1", status: "processing" }));
			await tracksRepository.update("t1", { status: "completed" });
			await expect(
				tracksRepository.update("t1", { status: "processing" }),
			).resolves.toBe(1);
		});
	});

	describe("status transition guard (updateMany)", () => {
		it("applies only legal transitions and counts them", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1" }),
				makeTrack({ id: "t2", status: "completed" }),
				makeTrack({
					id: "t3",
					status: "failed",
					reason: "boom",
				} as Partial<Metadata>),
			]);
			const total = await tracksRepository.updateMany([
				{ id: "t1", changes: { status: "processing" } }, // legal
				{ id: "t2", changes: { status: "failed", reason: "r" } }, // backward
				{ id: "t3", changes: { status: "pending" } }, // backward
				{ id: "missing", changes: { status: "processing" } }, // no row
			]);
			expect(total).toBe(1);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
			expect((await db.tracks.get("t2"))?.status).toBe("completed");
			expect((await db.tracks.get("t3"))?.status).toBe("failed");
		});

		it("does not throw when every transition in the batch is illegal", async () => {
			await seedTrackWithStatus("t1", "completed");
			await expect(
				tracksRepository.updateMany([
					{ id: "t1", changes: { status: "pending" } },
				]),
			).resolves.toBe(0);
			expect((await db.tracks.get("t1"))?.status).toBe("completed");
		});

		it("honours seq across the batch", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 5 }),
			);
			const total = await tracksRepository.updateMany([
				{ id: "t1", changes: statusChange("completed", 4) }, // stale
			]);
			expect(total).toBe(0);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
		});

		it("mixes status and field updates in one batch without cross-interference", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1" }),
				makeTrack({ id: "t2", selected: 0 }),
			]);
			const total = await tracksRepository.updateMany([
				{ id: "t1", changes: { status: "processing" } },
				{ id: "t2", changes: { selected: 1 } },
			]);
			expect(total).toBe(2);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
			expect((await db.tracks.get("t2"))?.selected).toBe(1);
		});
	});
});
