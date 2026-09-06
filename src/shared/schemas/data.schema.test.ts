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

import { getValidSettings, makeTrack } from "@shared/utils/factories";
import { dataSchema } from "./data.schema";

function createValidData(overrides: Record<string, unknown> = {}) {
	return {
		tracks: [makeTrack()],
		settings: getValidSettings(),
		...overrides,
	};
}

describe("dataSchema", () => {
	describe("valid composition", () => {
		it("accepts a complete object with valid tracks and settings", () => {
			const result = dataSchema.safeParse(createValidData());
			expect(result.success).toBe(true);
		});

		it("accepts an empty tracks array (valid state: no tracks loaded)", () => {
			const result = dataSchema.safeParse(createValidData({ tracks: [] }));
			expect(result.success).toBe(true);
		});
	});

	describe("root structure validation", () => {
		it("rejects when the 'tracks' property is missing", () => {
			const { tracks, ...withoutTracks } = createValidData();
			const result = dataSchema.safeParse(withoutTracks);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["tracks"]);
			}
		});

		it("rejects when the 'settings' property is missing", () => {
			const { settings, ...withoutSettings } = createValidData();
			const result = dataSchema.safeParse(withoutSettings);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["settings"]);
			}
		});

		it("rejects when 'tracks' is not an array", () => {
			const result = dataSchema.safeParse(
				createValidData({ tracks: "not-an-array" }),
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["tracks"]);
			}
		});

		it("rejects when 'settings' is not an object", () => {
			const result = dataSchema.safeParse(
				createValidData({ settings: "not-an-object" }),
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["settings"]);
			}
		});
	});

	describe("nested schema propagation", () => {
		it("rejects when a track in the array is invalid (propagates trackInputSchema)", () => {
			const result = dataSchema.safeParse(
				createValidData({
					tracks: [makeTrack({ status: "invalid_status" } as any)],
				}),
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["tracks", 0, "status"]);
			}
		});

		it("rejects when settings are invalid (propagates settingsSchema)", () => {
			const result = dataSchema.safeParse(
				createValidData({
					settings: {
						...getValidSettings(),
						global: {
							...getValidSettings().global,
							concurrency: 0,
						},
					},
				}),
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual([
					"settings",
					"global",
					"concurrency",
				]);
			}
		});
	});
});
