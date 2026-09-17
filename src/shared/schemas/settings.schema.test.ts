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
	MAX_CONCURRENCY,
	MAX_PATH_LENGTH,
	MIN_CONCURRENCY,
} from "@shared/constants";
import { getValidSettings } from "@shared/utils/factories";
import {
	audioFilterConfigSchema,
	FILTER_NAMES,
	SETTINGS_SCHEMA_VERSION,
	type SettingsForm,
	strictSettingsSchema as settingsSchema,
} from "@/src/shared/schemas/settings.schema";

describe("settingsSchema", () => {
	const validSettings: SettingsForm = getValidSettings();
	it("validates a complete valid settings object", () => {
		const result = settingsSchema.safeParse(validSettings);
		expect(result.success).toBe(true);
	});
	it("accepts settings without a version field and defaults to SETTINGS_SCHEMA_VERSION", () => {
		const { version, ...withoutVersion } = validSettings;
		const result = settingsSchema.safeParse(withoutVersion);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.version).toBe(SETTINGS_SCHEMA_VERSION);
		}
	});
	it("rejects a non-integer version", () => {
		const invalid = { ...validSettings, version: 1.5 };
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["version"]);
		}
	});

	it("rejects a negative version", () => {
		const invalid = { ...validSettings, version: -1 };
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["version"]);
		}
	});

	it("rejects a version of zero", () => {
		const invalid = { ...validSettings, version: 0 };
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["version"]);
		}
	});

	it("fails when outputDirectoryPath is empty", () => {
		const invalid = {
			...validSettings,
			global: { ...validSettings.global, outputDirectoryPath: "" },
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual([
				"global",
				"outputDirectoryPath",
			]);
		}
	});

	it("rejects outputDirectoryPath containing null bytes", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: "/music/\0output",
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual([
				"global",
				"outputDirectoryPath",
			]);
			expect(result.error.issues[0]?.code).toBe("custom");
		}
	});

	it("rejects outputDirectoryPath containing traversal sequences", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: "/music/../../etc/passwd",
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual([
				"global",
				"outputDirectoryPath",
			]);
			expect(result.error.issues[0]?.code).toBe("custom");
		}
	});

	it("rejects outputDirectoryPath with backslash traversal", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: "C:\\music\\..\\..\\Windows",
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual([
				"global",
				"outputDirectoryPath",
			]);
			expect(result.error.issues[0]?.code).toBe("custom");
		}
	});

	it("rejects outputDirectoryPath exceeding maximum length MAX_PATH_LENGTH", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: `/music/${"a".repeat(MAX_PATH_LENGTH + 4)}`,
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual([
				"global",
				"outputDirectoryPath",
			]);
			expect(result.error.issues[0]?.code).toBe("too_big");
		}
	});

	it("fails when concurrency is below minimum", () => {
		const invalid = {
			...validSettings,
			global: { ...validSettings.global, concurrency: MIN_CONCURRENCY - 1 },
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["global", "concurrency"]);
			expect(result.error.issues[0]?.code).toBe("too_small");
		}
	});

	it("fails when concurrency exceeds maximum", () => {
		const invalid = {
			...validSettings,
			global: { ...validSettings.global, concurrency: MAX_CONCURRENCY + 1 },
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["global", "concurrency"]);
			expect(result.error.issues[0]?.code).toBe("too_big");
		}
	});

	it("fails when audioQualityValue doesn't match the selected quality mode", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioQuality: "cbr",
				audioQualityValue: "9",
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual([
				"audio",
				"audioQualityValue",
			]);
		}
	});

	it("accepts auto quality with 'auto' value", () => {
		const valid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioQuality: "auto",
				audioQualityValue: "auto",
			},
		};
		const result = settingsSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it("accepts 'copy' as audioCodec", () => {
		const withCopy = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioCodec: "copy",
			},
		};
		const result = settingsSchema.safeParse(withCopy);
		expect(result.success).toBe(true);
	});

	it("accepts filterOptions with string, number, and boolean values", () => {
		const valid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				filterOptions: { I: "-24", LRA: 7, linear: true },
			},
		};
		const result = settingsSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it("accepts codecOptions with string, number, and boolean values", () => {
		const valid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				codecOptions: { b: "320k", compression_level: 5, reservoir: false },
			},
		};
		const result = settingsSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it.each([
		[
			"filterOptions",
			{ mockProperty: ["1", "2"] },
			["audio", "filterOptions", "mockProperty"],
		],
		[
			"codecOptions",
			{ mockProperty: ["1", "2"] },
			["audio", "codecOptions", "mockProperty"],
		],
	])(
		"rejects %s with non-permitted types",
		(_label, optionsValue, expectedPath) => {
			const invalid = {
				...validSettings,
				audio: {
					...validSettings.audio,
					[_label === "filterOptions" ? "filterOptions" : "codecOptions"]:
						optionsValue,
				},
			};
			const result = settingsSchema.safeParse(invalid);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(expectedPath);
			}
		},
	);

	it("allows empty objects for filterOptions and codecOptions", () => {
		const empty = {
			...validSettings,
			audio: { ...validSettings.audio, filterOptions: {}, codecOptions: {} },
		};
		const result = settingsSchema.safeParse(empty);
		expect(result.success).toBe(true);
	});

	it.each([
		["filterOptions", null, ["audio", "filterOptions"]],
		["filterOptions", undefined, ["audio", "filterOptions"]],
		["codecOptions", null, ["audio", "codecOptions"]],
		["codecOptions", undefined, ["audio", "codecOptions"]],
	])("rejects %s set to %s", (_field, value, expectedPath) => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				[_field]: value,
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(expectedPath);
		}
	});

	it.each([
		["filterOptions", { I: null }, ["audio", "filterOptions", "I"]],
		["filterOptions", { I: undefined }, ["audio", "filterOptions", "I"]],
	])(
		"rejects a record value that is null/undefined in %s",
		(_field, optionsValue, expectedPath) => {
			const invalid = {
				...validSettings,
				audio: {
					...validSettings.audio,
					filterOptions: optionsValue,
				},
			};
			const result = settingsSchema.safeParse(invalid);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(expectedPath);
			}
		},
	);

	it("rejects null for global.outputDirectoryPath", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: null,
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual([
				"global",
				"outputDirectoryPath",
			]);
			expect(result.error.issues[0]?.code).toBe("invalid_type");
		}
	});

	it.each(FILTER_NAMES)("accepts known filter name: %s", (filterName) => {
		const settings = {
			...validSettings,
			audio: { ...validSettings.audio, audioFilter: filterName },
		};
		expect(settingsSchema.safeParse(settings).success).toBe(true);
	});

	it("accepts an empty audioFilter (no filter)", () => {
		const settings = {
			...validSettings,
			audio: { ...validSettings.audio, audioFilter: "" },
		};
		const result = settingsSchema.safeParse(settings);
		expect(result.success).toBe(true);
	});

	it("rejects an unknown audioFilter string", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioFilter: "malicious;rm -rf /",
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["audio", "audioFilter"]);
		}
	});

	it("rejects an audioFilter with shell metacharacters", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioFilter: "loudnorm$(whoami)",
			},
		};
		const result = settingsSchema.safeParse(invalid);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["audio", "audioFilter"]);
		}
	});
});

describe("audioFilterConfigSchema", () => {
	const createValidFilterConfig = (
		overrides: Record<string, unknown> = {},
	): Record<string, unknown> => ({
		name: "loudnorm",
		desc: "EBU R128 loudness normalization.",
		options: [
			{
				type: "number",
				label: "I",
				desc: "Set integrated loudness target.",
				min: -70,
				max: -5,
				defaultValue: -24,
			},
			{
				type: "switch",
				label: "linear",
				desc: "Normalize by linearly scaling the source audio.",
				defaultValue: true,
			},
		],
		...overrides,
	});

	it("validates a complete filter configuration", () => {
		const result = audioFilterConfigSchema.safeParse(createValidFilterConfig());
		expect(result.success).toBe(true);
	});

	it("accepts a filter configuration with an empty options array", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({ options: [] }),
		);
		expect(result.success).toBe(true);
	});

	it("accepts every supported option type inside a single configuration", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({
				options: [
					{
						type: "number",
						label: "I",
						desc: "Integrated loudness target.",
						min: -70,
						max: -5,
						defaultValue: -24,
					},
					{
						type: "select",
						label: "mode",
						desc: "Operation mode.",
						options: ["downward", "upward"],
						defaultValue: "downward",
					},
					{
						type: "switch",
						label: "linear",
						desc: "Linear normalization.",
						defaultValue: true,
					},
					{
						type: "text",
						label: "delays",
						desc: "Delay list.",
						defaultValue: "1000",
					},
				],
			}),
		);
		expect(result.success).toBe(true);
	});

	it.each(["name", "desc", "options"])(
		"rejects a missing %s field and reports its path",
		(field) => {
			const config = createValidFilterConfig();
			delete config[field];
			const result = audioFilterConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual([field]);
			}
		},
	);

	it("rejects a non-string name", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({ name: 42 }),
		);
		expect(result.success).toBe(false);
	});

	it("rejects a non-string desc", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({ desc: null }),
		);
		expect(result.success).toBe(false);
	});

	it("rejects a non-array options value", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({ options: "loudnorm" }),
		);
		expect(result.success).toBe(false);
	});

	it("rejects an invalid option entry and reports the nested path", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({
				options: [
					{
						type: "number",
						label: "I",
						desc: "Integrated loudness target.",
						min: -70,
						defaultValue: -24,
					},
				],
			}),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["options", 0, "max"]);
		}
	});

	it("rejects a name that is not a member of FILTER_NAMES", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({ name: "custom_unknown_filter" }),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["name"]);
		}
	});

	it("rejects an empty desc string", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({ desc: "" }),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toEqual(["desc"]);
		}
	});

	it("rejects unknown properties on the config object (strict mode)", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({ legacyField: "value" }),
		);
		expect(result.success).toBe(false);
	});
});
