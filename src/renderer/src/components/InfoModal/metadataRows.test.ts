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
	buildMetadataRows,
	formatBitrate,
	formatDuration,
	formatMetadataValue,
	formatSampleRate,
	humanizeMetadataKey,
	isStringArray,
	isTrackPosition,
} from "./metadataRows";

describe("type guards (no assertions involved)", () => {
	it.each<[unknown, boolean]>([
		[["a", "b"], true],
		[[], true],
		[["a", 1], false],
		["ab", false],
		[null, false],
	])("isStringArray(%o) === %o", (input, expected) => {
		expect(isStringArray(input)).toBe(expected);
	});

	it.each<[unknown, boolean]>([
		[{ no: 3, of: 12 }, true],
		[{ no: null, of: null }, true],
		[{ no: 3 }, true],
		[{ of: 12 }, true],
		[{ no: "3", of: 12 }, false],
		[{ ratio: 1, dB: -3 }, false],
		[null, false],
		[[1, 2], false],
	])("isTrackPosition(%o) === %o", (input, expected) => {
		expect(isTrackPosition(input)).toBe(expected);
	});
});

describe("unit formatters", () => {
	it.each<[number, string]>([
		[65, "1:05"],
		[3725, "1:02:05"],
		[Number.NaN, "Not set"],
		[-1, "Not set"],
	])("formatDuration(%o) === %o", (seconds, expected) => {
		expect(formatDuration(seconds)).toBe(expected);
	});

	it.each<[number, string]>([
		[320_000, "320 kbps"],
		[1_411_200, "1.4 Mbps"],
		[0, "Not set"],
	])("formatBitrate(%o) === %o", (bps, expected) => {
		expect(formatBitrate(bps)).toBe(expected);
	});

	it.each<[number, string]>([
		[44_100, "44.1 kHz"],
		[800, "800 Hz"],
		[-1, "Not set"],
	])("formatSampleRate(%o) === %o", (hz, expected) => {
		expect(formatSampleRate(hz)).toBe(expected);
	});
});

describe("formatMetadataValue", () => {
	it("renders absent values as an explicit, plain phrase", () => {
		expect(formatMetadataValue("artist", null)).toBe("Not set");
		expect(formatMetadataValue("artist", undefined)).toBe("Not set");
		expect(formatMetadataValue("artist", "")).toBe("Not set");
	});

	it("renders booleans as Yes/No (plain language)", () => {
		expect(formatMetadataValue("lossless", true)).toBe("Yes");
		expect(formatMetadataValue("lossless", false)).toBe("No");
	});

	it("applies key-aware formatting for known technical keys", () => {
		expect(formatMetadataValue("duration", 225)).toBe("3:45");
		expect(formatMetadataValue("bitrate", 256_000)).toBe("256 kbps");
		expect(formatMetadataValue("sampleRate", 48_000)).toBe("48 kHz");
		expect(formatMetadataValue("year", 1979)).toBe("1,979");
	});

	it("renders positions as 'no of total'", () => {
		expect(formatMetadataValue("track", { no: 3, of: 12 })).toBe("3 of 12");
		expect(formatMetadataValue("track", { no: 3, of: null })).toBe("Track 3");
		expect(formatMetadataValue("track", { no: null, of: 12 })).toBe("Not set");
	});

	it("counts artwork references instead of building broken data URLs", () => {
		expect(formatMetadataValue("picture", ["uuid-1"])).toBe("1 image attached");
		expect(formatMetadataValue("picture", ["uuid-1", "uuid-2"])).toBe(
			"2 images attached",
		);
		expect(formatMetadataValue("picture", [])).toBe("0 images attached");
	});

	it("joins string arrays and counts object arrays", () => {
		expect(formatMetadataValue("genre", ["Rock", "Pop"])).toBe("Rock, Pop");
		expect(
			formatMetadataValue("chapters", [{ title: "a" }, { title: "b" }]),
		).toBe("2 entries");
	});

	it("bounds structured fallbacks and never throws on circular input", () => {
		const circular: Record<string, unknown> = { name: "x" };
		circular.self = circular;
		expect(formatMetadataValue("weird", circular)).toBe("Not set");
		expect(formatMetadataValue("weird", { a: 1 })).toBe('{"a":1}');
	});
});

describe("buildMetadataRows", () => {
	it("humanizes keys, formats values, and skips undefined entries", () => {
		const rows = buildMetadataRows({
			albumartist: "Daft Punk",
			track: { no: 1, of: 13 },
			duration: 369,
			missing: undefined,
			lossless: false,
		});
		expect(rows).toEqual([
			{ key: "albumartist", label: "Album Artist", value: "Daft Punk" },
			{ key: "track", label: "Track", value: "1 of 13" },
			{ key: "duration", label: "Duration", value: "6:09" },
			{ key: "lossless", label: "Lossless", value: "No" },
		]);
	});

	it.each<[string, string]>([
		["isrc", "ISRC"],
		["key", "Musical Key"],
		["originaldate", "Original Date"],
		["encodedby", "Encodedby"],
	])("humanizeMetadataKey(%s) === %s", (input, expected) => {
		expect(humanizeMetadataKey(input)).toBe(expected);
	});
});
