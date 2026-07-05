import { describe, expect, it } from "vitest";
import {
	type SettingsForm,
	settingsSchema,
} from "@/src/shared/schemas/settings.schema";

describe("settingsSchema", () => {
	const validSettings: SettingsForm = {
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
	it("fails when outputDirectoryPath is empty", () => {
		const invalid = {
			...validSettings,
			global: { ...validSettings.global, outputDirectoryPath: "" },
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
});
