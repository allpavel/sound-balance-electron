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
import { v7 as uuidV7 } from "uuid";
import {
	type SettingsForm,
	settingsSchema,
} from "@/src/shared/schemas/settings.schema";
import {
	configureUuidMock,
	makeCollection,
	makeTrack,
	resetDatabase,
	resetSequences,
	resetTestState,
} from "./testFactories";

function getValidSettings(): SettingsForm {
	return settingsSchema.parse({
		global: {
			outputDirectoryPath: "/music/out",
			openOutputFolderOnComplete: true,
			concurrency: 4,
			overwrite: false,
			noOverwrite: true,
		},
		audio: {
			audioCodec: "libmp3lame",
			codecOptions: {
				compression_level: 5,
			},
			audioQuality: "vbr",
			audioQualityValue: "4",
			outputExtension: ".mp3",
			audioFilter: "loudnorm",
			filterOptions: {
				I: -24,
				LRA: 7,
			},
		},
	});
}

describe("testFactories", () => {
	beforeEach(async () => {
		await resetTestState();
	});

	describe("configureUuidMock", () => {
		it("installs a deterministic sequential uuid v7 implementation", () => {
			configureUuidMock();
			expect(uuidV7()).toBe("mock-uuid-1");
			expect(uuidV7()).toBe("mock-uuid-2");
			expect(uuidV7()).toBe("mock-uuid-3");
		});

		it("resets the counter on each call so every test starts at mock-uuid-1", () => {
			configureUuidMock();
			uuidV7();
			uuidV7();
			configureUuidMock();
			expect(uuidV7()).toBe("mock-uuid-1");
		});

		it("does not reset entity factory sequences", () => {
			const first = makeCollection();
			configureUuidMock();
			const second = makeCollection();
			expect(first.id).toBe("col-1");
			expect(second.id).toBe("col-2");
		});
	});

	describe("resetFactorySequences", () => {
		it("resets uuid, collection, and track sequences", () => {
			configureUuidMock();
			uuidV7();
			makeCollection();
			makeTrack();
			resetSequences();
			expect(uuidV7()).toBe("mock-uuid-1");
			expect(makeCollection().id).toBe("col-1");
			expect(makeTrack().id).toBe("track-1");
		});

		it("allows deterministic factory output after reset", () => {
			makeCollection();
			makeTrack();
			resetSequences();
			expect(makeCollection()).toEqual({
				id: "col-1",
				title: "Collection 1",
			});
			expect(makeTrack()).toEqual({
				id: "track-1",
				filePath: "/music/track-1.mp3",
				collectionIds: ["all"],
				selected: 0,
			});
		});
	});

	describe("resetDatabase", () => {
		it("clears tracks, collections, and settings, then re-seeds the 'all' collection", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1" }),
				makeTrack({ id: "t2" }),
			]);
			await db.collections.add(makeCollection({ id: "extra", title: "Extra" }));
			await db.settings.put({
				id: "globalSettings",
				settings: getValidSettings(),
			});
			expect(await db.tracks.count()).toBe(2);
			expect(await db.collections.count()).toBe(2);
			expect(await db.settings.count()).toBe(1);
			await resetDatabase();
			expect(await db.tracks.count()).toBe(0);
			expect(await db.collections.toArray()).toEqual([
				{ id: "all", title: "All" },
			]);
			expect(await db.settings.count()).toBe(0);
		});

		it("is idempotent on an already-clean database", async () => {
			await resetDatabase();
			await expect(resetDatabase()).resolves.toBeUndefined();
			expect(await db.collections.toArray()).toEqual([
				{ id: "all", title: "All" },
			]);
			expect(await db.tracks.count()).toBe(0);
			expect(await db.settings.count()).toBe(0);
		});

		it("propagates database errors when clearing tracks fails", async () => {
			vi.spyOn(db.tracks, "clear").mockRejectedValueOnce(
				new Error("tracks clear failed"),
			);
			await expect(resetDatabase()).rejects.toThrow("tracks clear failed");
		});

		it("propagates database errors when seeding the 'all' collection fails", async () => {
			vi.spyOn(db.collections, "add").mockRejectedValueOnce(
				new Error("seed failed"),
			);
			await expect(resetDatabase()).rejects.toThrow("seed failed");
		});
	});

	describe("resetTestState", () => {
		it("resets uuid mock, factory sequences, and database", async () => {
			makeCollection();
			makeTrack();
			uuidV7();
			await db.collections.add(makeCollection({ id: "extra", title: "Extra" }));
			await db.tracks.bulkAdd([makeTrack({ id: "t1" })]);
			await db.settings.put({
				id: "globalSettings",
				settings: getValidSettings(),
			});
			await resetTestState();
			expect(uuidV7()).toBe("mock-uuid-1");
			expect(makeCollection()).toEqual({
				id: "col-1",
				title: "Collection 1",
			});
			expect(makeTrack()).toEqual({
				id: "track-1",
				filePath: "/music/track-1.mp3",
				collectionIds: ["all"],
				selected: 0,
			});
			expect(await db.collections.toArray()).toEqual([
				{ id: "all", title: "All" },
			]);
			expect(await db.tracks.count()).toBe(0);
			expect(await db.settings.count()).toBe(0);
		});
	});

	describe("makeCollection", () => {
		it("produces deterministic defaults after a sequence reset", () => {
			expect(makeCollection()).toEqual({
				id: "col-1",
				title: "Collection 1",
			});
			expect(makeCollection()).toEqual({
				id: "col-2",
				title: "Collection 2",
			});
		});

		it("uses a sequence independent from makeTrack", () => {
			makeTrack();
			makeTrack();
			expect(makeCollection()).toEqual({
				id: "col-1",
				title: "Collection 1",
			});
			makeTrack();
			expect(makeCollection()).toEqual({
				id: "col-2",
				title: "Collection 2",
			});
		});

		it("applies full overrides", () => {
			expect(
				makeCollection({ id: "custom-id", title: "Custom Title" }),
			).toEqual({
				id: "custom-id",
				title: "Custom Title",
			});
		});

		it("applies partial title override while preserving generated id", () => {
			expect(makeCollection({ title: "Custom Title" })).toEqual({
				id: "col-1",
				title: "Custom Title",
			});
		});

		it("applies partial id override while preserving generated title", () => {
			expect(makeCollection({ id: "custom-id" })).toEqual({
				id: "custom-id",
				title: "Collection 1",
			});
		});

		it("returns a new object on each call", () => {
			const first = makeCollection();
			const second = makeCollection();
			expect(first).not.toBe(second);
		});
	});

	describe("makeTrack", () => {
		it("produces deterministic defaults after a sequence reset", () => {
			expect(makeTrack()).toEqual({
				id: "track-1",
				filePath: "/music/track-1.mp3",
				collectionIds: ["all"],
				selected: 0,
			});
			expect(makeTrack()).toEqual({
				id: "track-2",
				filePath: "/music/track-2.mp3",
				collectionIds: ["all"],
				selected: 0,
			});
		});

		it("uses a sequence independent from makeCollection", () => {
			makeCollection();
			makeCollection();
			expect(makeTrack().id).toBe("track-1");
			makeCollection();
			expect(makeTrack().id).toBe("track-2");
		});

		it("applies full overrides", () => {
			expect(
				makeTrack({
					id: "explicit",
					filePath: "/other/path.mp3",
					collectionIds: ["all", "mix1"],
					selected: 1,
				}),
			).toEqual({
				id: "explicit",
				filePath: "/other/path.mp3",
				collectionIds: ["all", "mix1"],
				selected: 1,
			});
		});

		it("applies partial selected override while preserving generated defaults", () => {
			expect(makeTrack({ selected: 1 })).toEqual({
				id: "track-1",
				filePath: "/music/track-1.mp3",
				collectionIds: ["all"],
				selected: 1,
			});
		});

		it("applies partial collectionIds override while preserving generated defaults", () => {
			expect(makeTrack({ collectionIds: ["all", "mix1"] })).toEqual({
				id: "track-1",
				filePath: "/music/track-1.mp3",
				collectionIds: ["all", "mix1"],
				selected: 0,
			});
		});

		it("does not derive filePath from an overridden id", () => {
			const track = makeTrack({ id: "explicit-id" });
			expect(track.id).toBe("explicit-id");
			expect(track.filePath).toBe("/music/track-1.mp3");
			expect(track.filePath).not.toBe("/music/explicit-id.mp3");
		});

		it("preserves generated id when filePath is overridden", () => {
			expect(makeTrack({ filePath: "/other/path.mp3" })).toEqual({
				id: "track-1",
				filePath: "/other/path.mp3",
				collectionIds: ["all"],
				selected: 0,
			});
		});

		it("returns isolated collectionIds arrays on each call", () => {
			const first = makeTrack();
			first.collectionIds.push("modified");
			const second = makeTrack();
			expect(first.collectionIds).toEqual(["all", "modified"]);
			expect(second.collectionIds).toEqual(["all"]);
		});
	});
});
