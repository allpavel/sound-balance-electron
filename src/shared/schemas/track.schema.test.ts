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
} from "./track.schema";

function withoutField(field: string): Record<string, unknown> {
	const track = makeTrack();
	delete track[field];
	return track;
}

describe("track.schema", () => {
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
});
