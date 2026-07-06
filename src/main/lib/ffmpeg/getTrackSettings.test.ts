import type { SettingsForm } from "@/src/shared/schemas/settings.schema";
import { getTrackSettings } from "./getTrackSettings";

describe("getTrackSettings", () => {
	const initialSettings: SettingsForm["audio"] = {
		audioCodec: "copy",
		codecOptions: {},
		audioQuality: "auto",
		audioQualityValue: "auto",
		outputExtension: ".mp3",
		audioFilter: "",
		filterOptions: {},
	};

	it("returns no args when settings equal initial", () => {
		const result = getTrackSettings(initialSettings, initialSettings);
		expect(result).toEqual([]);
	});

	it("adds codec arguments when codec changes", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioCodec: "libmp3lame",
			codecOptions: { compression_level: 5 },
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toContain("-c:a");
		expect(result).toContain("libmp3lame");
		expect(result).toContain("-compression_level:a");
		expect(result).toContain("5");
	});

	it("handles boolean codec options correctly", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioCodec: "libmp3lame",
			codecOptions: { reservoir: false },
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toContain("-reservoir:a");
		expect(result).toContain("0");
	});

	it("handles multiple codec arguments", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioCodec: "libmp3lame",
			codecOptions: {
				b: "128k",
				compression_level: 5,
				reservoir: false,
				joint_stereo: true,
			},
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toEqual([
			"-c:a",
			"libmp3lame",
			"-b:a",
			"128k",
			"-compression_level:a",
			"5",
			"-reservoir:a",
			"0",
			"-joint_stereo:a",
			"1",
		]);
	});

	it("does not add codec options when codec is unchanged", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			codecOptions: { compression_level: 5 },
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).not.toContain("-compression_level:a");
		expect(result).not.toContain("5");
		expect(result).toEqual([]);
	});

	it("adds filter arguments when audioFilter is set", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioFilter: "loudnorm",
			filterOptions: { I: -24 },
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toContain("-af");
		expect(result).toContain("loudnorm=I=-24");
	});

	it("handles multiple filter arguments", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioFilter: "loudnorm",
			filterOptions: {
				I: -24,
				LRA: 7,
				TP: -1,
				linear: true,
				offset: 0.5,
			},
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toEqual([
			"-af",
			"loudnorm=I=-24:LRA=7:TP=-1:linear=true:offset=0.5",
		]);
	});

	it("does not add filter options when filter is not set", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			filterOptions: {
				I: -24,
				linear: true,
			},
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toEqual([]);
	});

	it("adds quality arguments for CBR", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioQuality: "cbr",
			audioQualityValue: "320k",
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toContain("-b:a");
		expect(result).toContain("320k");
	});

	it("adds quality arguments for VBR", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioQuality: "vbr",
			audioQualityValue: "4",
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toContain("-q:a");
		expect(result).toContain("4");
	});

	it("does not add quality arguments when auto", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioQuality: "auto",
			audioQualityValue: "auto",
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).not.toContain("-q:a");
		expect(result).not.toContain("-b:a");
	});

	it("handles combined changes in correct order", () => {
		const settings: SettingsForm["audio"] = {
			...initialSettings,
			audioCodec: "libmp3lame",
			codecOptions: { compression_level: 5, reservoir: true },
			audioFilter: "volume",
			filterOptions: { volume: 0.8 },
			audioQuality: "cbr",
			audioQualityValue: "128k",
		};
		const result = getTrackSettings(initialSettings, settings);
		expect(result).toEqual([
			"-c:a",
			"libmp3lame",
			"-compression_level:a",
			"5",
			"-reservoir:a",
			"1",
			"-af",
			"volume=volume=0.8",
			"-b:a",
			"128k",
		]);
	});

	it("treats undefined as empty", () => {
		const settings = {
			...initialSettings,
			audioCodec: undefined,
			audioFilter: undefined,
			audioQuality: undefined,
		};
		const result = getTrackSettings(initialSettings, settings as any);
		expect(result).toEqual([]);
	});
});
