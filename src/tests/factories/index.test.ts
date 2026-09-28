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
import { formatValidationIssues, pathToString } from "@shared/utils";
import type { ValidationIssue } from "@shared/validators";
import {
	getValidData,
	getValidSettings,
	makeCollection,
	makeIssue,
	makeTrack,
	resetFactorySequences,
} from ".";

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

		it.each([
			["title override", { title: "Custom" }, { id: "col-1", title: "Custom" }],
			[
				"id override",
				{ id: "custom-id" },
				{ id: "custom-id", title: "Collection 1" },
			],
		])("applies partial override: %s", (_desc, overrides, expected) => {
			expect(makeCollection(overrides)).toEqual(expected);
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

	describe("makeIssue", () => {
		describe("field preservation", () => {
			it("preserves pathString, message, and code on the returned object", () => {
				const issue = makeIssue("global.concurrency", "Too small", "too_small");
				expect(issue.pathString).toBe("global.concurrency");
				expect(issue.message).toBe("Too small");
				expect(issue.code).toBe("too_small");
			});

			it("preserves path and pathString consistently", () => {
				const issue = makeIssue("common.picture.0.data", "Too large");
				expect(pathToString(issue.path)).toBe(issue.pathString);
			});
		});

		describe("default code", () => {
			it("defaults code to 'custom' when omitted", () => {
				const issue = makeIssue("id", "Must not be empty");
				expect(issue.code).toBe("custom");
			});

			it("uses the provided code when given", () => {
				const issue = makeIssue("id", "Must not be empty", "too_small");
				expect(issue.code).toBe("too_small");
			});
		});

		describe("path derivation from pathString", () => {
			const pathSplittingCases: ReadonlyArray<
				readonly [string, string, readonly string[]]
			> = [
				["empty string (root-level)", "", []],
				["single segment", "id", ["id"]],
				["two segments", "global.concurrency", ["global", "concurrency"]],
				[
					"deeply nested with numeric segment",
					"common.picture.0.data",
					["common", "picture", "0", "data"],
				],
				["numeric-only segment", "tracks.0.status", ["tracks", "0", "status"]],
			];

			it.each(pathSplittingCases)(
				"splits pathString '%s' into correct path segments",
				(_desc, pathString, expectedPath) => {
					const issue = makeIssue(pathString, "test message");
					expect(issue.path).toEqual(expectedPath);
				},
			);
		});

		describe("immutability (Defense in Depth)", () => {
			it("returns a frozen object", () => {
				const issue = makeIssue("id", "Must not be empty");
				expect(Object.isFrozen(issue)).toBe(true);
			});

			it("returns a frozen path array", () => {
				const issue = makeIssue("global.concurrency", "Too small");
				expect(Object.isFrozen(issue.path)).toBe(true);
			});

			it("field mutations are no-ops in strict mode (frozen object)", () => {
				const issue = makeIssue("id", "Must not be empty");
				const originalMessage = issue.message;
				expect(() => Object.assign(issue, { message: "mutated" })).toThrow(
					TypeError,
				);
				expect(issue.message).toBe(originalMessage);
			});
		});

		describe("contract compliance", () => {
			it("has exactly the four ValidationIssue keys", () => {
				const issue = makeIssue("id", "Must not be empty");
				expect(Object.keys(issue).sort()).toEqual([
					"code",
					"message",
					"path",
					"pathString",
				]);
			});

			it("path is an array", () => {
				const issue = makeIssue("global.concurrency", "Too small");
				expect(Array.isArray(issue.path)).toBe(true);
			});

			it("pathString, message, and code are all strings", () => {
				const issue = makeIssue("global.concurrency", "Too small", "too_small");
				expect(typeof issue.pathString).toBe("string");
				expect(typeof issue.message).toBe("string");
				expect(typeof issue.code).toBe("string");
			});

			it("path elements are strings (split produces string[])", () => {
				const issue = makeIssue("common.picture.0.data", "Too large");
				for (const segment of issue.path) {
					expect(typeof segment).toBe("string");
				}
			});
		});

		describe("path/pathString invariant", () => {
			it.each([
				"",
				"id",
				"global.concurrency",
				"common.picture.0.data",
				"tracks.0.status",
			])(
				"pathToString(issue.path) === issue.pathString for '%s'",
				(pathString) => {
					const issue = makeIssue(pathString, "test");
					expect(pathToString(issue.path)).toBe(issue.pathString);
				},
			);
		});

		describe("integration with formatValidationIssues", () => {
			it("produces issues consumable by formatValidationIssues", () => {
				const issues: readonly ValidationIssue[] = [
					makeIssue("global.concurrency", "Too small", "too_small"),
					makeIssue("audio.audioCodec", "Unrecognized", "invalid_value"),
				];
				expect(formatValidationIssues(issues)).toBe(
					"global.concurrency: Too small; audio.audioCodec: Unrecognized",
				);
			});

			it("produces root-level issues (empty pathString) with bare message", () => {
				const issues: readonly ValidationIssue[] = [
					makeIssue("", "Invalid root payload", "invalid_type"),
				];
				expect(formatValidationIssues(issues)).toBe("Invalid root payload");
			});
		});

		describe("edge cases", () => {
			it("accepts an empty message", () => {
				const issue = makeIssue("id", "");
				expect(issue.message).toBe("");
				expect(issue.pathString).toBe("id");
				expect(issue.path).toEqual(["id"]);
			});

			it("treats a whitespace-only pathString as a single segment", () => {
				const issue = makeIssue("   ", "test");
				expect(issue.path).toEqual(["   "]);
				expect(issue.pathString).toBe("   ");
			});

			it("handles consecutive dots by producing empty-string segments", () => {
				const issue = makeIssue("a..b", "test");
				expect(issue.path).toEqual(["a", "", "b"]);
			});
		});

		describe("isolation", () => {
			it("returns a distinct object on every call", () => {
				const first = makeIssue("id", "Must not be empty");
				const second = makeIssue("id", "Must not be empty");
				expect(first).not.toBe(second);
				expect(first).toEqual(second);
			});

			it("returns a distinct path array on every call", () => {
				const first = makeIssue("global.concurrency", "Too small");
				const second = makeIssue("global.concurrency", "Too small");
				expect(first.path).not.toBe(second.path);
				expect(first.path).toEqual(second.path);
			});

			it("does not share path array references across different pathStrings", () => {
				const first = makeIssue("id", "test");
				const second = makeIssue("file", "test");
				expect(first.path).not.toBe(second.path);
				expect(first.path).toEqual(["id"]);
				expect(second.path).toEqual(["file"]);
			});
		});
	});
});
