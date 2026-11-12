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

import { withOverrides } from "@renderer/utils/humanizeLabel";

/** One presentable `Tag → Value` row. */
export type MetadataRow = {
	readonly key: string;
	readonly label: string;
	readonly value: string;
};

/** Fallback shown when a value is absent or unrenderable. */
const NOT_SET = "Not set";

/**
 * Plain-language overrides for single-word metadata keys that the generic
 * splitter cannot separate (Understandable: plain language).
 */
const METADATA_KEY_OVERRIDES: Readonly<Record<string, string>> = {
	albumartist: "Album Artist",
	albumartists: "Album Artists",
	originalartist: "Original Artist",
	originalalbum: "Original Album",
	originalyear: "Original Year",
	originaldate: "Original Date",
	releasedate: "Release Date",
	discsubtitle: "Disc Subtitle",
	longDescription: "Long Description",
	subtitle: "Subtitle",
	djmixer: "DJ Mixer",
	isrc: "ISRC",
	bpm: "BPM",
	key: "Musical Key",
	hdVideo: "HD Video",
	label: "Record Label",
	picture: "Album Art",
	trackInfo: "Stream Info",
	tagTypes: "Tag Types",
	numberOfChannels: "Channels",
	numberOfSamples: "Total Samples",
	bitsPerRawSample: "Bits per Raw Sample",
	trackPeakLevel: "Track Peak Level",
	albumPeakLevel: "Album Peak Level",
	hasAudio: "Has Audio Stream",
	hasVideo: "Has Video Stream",
};

/** Resolver combining overrides with the generic humanizer. */
export const humanizeMetadataKey = withOverrides(METADATA_KEY_OVERRIDES);

/**
 * Type guard: array whose every element is a string.
 *
 * @param value - Unknown runtime value.
 * @returns `true` when `value` is a `string[]`.
 */
export function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

/** Track/disc position shape stored in `common.track` / `common.disk`. */
export type TrackPosition = { no?: number | null; of?: number | null };

/**
 * Type guard for `{ no, of }` position objects.
 *
 * Narrowing strategy: structural checks with `typeof`/`in` only — no
 * assertions. `null` members are legal ("unknown side of the position").
 *
 * @param value - Unknown runtime value.
 * @returns `true` when `value` looks like a track/disc position.
 */
export function isTrackPosition(value: unknown): value is TrackPosition {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	// `in`-operator narrowing (TS >= 4.9) turns `value: object` into
	// `object & Record<"no" | "of", unknown>` without any assertion.
	const hasNo = "no" in value;
	const hasOf = "of" in value;
	if (!hasNo && !hasOf) {
		return false;
	}
	const no: unknown = hasNo ? value.no : undefined;
	const of: unknown = hasOf ? value.of : undefined;
	/** True when a range member is absent, null, or numeric. */
	const isLegalMember = (member: unknown): boolean =>
		member === undefined || member === null || typeof member === "number";
	return isLegalMember(no) && isLegalMember(of);
}

/**
 * Formats a duration in seconds as `m:ss` / `h:mm:ss`.
 *
 * @param seconds - Non-negative duration.
 * @returns Human-readable duration string.
 */
export function formatDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return NOT_SET;
	const total = Math.round(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
	const ss = String(s).padStart(2, "0");
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Formats a bit rate in bit/s as a kbps/Mbps string.
 *
 * @param bitrate - Bit rate in bits per second.
 * @returns e.g. `"320 kbps"` or `"1.4 Mbps"`.
 */
export function formatBitrate(bitrate: number): string {
	if (!Number.isFinite(bitrate) || bitrate <= 0) return NOT_SET;
	return bitrate >= 1_000_000
		? `${(bitrate / 1_000_000).toFixed(1)} Mbps`
		: `${Math.round(bitrate / 1000)} kbps`;
}

/**
 * Formats a sample rate in Hz.
 *
 * @param sampleRate - Sample rate (e.g. 44100).
 * @returns e.g. `"44.1 kHz"`.
 */
export function formatSampleRate(sampleRate: number): string {
	if (!Number.isFinite(sampleRate) || sampleRate <= 0) return NOT_SET;
	return sampleRate >= 1000
		? `${(sampleRate / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} kHz`
		: `${sampleRate} Hz`;
}

/**
 * Converts one metadata value into display text.
 *
 * Pure fallback chain (no assertions): primitives → boolean words →
 * positions → string arrays → object arrays → structured objects.
 *
 * @param key - Metadata key; enables key-aware formatting (duration, bitrate…).
 * @param value - Unknown runtime value from the track record.
 * @returns Display string; never throws.
 */
export function formatMetadataValue(key: string, value: unknown): string {
	if (value === null || value === undefined) {
		return NOT_SET;
	}
	if (typeof value === "boolean") {
		// Plain language instead of raw true/false (Understandable).
		return value ? "Yes" : "No";
	}
	if (typeof value === "number") {
		switch (key) {
			case "duration":
				return formatDuration(value);
			case "bitrate":
				return formatBitrate(value);
			case "sampleRate":
				return formatSampleRate(value);
			default:
				return value.toLocaleString("en-US");
		}
	}
	if (typeof value === "string") {
		return value.length > 0 ? value : NOT_SET;
	}
	if (isTrackPosition(value)) {
		const { no, of } = value;
		return typeof no === "number" && typeof of === "number"
			? `${no} of ${of}`
			: typeof no === "number"
				? `Track ${no}`
				: NOT_SET;
	}
	if (key === "picture" && isStringArray(value)) {
		// Stored tracks reference artwork by UUID; binaries live in the
		// `artworks` table. Present an honest count rather than a broken image.
		return value.length === 1
			? "1 image attached"
			: `${value.length} images attached`;
	}
	if (isStringArray(value)) {
		return value.join(", ");
	}
	if (Array.isArray(value)) {
		return value.length === 1 ? "1 entry" : `${value.length} entries`;
	}
	if (typeof value === "object") {
		// Last-resort structured dump, size-bounded to keep the DOM safe.
		try {
			const json = JSON.stringify(value);
			if (typeof json === "string" && json.length <= 240) {
				return json;
			}
		} catch {
			// Circular structures fall through to the generic fallback.
		}
	}
	return NOT_SET;
}

/**
 * Builds the ordered row list for one metadata section.
 *
 * @param source - `common` or `format` record from a track row (untrusted).
 * @returns Rows with humanized labels and formatted values; entries whose
 * value is absent (`undefined`) are skipped, matching `Object.entries`
 * semantics of the previous UI.
 */
export function buildMetadataRows(
	source: Record<string, unknown>,
): MetadataRow[] {
	return Object.entries(source)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => ({
			key,
			label: humanizeMetadataKey(key),
			value: formatMetadataValue(key, value),
		}));
}
