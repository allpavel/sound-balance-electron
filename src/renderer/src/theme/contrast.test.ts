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
	contrastRatio,
	hexToRgb,
	isValidHexColor,
	meetsTextContrast,
	meetsUiContrast,
	relativeLuminance,
	WCAG_AA_LARGE_AND_UI_MIN,
	WCAG_AA_TEXT_MIN,
} from "./contrast";
import {
	brandRamp,
	dangerRamp,
	palette,
	statusTokens,
	successRamp,
	warningRamp,
} from "./tokens";

describe("contrast utilities", () => {
	it("computes the canonical 21:1 ratio for black on white", () => {
		expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
	});

	it("computes the well-known AA threshold color #767676 on white (~4.54)", () => {
		expect(contrastRatio("#767676", "#FFFFFF")).toBeGreaterThanOrEqual(4.54);
		expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(4.54);
	});

	it("is symmetric and idempotent for identical colors", () => {
		expect(contrastRatio("#0F766E", "#FDFCF9")).toBeCloseTo(
			contrastRatio("#FDFCF9", "#0F766E"),
			10,
		);
		expect(contrastRatio("#0F766E", "#0F766E")).toBeCloseTo(1, 10);
	});

	it("expands 3-digit hex identically to its 6-digit form", () => {
		expect(hexToRgb("#FFF")).toEqual(hexToRgb("#FFFFFF"));
		expect(hexToRgb("0f0")).toEqual([0, 255, 0]);
	});

	it("maps luminance endpoints correctly", () => {
		expect(relativeLuminance("#000000")).toBeCloseTo(0, 10);
		expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
	});

	it("validates hex syntax with the type guard (zero trust on inputs)", () => {
		expect(isValidHexColor("#0F766E")).toBe(true);
		expect(isValidHexColor("0f766e")).toBe(true);
		expect(isValidHexColor("#abc")).toBe(true);
		expect(isValidHexColor("#abcd")).toBe(false);
		expect(isValidHexColor("teal")).toBe(false);
		expect(isValidHexColor("")).toBe(false);
	});

	it("throws a RangeError instead of producing NaN for malformed colors", () => {
		expect(() => hexToRgb("not-a-color")).toThrow(RangeError);
		expect(() => contrastRatio("#0F766E", "oops")).toThrow(RangeError);
	});
});

describe("palette accessibility contract (WCAG 2.1 AA)", () => {
	it("renders primary and secondary text at >= 4.5:1 on surface and canvas", () => {
		for (const bg of [palette.surface, palette.canvas, palette.surfaceSunken]) {
			expect(meetsTextContrast(palette.inkPrimary, bg)).toBe(true);
			expect(meetsTextContrast(palette.inkSecondary, bg)).toBe(true);
		}
	});

	it("renders tertiary text at >= 4.5:1 on the surface it is restricted to", () => {
		// `inkTertiary` is documented as surface-only; canvas would be 4.36:1.
		expect(meetsTextContrast(palette.inkTertiary, palette.surface)).toBe(true);
	});

	it("renders white text on the primary brand shade at >= 4.5:1", () => {
		expect(meetsTextContrast(palette.onBrand, brandRamp[6])).toBe(true);
	});

	it("renders the brand shade as text/link color at >= 4.5:1 on surfaces", () => {
		expect(meetsTextContrast(brandRamp[6], palette.surface)).toBe(true);
		expect(meetsTextContrast(palette.brandSoftText, palette.brandSoft)).toBe(
			true,
		);
	});

	it("renders white text on destructive-action shades at >= 4.5:1", () => {
		for (const shade of [dangerRamp[6], dangerRamp[7], dangerRamp[8]]) {
			expect(meetsTextContrast(palette.onBrand, shade)).toBe(true);
		}
	});

	it("renders success/warning ramp shade 6 as text at >= 4.5:1 on surface", () => {
		expect(meetsTextContrast(successRamp[6], palette.surface)).toBe(true);
		expect(meetsTextContrast(warningRamp[6], palette.surface)).toBe(true);
	});

	it("marks interactive control boundaries at >= 3:1 (SC 1.4.11)", () => {
		expect(meetsUiContrast(palette.borderControl, palette.surface)).toBe(true);
		expect(meetsUiContrast(palette.borderControl, palette.canvas)).toBe(true);
		expect(
			contrastRatio(palette.borderControl, palette.surface),
		).toBeGreaterThanOrEqual(WCAG_AA_LARGE_AND_UI_MIN);
	});

	it("marks the focus indicator at >= 3:1 against both backgrounds", () => {
		expect(meetsUiContrast(palette.focusRing, palette.surface)).toBe(true);
		expect(meetsUiContrast(palette.focusRing, palette.canvas)).toBe(true);
	});

	it("keeps every custom ramp monotonically darker from shade 0 to 9", () => {
		for (const ramp of [brandRamp, dangerRamp, successRamp, warningRamp]) {
			for (let i = 1; i < ramp.length; i += 1) {
				const previous = ramp[i - 1];
				const current = ramp[i];
				if (previous === undefined || current === undefined) continue;
				expect(relativeLuminance(current)).toBeLessThan(
					relativeLuminance(previous),
				);
			}
		}
	});
});

describe("semantic status tokens (WCAG 1.4.1 + 1.4.3)", () => {
	const entries = Object.entries(statusTokens);

	it("declares a tone for every canonical status plus the unknown fallback", () => {
		expect(new Set(entries.map(([key]) => key))).toEqual(
			new Set(["pending", "processing", "completed", "failed", "unknown"]),
		);
	});

	it.each(entries)(
		"renders %s label text at >= 4.5:1 on its chip background and on the surface",
		(_status, tone) => {
			expect(meetsTextContrast(tone.fg, tone.bg)).toBe(true);
			expect(meetsTextContrast(tone.fg, palette.surface)).toBe(true);
		},
	);

	it.each(entries)(
		"renders %s iconography at >= 3:1 on its chip background",
		(_status, tone) => {
			expect(meetsUiContrast(tone.fg, tone.bg)).toBe(true);
			expect(contrastRatio(tone.fg, tone.bg)).toBeGreaterThanOrEqual(
				WCAG_AA_TEXT_MIN,
			);
		},
	);
});
