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

/** WCAG 2.1 contrast mathematics  */

/** 3- or 6-digit hex color, with or without a leading `#`. */
const HEX_COLOR_PATTERN = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Minimum contrast for normal-size text (WCAG 1.4.3 AA). */
export const WCAG_AA_TEXT_MIN = 4.5;

/** Minimum contrast for large text (>= 18.66px bold / 24px) and UI component
 * boundaries such as input borders and focus indicators (WCAG 1.4.11 AA). */
export const WCAG_AA_LARGE_AND_UI_MIN = 3;

/**
 * Type guard narrowing an unknown string to a parseable hex color.
 *
 * Narrowing strategy: a single anchored regex accepts `#RGB`, `RGB`,
 * `#RRGGBB`, and `RRGGBB`; everything else is rejected before arithmetic.
 *
 * @param value - Candidate color string.
 * @returns `true` when `value` can be safely passed to {@link hexToRgb}.
 */
export function isValidHexColor(value: string): boolean {
	return HEX_COLOR_PATTERN.test(value);
}

/**
 * Converts a hex color to its sRGB channel triple (0–255).
 *
 * @param hex - 3- or 6-digit hex color (leading `#` optional).
 * @returns Tuple `[r, g, b]` with integer channel values.
 * @throws {RangeError} When `hex` is not a valid hex color (never `NaN`-propagates).
 */
export function hexToRgb(hex: string): readonly [number, number, number] {
	if (!isValidHexColor(hex)) {
		throw new RangeError(`Invalid hex color: "${hex}"`);
	}
	const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
	const expanded =
		normalized.length === 3
			? normalized
					.split("")
					.map((channel) => channel.repeat(2))
					.join("")
			: normalized;
	return [
		Number.parseInt(expanded.slice(0, 2), 16),
		Number.parseInt(expanded.slice(2, 4), 16),
		Number.parseInt(expanded.slice(4, 6), 16),
	];
}

/**
 * Linearizes one sRGB channel value per WCAG 2.1 definition.
 *
 * @param channel - 8-bit channel value (0–255).
 * @returns Linear-light component in [0, 1].
 */
function linearize(channel: number): number {
	const srgb = channel / 255;
	return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative luminance of a color (WCAG 2.1 definition).
 *
 * @param hex - Any valid hex color.
 * @returns Luminance in [0, 1]; 0 = black, 1 = white.
 * @throws {RangeError} On invalid hex input.
 */
export function relativeLuminance(hex: string): number {
	const [r, g, b] = hexToRgb(hex);
	return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Contrast ratio between two colors, per WCAG 2.1.
 *
 * @param a - First hex color.
 * @param b - Second hex color.
 * @returns Ratio in [1, 21]; order of arguments does not matter.
 * @throws {RangeError} On invalid hex input.
 */
export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	const lighter = Math.max(la, lb);
	const darker = Math.min(la, lb);
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Whether a foreground/background pair meets AA for normal-size text (>= 4.5:1).
 *
 * @param fg - Foreground hex color.
 * @param bg - Background hex color.
 * @returns `true` when the pair passes WCAG 1.4.3 AA.
 */
export function meetsTextContrast(fg: string, bg: string): boolean {
	return contrastRatio(fg, bg) >= WCAG_AA_TEXT_MIN;
}

/**
 * Whether a pair meets the AA minimum for large text and non-text UI
 * boundaries (>= 3:1) — input borders, focus rings, icon strokes.
 *
 * @param fg - Foreground hex color.
 * @param bg - Background hex color.
 * @returns `true` when the pair passes WCAG 1.4.11 AA.
 */
export function meetsUiContrast(fg: string, bg: string): boolean {
	return contrastRatio(fg, bg) >= WCAG_AA_LARGE_AND_UI_MIN;
}
