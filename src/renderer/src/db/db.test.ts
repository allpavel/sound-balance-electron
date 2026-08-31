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
import { resetDatabase } from "@renderer/utils/test-utils/testFactories";
import { SYSTEM_COLLECTION_ID } from "@shared/constants";
import { makeTrack } from "@shared/utils/factories";

describe("AudioDB", () => {
	describe("database initialization and populate hook", () => {
		beforeEach(async () => {
			await db.delete();
			await db.open();
		});

		it("seeds the system 'all' collection on fresh database initialization", async () => {
			const collections = await db.collections.toArray();
			expect(collections).toEqual([{ id: SYSTEM_COLLECTION_ID, title: "All" }]);
		});

		it("does not duplicate the system collection on subsequent opens", async () => {
			db.close();
			await db.open();
			const count = await db.collections
				.where("id")
				.equals(SYSTEM_COLLECTION_ID)
				.count();
			expect(count).toBe(1);
		});
	});

	describe("schema indexes and constraints", () => {
		beforeEach(async () => {
			await resetDatabase();
		});

		describe("schema indexes", () => {
			it("allows querying tracks by filePath", async () => {
				await db.tracks.add(
					makeTrack({ id: "t1", filePath: "/music/track-1.mp3" }),
				);
				await db.tracks.add(
					makeTrack({ id: "t2", filePath: "/music/track-2.mp3" }),
				);

				const result = await db.tracks
					.where("filePath")
					.equals("/music/track-1.mp3")
					.toArray();
				expect(result).toHaveLength(1);
				expect(result[0]?.id).toBe("t1");
			});

			it("allows querying tracks by collectionIds (multi-entry index)", async () => {
				await db.tracks.bulkAdd([
					makeTrack({ id: "t1", collectionIds: ["all", "mix1"] }),
					makeTrack({ id: "t2", collectionIds: ["mix1", "mix2"] }),
					makeTrack({ id: "t3", collectionIds: ["all"] }),
				]);
				const mix1Tracks = await db.tracks
					.where("collectionIds")
					.equals("mix1")
					.toArray();
				expect(mix1Tracks.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
			});

			it("allows querying tracks by selected state", async () => {
				await db.tracks.bulkAdd([
					makeTrack({ id: "t1", selected: 1 }),
					makeTrack({ id: "t2", selected: 0 }),
				]);
				const selectedTracks = await db.tracks
					.where("selected")
					.equals(1)
					.toArray();
				expect(selectedTracks).toHaveLength(1);
				expect(selectedTracks[0]?.id).toBe("t1");
			});
		});

		describe("primary key constraints", () => {
			it("rejects duplicate track ids", async () => {
				await db.tracks.add(makeTrack({ id: "duplicate-id" }));
				await expect(
					db.tracks.add(makeTrack({ id: "duplicate-id" })),
				).rejects.toThrow(expect.objectContaining({ name: "ConstraintError" }));
			});

			it("rejects duplicate collection ids", async () => {
				await db.collections.add({ id: "custom", title: "Custom" });
				await expect(
					db.collections.add({ id: "custom", title: "Duplicate" }),
				).rejects.toThrow(expect.objectContaining({ name: "ConstraintError" }));
			});

			it("rejects duplicate settings ids with a ConstraintError", async () => {
				await db.settings.add({ id: "globalSettings", settings: {} as any });
				await expect(
					db.settings.add({ id: "globalSettings", settings: {} as any }),
				).rejects.toThrow(expect.objectContaining({ name: "ConstraintError" }));
			});
		});
	});
});
