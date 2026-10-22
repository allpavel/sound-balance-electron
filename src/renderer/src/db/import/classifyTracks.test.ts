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

	it("returns an empty plan for empty input", () => {
		const plan = classifyTracks([], new Map(), "all");
		expect(plan.toAdd).toEqual([]);
		expect(plan.toUpdate).toEqual([]);
		expect(plan.mergedIds).toEqual([]);
		expect(plan.skippedIds).toEqual([]);
		expect(plan.artworksToSave).toEqual([]);
	});
});
