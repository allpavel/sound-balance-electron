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
import {
	resetDatabase,
	resetTestState,
	seedCollection,
} from "@renderer/utils/test-utils";
import { ANYOF_CHUNK_SIZE, SYSTEM_COLLECTION_ID } from "@shared/constants";
import type { IngestionMetadata } from "@shared/schemas/track.schema";
import type { AddManyResult } from "@shared/types";
import { makeIngestionTrack, makeTrack } from "@tests/factories";
import { fetchExistingTrackRefs, processBatch } from ".";

describe("fetchExistingTrackRefs", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("returns an empty map for empty input", async () => {
		const result = await fetchExistingTrackRefs([], db.tracks);
		expect(result.size).toBe(0);
	});

	it("projects matching rows to {id, collectionIds} keyed by filePath", async () => {
		await db.tracks.bulkAdd([
			makeTrack({
				id: "t1",
				filePath: "/music/a.mp3",
				collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
			}),
			makeTrack({
				id: "t2",
				filePath: "/music/b.mp3",
				collectionIds: [SYSTEM_COLLECTION_ID],
			}),
		]);
		const result = await fetchExistingTrackRefs(
			["/music/a.mp3", "/music/b.mp3", "/music/ghost.mp3"],
			db.tracks,
		);
		expect(result.size).toBe(2);
		expect(result.get("/music/a.mp3")).toEqual({
			id: "t1",
			collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
		});
		expect(result.get("/music/b.mp3")).toEqual({
			id: "t2",
			collectionIds: [SYSTEM_COLLECTION_ID],
		});
		expect(result.has("/music/ghost.mp3")).toBe(false);
	});

	it("deduplicates input filePaths (the same row appears once)", async () => {
		await db.tracks.add(
			makeTrack({
				id: "t1",
				filePath: "/music/a.mp3",
				collectionIds: [SYSTEM_COLLECTION_ID],
			}),
		);
		const result = await fetchExistingTrackRefs(
			["/music/a.mp3", "/music/a.mp3"],
			db.tracks,
		);
		expect(result.size).toBe(1);
		expect(result.get("/music/a.mp3")?.id).toBe("t1");
	});

	it("returns an empty map when no filePaths match", async () => {
		await db.tracks.add(
			makeTrack({
				id: "t1",
				filePath: "/music/a.mp3",
				collectionIds: [SYSTEM_COLLECTION_ID],
			}),
		);
		const result = await fetchExistingTrackRefs(
			["/music/ghost.mp3", "/music/another.mp3"],
			db.tracks,
		);
		expect(result.size).toBe(0);
	});

	it("resolves more than ANYOF_CHUNK_SIZE filePaths (chunking is exercised)", async () => {
		const count = ANYOF_CHUNK_SIZE + 10;
		const tracks = Array.from({ length: count }, (_, i) =>
			makeTrack({
				id: `t${i}`,
				filePath: `/music/t${i}.mp3`,
				collectionIds: [SYSTEM_COLLECTION_ID],
			}),
		);
		await db.tracks.bulkAdd(tracks);
		const filePaths = tracks.map((t) => t.filePath);
		const result = await fetchExistingTrackRefs(filePaths, db.tracks);
		expect(result.size).toBe(count);
	});
});

describe("processBatch", async () => {
	let artworksBulkAddSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		await resetTestState();
		artworksBulkAddSpy = vi.spyOn(db.artworks, "bulkAdd");
	});

	afterEach(() => {
		artworksBulkAddSpy.mockRestore();
	});

	it("classifies tracks and persists them correctly within a transaction", async () => {
		await db.collections.add({ id: "mix1", title: "Mix1" });
		await db.tracks.add(
			makeTrack({
				id: "exist",
				filePath: "/music/exist.mp3",
				collectionIds: ["all"],
			}),
		);

		const tracks: IngestionMetadata[] = [
			makeIngestionTrack({
				id: "new",
				filePath: "/music/new.mp3",
				collectionIds: [],
			}),
			makeIngestionTrack({
				id: "exist-merge",
				filePath: "/music/exist.mp3",
				collectionIds: ["all"],
			}),
		];
		const result: AddManyResult = await processBatch(tracks, "mix1", db);
		expect(result.added).toHaveLength(1);
		expect(result.merged).toHaveLength(1);
		expect(result.skipped).toHaveLength(0);
		const newTrack = await db.tracks.get("new");
		expect(newTrack?.collectionIds).toEqual(["all", "mix1"]);
		const mergedTrack = await db.tracks.get("exist");
		expect(mergedTrack?.collectionIds).toEqual(["all", "mix1"]);
	});

	it("returns an empty AddManyResult for an empty input array", async () => {
		const result = await processBatch([], SYSTEM_COLLECTION_ID, db);
		expect(result).toEqual({ added: [], merged: [], skipped: [] });
		expect(await db.tracks.count()).toBe(0);
		expect(await db.artworks.count()).toBe(0);
	});

	it("classifies a track already in the target collection as skipped", async () => {
		await seedCollection("mix1");
		await db.tracks.add(
			makeTrack({
				id: "already-there",
				filePath: "/music/skip.mp3",
				collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
			}),
		);
		const tracks: IngestionMetadata[] = [
			makeIngestionTrack(
				{ id: "input-skip", filePath: "/music/skip.mp3", collectionIds: [] },
				[{ format: "image/jpeg", data: new Uint8Array([1]) }],
			),
		];
		const result = await processBatch(tracks, "mix1", db);
		expect(result.skipped).toEqual(["already-there"]);
		expect(result.added).toEqual([]);
		expect(result.merged).toEqual([]);
		expect(artworksBulkAddSpy).not.toHaveBeenCalled();
		expect(await db.artworks.count()).toBe(0);
		const stored = await db.tracks.get("already-there");
		expect(stored?.collectionIds).toEqual([SYSTEM_COLLECTION_ID, "mix1"]);
	});

	it("extracts artwork from new tracks and stores UUID refs", async () => {
		const pictureBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
		const tracks: IngestionMetadata[] = [
			makeIngestionTrack(
				{ id: "art-new", filePath: "/music/art.mp3", collectionIds: [] },
				[{ format: "image/jpeg", data: pictureBytes, name: "cover.jpg" }],
			),
		];
		const result = await processBatch(tracks, SYSTEM_COLLECTION_ID, db);
		expect(result.added).toHaveLength(1);
		const stored = await db.tracks.get("art-new");
		expect(stored?.common?.picture).toHaveLength(1);
		const ref = stored?.common?.picture?.[0];
		expect(typeof ref).toBe("string");
		expect(artworksBulkAddSpy).toHaveBeenCalledTimes(1);
		const savedArtworks = artworksBulkAddSpy.mock.calls[0]?.[0];
		expect(savedArtworks).toHaveLength(1);
		const artwork = savedArtworks?.[0];
		expect(artwork).toBeDefined();
		expect(artwork?.id).toBe(ref);
		expect(artwork?.format).toBe("image/jpeg");
		expect(artwork?.name).toBe("cover.jpg");
		expect(artwork?.blob).toBeInstanceOf(Blob);
	});

	it("does not create artwork rows for merged tracks", async () => {
		await seedCollection("target");
		await db.tracks.add(
			makeTrack({
				id: "existing-merge",
				filePath: "/music/merge.mp3",
				collectionIds: [SYSTEM_COLLECTION_ID],
			}),
		);
		const tracks: IngestionMetadata[] = [
			makeIngestionTrack(
				{ id: "reimport", filePath: "/music/merge.mp3", collectionIds: [] },
				[{ format: "image/png", data: new Uint8Array([1]) }],
			),
		];
		const result = await processBatch(tracks, "target", db);
		expect(result.merged).toEqual(["existing-merge"]);
		expect(artworksBulkAddSpy).not.toHaveBeenCalled();
		expect(await db.artworks.count()).toBe(0);
	});
});
