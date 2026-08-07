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
import { db } from "@renderer/db/db";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import { makeTrack, resetDatabase } from "@renderer/db/utils/testFactories";
import type { Metadata } from "@/types";

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
});
