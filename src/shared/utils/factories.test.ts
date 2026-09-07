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
import { SYSTEM_COLLECTION_ID } from "@shared/constants";
import { dataSchema } from "@shared/schemas/data.schema";
import {
	SETTINGS_SCHEMA_VERSION,
	strictSettingsSchema,
} from "@shared/schemas/settings.schema";
import { trackInputSchema } from "@shared/schemas/track.schema";
import {
	getValidData,
	getValidSettings,
	makeCollection,
	makeTrack,
	resetFactorySequences,
} from "./factories";

describe("shared/utils/factories", () => {
	beforeEach(() => {
		resetFactorySequences();
	});

	describe("resetFactorySequences", () => {
		it("restarts both the collection and track counters at 1", () => {
			makeCollection();
			makeCollection();
			makeTrack();
			makeTrack();
			resetFactorySequences();
			expect(makeCollection().id).toBe("col-1");
			expect(makeTrack().id).toBe("track-1");
		});
	});

	describe("makeCollection", () => {
		it("generates sequential ids and titles from a shared counter", () => {
			expect(makeCollection()).toEqual({ id: "col-1", title: "Collection 1" });
			expect(makeCollection()).toEqual({ id: "col-2", title: "Collection 2" });
		});

		it("applies partial overrides while preserving generated defaults", () => {
			expect(makeCollection({ title: "Custom" })).toEqual({
				id: "col-1",
				title: "Custom",
			});
			expect(makeCollection({ id: "custom-id" })).toEqual({
				id: "custom-id",
				title: "Collection 2",
			});
		});

		it("returns a distinct object on every call", () => {
			expect(makeCollection()).not.toBe(makeCollection());
		});
	});

	describe("makeTrack", () => {
		it("generates sequential id, file, and filePath from a shared counter", () => {
			expect(makeTrack()).toMatchObject({
				id: "track-1",
				file: "track-1.mp3",
				filePath: "/music/track-1.mp3",
			});
			expect(makeTrack()).toMatchObject({
				id: "track-2",
				file: "track-2.mp3",
				filePath: "/music/track-2.mp3",
			});
		});

		it("applies the fixed processing defaults", () => {
			expect(makeTrack()).toMatchObject({
				status: "pending",
				selected: 0,
				collectionIds: [SYSTEM_COLLECTION_ID],
				common: {},
				format: {},
			});
		});

		it("applies overrides on top of defaults without dropping siblings", () => {
			const track = makeTrack({ id: "explicit", selected: 1 });
			expect(track.id).toBe("explicit");
			expect(track.selected).toBe(1);
			expect(track.status).toBe("pending");
			expect(track.collectionIds).toEqual([SYSTEM_COLLECTION_ID]);
		});

		it("uses a sequence that is independent from makeCollection", () => {
			makeCollection();
			makeCollection();
			expect(makeTrack().id).toBe("track-1");
		});

		it("returns an isolated collectionIds array per instance", () => {
			const first = makeTrack();
			first.collectionIds.push("mutated");
			expect(makeTrack().collectionIds).toEqual([SYSTEM_COLLECTION_ID]);
		});

		it("produces a track that satisfies trackInputSchema", () => {
			expect(trackInputSchema.safeParse(makeTrack()).success).toBe(true);
		});

		it("produces a valid failed track when a reason is supplied", () => {
			const failed = makeTrack({ status: "failed", reason: "boom" });
			expect(trackInputSchema.safeParse(failed).success).toBe(true);
		});
	});

	describe("getValidSettings", () => {
		it("returns the complete default settings", () => {
			expect(getValidSettings()).toEqual({
				version: SETTINGS_SCHEMA_VERSION,
				global: {
					outputDirectoryPath: "/music/output",
					openOutputFolderOnComplete: true,
					concurrency: 4,
					overwrite: false,
					noOverwrite: true,
				},
				audio: {
					audioCodec: "libmp3lame",
					codecOptions: { compression_level: 5 },
					audioQuality: "vbr",
					audioQualityValue: "4",
					outputExtension: ".mp3",
					audioFilter: "loudnorm",
					filterOptions: { I: -24, LRA: 7 },
				},
			});
		});

		it("deep-merges nested overrides while preserving sibling fields", () => {
			const settings = getValidSettings({
				global: { concurrency: 9 },
				audio: { filterOptions: { I: -16 } },
			} as any);
			expect(settings.global.concurrency).toBe(9);
			expect(settings.global.outputDirectoryPath).toBe("/music/output");
			expect(settings.audio.filterOptions).toEqual({ I: -16, LRA: 7 });
			expect(settings.audio.audioCodec).toBe("libmp3lame");
		});

		it("does not leak overrides into subsequent default calls", () => {
			getValidSettings({ global: { concurrency: 9 } } as any);
			expect(getValidSettings().global.concurrency).toBe(4);
		});

		it("produces settings that satisfy strictSettingsSchema", () => {
			expect(strictSettingsSchema.safeParse(getValidSettings()).success).toBe(
				true,
			);
		});
	});

	describe("getValidData", () => {
		it("returns one default track and the default settings", () => {
			const data = getValidData();
			expect(data.tracks).toEqual([
				expect.objectContaining({ id: "track-1", status: "pending" }),
			]);
			expect(data.settings).toEqual(getValidSettings());
		});

		it("uses the provided tracks and deep-merges settings overrides", () => {
			const tracks = [makeTrack(), makeTrack()];
			const data = getValidData({
				tracks,
				settings: { global: { concurrency: 2 } } as any,
			});
			expect(data.tracks).toBe(tracks);
			expect(data.settings.global.concurrency).toBe(2);
			expect(data.settings.global.outputDirectoryPath).toBe("/music/output");
		});

		it("produces a payload that satisfies dataSchema", () => {
			expect(dataSchema.safeParse(getValidData()).success).toBe(true);
		});
	});
});
