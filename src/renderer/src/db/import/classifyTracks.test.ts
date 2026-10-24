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

import type { ExistingTrackRef } from "@renderer/db/types";
import { configureUuidMock } from "@renderer/utils/test-utils";
import { SYSTEM_COLLECTION_ID } from "@shared/constants";
import { makeIngestionTrack } from "@tests/factories";
import { classifyTracks } from "./classifyTracks";

describe("classifyTracks", () => {
	beforeEach(() => {
		configureUuidMock();
	});

	it("classifies a new track (no existing) as 'add' with normalized collectionIds", () => {
		const track = makeIngestionTrack({
			id: "new",
			filePath: "/music/new.mp3",
			collectionIds: [],
		});
		const plan = classifyTracks([track], new Map(), "mix1");
		expect(plan.toAdd).toHaveLength(1);
		expect(plan.toAdd[0]?.id).toBe("new");
		expect(plan.toAdd[0]?.collectionIds).toEqual([
			SYSTEM_COLLECTION_ID,
			"mix1",
		]);
		expect(plan.toUpdate).toEqual([]);
		expect(plan.mergedIds).toEqual([]);
		expect(plan.skippedIds).toEqual([]);
		expect(plan.artworksToSave).toEqual([]);
	});

	it("classifies an existing track with a new collection as 'merge'", () => {
		const track = makeIngestionTrack({
			id: "merge-me",
			filePath: "/music/merge.mp3",
			collectionIds: ["all"],
		});
		const existing = new Map<string, ExistingTrackRef>([
			["/music/merge.mp3", { id: "merge-me", collectionIds: ["all"] }],
		]);
		const plan = classifyTracks([track], existing, "mix1");
		expect(plan.toAdd).toEqual([]);
		expect(plan.toUpdate).toHaveLength(1);
		expect(plan.toUpdate[0]?.key).toBe("merge-me");
		expect(plan.toUpdate[0]?.changes.collectionIds).toEqual(["all", "mix1"]);
		expect(plan.mergedIds).toEqual(["merge-me"]);
		expect(plan.skippedIds).toEqual([]);
		expect(plan.artworksToSave).toEqual([]);
	});

	it("classifies an existing track already in the target collection as 'skip'", () => {
		const track = makeIngestionTrack({
			id: "skip-me",
			filePath: "/music/skip.mp3",
			collectionIds: ["all", "mix1"],
		});
		const existing = new Map<string, ExistingTrackRef>([
			["/music/skip.mp3", { id: "skip-me", collectionIds: ["all", "mix1"] }],
		]);
		const plan = classifyTracks([track], existing, "mix1");
		expect(plan.toAdd).toEqual([]);
		expect(plan.toUpdate).toEqual([]);
		expect(plan.mergedIds).toEqual([]);
		expect(plan.skippedIds).toEqual(["skip-me"]);
	});

	it("extracts artwork from a new track and replaces common.picture with UUID refs", () => {
		const track = makeIngestionTrack(
			{
				id: "art-new",
				filePath: "/music/art.mp3",
				collectionIds: [],
			},
			[
				{
					format: "image/jpeg",
					data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
					name: "cover.jpg",
				},
			],
		);
		const plan = classifyTracks([track], new Map(), "all");
		expect(plan.toAdd).toHaveLength(1);
		expect(plan.toAdd[0]?.common?.picture).toHaveLength(1);
		expect(typeof plan.toAdd[0]?.common?.picture?.[0]).toBe("string");
		expect(plan.artworksToSave).toHaveLength(1);
		expect(plan.artworksToSave[0]?.format).toBe("image/jpeg");
		expect(plan.artworksToSave[0]?.name).toBe("cover.jpg");
		expect(plan.artworksToSave[0]?.blob).toBeInstanceOf(Blob);
		// the UUID ref matches the artwork id
		expect(plan.toAdd[0]?.common?.picture?.[0]).toBe(
			plan.artworksToSave[0]?.id,
		);
	});

	it("does not extract artwork for merged tracks (orphan-artwork regression)", () => {
		const track = makeIngestionTrack(
			{
				id: "reimport",
				filePath: "/music/merge.mp3",
				collectionIds: ["all"],
			},
			[{ format: "image/png", data: new Uint8Array([1]) }],
		);
		const existing = new Map<string, ExistingTrackRef>([
			["/music/merge.mp3", { id: "reimport", collectionIds: ["all"] }],
		]);
		const plan = classifyTracks([track], existing, "mix1");
		expect(plan.mergedIds).toEqual(["reimport"]);
		expect(plan.artworksToSave).toEqual([]);
	});

	it("handles a mixed batch: new + merge + skip (skip has artwork — must NOT extract)", () => {
		const tracks = [
			makeIngestionTrack({
				id: "new",
				filePath: "/music/new.mp3",
				collectionIds: [],
			}),
			makeIngestionTrack({
				id: "merge",
				filePath: "/music/merge.mp3",
				collectionIds: ["all"],
			}),
			makeIngestionTrack(
				{
					id: "skip",
					filePath: "/music/skip.mp3",
					collectionIds: ["all", "mix1"],
				},
				[{ format: "image/jpeg", data: new Uint8Array([1]) }],
			),
		];
		const existing = new Map<string, ExistingTrackRef>([
			["/music/merge.mp3", { id: "merge", collectionIds: ["all"] }],
			["/music/skip.mp3", { id: "skip", collectionIds: ["all", "mix1"] }],
		]);
		const plan = classifyTracks(tracks, existing, "mix1");
		expect(plan.toAdd).toHaveLength(1);
		expect(plan.toUpdate).toHaveLength(1);
		expect(plan.mergedIds).toEqual(["merge"]);
		expect(plan.skippedIds).toEqual(["skip"]);
		// skip track has artwork but it must NOT be extracted
		expect(plan.artworksToSave).toEqual([]);
	});

	it("passes a Blob picture through unchanged and preserves its description", () => {
		const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
		const track = makeIngestionTrack(
			{
				id: "blob-art",
				filePath: "/music/blob.mp3",
				collectionIds: [],
			},
			[{ format: "image/png", data: blob, description: "front cover" }],
		);
		const plan = classifyTracks([track], new Map(), "all");
		expect(plan.toAdd).toHaveLength(1);
		expect(plan.artworksToSave).toHaveLength(1);
		expect(plan.artworksToSave[0]?.blob).toBe(blob);
		expect(plan.artworksToSave[0]?.format).toBe("image/png");
		expect(plan.artworksToSave[0]?.description).toBe("front cover");
		expect(plan.toAdd[0]?.common?.picture?.[0]).toBe(
			plan.artworksToSave[0]?.id,
		);
	});

	it("extracts every picture of a multi-picture track in input order", () => {
		const track = makeIngestionTrack(
			{
				id: "multi-art",
				filePath: "/music/multi.mp3",
				collectionIds: [],
			},
			[
				{ format: "image/jpeg", data: new Uint8Array([1]) },
				{ format: "image/png", data: new Uint8Array([2]), name: "back.png" },
			],
		);
		const plan = classifyTracks([track], new Map(), "all");
		expect(plan.artworksToSave).toHaveLength(2);
		const refs = plan.toAdd[0]?.common?.picture;
		expect(refs).toHaveLength(2);
		expect(refs?.[0]).toBe(plan.artworksToSave[0]?.id);
		expect(refs?.[1]).toBe(plan.artworksToSave[1]?.id);
		expect(plan.artworksToSave[0]?.format).toBe("image/jpeg");
		expect(plan.artworksToSave[1]?.format).toBe("image/png");
		expect(plan.artworksToSave[1]?.name).toBe("back.png");
		// binary payloads never leak into the track row
		expect(
			plan.toAdd[0]?.common?.picture?.every((r) => typeof r === "string"),
		).toBe(true);
	});

	it("returns an empty plan for empty input", () => {
		const plan = classifyTracks([], new Map(), "all");
		expect(plan.toAdd).toEqual([]);
		expect(plan.toUpdate).toEqual([]);
		expect(plan.mergedIds).toEqual([]);
		expect(plan.skippedIds).toEqual([]);
		expect(plan.artworksToSave).toEqual([]);
	});

	it("unions incoming collectionIds with existing row on merge", () => {
		const track = makeIngestionTrack({
			id: "merge-me",
			filePath: "/music/merge.mp3",
			collectionIds: [SYSTEM_COLLECTION_ID, "rock"],
		});
		const existing = new Map<string, ExistingTrackRef>([
			[
				"/music/merge.mp3",
				{ id: "merge-me", collectionIds: [SYSTEM_COLLECTION_ID] },
			],
		]);
		const plan = classifyTracks([track], existing, "mix1");
		expect(plan.toUpdate).toHaveLength(1);
		expect(plan.toUpdate[0]?.key).toBe("merge-me");
		// Union: existing ["all"] + incoming ["all","rock"] → deduped ["all","rock"]
		// + target "mix1" appended → ["all", "rock", "mix1"]
		expect(plan.toUpdate[0]?.changes.collectionIds).toEqual([
			SYSTEM_COLLECTION_ID,
			"rock",
			"mix1",
		]);
		expect(plan.mergedIds).toEqual(["merge-me"]);
		expect(plan.skippedIds).toEqual([]);
	});

	it("skips merge when incoming collectionIds are a subset of existing", () => {
		const track = makeIngestionTrack({
			id: "skip-me",
			filePath: "/music/skip.mp3",
			collectionIds: [SYSTEM_COLLECTION_ID],
		});
		const existing = new Map<string, ExistingTrackRef>([
			[
				"/music/skip.mp3",
				{ id: "skip-me", collectionIds: [SYSTEM_COLLECTION_ID, "mix1"] },
			],
		]);
		const plan = classifyTracks([track], existing, "mix1");
		// Union adds nothing new → areCollectionIdsEqual → skip
		expect(plan.skippedIds).toEqual(["skip-me"]);
		expect(plan.toUpdate).toEqual([]);
		expect(plan.mergedIds).toEqual([]);
	});

	it("preserves existing order and appends new incoming IDs", () => {
		const track = makeIngestionTrack({
			id: "merge-order",
			filePath: "/music/order.mp3",
			collectionIds: ["jazz", SYSTEM_COLLECTION_ID],
		});
		const existing = new Map<string, ExistingTrackRef>([
			[
				"/music/order.mp3",
				{ id: "merge-order", collectionIds: ["rock", SYSTEM_COLLECTION_ID] },
			],
		]);
		const plan = classifyTracks([track], existing, "mix1");

		expect(plan.toUpdate).toHaveLength(1);
		// Existing ["rock","all"] + incoming ["jazz","all"]
		// → deduped insertion order: ["rock","all","jazz"]
		// → system "all" already present → ["rock","all","jazz"]
		// → target "mix1" appended → ["rock","all","jazz","mix1"]
		expect(plan.toUpdate[0]?.changes.collectionIds).toEqual([
			"rock",
			SYSTEM_COLLECTION_ID,
			"jazz",
			"mix1",
		]);
	});
});
