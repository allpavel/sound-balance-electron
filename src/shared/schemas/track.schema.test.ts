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

import { STATUS_VALUES } from "@shared/constants";
import { makeTrack } from "@shared/utils/factories";
import {
	collectionIdsSchema,
	selectedSchema,
	statusSchema,
	targetCollectionIdSchema,
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

		it("rejects picture data exceeding 5MB", () => {
			const oversizedData = "x".repeat(5 * 1024 * 1024 + 1);
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

		it("rejects more than 10 pictures", () => {
			const pictures = Array.from({ length: 21 }, () => ({
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

		it("accepts unknown IAudioMetadata fields and preserves them", () => {
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
				makeTrack(), // a single track object is NOT an array
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
});
