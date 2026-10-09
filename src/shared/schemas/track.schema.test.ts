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

import {
	MAX_BLOB_IMAGE_SIZE,
	MAX_PATH_LENGTH,
	MAX_PICTURE_COUNT,
	MAX_REASON_LENGTH,
	MAX_YEAR,
	STATUS_VALUES,
} from "@shared/constants";
import { configurePlatform, resetPlatform } from "@shared/utils";
import { makeTrack } from "@tests/factories";
import { expectFailure, expectSuccess, hasIssueWithPath } from "@tests/utils";
import {
	collectionIdsSchema,
	filePathSchema,
	selectedSchema,
	statusSchema,
	targetCollectionIdSchema,
	trackChangesSchema,
	trackInputSchema,
	tracksArraySchema,
} from "./track.schema";

const REQUIRED_FIELDS = [
	"id",
	"file",
	"filePath",
	"status",
	"selected",
	"collectionIds",
] as const;

const STRING_IDENTITY_FIELDS = ["id", "file", "filePath"] as const;

function withoutField(field: string): Record<string, unknown> {
	const track = makeTrack();
	delete track[field];
	return track;
}

describe("track.schema", () => {
	describe("track.schema - security constraints", () => {
		it("rejects filePath containing null bytes", () => {
			const issues = expectFailure(
				trackInputSchema.safeParse(
					makeTrack({ filePath: "/music/\0track.mp3" }),
				),
			);
			expect(hasIssueWithPath(issues, ["filePath"])).toBe(true);
		});

		it("rejects filePath exceeding MAX_PATH_LENGTH", () => {
			const issues = expectFailure(
				trackInputSchema.safeParse(
					makeTrack({
						filePath: `/music/${"a".repeat(MAX_PATH_LENGTH + 4)}.mp3`,
					}),
				),
			);
			expect(hasIssueWithPath(issues, ["filePath"])).toBe(true);
		});

		it("rejects id containing null bytes", () => {
			const result = trackInputSchema.safeParse(makeTrack({ id: "track\0id" }));
			expect(result.success).toBe(false);
		});

		it("strips unknown top-level properties instead of preserving them", () => {
			const input = { ...makeTrack(), unknownField: "should be stripped" };
			expect(
				expectSuccess(trackInputSchema.safeParse(input)),
			).not.toHaveProperty("unknownField");
		});

		it("rejects picture data exceeding MAX_BLOB_IMAGE_SIZE", () => {
			const oversizedData = new Uint8Array(MAX_BLOB_IMAGE_SIZE + 1);
			const issues = expectFailure(
				trackInputSchema.safeParse({
					id: "track-1",
					file: "track-1.mp3",
					filePath: "/music/track-1.mp3",
					status: "pending",
					selected: 0,
					collectionIds: ["all"],
					common: {
						picture: [{ format: "image/jpeg", data: oversizedData }],
					},
					format: {},
				}),
			);
			expect(hasIssueWithPath(issues, ["common", "picture", 0, "data"])).toBe(
				true,
			);
		});

		it(`rejects more than ${MAX_PICTURE_COUNT} pictures`, () => {
			const pictures = Array.from({ length: MAX_PICTURE_COUNT + 1 }, () => ({
				format: "image/jpeg",
				data: new Uint8Array([1, 2, 3]),
			}));
			const result = trackInputSchema.safeParse({
				id: "track-1",
				file: "track-1.mp3",
				filePath: "/music/track-1.mp3",
				status: "pending",
				selected: 0,
				collectionIds: ["all"],
				common: {
					picture: pictures,
				},
				format: {},
			});
			expect(result.success).toBe(false);
		});

		it("rejects year outside valid range", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ common: { year: MAX_YEAR + 1 } }),
			);
			expect(result.success).toBe(false);
		});

		it("rejects negative duration", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ format: { duration: -1 } }),
			);
			expect(result.success).toBe(false);
		});
	});

	describe("track.schema - explicit whitelist (common / format)", () => {
		it("accepts whitelisted common fields (genre, composer, artists, albumartist)", () => {
			const input = makeTrack({
				common: {
					title: "Test Track",
					genre: ["Rock", "Alternative"],
					composer: ["John Lennon"],
					artists: ["John Lennon"],
					albumartist: "The Beatles",
				} as any,
			});
			const common = expectSuccess(trackInputSchema.safeParse(input)).common;
			expect(common.genre).toEqual(["Rock", "Alternative"]);
			expect(common.composer).toEqual(["John Lennon"]);
			expect(common.artists).toEqual(["John Lennon"]);
			expect(common.albumartist).toBe("The Beatles");
			expect(common.title).toBe("Test Track");
		});

		it("accepts whitelisted common fields (dates, credits, identifiers)", () => {
			const input = makeTrack({
				common: {
					date: "2024-01-15",
					lyricist: ["Lyricist A"],
					conductor: ["Conductor B"],
					label: ["Label C"],
					barcode: "0123456789012",
					isrc: ["USRC17607839"],
					musicbrainz_recordingid: "abc-123",
					albumsort: "Abbey Road",
					compilation: false,
					bpm: 120,
					mood: "Happy",
					key: "C Major",
				} as any,
			});
			const common = expectSuccess(trackInputSchema.safeParse(input)).common;
			expect(common.date).toBe("2024-01-15");
			expect(common.lyricist).toEqual(["Lyricist A"]);
			expect(common.barcode).toBe("0123456789012");
			expect(common.bpm).toBe(120);
		});

		it("accepts whitelisted disk and movementIndex fields", () => {
			const input = makeTrack({
				common: {
					disk: { no: 1, of: 2 },
					movementIndex: { no: 3, of: 5 },
				} as any,
			});
			const common = expectSuccess(trackInputSchema.safeParse(input)).common;
			expect(common.disk).toEqual({ no: 1, of: 2 });
			expect(common.movementIndex).toEqual({ no: 3, of: 5 });
		});

		it("accepts whitelisted format fields (container, lossless, numberOfChannels)", () => {
			const input = makeTrack({
				format: {
					duration: 210.5,
					bitrate: 320000,
					container: "MPEG",
					lossless: false,
					numberOfChannels: 2,
					sampleRate: 44100,
				} as any,
			});
			const format = expectSuccess(trackInputSchema.safeParse(input)).format;
			expect(format.container).toBe("MPEG");
			expect(format.lossless).toBe(false);
			expect(format.numberOfChannels).toBe(2);
			expect(format.sampleRate).toBe(44100);
			expect(format.duration).toBe(210.5);
		});

		it("rejects unknown fields in common (strict mode)", () => {
			const input = makeTrack({
				common: {
					title: "Test",
					maliciousField: "should be rejected",
				} as any,
			});
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("rejects unknown fields in format (strict mode)", () => {
			const input = makeTrack({
				format: {
					duration: 120,
					unknownFormatProp: true,
				} as any,
			});
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("still validates declared common fields with constraints", () => {
			const input = makeTrack({
				common: { year: 99999, genre: ["Rock"] } as any,
			});
			const issues = expectFailure(trackInputSchema.safeParse(input));
			expect(hasIssueWithPath(issues, ["common", "year"])).toBe(true);
		});

		it("still validates declared format fields with constraints", () => {
			const input = makeTrack({
				format: { duration: -1, container: "MPEG" } as any,
			});
			const issues = expectFailure(trackInputSchema.safeParse(input));
			expect(hasIssueWithPath(issues, ["format", "duration"])).toBe(true);
		});
	});

	describe("statusSchema", () => {
		it.each(STATUS_VALUES)("accepts every supported status: %s", (status) => {
			expectSuccess(statusSchema.safeParse(status));
		});

		it.each([
			["empty string", ""],
			["whitespace-only", "   "],
			["unknown value", "done"],
			["synonym", "error"],
			["wrong case", "PENDING"],
		])("rejects unsupported string value: %s", (_label, value) => {
			expectFailure(statusSchema.safeParse(value));
		});

		it.each([
			["number", 123],
			["null", null],
			["undefined", undefined],
			["array", []],
			["object", {}],
		])("rejects non-string value: %s", (_label, value) => {
			expectFailure(statusSchema.safeParse(value));
		});
	});

	describe("selectedSchema", () => {
		it.each([
			["0", 0],
			["1", 1],
		])("accepts %s", (_label, value) => {
			expectSuccess(selectedSchema.safeParse(value));
		});

		it.each([
			["integer > 1", 2],
			["negative integer", -1],
			["float", 1.5],
		])("rejects other number: %s", (_label, value) => {
			expectFailure(selectedSchema.safeParse(value));
		});

		it.each([
			["true", true],
			["false", false],
		])("rejects boolean: %s", (_label, value) => {
			expectFailure(selectedSchema.safeParse(value));
		});

		it.each([
			['"0"', "0"],
			['"1"', "1"],
		])("rejects string: %s", (_label, value) => {
			expectFailure(selectedSchema.safeParse(value));
		});

		it.each([
			["null", null],
			["undefined", undefined],
		])("rejects %s", (_label, value) => {
			expectFailure(selectedSchema.safeParse(value));
		});
	});

	describe("targetCollectionIdSchema", () => {
		it.each([
			["system id", "all"],
			["custom id", "mix-1"],
			["id with surrounding whitespace", "  mix-1  "],
		])("accepts non-empty string: %s", (_label, value) => {
			expectSuccess(targetCollectionIdSchema.safeParse(value));
		});

		it.each([
			["empty string", ""],
			["whitespace-only", "   "],
			["tab and newline", "\t\n"],
		])("rejects empty or whitespace-only string: %s", (_label, value) => {
			expectFailure(targetCollectionIdSchema.safeParse(value));
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["number", 123],
			["array", []],
			["object", {}],
		])("rejects non-string value: %s", (_label, value) => {
			expectFailure(targetCollectionIdSchema.safeParse(value));
		});
	});

	describe("collectionIdsSchema", () => {
		it("accepts an empty array", () => {
			expectSuccess(collectionIdsSchema.safeParse([]));
		});

		it.each([
			["single element", ["all"]],
			["multiple elements", ["all", "mix-1"]],
		])("accepts an array of non-empty strings: %s", (_label, value) => {
			expectSuccess(collectionIdsSchema.safeParse(value));
		});

		it("rejects undefined because collectionIds is required", () => {
			expectFailure(collectionIdsSchema.safeParse(undefined));
		});

		it("rejects null", () => {
			expectFailure(collectionIdsSchema.safeParse(null));
		});

		it.each([
			["string", "all"],
			["number", 123],
			["object", {}],
		])("rejects non-array value: %s", (_label, value) => {
			expectFailure(collectionIdsSchema.safeParse(value));
		});

		it("rejects empty collection ids and reports the invalid index", () => {
			const result = collectionIdsSchema.safeParse(["all", ""]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(hasIssueWithPath(result.error.issues, [1])).toBe(true);
			}
		});

		it("rejects whitespace-only collection ids and reports the invalid index", () => {
			const issues = expectFailure(collectionIdsSchema.safeParse(["all", ""]));
			expect(hasIssueWithPath(issues, [1])).toBe(true);
		});

		it("rejects non-string collection ids and reports the invalid index", () => {
			const issues = expectFailure(
				collectionIdsSchema.safeParse(["all", "   "]),
			);
			expect(hasIssueWithPath(issues, [1])).toBe(true);
		});
	});

	describe("trackInputSchema", () => {
		it("accepts a complete application-owned track", () => {
			expectSuccess(trackInputSchema.safeParse(makeTrack()));
		});

		it("accepts an empty collectionIds array", () => {
			expectSuccess(
				trackInputSchema.safeParse(makeTrack({ collectionIds: [] })),
			);
		});

		it("accepts declared IAudioMetadata fields and preserves them", () => {
			const input = makeTrack({
				format: {
					duration: 210.5,
					bitrate: 320000,
				},
				common: {
					title: "Test Track",
					album: "Test Album",
				},
			});
			const data = expectSuccess(trackInputSchema.safeParse(input));
			expect(data.format).toEqual({ duration: 210.5, bitrate: 320000 });
			expect(data.common).toEqual({ title: "Test Track", album: "Test Album" });
		});

		it.each(REQUIRED_FIELDS)("rejects missing required field: %s", (field) => {
			const issues = expectFailure(
				trackInputSchema.safeParse(withoutField(field)),
			);
			expect(hasIssueWithPath(issues, [field])).toBe(true);
		});

		it.each(STRING_IDENTITY_FIELDS)("rejects empty %s value", (field) => {
			const issues = expectFailure(
				trackInputSchema.safeParse(makeTrack({ [field]: "" })),
			);
			expect(hasIssueWithPath(issues, [field])).toBe(true);
		});

		it.each(STRING_IDENTITY_FIELDS)(
			"rejects whitespace-only %s value",
			(field) => {
				const issues = expectFailure(
					trackInputSchema.safeParse(makeTrack({ [field]: "   " })),
				);
				expect(hasIssueWithPath(issues, [field])).toBe(true);
			},
		);

		it("rejects invalid status values and reports the status path", () => {
			const issues = expectFailure(
				trackInputSchema.safeParse(makeTrack({ status: "done" } as any)),
			);
			expect(hasIssueWithPath(issues, ["status"])).toBe(true);
		});

		it("rejects invalid selected values and reports the selected path", () => {
			const issues = expectFailure(
				trackInputSchema.safeParse(makeTrack({ selected: 2 } as any)),
			);
			expect(hasIssueWithPath(issues, ["selected"])).toBe(true);
		});

		it("rejects a non-array collectionIds value and reports the collectionIds path", () => {
			const issues = expectFailure(
				trackInputSchema.safeParse(makeTrack({ collectionIds: "all" } as any)),
			);
			expect(hasIssueWithPath(issues, ["collectionIds"])).toBe(true);
		});

		it("rejects invalid collectionIds items and reports the invalid index", () => {
			const issues = expectFailure(
				trackInputSchema.safeParse(makeTrack({ collectionIds: ["all", ""] })),
			);
			expect(hasIssueWithPath(issues, ["collectionIds", 1])).toBe(true);
		});
	});

	describe("tracksArraySchema", () => {
		it("accepts a valid array of tracks", () => {
			const tracks = [makeTrack(), makeTrack()];
			const data = expectSuccess(tracksArraySchema.safeParse(tracks));
			expect(data).toHaveLength(2);
			expect(data[0]).toEqual(tracks[0]);
			expect(data[1]).toEqual(tracks[1]);
		});

		it("accepts an empty array (valid state: no tracks loaded)", () => {
			expectSuccess(tracksArraySchema.safeParse([]));
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["string", "not-an-array"],
			["number", 42],
			["boolean", true],
			["object", {}],
			["single track", makeTrack()],
		])("rejects non-array input: %s", (_label, input) => {
			const issues = expectFailure(tracksArraySchema.safeParse(input));
			expect(issues.some((i) => i.code === "invalid_type")).toBe(true);
		});

		it("propagates item errors with the correct index in the path", () => {
			const issues = expectFailure(
				tracksArraySchema.safeParse([
					makeTrack(),
					makeTrack({ status: "invalid_status" } as any),
				]),
			);
			expect(hasIssueWithPath(issues, [1, "status"])).toBe(true);
		});

		it("reports index 0 for an invalid first item", () => {
			const issues = expectFailure(
				tracksArraySchema.safeParse([makeTrack({ id: "" })]),
			);
			expect(hasIssueWithPath(issues, [0, "id"])).toBe(true);
		});

		it("captures multiple item-level errors across different indices", () => {
			const issues = expectFailure(
				tracksArraySchema.safeParse([
					makeTrack({ id: "" }),
					makeTrack(),
					makeTrack({ filePath: "   " }),
				]),
			);
			expect(hasIssueWithPath(issues, [0, "id"])).toBe(true);
			expect(hasIssueWithPath(issues, [2, "filePath"])).toBe(true);
		});
	});

	describe("trackChangesSchema", () => {
		describe("fields branch", () => {
			it("accepts a valid filePath change", () => {
				expectSuccess(
					trackChangesSchema.safeParse({
						filePath: "/music/track.mp3",
					}),
				);
			});

			it.each([
				["selected: 1", { selected: 1 }],
				["selected: 0", { selected: 0 }],
			])("accepts a valid selected change: %s", (_label, value) => {
				expectSuccess(trackChangesSchema.safeParse(value));
			});

			it("accepts a valid collectionIds change", () => {
				expectSuccess(
					trackChangesSchema.safeParse({
						collectionIds: ["all", "mix-1"],
					}),
				);
			});

			it("accepts multiple fields together", () => {
				expectSuccess(
					trackChangesSchema.safeParse({
						filePath: "/music/track.mp3",
						selected: 1,
						collectionIds: ["all"],
					}),
				);
			});

			it("rejects an empty object (no-op mutation)", () => {
				expectFailure(trackChangesSchema.safeParse({}));
			});

			it("rejects unknown fields (strict mode)", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						selected: 1,
						unknownField: true,
					}),
				);
			});

			it.each([
				["empty string", ""],
				["whitespace-only", "   "],
			])("rejects invalid filePath value: %s", (_label, value) => {
				expectFailure(trackChangesSchema.safeParse(value));
			});

			it.each([
				["number > 1", { selected: 2 }],
				["boolean", { selected: true }],
			])("rejects invalid selected value: %s", (_label, value) => {
				expectFailure(trackChangesSchema.safeParse(value));
			});

			it("rejects invalid collectionIds items", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						collectionIds: ["all", ""],
					}),
				);
			});
		});

		describe("status branch", () => {
			it("accepts pending status", () => {
				expectSuccess(trackChangesSchema.safeParse({ status: "pending" }));
			});

			it("accepts processing status", () => {
				expectSuccess(trackChangesSchema.safeParse({ status: "processing" }));
			});

			it("accepts completed status", () => {
				expectSuccess(trackChangesSchema.safeParse({ status: "completed" }));
			});

			it("accepts failed status with a valid reason", () => {
				expectSuccess(
					trackChangesSchema.safeParse({
						status: "failed",
						reason: "FFmpeg exited with code 1",
					}),
				);
			});

			it("rejects failed status without reason", () => {
				expectFailure(trackChangesSchema.safeParse({ status: "failed" }));
			});

			it("rejects an empty reason", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						status: "failed",
						reason: "",
					}),
				);
			});

			it("rejects a whitespace-only reason", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						status: "failed",
						reason: "   ",
					}),
				);
			});

			it("rejects a reason exceeding MAX_REASON_LENGTH", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						status: "failed",
						reason: "x".repeat(MAX_REASON_LENGTH + 1),
					}),
				);
			});

			it("rejects a reason containing null bytes", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						status: "failed",
						reason: "error\0injection",
					}),
				);
			});

			it("accepts a reason at exactly MAX_REASON_LENGTH", () => {
				expectSuccess(
					trackChangesSchema.safeParse({
						status: "failed",
						reason: "x".repeat(MAX_REASON_LENGTH),
					}),
				);
			});
		});

		describe("mutual exclusivity (status XOR fields)", () => {
			it("rejects status combined with filePath", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						status: "pending",
						filePath: "/music/track.mp3",
					}),
				);
			});

			it("rejects status combined with selected", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						status: "completed",
						selected: 1,
					}),
				);
			});

			it("rejects status combined with collectionIds", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						status: "processing",
						collectionIds: ["all"],
					}),
				);
			});

			it("rejects reason on non-failed status (strict mode)", () => {
				expectFailure(
					trackChangesSchema.safeParse({
						status: "pending",
						reason: "should not be here",
					}),
				);
			});
		});

		describe("non-object inputs", () => {
			it.each([
				["null", null],
				["undefined", undefined],
				["string", "str"],
				["number", 42],
				["boolean", true],
				["array", []],
			])("rejects %s", (_label, input) => {
				expectFailure(trackChangesSchema.safeParse(input));
			});
		});
	});

	describe("trackInputSchema - statusSeq", () => {
		it("accepts a track without statusSeq (optional field)", () => {
			expectSuccess(trackInputSchema.safeParse(makeTrack()));
		});

		it("rejects statusSeq 0 (must be >= 1)", () => {
			expectFailure(trackInputSchema.safeParse(makeTrack({ statusSeq: 0 })));
		});

		it("accepts a positive integer statusSeq and preserves it", () => {
			const data = expectSuccess(
				trackInputSchema.safeParse(makeTrack({ statusSeq: 42 })),
			);
			expect(data.statusSeq).toBe(42);
		});

		it.each([
			["negative", -1],
			["fractional", 2.5],
			["string", "3"],
			["null", null],
			["boolean", true],
		])("rejects %s statusSeq", (_label, value) => {
			expectFailure(
				trackInputSchema.safeParse(makeTrack({ statusSeq: value } as any)),
			);
		});
	});

	describe("trackChangesSchema - seq (status event sequencing)", () => {
		it.each([
			["processing", { status: "processing", seq: 1 }],
			["completed", { status: "completed", seq: 42 }],
		])("accepts %s status with a non-negative integer seq", (_label, value) => {
			expectSuccess(trackChangesSchema.safeParse(value));
		});

		it("accepts failed status with reason and seq", () => {
			expectSuccess(
				trackChangesSchema.safeParse({
					status: "failed",
					reason: "FFmpeg exited with code 1",
					seq: 3,
				}),
			);
		});

		it("rejects seq 0 (must be >= 1)", () => {
			expectFailure(
				trackChangesSchema.safeParse({ status: "processing", seq: 0 }),
			);
		});

		it("rejects pending status in changes (no implicit re-queue)", () => {
			expectFailure(
				trackChangesSchema.safeParse({ status: "pending", seq: 1 }),
			);
		});

		it("keeps seq optional for backward compatibility", () => {
			expectSuccess(trackChangesSchema.safeParse({ status: "processing" }));
		});

		it.each([
			["negative", -1],
			["fractional", 1.5],
			["string", "2"],
			["null", null],
			["boolean", true],
		])("rejects %s seq", (_label, seq) => {
			expectFailure(
				trackChangesSchema.safeParse({
					status: "processing",
					seq,
				}),
			);
		});
		it("rejects failed status with seq but missing reason", () => {
			expectFailure(trackChangesSchema.safeParse({ status: "failed", seq: 1 }));
		});

		it("rejects seq on the fields branch", () => {
			expectFailure(trackChangesSchema.safeParse({ selected: 1, seq: 2 }));
		});
	});

	describe("filePathSchema", () => {
		afterEach(() => resetPlatform());

		it("accepts a valid file path", () => {
			expectSuccess(filePathSchema.safeParse("/music/track.mp3"));
		});

		it("rejects an empty file path", () => {
			expectFailure(filePathSchema.safeParse(""));
		});

		it("rejects file paths containing null bytes", () => {
			expectFailure(filePathSchema.safeParse("/music/\0track.mp3"));
		});

		it("lowercases filePath on win32", () => {
			configurePlatform("win32");
			expect(
				expectSuccess(filePathSchema.safeParse("C:/Music/Track.MP3")),
			).toBe("c:/music/track.mp3");
		});

		it("lowercases filePath on darwin", () => {
			configurePlatform("darwin");
			expect(expectSuccess(filePathSchema.safeParse("/Music/Track.MP3"))).toBe(
				"/music/track.mp3",
			);
		});

		it("preserves case on linux", () => {
			configurePlatform("linux");
			expect(expectSuccess(filePathSchema.safeParse("/Music/Track.MP3"))).toBe(
				"/Music/Track.MP3",
			);
		});

		it("is idempotent (re-parsing a normalized value is a no-op)", () => {
			configurePlatform("win32");
			const firstData = expectSuccess(filePathSchema.safeParse("C:/A.MP3"));
			const reparsedData = expectSuccess(filePathSchema.safeParse(firstData));
			expect(reparsedData).toBe(firstData);
		});
	});

	describe("trackInputSchema — filePath normalization", () => {
		afterEach(() => resetPlatform());

		it("normalizes filePath on the ingestion path", () => {
			configurePlatform("win32");
			const parsed = expectSuccess(
				trackInputSchema.safeParse(
					makeTrack({ filePath: "C:/Music/Track.MP3" }),
				),
			);
			expect(parsed.filePath).toBe("c:/music/track.mp3");
		});

		it("folds case-variant filePaths to the same canonical key", () => {
			configurePlatform("win32");
			const a = expectSuccess(
				trackInputSchema.safeParse(
					makeTrack({ id: "a", filePath: "C:/A.MP3" }),
				),
			);
			const b = expectSuccess(
				trackInputSchema.safeParse(
					makeTrack({ id: "b", filePath: "c:/a.mp3" }),
				),
			);
			expect(a.filePath).toBe(b.filePath);
			expect(a.filePath).toBe("c:/a.mp3");
		});

		it("preserves already-normalized filePaths (idempotent re-parse)", () => {
			configurePlatform("win32");
			const parsed = expectSuccess(
				trackInputSchema.safeParse(
					makeTrack({ filePath: "c:/music/track.mp3" }),
				),
			);
			expect(parsed.filePath).toBe("c:/music/track.mp3");
		});

		it("still rejects empty / null-byte filePaths after the transform", () => {
			configurePlatform("win32");
			expectFailure(trackInputSchema.safeParse(makeTrack({ filePath: "" })));
			expectFailure(
				trackInputSchema.safeParse(
					makeTrack({ filePath: "/music/\0track.mp3" }),
				),
			);
		});

		it("applies NFC folding on the ingestion path", () => {
			configurePlatform("darwin");
			const nfdInput = "/Music/E\u0301le\u0301ment.MP3";
			const parsed = expectSuccess(
				trackInputSchema.safeParse(makeTrack({ filePath: nfdInput })),
			);
			expect(parsed.filePath).toBe("/music/\u00e9l\u00e9ment.mp3");
		});
	});
});
