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
	audioFilterConfigSchema,
	FILTER_NAMES,
	SETTINGS_SCHEMA_VERSION,
	type SettingsForm,
	settingsSchema,
} from "@/src/shared/schemas/settings.schema";

describe("settingsSchema", () => {
	const validSettings: SettingsForm = {
		version: SETTINGS_SCHEMA_VERSION,
		global: {
			outputDirectoryPath: "/music/output",
			openOutputFolderOnComplete: true,
			concurrency: 4,
			overwrite: false,
			noOverwrite: true,
		},
		audio: {
			audioCodec: "libmp3lame",
			codecOptions: { compression_level: 5 },
			audioQuality: "vbr",
			audioQualityValue: "4",
			outputExtension: ".mp3",
			audioFilter: "loudnorm",
			filterOptions: { I: -24, LRA: 7 },
		},
	};
	it("validates a complete valid settings object", () => {
		expect(() => settingsSchema.parse(validSettings)).not.toThrow();
	});
	it("accepts settings without a version field and defaults to 1", () => {
		const { version, ...withoutVersion } = validSettings;
		const result = settingsSchema.safeParse(withoutVersion);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.version).toBe(1);
		}
	});
	it("rejects a non-integer version", () => {
		const invalid = { ...validSettings, version: 1.5 };
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});

	it("rejects a negative version", () => {
		const invalid = { ...validSettings, version: -1 };
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});

	it("rejects a version of zero", () => {
		const invalid = { ...validSettings, version: 0 };
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("fails when outputDirectoryPath is empty", () => {
		const invalid = {
			...validSettings,
			global: { ...validSettings.global, outputDirectoryPath: "" },
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});

	it("rejects outputDirectoryPath containing null bytes", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: "/music/\0output",
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("rejects outputDirectoryPath containing traversal sequences", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: "/music/../../etc/passwd",
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("rejects outputDirectoryPath with backslash traversal", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: "C:\\music\\..\\..\\Windows",
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("rejects outputDirectoryPath exceeding maximum length", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: `/music/${"a".repeat(4100)}`,
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("fails when concurrency is out of range", () => {
		const invalid = {
			...validSettings,
			global: { ...validSettings.global, concurrency: 0 },
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
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
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("accepts auto quality with 'auto' value", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioQuality: "auto",
				audioQualityValue: "auto",
			},
		};
		expect(() => settingsSchema.parse(invalid)).not.toThrow();
	});
	it("accepts 'copy' as audioCodec", () => {
		const withCopy = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioCodec: "copy",
			},
		};
		expect(() => settingsSchema.parse(withCopy)).not.toThrow();
	});
	it("accepts filterOptions with string, number, and boolean values", () => {
		const valid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				filterOptions: { I: "-24", LRA: 7, linear: true },
			},
		};
		expect(() => settingsSchema.parse(valid)).not.toThrow();
	});
	it("accepts codecOptions with string, number, and boolean values", () => {
		const valid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				codecOptions: { b: "320k", compression_level: 5, reservoir: false },
			},
		};
		expect(() => settingsSchema.parse(valid)).not.toThrow();
	});
	it("rejects filterOptions with non-permitted types", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				filterOptions: { mockProperty: ["1", "2"] },
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("rejects codecOptions with non-permitted types", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				codecOptions: { mockProperty: ["1", "2"] },
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("allows empty objects for filterOptions and codecOptions", () => {
		const empty = {
			...validSettings,
			audio: { ...validSettings.audio, filterOptions: {}, codecOptions: {} },
		};
		expect(() => settingsSchema.parse(empty)).not.toThrow();
	});
	it("rejects null for filterOptions", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				filterOptions: null,
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});

	it("rejects undefined for filterOptions", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				filterOptions: undefined,
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("rejects null for codecOptions", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				codecOptions: null,
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});

	it("rejects undefined for codecOptions", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				codecOptions: undefined,
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});

	it("rejects a record value that is null", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				filterOptions: { I: null },
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("rejects a record value that is undefined", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				filterOptions: { I: undefined },
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("rejects null for global.outputDirectoryPath", () => {
		const invalid = {
			...validSettings,
			global: {
				...validSettings.global,
				outputDirectoryPath: null,
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("accepts every known filter name", () => {
		for (const filterName of FILTER_NAMES) {
			const settings = {
				...validSettings,
				audio: { ...validSettings.audio, audioFilter: filterName },
			};
			expect(settingsSchema.safeParse(settings).success).toBe(true);
		}
	});
	it("accepts an empty audioFilter (no filter)", () => {
		const settings = {
			...validSettings,
			audio: { ...validSettings.audio, audioFilter: "" },
		};
		expect(() => settingsSchema.parse(settings)).not.toThrow();
	});
	it("rejects an unknown audioFilter string", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioFilter: "malicious;rm -rf /",
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
	});
	it("rejects an audioFilter with shell metacharacters", () => {
		const invalid = {
			...validSettings,
			audio: {
				...validSettings.audio,
				audioFilter: "loudnorm$(whoami)",
			},
		};
		expect(() => settingsSchema.parse(invalid)).toThrow();
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

	it("accepts any string name without restricting it to FILTER_NAMES", () => {
		const result = audioFilterConfigSchema.safeParse(
			createValidFilterConfig({ name: "custom_filter" }),
		);
		expect(result.success).toBe(true);
	});
});
