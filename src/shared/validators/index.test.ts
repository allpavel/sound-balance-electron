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

import { MAX_BASE64_IMAGE_SIZE } from "@shared/constants";
import { getValidSettings, makeTrack } from "@tests/factories";
import {
	ISSUE_LIMIT_CODE,
	MAX_VALIDATION_ISSUES,
	safeParseData,
	safeParseSettings,
	safeParseTrack,
	safeParseTrackChanges,
	safeParseTracks,
	type ValidationIssue,
	type ValidationResult,
} from "./index";

function expectSuccess<T>(result: ValidationResult<T>): T {
	if (!result.success) {
		throw new Error(
			`Expected validation to succeed but received issues: ${JSON.stringify(result.issues)}`,
		);
	}
	return result.data;
}

function expectFailure(result: ValidationResult<unknown>): ValidationIssue[] {
	if (result.success) {
		throw new Error(
			`Expected validation to fail but parsing succeeded: ${JSON.stringify(result.data)}`,
		);
	}
	expect(result.issues.length).toBeGreaterThan(0);
	for (const issue of result.issues) {
		expect(Array.isArray(issue.path)).toBe(true);
		expect(typeof issue.pathString).toBe("string");
		expect(typeof issue.message).toBe("string");
		expect(typeof issue.code).toBe("string");
	}
	return result.issues;
}

describe("safeParseSettings", () => {
	describe("successful parsing contract", () => {
		it("returns success: true and the parsed data for a fully valid settings object", () => {
			const validSettings = getValidSettings();
			const data = expectSuccess(safeParseSettings(validSettings));
			expect(data).toEqual(validSettings);
		});

		it("applies schema defaults when optional fields with defaults are omitted", () => {
			const { version, ...settingsWithoutVersion } = getValidSettings();
			const data = expectSuccess(safeParseSettings(settingsWithoutVersion));
			expect(data.version).toBe(1);
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
			const data = expectSuccess(safeParseSettings(input));
			expect(data).not.toHaveProperty("unknownTopLevel");
			expect(data.global).not.toHaveProperty("unknownGlobal");
		});
	});

	describe("mode option (strict vs loose)", () => {
		it("defaults to strict mode when no options are provided", () => {
			const validSettings = getValidSettings();
			expect(safeParseSettings(validSettings)).toEqual(
				safeParseSettings(validSettings, { mode: "strict" }),
			);
		});

		it("exercises the loose branch and returns a well-formed result for valid input", () => {
			const validSettings = getValidSettings();
			const data = expectSuccess(
				safeParseSettings(validSettings, { mode: "loose" }),
			);
			expect(data).toEqual(validSettings);
		});

		it("loose mode still rejects structurally invalid input (validation is never skipped)", () => {
			expectFailure(safeParseSettings({ concurrency: 0 }, { mode: "loose" }));
		});
	});

	describe("failed parsing contract (Issue Mapping)", () => {
		it.each([null, undefined, "string", 42, true, []])(
			"returns an empty path and invalid_type for non-object root input %s",
			(input) => {
				const issues = expectFailure(safeParseSettings(input));
				expect(issues[0]?.pathString).toBe("");
				expect(issues[0]?.path).toEqual([]);
				expect(issues[0]?.code).toBe("invalid_type");
			},
		);

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
			const issues = expectFailure(safeParseSettings(invalidSettings));
			const paths = issues.map((issue) => issue.pathString);
			expect(paths).toContain("global.outputDirectoryPath");
			expect(paths).toContain("global.concurrency");
			expect(paths).toContain("audio.audioCodec");
			const concurrencyIssue = issues.find(
				(i) => i.pathString === "global.concurrency",
			);
			expect(concurrencyIssue).toBeDefined();
			expect(concurrencyIssue?.code).toBe("invalid_type");
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
					(i) => i.pathString === "global.concurrency",
				);
				expect(concurrencyIssue).toBeDefined();
				expect(concurrencyIssue?.code).toBe("too_big");
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
			const issues = expectFailure(safeParseSettings(invalidSettings));
			const pathIssue = issues.find(
				(i) => i.pathString === "global.outputDirectoryPath",
			);
			expect(pathIssue?.code).toBe("custom");
			expect(pathIssue?.message).toBe("Path contains traversal sequences (..)");
		});

		it("captures multiple simultaneous issues without throwing or truncating", () => {
			const base = getValidSettings();
			const invalidSettings = {
				...base,
				version: -1,
				global: {
					...base.global,
					outputDirectoryPath: "",
					openOutputFolderOnComplete: "yes" as unknown as boolean,
					concurrency: 0,
				},
				audio: { ...base.audio, audioCodec: "invalid_codec" },
			};
			const issues = expectFailure(safeParseSettings(invalidSettings));
			expect(issues.length).toBeGreaterThanOrEqual(4);
			const paths = issues.map((i) => i.pathString);
			expect(paths).toContain("version");
			expect(paths).toContain("global.outputDirectoryPath");
			expect(paths).toContain("global.openOutputFolderOnComplete");
			expect(paths).toContain("audio.audioCodec");
		});
	});
});

describe("safeParseTracks", () => {
	describe("successful parsing contract", () => {
		it("returns success: true and parsed data for a valid tracks array", () => {
			const tracks = [makeTrack(), makeTrack()];
			const data = expectSuccess(safeParseTracks(tracks));
			expect(data).toHaveLength(2);
			expect(data[0]?.id).toBe(tracks[0]?.id);
		});

		it("accepts an empty tracks array", () => {
			const data = expectSuccess(safeParseTracks([]));
			expect(data).toEqual([]);
		});

		it("strips unknown top-level properties from tracks", () => {
			const tracks = [{ ...makeTrack(), unknownProp: "should be stripped" }];
			const data = expectSuccess(safeParseTracks(tracks));
			expect(data[0]).not.toHaveProperty("unknownProp");
		});
	});

	describe("failed parsing contract", () => {
		it.each([null, undefined, "string", 42, {}, makeTrack()])(
			"rejects non-array input %s",
			(input) => {
				expectFailure(safeParseTracks(input));
			},
		);

		it("rejects a track with missing required fields and reports path", () => {
			const { id, ...invalidTrack } = makeTrack();
			const issues = expectFailure(safeParseTracks([invalidTrack]));
			expect(issues[0]?.pathString).toBe("0.id");
			expect(issues[0]?.path).toEqual([0, "id"]);
		});

		it("rejects a track with invalid status and reports nested path", () => {
			const issues = expectFailure(
				safeParseTracks([makeTrack({ status: "invalid" as any })]),
			);
			expect(issues[0]?.pathString).toBe("0.status");
			expect(issues[0]?.path).toEqual([0, "status"]);
		});

		it("reports correct index for invalid items in the array", () => {
			const tracks = [makeTrack(), makeTrack({ filePath: "" })];
			const issues = expectFailure(safeParseTracks(tracks));
			expect(issues[0]?.pathString).toBe("1.filePath");
			expect(issues[0]?.path).toEqual([1, "filePath"]);
		});

		it("captures multiple simultaneous issues", () => {
			const tracks = [
				makeTrack({ id: "", filePath: "" }),
				makeTrack({ selected: 99 as any }),
			];
			const issues = expectFailure(safeParseTracks(tracks));
			expect(issues.length).toBeGreaterThanOrEqual(3);
		});
	});
});

describe("safeParseTrack", () => {
	it("returns success: true and round-trips the parsed data", () => {
		const track = makeTrack();
		const data = expectSuccess(safeParseTrack(track));
		expect(data).toEqual(track);
	});

	it("strips unknown top-level properties", () => {
		const data = expectSuccess(
			safeParseTrack({ ...makeTrack(), unknownProp: "stripped" }),
		);
		expect(data).not.toHaveProperty("unknownProp");
	});

	it.each([null, undefined, "string", 42, true, [], {}])(
		"rejects non-object input %s",
		(input) => {
			expectFailure(safeParseTrack(input));
		},
	);

	it("reports field paths WITHOUT array-index prefixes (single-object contract)", () => {
		const issues = expectFailure(
			safeParseTrack(makeTrack({ status: "invalid" as any })),
		);
		expect(issues[0]?.pathString).toBe("status");
		expect(issues[0]?.path).toEqual(["status"]);
	});

	it("rejects a track missing a required field and reports its path", () => {
		const { id, ...withoutId } = makeTrack();
		const issues = expectFailure(safeParseTrack(withoutId));
		expect(issues[0]?.pathString).toBe("id");
		expect(issues[0]?.path).toEqual(["id"]);
	});

	it("reports deeply nested array paths", () => {
		const issues = expectFailure(
			safeParseTrack(
				makeTrack({
					common: {
						picture: [
							{
								format: "image/jpeg",
								data: "x".repeat(MAX_BASE64_IMAGE_SIZE + 1),
							},
						],
					},
				} as any),
			),
		);
		expect(issues[0]?.pathString).toBe("common.picture.0.data");
		expect(issues[0]?.path).toEqual(["common", "picture", 0, "data"]);
	});

	it("re-verifies null-byte rejection at the boundary (defense in depth)", () => {
		const issues = expectFailure(
			safeParseTrack(makeTrack({ filePath: "/music/\0track.mp3" })),
		);
		expect(issues.some((i) => i.pathString === "filePath")).toBe(true);
	});
});

describe("safeParseData", () => {
	const createValidData = () => ({
		tracks: [makeTrack()],
		settings: getValidSettings(),
	});

	describe("successful parsing contract", () => {
		it("returns success: true for a fully valid Data payload", () => {
			const data = expectSuccess(safeParseData(createValidData()));
			expect(data.tracks).toHaveLength(1);
			expect(data.settings).toBeDefined();
		});

		it("accepts empty tracks array with valid settings", () => {
			expectSuccess(
				safeParseData({ tracks: [], settings: getValidSettings() }),
			);
		});
	});

	describe("failed parsing contract", () => {
		it.each([null, undefined, "string", 42, []])(
			"rejects non-object input %s",
			(input) => {
				expectFailure(safeParseData(input));
			},
		);

		it("rejects missing tracks property", () => {
			const { tracks, ...withoutTracks } = createValidData();
			const issues = expectFailure(safeParseData(withoutTracks));
			expect(issues[0]?.pathString).toBe("tracks");
			expect(issues[0]?.path).toEqual(["tracks"]);
		});

		it("rejects missing settings property", () => {
			const { settings, ...withoutSettings } = createValidData();
			const issues = expectFailure(safeParseData(withoutSettings));
			expect(issues[0]?.pathString).toBe("settings");
			expect(issues[0]?.path).toEqual(["settings"]);
		});

		it("rejects invalid track within the array and reports nested path", () => {
			const issues = expectFailure(
				safeParseData({
					tracks: [makeTrack({ status: "invalid" as any })],
					settings: getValidSettings(),
				}),
			);
			expect(issues[0]?.pathString).toBe("tracks.0.status");
			expect(issues[0]?.path).toEqual(["tracks", 0, "status"]);
		});

		it("rejects invalid settings and reports nested path", () => {
			const validSettings = getValidSettings();
			const issues = expectFailure(
				safeParseData({
					tracks: [makeTrack()],
					settings: {
						...validSettings,
						global: { ...validSettings.global, concurrency: 0 },
					},
				}),
			);
			expect(issues[0]?.pathString).toBe("settings.global.concurrency");
			expect(issues[0]?.path).toEqual(["settings", "global", "concurrency"]);
		});

		it("captures issues from both tracks and settings simultaneously", () => {
			const validSettings = getValidSettings();
			const issues = expectFailure(
				safeParseData({
					tracks: [makeTrack({ id: "" })],
					settings: {
						...validSettings,
						global: { ...validSettings.global, concurrency: 0 },
					},
				}),
			);
			const paths = issues.map((i) => i.pathString);
			expect(paths).toContain("tracks.0.id");
			expect(paths).toContain("settings.global.concurrency");
		});
	});
});

describe("mapZodIssues (verified through the public API)", () => {
	it("flattens union branch errors into leaf issues (no opaque invalid_union leaked)", () => {
		const issues = expectFailure(safeParseTrackChanges({ selected: 99 }));
		expect(issues.some((i) => i.code === "invalid_union")).toBe(false);
		expect(issues.some((i) => i.pathString === "selected")).toBe(true);
	});

	it("emits each unique path|code|message signature exactly once (dedup)", () => {
		const issues = expectFailure(safeParseTrackChanges({ selected: 99 }));
		const signatures = issues.map(
			(i) => `${i.pathString}|${i.code}|${i.message}`,
		);
		expect(new Set(signatures).size).toBe(signatures.length);
	});

	it("flattens the status/reason branch of the union", () => {
		const issues = expectFailure(
			safeParseTrackChanges({ status: "failed", reason: "" }),
		);
		expect(issues.some((i) => i.pathString === "reason")).toBe(true);
	});

	it("caps flattened issues at MAX_VALIDATION_ISSUES and appends a truncation marker", () => {
		const oversizedCollectionIds = Array.from(
			{ length: MAX_VALIDATION_ISSUES + 50 },
			() => "",
		);
		const issues = expectFailure(
			safeParseTracks([makeTrack({ collectionIds: oversizedCollectionIds })]),
		);
		expect(issues).toHaveLength(MAX_VALIDATION_ISSUES + 1);
		expect(issues[issues.length - 1]?.code).toBe(ISSUE_LIMIT_CODE);
		expect(issues[issues.length - 1]?.pathString).toBe("");
		expect(issues[issues.length - 1]?.path).toEqual([]);
		const realIssues = issues.filter((i) => i.code !== ISSUE_LIMIT_CODE);
		expect(realIssues).toHaveLength(MAX_VALIDATION_ISSUES);
	});

	it("returns frozen issue objects (shared results cannot be mutated downstream)", () => {
		const issues = expectFailure(safeParseSettings(null));
		for (const issue of issues) {
			expect(Object.isFrozen(issue.path)).toBe(true);
		}
	});
});

describe("mapZodIssues DRY contract", () => {
	const cases: ReadonlyArray<
		readonly [name: string, run: () => ValidationResult<unknown>]
	> = [
		["safeParseSettings", () => safeParseSettings({ invalid: true })],
		["safeParseTracks", () => safeParseTracks("not-an-array")],
		["safeParseTrack", () => safeParseTrack(42)],
		["safeParseData", () => safeParseData(null)],
		["safeParseTrackChanges", () => safeParseTrackChanges("str")],
	];

	it.each(cases)("%s emits the shared ValidationIssue contract", (_, run) => {
		const issues = expectFailure(run());
		for (const issue of issues) {
			expect(Object.keys(issue).sort()).toEqual([
				"code",
				"message",
				"path",
				"pathString",
			]);
		}
	});
});

describe("safeParseTrackChanges", () => {
	describe("successful parsing contract", () => {
		it("returns success: true for valid field changes", () => {
			const data = expectSuccess(safeParseTrackChanges({ selected: 1 }));
			expect(data).toEqual({ selected: 1 });
		});

		it("returns success: true for valid status changes", () => {
			const data = expectSuccess(
				safeParseTrackChanges({ status: "failed", reason: "FFmpeg error" }),
			);
			expect(data).toEqual({ status: "failed", reason: "FFmpeg error" });
		});

		it("rejects unknown top-level fields (strict mode)", () => {
			expectFailure(
				safeParseTrackChanges({ selected: 1, unknownProp: "stripped" }),
			);
		});
	});

	describe("failed parsing contract", () => {
		it.each([null, undefined, "str", 42, []])(
			"rejects non-object input %s",
			(input) => {
				expectFailure(safeParseTrackChanges(input));
			},
		);

		it("rejects an empty object (no-op mutation)", () => {
			const issues = expectFailure(safeParseTrackChanges({}));
			expect(issues[0]?.message).toContain("At least one field");
		});

		it("rejects status + fields combination", () => {
			expectFailure(safeParseTrackChanges({ status: "pending", selected: 1 }));
		});

		it("rejects failed status without reason", () => {
			expectFailure(safeParseTrackChanges({ status: "failed" }));
		});

		it("produces issues with path, message, and code", () => {
			expectFailure(safeParseTrackChanges({ selected: 99 }));
		});
	});
});
