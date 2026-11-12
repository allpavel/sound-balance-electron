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
	it("isStringArray accepts only homogeneous string arrays", () => {
		expect(isStringArray(["a", "b"])).toBe(true);
		expect(isStringArray([])).toBe(true);
		expect(isStringArray(["a", 1])).toBe(false);
		expect(isStringArray("ab")).toBe(false);
		expect(isStringArray(null)).toBe(false);
	});

	it("isTrackPosition accepts { no, of } shapes with nullable members", () => {
		expect(isTrackPosition({ no: 3, of: 12 })).toBe(true);
		expect(isTrackPosition({ no: null, of: null })).toBe(true);
		expect(isTrackPosition({ no: 3 })).toBe(true);
		expect(isTrackPosition({ of: 12 })).toBe(true);
		expect(isTrackPosition({ no: "3", of: 12 })).toBe(false);
		expect(isTrackPosition({ ratio: 1, dB: -3 })).toBe(false);
		expect(isTrackPosition(null)).toBe(false);
		expect(isTrackPosition([1, 2])).toBe(false);
	});
});

describe("unit formatters", () => {
	it("formats durations as m:ss / h:mm:ss", () => {
		expect(formatDuration(65)).toBe("1:05");
		expect(formatDuration(3725)).toBe("1:02:05");
		expect(formatDuration(Number.NaN)).toBe("Not set");
		expect(formatDuration(-1)).toBe("Not set");
	});

	it("formats bit rates in kbps/Mbps", () => {
		expect(formatBitrate(320_000)).toBe("320 kbps");
		expect(formatBitrate(1_411_200)).toBe("1.4 Mbps");
		expect(formatBitrate(0)).toBe("Not set");
	});

	it("formats sample rates in kHz", () => {
		expect(formatSampleRate(44_100)).toBe("44.1 kHz");
		expect(formatSampleRate(800)).toBe("800 Hz");
		expect(formatSampleRate(-1)).toBe("Not set");
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

	it("humanizeMetadataKey prefers overrides and falls back to the splitter", () => {
		expect(humanizeMetadataKey("isrc")).toBe("ISRC");
		expect(humanizeMetadataKey("key")).toBe("Musical Key");
		expect(humanizeMetadataKey("originaldate")).toBe("Original Date");
		expect(humanizeMetadataKey("encodedby")).toBe("Encodedby");
	});
});
