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
	type AUDIO_FILTER_NAMES,
	audioFilterNameSchema,
	type VBR,
	vbrSchema,
} from "@shared/schemas/settings.schema";

/** Slider default when stored data is missing or invalid. */
const DEFAULT_VBR_POSITION = 4;

/**
 * Type guard narrowing unknown input to a canonical FFmpeg filter name.
 *
 * @param value - Candidate (typically a combobox submission string).
 * @returns `true` when `value` is a member of `FILTER_NAMES`.
 */
export function isAudioFilterName(value: unknown): value is AUDIO_FILTER_NAMES {
	return audioFilterNameSchema.safeParse(value).success;
}

/**
 * Normalizes a combobox selection to the schema's union `"" | filter name`.
 *
 * Zero trust: anything unrecognized (stale option, injected value) collapses
 * to `""` (= "no filter") instead of propagating an invalid string into the
 * form state and later into FFmpeg arguments.
 *
 * @param value - Raw combobox output.
 * @returns A schema-valid filter selection.
 */
export function normalizeFilterSelection(
	value: unknown,
): AUDIO_FILTER_NAMES | "" {
	if (value === "" || value === null || value === undefined) {
		return "";
	}
	return isAudioFilterName(value) ? value : "";
}

/**
 * Type guard narrowing unknown input to a canonical VBR quality string.
 *
 * @param value - Candidate quality value.
 * @returns `true` when `value` is one of "1"–"9".
 */
export function isVbrValue(value: unknown): value is VBR {
	return vbrSchema.safeParse(value).success;
}

/**
 * Converts the VBR slider position (number 1–9) to the schema's string enum.
 *
 * @param position - Slider position.
 * @returns The matching `VBR` string, or `null` when out of range — callers
 * decide the fallback instead of silently clamping (explicit > implicit).
 */
export function toVbrValue(position: number): VBR | null {
	const candidate = String(Math.trunc(position));
	return isVbrValue(candidate) ? candidate : null;
}

/**
 * Parses a stored VBR quality value into a slider position.
 *
 * Accepts `unknown` because the form state is a discriminated union whose
 * `audioQualityValue` member may be a CBR string or the literal `"auto"`
 * while the user switches modes; invalid values fall back to the schema's
 * documented default instead of `NaN` (which would break the slider).
 *
 * @param value - Current `audio.audioQualityValue` form value.
 * @returns Integer slider position in [1, 9].
 */
export function fromVbrValue(value: unknown): number {
	if (typeof value === "number" && isVbrValue(String(Math.trunc(value)))) {
		return Math.trunc(value);
	}
	if (isVbrValue(value)) {
		return Number.parseInt(value, 10);
	}
	return DEFAULT_VBR_POSITION;
}
