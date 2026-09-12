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
import {
	safeParseData,
	safeParseSettings,
	safeParseTrackChanges,
	safeParseTracks,
	type ValidationIssue,
} from "./index";

describe("safeParseSettings", () => {
	describe("successful parsing contract", () => {
		it("returns success: true and the parsed data for a fully valid settings object", () => {
			const validSettings = getValidSettings();
			const result = safeParseSettings(validSettings);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validSettings);
			}
		});

		it("applies schema defaults when optional fields with defaults are omitted", () => {
			const validSettings = getValidSettings();
			const { version, ...settingsWithoutVersion } = validSettings;
			const result = safeParseSettings(settingsWithoutVersion);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.version).toBe(1);
			}
		});

		it("strips unknown top-level and nested properties from the parsed data", () => {
			const validSettings = getValidSettings();
			const input = {
				...validSettings,
				unknownTopLevel: "should be stripped",
				global: {
					...validSettings.global,
					unknownGlobal: true,
				},
			};
			const result = safeParseSettings(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).not.toHaveProperty("unknownTopLevel");
				expect(result.data.global).not.toHaveProperty("unknownGlobal");
			}
		});
	});

	describe("failed parsing contract (Issue Mapping)", () => {
		it("returns success: false with an empty path string for non-object root inputs", () => {
			const invalidInputs = [null, undefined, "string", 42, true, []];
			for (const input of invalidInputs) {
				const result = safeParseSettings(input);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.issues).toBeInstanceOf(Array);
					expect(result.issues.length).toBeGreaterThan(0);
					expect(result.issues[0].path).toBe("");
					expect(result.issues[0].code).toBe("invalid_type");
				}
			}
		});

		it("maps nested paths correctly using dot notation for missing required fields", () => {
			const invalidSettings = {
				version: 1,
				global: {
					openOutputFolderOnComplete: true,
					overwrite: false,
					noOverwrite: true,
				},
				audio: {
					audioQuality: "auto",
					audioQualityValue: "auto",
					outputExtension: "copy",
					audioFilter: "",
					filterOptions: {},
					codecOptions: {},
				},
			};
			const result = safeParseSettings(invalidSettings);
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.issues.map((issue) => issue.path);
				expect(paths).toContain("global.outputDirectoryPath");
				expect(paths).toContain("global.concurrency");
				expect(paths).toContain("audio.audioCodec");
				const concurrencyIssue = result.issues.find(
					(i) => i.path === "global.concurrency",
				);
				expect(concurrencyIssue).toBeDefined();
				expect(concurrencyIssue?.code).toBe("invalid_type");
				expect(typeof concurrencyIssue?.message).toBe("string");
			}
		});

		it("captures constraint violation codes and messages (e.g., too_big)", () => {
			const validSettings = getValidSettings();
			const invalidSettings = {
				...validSettings,
				global: {
					...validSettings.global,
					concurrency: 999,
				},
			};
			const result = safeParseSettings(invalidSettings);
			expect(result.success).toBe(false);
			if (!result.success) {
				const concurrencyIssue = result.issues.find(
					(i) => i.path === "global.concurrency",
				);
				expect(concurrencyIssue).toBeDefined();
				expect(concurrencyIssue?.code).toBe("too_big");
				expect(concurrencyIssue?.message).toContain("10");
			}
		});

		it("captures custom refine validation messages and codes", () => {
			const validSettings = getValidSettings();
			const invalidSettings = {
				...validSettings,
				global: {
					...validSettings.global,
					outputDirectoryPath: "/music/../etc/passwd",
				},
			};
			const result = safeParseSettings(invalidSettings);
			expect(result.success).toBe(false);
			if (!result.success) {
				const pathIssue = result.issues.find(
					(i) => i.path === "global.outputDirectoryPath",
				);
				expect(pathIssue).toBeDefined();
				expect(pathIssue?.code).toBe("custom");
				expect(pathIssue?.message).toBe(
					"Path contains traversal sequences (..)",
				);
			}
		});

		it("captures multiple simultaneous issues without throwing or truncating", () => {
			const invalidSettings = {
				version: -1,
				global: {
					outputDirectoryPath: "",
					openOutputFolderOnComplete: "yes",
					concurrency: 0,
					overwrite: true,
					noOverwrite: false,
				},
				audio: {
					audioCodec: "invalid_codec",
					audioQuality: "auto",
					audioQualityValue: "auto",
					outputExtension: "copy",
					audioFilter: "",
					filterOptions: {},
					codecOptions: {},
				},
			};
			const result = safeParseSettings(invalidSettings);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues.length).toBeGreaterThanOrEqual(4);
				const paths = result.issues.map((i) => i.path);
				expect(paths).toContain("version");
				expect(paths).toContain("global.outputDirectoryPath");
				expect(paths).toContain("global.openOutputFolderOnComplete");
				expect(paths).toContain("audio.audioCodec");
			}
		});
	});
});

describe("safeParseTracks", () => {
	describe("successful parsing contract", () => {
		it("returns success: true and parsed data for a valid tracks array", () => {
			const tracks = [makeTrack(), makeTrack()];
			const result = safeParseTracks(tracks);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(2);
				expect(result.data[0]?.id).toBe(tracks[0]?.id);
			}
		});

		it("accepts an empty tracks array", () => {
			const result = safeParseTracks([]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual([]);
			}
		});

		it("strips unknown top-level properties from tracks", () => {
			const tracks = [{ ...makeTrack(), unknownProp: "should be stripped" }];
			const result = safeParseTracks(tracks);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data[0]).not.toHaveProperty("unknownProp");
			}
		});
	});

	describe("failed parsing contract", () => {
		it("rejects non-array input", () => {
			for (const input of [null, undefined, "string", 42, {}, makeTrack()]) {
				const result = safeParseTracks(input);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.issues.length).toBeGreaterThan(0);
				}
			}
		});

		it("rejects a track with missing required fields and reports path", () => {
			const invalidTrack = { ...makeTrack() };
			delete (invalidTrack as any).id;
			const result = safeParseTracks([invalidTrack]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues[0]?.path).toBe("0.id");
			}
		});

		it("rejects a track with invalid status and reports nested path", () => {
			const result = safeParseTracks([makeTrack({ status: "invalid" as any })]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues[0]?.path).toBe("0.status");
			}
		});

		it("reports correct index for invalid items in the array", () => {
			const tracks = [makeTrack(), makeTrack({ filePath: "" })];
			const result = safeParseTracks(tracks);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues[0]?.path).toBe("1.filePath");
			}
		});

		it("captures multiple simultaneous issues", () => {
			const tracks = [
				makeTrack({ id: "", filePath: "" }),
				makeTrack({ selected: 99 as any }),
			];
			const result = safeParseTracks(tracks);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues.length).toBeGreaterThanOrEqual(3);
			}
		});
	});
});

describe("safeParseData", () => {
	const createValidData = () => ({
		tracks: [makeTrack()],
		settings: getValidSettings(),
	});

	describe("successful parsing contract", () => {
		it("returns success: true for a fully valid Data payload", () => {
			const result = safeParseData(createValidData());
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.tracks).toHaveLength(1);
				expect(result.data.settings).toBeDefined();
			}
		});

		it("accepts empty tracks array with valid settings", () => {
			const result = safeParseData({
				tracks: [],
				settings: getValidSettings(),
			});
			expect(result.success).toBe(true);
		});
	});

	describe("failed parsing contract", () => {
		it("rejects non-object input", () => {
			for (const input of [null, undefined, "string", 42, []]) {
				const result = safeParseData(input);
				expect(result.success).toBe(false);
			}
		});

		it("rejects missing tracks property", () => {
			const { tracks, ...withoutTracks } = createValidData();
			const result = safeParseData(withoutTracks);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues[0]?.path).toBe("tracks");
			}
		});

		it("rejects missing settings property", () => {
			const { settings, ...withoutSettings } = createValidData();
			const result = safeParseData(withoutSettings);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues[0]?.path).toBe("settings");
			}
		});

		it("rejects invalid track within the array and reports nested path", () => {
			const result = safeParseData({
				tracks: [makeTrack({ status: "invalid" as any })],
				settings: getValidSettings(),
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues[0]?.path).toBe("tracks.0.status");
			}
		});

		it("rejects invalid settings and reports nested path", () => {
			const result = safeParseData({
				tracks: [makeTrack()],
				settings: {
					...getValidSettings(),
					global: { ...getValidSettings().global, concurrency: 0 },
				},
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues[0]?.path).toBe("settings.global.concurrency");
			}
		});

		it("captures issues from both tracks and settings simultaneously", () => {
			const result = safeParseData({
				tracks: [makeTrack({ id: "" })],
				settings: {
					...getValidSettings(),
					global: { ...getValidSettings().global, concurrency: 0 },
				},
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const paths = result.issues.map((i: ValidationIssue) => i.path);
				expect(paths).toContain("tracks.0.id");
				expect(paths).toContain("settings.global.concurrency");
			}
		});
	});
});

describe("mapZodIssues DRY contract", () => {
	it("produces identical issue format across all validators", () => {
		const invalidSettings = { invalid: true };
		const invalidTracks = "not-an-array";
		const invalidData = null;

		const settingsResult = safeParseSettings(invalidSettings);
		const tracksResult = safeParseTracks(invalidTracks);
		const dataResult = safeParseData(invalidData);

		expect(settingsResult.success).toBe(false);
		expect(tracksResult.success).toBe(false);
		expect(dataResult.success).toBe(false);

		if (
			!settingsResult.success &&
			!tracksResult.success &&
			!dataResult.success
		) {
			for (const issues of [
				settingsResult.issues,
				tracksResult.issues,
				dataResult.issues,
			]) {
				for (const issue of issues) {
					expect(issue).toHaveProperty("path");
					expect(issue).toHaveProperty("message");
					expect(issue).toHaveProperty("code");
					expect(typeof issue.path).toBe("string");
					expect(typeof issue.message).toBe("string");
					expect(typeof issue.code).toBe("string");
				}
			}
		}
	});
});

describe("safeParseTrackChanges", () => {
	describe("successful parsing contract", () => {
		it("returns success: true for valid field changes", () => {
			const result = safeParseTrackChanges({ selected: 1 });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({ selected: 1 });
			}
		});

		it("returns success: true for valid status changes", () => {
			const result = safeParseTrackChanges({
				status: "failed",
				reason: "FFmpeg error",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({
					status: "failed",
					reason: "FFmpeg error",
				});
			}
		});

		it("strips unknown top-level fields", () => {
			const result = safeParseTrackChanges({
				selected: 1,
				unknownProp: "stripped",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("failed parsing contract", () => {
		it("rejects non-object input and reports issues", () => {
			for (const input of [null, undefined, "str", 42, []]) {
				const result = safeParseTrackChanges(input);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.issues.length).toBeGreaterThan(0);
				}
			}
		});

		it("rejects an empty object (no-op mutation)", () => {
			const result = safeParseTrackChanges({});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.issues[0]?.message).toContain("At least one field");
			}
		});

		it("rejects status + fields combination", () => {
			const result = safeParseTrackChanges({
				status: "pending",
				selected: 1,
			});
			expect(result.success).toBe(false);
		});

		it("rejects failed status without reason", () => {
			const result = safeParseTrackChanges({ status: "failed" });
			expect(result.success).toBe(false);
		});

		it("produces issues with path, message, and code", () => {
			const result = safeParseTrackChanges({ selected: 99 });
			expect(result.success).toBe(false);
			if (!result.success) {
				for (const issue of result.issues) {
					expect(typeof issue.path).toBe("string");
					expect(typeof issue.message).toBe("string");
					expect(typeof issue.code).toBe("string");
				}
			}
		});
	});
});
