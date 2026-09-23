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
	MAX_BASE64_IMAGE_SIZE,
	MAX_PATH_LENGTH,
	MAX_PICTURE_COUNT,
	MAX_REASON_LENGTH,
	MAX_YEAR,
	STATUS_VALUES,
} from "@shared/constants";
import { makeTrack } from "@tests/factories";
import { expectFailure, expectSuccess, hasIssueWithPath } from "@tests/utils";
import {
	collectionIdsSchema,
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

		it("rejects picture data exceeding MAX_BASE64_IMAGE_SIZE", () => {
			const oversizedData = "x".repeat(MAX_BASE64_IMAGE_SIZE + 1);
			const issues = expectFailure(
				trackInputSchema.safeParse(
					makeTrack({
						common: {
							picture: [{ format: "image/jpeg", data: oversizedData }],
						},
					}),
				),
			);
			expect(hasIssueWithPath(issues, ["common", "picture", 0, "data"])).toBe(
				true,
			);
		});

		it(`rejects more than ${MAX_PICTURE_COUNT} pictures`, () => {
			const pictures = Array.from({ length: MAX_PICTURE_COUNT + 1 }, () => ({
				format: "image/jpeg",
				data: "AQID",
			}));
			const result = trackInputSchema.safeParse(
				makeTrack({ common: { picture: pictures } }),
			);
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
			expect(statusSchema.safeParse(status).success).toBe(true);
		});

		it.each([
			["empty string", ""],
			["whitespace-only", "   "],
			["unknown value", "done"],
			["synonym", "error"],
			["wrong case", "PENDING"],
		])("rejects unsupported string value: %s", (_label, value) => {
			expect(statusSchema.safeParse(value).success).toBe(false);
		});

		it.each([
			["number", 123],
			["null", null],
			["undefined", undefined],
			["array", []],
			["object", {}],
		])("rejects non-string value: %s", (_label, value) => {
			expect(statusSchema.safeParse(value).success).toBe(false);
		});
	});

	describe("selectedSchema", () => {
		it.each([
			["0", 0],
			["1", 1],
		])("accepts %s", (_label, value) => {
			expect(selectedSchema.safeParse(value).success).toBe(true);
		});

		it.each([
			["integer > 1", 2],
			["negative integer", -1],
			["float", 1.5],
		])("rejects other number: %s", (_label, value) => {
			expect(selectedSchema.safeParse(value).success).toBe(false);
		});

		it.each([
			["true", true],
			["false", false],
		])("rejects boolean: %s", (_label, value) => {
			expect(selectedSchema.safeParse(value).success).toBe(false);
		});

		it.each([
			['"0"', "0"],
			['"1"', "1"],
		])("rejects string: %s", (_label, value) => {
			expect(selectedSchema.safeParse(value).success).toBe(false);
		});

		it.each([
			["null", null],
			["undefined", undefined],
		])("rejects %s", (_label, value) => {
			expect(selectedSchema.safeParse(value).success).toBe(false);
		});
	});

	describe("targetCollectionIdSchema", () => {
		it.each([
			["system id", "all"],
			["custom id", "mix-1"],
			["id with surrounding whitespace", "  mix-1  "],
		])("accepts non-empty string: %s", (_label, value) => {
			expect(targetCollectionIdSchema.safeParse(value).success).toBe(true);
		});

		it.each([
			["empty string", ""],
			["whitespace-only", "   "],
			["tab and newline", "\t\n"],
		])("rejects empty or whitespace-only string: %s", (_label, value) => {
			expect(targetCollectionIdSchema.safeParse(value).success).toBe(false);
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["number", 123],
			["array", []],
			["object", {}],
		])("rejects non-string value: %s", (_label, value) => {
			expect(targetCollectionIdSchema.safeParse(value).success).toBe(false);
		});
	});

	describe("collectionIdsSchema", () => {
		it("accepts an empty array", () => {
			expect(collectionIdsSchema.safeParse([]).success).toBe(true);
		});

		it.each([
			["single element", ["all"]],
			["multiple elements", ["all", "mix-1"]],
		])("accepts an array of non-empty strings: %s", (_label, value) => {
			expect(collectionIdsSchema.safeParse(value).success).toBe(true);
		});

		it("rejects undefined because collectionIds is required", () => {
			expect(collectionIdsSchema.safeParse(undefined).success).toBe(false);
		});

		it("rejects null", () => {
			expect(collectionIdsSchema.safeParse(null).success).toBe(false);
		});

		it.each([
			["string", "all"],
			["number", 123],
			["object", {}],
		])("rejects non-array value: %s", (_label, value) => {
			expect(collectionIdsSchema.safeParse(value).success).toBe(false);
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
			const result = trackInputSchema.safeParse(makeTrack());
			expect(result.success).toBe(true);
		});

		it("accepts an empty collectionIds array", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ collectionIds: [] }),
			);
			expect(result.success).toBe(true);
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
			expect(expectSuccess(tracksArraySchema.safeParse([]))).toEqual([]);
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
				const result = trackChangesSchema.safeParse({
					filePath: "/music/track.mp3",
				});
				expect(result.success).toBe(true);
			});

			it.each([
				["selected: 1", { selected: 1 }],
				["selected: 0", { selected: 0 }],
			])("accepts a valid selected change: %s", (_label, value) => {
				expect(trackChangesSchema.safeParse(value).success).toBe(true);
			});

			it("accepts a valid collectionIds change", () => {
				const result = trackChangesSchema.safeParse({
					collectionIds: ["all", "mix-1"],
				});
				expect(result.success).toBe(true);
			});

			it("accepts multiple fields together", () => {
				const result = trackChangesSchema.safeParse({
					filePath: "/music/track.mp3",
					selected: 1,
					collectionIds: ["all"],
				});
				expect(result.success).toBe(true);
			});

			it("rejects an empty object (no-op mutation)", () => {
				const result = trackChangesSchema.safeParse({});
				expect(result.success).toBe(false);
			});

			it("rejects unknown fields (strict mode)", () => {
				const result = trackChangesSchema.safeParse({
					selected: 1,
					unknownField: true,
				});
				expect(result.success).toBe(false);
			});

			it.each([
				["empty string", ""],
				["whitespace-only", "   "],
			])("rejects invalid filePath value: %s", (_label, value) => {
				expect(trackChangesSchema.safeParse({ filePath: value }).success).toBe(
					false,
				);
			});

			it.each([
				["number > 1", { selected: 2 }],
				["boolean", { selected: true }],
			])("rejects invalid selected value: %s", (_label, value) => {
				expect(trackChangesSchema.safeParse(value).success).toBe(false);
			});

			it("rejects invalid collectionIds items", () => {
				const result = trackChangesSchema.safeParse({
					collectionIds: ["all", ""],
				});
				expect(result.success).toBe(false);
			});
		});

		describe("status branch", () => {
			it("accepts pending status", () => {
				expect(
					trackChangesSchema.safeParse({ status: "pending" }).success,
				).toBe(true);
			});

			it("accepts processing status", () => {
				expect(
					trackChangesSchema.safeParse({ status: "processing" }).success,
				).toBe(true);
			});

			it("accepts completed status", () => {
				expect(
					trackChangesSchema.safeParse({ status: "completed" }).success,
				).toBe(true);
			});

			it("accepts failed status with a valid reason", () => {
				const result = trackChangesSchema.safeParse({
					status: "failed",
					reason: "FFmpeg exited with code 1",
				});
				expect(result.success).toBe(true);
			});

			it("rejects failed status without reason", () => {
				const result = trackChangesSchema.safeParse({ status: "failed" });
				expect(result.success).toBe(false);
			});

			it("rejects an empty reason", () => {
				const result = trackChangesSchema.safeParse({
					status: "failed",
					reason: "",
				});
				expect(result.success).toBe(false);
			});

			it("rejects a whitespace-only reason", () => {
				const result = trackChangesSchema.safeParse({
					status: "failed",
					reason: "   ",
				});
				expect(result.success).toBe(false);
			});

			it("rejects a reason exceeding MAX_REASON_LENGTH", () => {
				const result = trackChangesSchema.safeParse({
					status: "failed",
					reason: "x".repeat(MAX_REASON_LENGTH + 1),
				});
				expect(result.success).toBe(false);
			});

			it("rejects a reason containing null bytes", () => {
				const result = trackChangesSchema.safeParse({
					status: "failed",
					reason: "error\0injection",
				});
				expect(result.success).toBe(false);
			});

			it("accepts a reason at exactly MAX_REASON_LENGTH", () => {
				const result = trackChangesSchema.safeParse({
					status: "failed",
					reason: "x".repeat(MAX_REASON_LENGTH),
				});
				expect(result.success).toBe(true);
			});
		});

		describe("mutual exclusivity (status XOR fields)", () => {
			it("rejects status combined with filePath", () => {
				const result = trackChangesSchema.safeParse({
					status: "pending",
					filePath: "/music/track.mp3",
				});
				expect(result.success).toBe(false);
			});

			it("rejects status combined with selected", () => {
				const result = trackChangesSchema.safeParse({
					status: "completed",
					selected: 1,
				});
				expect(result.success).toBe(false);
			});

			it("rejects status combined with collectionIds", () => {
				const result = trackChangesSchema.safeParse({
					status: "processing",
					collectionIds: ["all"],
				});
				expect(result.success).toBe(false);
			});

			it("rejects reason on non-failed status (strict mode)", () => {
				const result = trackChangesSchema.safeParse({
					status: "pending",
					reason: "should not be here",
				});
				expect(result.success).toBe(false);
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
				expect(trackChangesSchema.safeParse(input).success).toBe(false);
			});
		});
	});

	describe("trackInputSchema - statusSeq", () => {
		it("accepts a track without statusSeq (optional field)", () => {
			expect(trackInputSchema.safeParse(makeTrack()).success).toBe(true);
		});

		it("rejects statusSeq 0 (must be >= 1)", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ statusSeq: 0 } as any),
			);
			expect(result.success).toBe(false);
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
			const result = trackInputSchema.safeParse(
				makeTrack({ statusSeq: value } as any),
			);
			expect(result.success).toBe(false);
		});
	});

	describe("trackChangesSchema - seq (status event sequencing)", () => {
		it.each([
			["processing", { status: "processing", seq: 1 }],
			["completed", { status: "completed", seq: 42 }],
		])("accepts %s status with a non-negative integer seq", (_label, value) => {
			expect(trackChangesSchema.safeParse(value).success).toBe(true);
		});

		it("accepts failed status with reason and seq", () => {
			const result = trackChangesSchema.safeParse({
				status: "failed",
				reason: "FFmpeg exited with code 1",
				seq: 3,
			});
			expect(result.success).toBe(true);
		});

		it("rejects seq 0 (must be >= 1)", () => {
			expect(
				trackChangesSchema.safeParse({ status: "processing", seq: 0 }).success,
			).toBe(false);
		});

		it("rejects pending status in changes (no implicit re-queue)", () => {
			expect(
				trackChangesSchema.safeParse({ status: "pending", seq: 1 }).success,
			).toBe(false);
		});

		it("keeps seq optional for backward compatibility", () => {
			expect(
				trackChangesSchema.safeParse({ status: "processing" }).success,
			).toBe(true);
		});

		it.each([
			["negative", -1],
			["fractional", 1.5],
			["string", "2"],
			["null", null],
			["boolean", true],
		])("rejects %s seq", (_label, seq) => {
			const result = trackChangesSchema.safeParse({
				status: "processing",
				seq,
			});
			expect(result.success).toBe(false);
		});
		it("rejects failed status with seq but missing reason", () => {
			const result = trackChangesSchema.safeParse({ status: "failed", seq: 1 });
			expect(result.success).toBe(false);
		});

		it("rejects seq on the fields branch", () => {
			const result = trackChangesSchema.safeParse({ selected: 1, seq: 2 });
			expect(result.success).toBe(false);
		});
	});
});
