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
import { getValidSettings } from "@shared/utils/factories";
import { safeParseSettings } from "./index";

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
