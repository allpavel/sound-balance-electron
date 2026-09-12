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
	MAX_PICTURE_COUNT,
	STATUS_VALUES,
} from "@shared/constants";
import { makeTrack } from "@shared/utils/factories";
import {
	collectionIdsSchema,
	selectedSchema,
	statusSchema,
	targetCollectionIdSchema,
	trackChangesSchema,
	trackInputSchema,
	tracksArraySchema,
} from "./track.schema";

function withoutField(field: string): Record<string, unknown> {
	const track = makeTrack();
	delete track[field];
	return track;
}

describe("track.schema", () => {
	describe("track.schema - security constraints", () => {
		it("rejects filePath containing null bytes", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ filePath: "/music/\0track.mp3" }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["filePath"]);
			}
		});

		it("rejects filePath exceeding 4096 characters", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ filePath: `/music/${"a".repeat(4100)}.mp3` }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["filePath"]);
			}
		});

		it("rejects id containing null bytes", () => {
			const result = trackInputSchema.safeParse(makeTrack({ id: "track\0id" }));
			expect(result.success).toBe(false);
		});

		it("strips unknown top-level properties instead of preserving them", () => {
			const input = { ...makeTrack(), unknownField: "should be stripped" };
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).not.toHaveProperty("unknownField");
			}
		});

		it("rejects picture data exceeding MAX_BASE64_IMAGE_SIZE", () => {
			const oversizedData = "x".repeat(MAX_BASE64_IMAGE_SIZE + 1);
			const result = trackInputSchema.safeParse(
				makeTrack({
					common: {
						picture: [
							{
								format: "image/jpeg",
								data: oversizedData,
							},
						],
					},
				}),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual([
					"common",
					"picture",
					0,
					"data",
				]);
			}
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
				makeTrack({ common: { year: 99999 } }),
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
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				const common = result.data.common as Record<string, unknown>;
				expect(common.genre).toEqual(["Rock", "Alternative"]);
				expect(common.composer).toEqual(["John Lennon"]);
				expect(common.artists).toEqual(["John Lennon"]);
				expect(common.albumartist).toBe("The Beatles");
				expect(common.title).toBe("Test Track");
			}
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
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				const common = result.data.common as Record<string, unknown>;
				expect(common.date).toBe("2024-01-15");
				expect(common.lyricist).toEqual(["Lyricist A"]);
				expect(common.barcode).toBe("0123456789012");
				expect(common.bpm).toBe(120);
			}
		});

		it("accepts whitelisted disk and movementIndex fields", () => {
			const input = makeTrack({
				common: {
					disk: { no: 1, of: 2 },
					movementIndex: { no: 3, of: 5 },
				} as any,
			});
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				const common = result.data.common as Record<string, unknown>;
				expect(common.disk).toEqual({ no: 1, of: 2 });
				expect(common.movementIndex).toEqual({ no: 3, of: 5 });
			}
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
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				const format = result.data.format as Record<string, unknown>;
				expect(format.container).toBe("MPEG");
				expect(format.lossless).toBe(false);
				expect(format.numberOfChannels).toBe(2);
				expect(format.sampleRate).toBe(44100);
				expect(format.duration).toBe(210.5);
			}
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
				common: {
					year: 99999,
					genre: ["Rock"],
				} as any,
			});
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["common", "year"]);
			}
		});

		it("still validates declared format fields with constraints", () => {
			const input = makeTrack({
				format: {
					duration: -1,
					container: "MPEG",
				} as any,
			});
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["format", "duration"]);
			}
		});
	});

	describe("STATUS_VALUES", () => {
		it("contains the supported track statuses", () => {
			expect(STATUS_VALUES).toEqual([
				"pending",
				"processing",
				"completed",
				"failed",
			]);
		});
	});

	describe("statusSchema", () => {
		it("accepts every supported status", () => {
			for (const status of STATUS_VALUES) {
				expect(statusSchema.safeParse(status).success).toBe(true);
			}
		});

		it("rejects unsupported string values", () => {
			expect(statusSchema.safeParse("").success).toBe(false);
			expect(statusSchema.safeParse("   ").success).toBe(false);
			expect(statusSchema.safeParse("done").success).toBe(false);
			expect(statusSchema.safeParse("error").success).toBe(false);
			expect(statusSchema.safeParse("PENDING").success).toBe(false);
		});

		it("rejects non-string values", () => {
			expect(statusSchema.safeParse(123).success).toBe(false);
			expect(statusSchema.safeParse(null).success).toBe(false);
			expect(statusSchema.safeParse(undefined).success).toBe(false);
			expect(statusSchema.safeParse([]).success).toBe(false);
			expect(statusSchema.safeParse({}).success).toBe(false);
		});
	});

	describe("selectedSchema", () => {
		it("accepts 0 and 1", () => {
			expect(selectedSchema.safeParse(0).success).toBe(true);
			expect(selectedSchema.safeParse(1).success).toBe(true);
		});

		it("rejects other numbers", () => {
			expect(selectedSchema.safeParse(2).success).toBe(false);
			expect(selectedSchema.safeParse(-1).success).toBe(false);
			expect(selectedSchema.safeParse(1.5).success).toBe(false);
		});

		it("rejects booleans", () => {
			expect(selectedSchema.safeParse(true).success).toBe(false);
			expect(selectedSchema.safeParse(false).success).toBe(false);
		});

		it("rejects strings", () => {
			expect(selectedSchema.safeParse("0").success).toBe(false);
			expect(selectedSchema.safeParse("1").success).toBe(false);
		});

		it("rejects null and undefined", () => {
			expect(selectedSchema.safeParse(null).success).toBe(false);
			expect(selectedSchema.safeParse(undefined).success).toBe(false);
		});
	});

	describe("targetCollectionIdSchema", () => {
		it("accepts non-empty strings", () => {
			expect(targetCollectionIdSchema.safeParse("all").success).toBe(true);
			expect(targetCollectionIdSchema.safeParse("mix-1").success).toBe(true);
			expect(targetCollectionIdSchema.safeParse("  mix-1  ").success).toBe(
				true,
			);
		});

		it("rejects empty and whitespace-only strings", () => {
			expect(targetCollectionIdSchema.safeParse("").success).toBe(false);
			expect(targetCollectionIdSchema.safeParse("   ").success).toBe(false);
			expect(targetCollectionIdSchema.safeParse("\t\n").success).toBe(false);
		});

		it("rejects non-string values", () => {
			expect(targetCollectionIdSchema.safeParse(null).success).toBe(false);
			expect(targetCollectionIdSchema.safeParse(undefined).success).toBe(false);
			expect(targetCollectionIdSchema.safeParse(123).success).toBe(false);
			expect(targetCollectionIdSchema.safeParse([]).success).toBe(false);
			expect(targetCollectionIdSchema.safeParse({}).success).toBe(false);
		});
	});

	describe("collectionIdsSchema", () => {
		it("accepts an empty array", () => {
			expect(collectionIdsSchema.safeParse([]).success).toBe(true);
		});

		it("accepts an array of non-empty strings", () => {
			expect(collectionIdsSchema.safeParse(["all"]).success).toBe(true);
			expect(collectionIdsSchema.safeParse(["all", "mix-1"]).success).toBe(
				true,
			);
		});

		it("rejects undefined because collectionIds is required", () => {
			expect(collectionIdsSchema.safeParse(undefined).success).toBe(false);
		});

		it("rejects null", () => {
			expect(collectionIdsSchema.safeParse(null).success).toBe(false);
		});

		it("rejects non-array values", () => {
			expect(collectionIdsSchema.safeParse("all").success).toBe(false);
			expect(collectionIdsSchema.safeParse(123).success).toBe(false);
			expect(collectionIdsSchema.safeParse({}).success).toBe(false);
		});

		it("rejects empty collection ids and reports the invalid index", () => {
			const result = collectionIdsSchema.safeParse(["all", ""]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual([1]);
			}
		});

		it("rejects whitespace-only collection ids and reports the invalid index", () => {
			const result = collectionIdsSchema.safeParse(["all", "   "]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual([1]);
			}
		});

		it("rejects non-string collection ids and reports the invalid index", () => {
			const result = collectionIdsSchema.safeParse(["all", 123]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual([1]);
			}
		});
	});

	describe("trackInputSchema", () => {
		const requiredFields = [
			"id",
			"file",
			"filePath",
			"status",
			"selected",
			"collectionIds",
		] as const;

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
			const result = trackInputSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				const data = result.data as Record<string, unknown>;
				expect(data.format).toEqual({
					duration: 210.5,
					bitrate: 320000,
				});
				expect(data.common).toEqual({
					title: "Test Track",
					album: "Test Album",
				});
			}
		});

		it("rejects missing required application-owned fields", () => {
			for (const field of requiredFields) {
				const result = trackInputSchema.safeParse(withoutField(field));
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.path).toEqual([field]);
				}
			}
		});

		it("rejects empty id, file, and filePath values", () => {
			for (const field of ["id", "file", "filePath"] as const) {
				const result = trackInputSchema.safeParse(makeTrack({ [field]: "" }));
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.path).toEqual([field]);
				}
			}
		});

		it("rejects whitespace-only id, file, and filePath values", () => {
			for (const field of ["id", "file", "filePath"] as const) {
				const result = trackInputSchema.safeParse(
					makeTrack({ [field]: "   " }),
				);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.path).toEqual([field]);
				}
			}
		});

		it("rejects invalid status values and reports the status path", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ status: "done" } as any),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["status"]);
			}
		});

		it("rejects invalid selected values and reports the selected path", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ selected: 2 } as any),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["selected"]);
			}
		});

		it("rejects a non-array collectionIds value and reports the collectionIds path", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ collectionIds: "all" } as any),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["collectionIds"]);
			}
		});

		it("rejects invalid collectionIds items and reports the invalid index", () => {
			const result = trackInputSchema.safeParse(
				makeTrack({ collectionIds: ["all", ""] }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["collectionIds", 1]);
			}
		});
	});

	describe("tracksArraySchema", () => {
		it("accepts a valid array of tracks", () => {
			const tracks = [makeTrack(), makeTrack()];
			const result = tracksArraySchema.safeParse(tracks);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(2);
				expect(result.data[0]).toEqual(tracks[0]);
				expect(result.data[1]).toEqual(tracks[1]);
			}
		});

		it("accepts an empty array (valid state: no tracks loaded)", () => {
			const result = tracksArraySchema.safeParse([]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual([]);
			}
		});

		it("rejects non-array inputs", () => {
			for (const input of [
				null,
				undefined,
				"not-an-array",
				42,
				true,
				{},
				makeTrack(),
			]) {
				const result = tracksArraySchema.safeParse(input);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.code).toBe("invalid_type");
				}
			}
		});

		it("propagates item errors with the correct index in the path", () => {
			const result = tracksArraySchema.safeParse([
				makeTrack(),
				makeTrack({ status: "invalid_status" } as any),
			]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual([1, "status"]);
			}
		});

		it("reports index 0 for an invalid first item", () => {
			const result = tracksArraySchema.safeParse([makeTrack({ id: "" })]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual([0, "id"]);
			}
		});

		it("captures multiple item-level errors across different indices", () => {
			const result = tracksArraySchema.safeParse([
				makeTrack({ id: "" }),
				makeTrack(),
				makeTrack({ filePath: "   " }),
			]);
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.error.issues.map((i) => i.path.join("."));
				expect(paths).toContain("0.id");
				expect(paths).toContain("2.filePath");
			}
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

			it("accepts a valid selected change", () => {
				expect(trackChangesSchema.safeParse({ selected: 1 }).success).toBe(
					true,
				);
				expect(trackChangesSchema.safeParse({ selected: 0 }).success).toBe(
					true,
				);
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
				if (!result.success) {
					expect(result.error.issues[0]?.message).toContain(
						"At least one field",
					);
				}
			});

			it("rejects unknown fields (strict mode)", () => {
				const result = trackChangesSchema.safeParse({
					selected: 1,
					unknownField: true,
				});
				expect(result.success).toBe(false);
			});

			it("rejects invalid filePath values", () => {
				expect(trackChangesSchema.safeParse({ filePath: "" }).success).toBe(
					false,
				);
				expect(trackChangesSchema.safeParse({ filePath: "   " }).success).toBe(
					false,
				);
			});

			it("rejects invalid selected values", () => {
				expect(trackChangesSchema.safeParse({ selected: 2 }).success).toBe(
					false,
				);
				expect(trackChangesSchema.safeParse({ selected: true }).success).toBe(
					false,
				);
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
					reason: "x".repeat(1001),
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
					reason: "x".repeat(1000),
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
			it("rejects null, undefined, primitives, and arrays", () => {
				for (const input of [null, undefined, "str", 42, true, []]) {
					expect(trackChangesSchema.safeParse(input).success).toBe(false);
				}
			});
		});
	});
});
