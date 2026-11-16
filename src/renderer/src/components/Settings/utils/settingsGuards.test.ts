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

import { FILTER_NAMES } from "@shared/schemas/settings.schema";
import {
	fromVbrValue,
	isAudioFilterName,
	isVbrValue,
	normalizeFilterSelection,
	toVbrValue,
} from "./settingsGuards";
import {
	BITRATE_MODE_LABELS,
	buildAdvancedHelp,
	humanizeOptionLabel,
} from "./settingsLabels";

describe("isAudioFilterName", () => {
	it.each(FILTER_NAMES)("accepts canonical filter name %s", (name) => {
		expect(isAudioFilterName(name)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["similar name", "loudnorm2"],
		["shell injection attempt", "loudnorm; rm -rf /"],
		["wrong type", 42],
		["null", null],
		["prototype key", "__proto__"],
	])("rejects %s", (_desc, value) => {
		expect(isAudioFilterName(value)).toBe(false);
	});
});

describe("normalizeFilterSelection", () => {
	it("passes canonical names through", () => {
		expect(normalizeFilterSelection("loudnorm")).toBe("loudnorm");
	});

	it("maps empty-ish values to the no-filter sentinel", () => {
		expect(normalizeFilterSelection("")).toBe("");
		expect(normalizeFilterSelection(null)).toBe("");
		expect(normalizeFilterSelection(undefined)).toBe("");
	});

	it("collapses unknown strings to no-filter instead of propagating them", () => {
		expect(normalizeFilterSelection("evil=1:drop=table")).toBe("");
	});
});

describe("VBR value guards and converters", () => {
	it("accepts only the string enum '1'-'9'", () => {
		expect(isVbrValue("4")).toBe(true);
		expect(isVbrValue("0")).toBe(false);
		expect(isVbrValue("10")).toBe(false);
		expect(isVbrValue(4)).toBe(false);
	});

	it("toVbrValue maps in-range slider positions and rejects the rest", () => {
		expect(toVbrValue(1)).toBe("1");
		expect(toVbrValue(9)).toBe("9");
		expect(toVbrValue(4.7)).toBe("4");
		expect(toVbrValue(0)).toBeNull();
		expect(toVbrValue(10)).toBeNull();
		expect(toVbrValue(Number.NaN)).toBeNull();
	});

	it("fromVbrValue parses stored values and defaults safely", () => {
		expect(fromVbrValue("7")).toBe(7);
		expect(fromVbrValue(3)).toBe(3);
		expect(fromVbrValue("auto")).toBe(4);
		expect(fromVbrValue(undefined)).toBe(4);
		expect(fromVbrValue("99")).toBe(4);
	});
});

describe("plain-language labels", () => {
	it("replaces loudnorm jargon with product language", () => {
		expect(humanizeOptionLabel("I")).toBe("Target Volume (LUFS)");
		expect(humanizeOptionLabel("LRA")).toBe("Loudness Range (LU)");
		expect(humanizeOptionLabel("TP")).toBe("True Peak Limit (dBTP)");
		expect(humanizeOptionLabel("level_in")).toBe("Input Level");
	});

	it("falls back to the generic humanizer for unmapped parameters", () => {
		expect(humanizeOptionLabel("gaussize") === "gaussize").toBe(false);
		expect(humanizeOptionLabel("gaussize")).toBe("Gaussize");
	});

	it("keeps the raw FFmpeg identifier discoverable in tooltip copy", () => {
		const help = buildAdvancedHelp({
			label: "level_in",
			desc: "Set input gain. Range is between 0.015625 and 64.",
		});
		expect(help).toContain("FFmpeg parameter: level_in");
		expect(help).toContain("Set input gain");
	});

	it("labels every bitrate mode in plain language", () => {
		expect(BITRATE_MODE_LABELS.cbr).toBe("Constant");
		expect(BITRATE_MODE_LABELS.vbr).toBe("Variable");
		expect(BITRATE_MODE_LABELS.auto).toBe("Auto");
	});
});
