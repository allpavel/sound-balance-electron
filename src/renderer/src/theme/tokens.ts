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

/** System-native sans-serif stack. */
export const SYSTEM_FONT_STACK =
	'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Monospace stack for FFmpeg parameter names shown in tooltips/code chips. */
export const MONO_FONT_STACK =
	'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/**
 * 10-step ramps follow the Mantine color contract (index 0 = lightest …
 * index 9 = darkest). Shade 6 is the primary/actionable shade for the light
 * scheme and is contrast-verified for white foreground text.
 */
export const brandRamp = [
	"#F0F7F5",
	"#DCEDE8",
	"#B9DCD3",
	"#8FC5B8",
	"#63A898",
	"#3D8C7B",
	"#0F766E", // 6 — primary: 5.33:1 on surface, white-on-brand 5.47:1
	"#0D6A62",
	"#0B5C55",
	"#094E48",
] as const;

/** Destructive-action ramp (delete collection, delete tracks, stop). */
export const dangerRamp = [
	"#FBF0EE",
	"#F6E0DB",
	"#EDBFB6",
	"#E0978A",
	"#D07162",
	"#C24C3A",
	"#B42318", // 6 - white-on-danger 6.57:1
	"#9E1F15",
	"#871B12",
	"#6F160F",
] as const;

/** Positive-outcome ramp (success alerts, processed state accents). */
export const successRamp = [
	"#EAF4EE",
	"#DDEDE4",
	"#C1DCCB",
	"#9AC4AB",
	"#6FA587",
	"#458663",
	"#1C6B41", // 6 - dark enough for text on light backgrounds
	"#186039",
	"#13522F",
	"#0E4225",
] as const;

/** Caution / in-progress ramp (amber, deliberately dark for text contrast). */
export const warningRamp = [
	"#FBF3DF",
	"#F7EBD0",
	"#EFD9A8",
	"#E3C176",
	"#D0A44A",
	"#A97C11",
	"#7D5A00", // 6 - 6.74:1 on its soft background, readable as text
	"#6E4E00",
	"#5C4100",
	"#4A3400",
] as const;

/** Neutral surfaces & ink. */
export const palette = {
	/** App background (warm paper). */
	canvas: "#F6F4F0",
	/** Floating card / panel / modal surface (soft white). */
	surface: "#FDFCF9",
	/** Recessed areas: table head, code chips, inset wells. */
	surfaceSunken: "#F1EEE8",
	/** Decorative hairlines (card edges, table row separators). */
	borderDecorative: "#E3DED4",
	borderSubtle: "#EDE9E1",
	/** Boundary of interactive controls (inputs, outlined buttons). */
	borderControl: "#7E7466",
	inkPrimary: "#292521", // 14.8:1 on surface
	inkSecondary: "#57504A", // 7.7:1 on surface
	inkTertiary: "#7A7166", // 4.7:1 — use on `surface` only, never on canvas
	/** Inverted text/icons placed on brand-600 fills. */
	onBrand: "#FFFFFF",
	/** Soft brand tint used for selected-row highlight and info chips. */
	brandSoft: "#DCEDE8",
	brandSoftText: "#0B5C55", // 6.47:1 on brandSoft
	focusRing: "#0F766E", // 5.1:1 on canvas, 5.3:1 on surface (>= 3:1)
} as const;

/** Canonical status union, derived from `STATUS_VALUES` */
export type CanonicalStatus =
	typeof import("@shared/constants").STATUS_VALUES[number];

/** One semantic status tone: foreground (icon + text), chip background, hairline. */
export type StatusTone = {
	readonly fg: string;
	readonly bg: string;
	readonly border: string;
};

/**
 * Semantic status colors keyed by the app's canonical track statuses
 * (`STATUS_VALUES` from `@shared/constants`). Every `fg`/`bg` pair passes
 * 4.5:1 (verified in `contrast.test.ts`), and every status also ships a
 * text label + distinct icon in `StatusBadge`, so meaning never depends
 * on hue alone (WCAG 1.4.1 Use of Color).
 */
export const statusTokens: Readonly<
	Record<CanonicalStatus | "unknown", StatusTone>
> = {
	pending: { fg: "#5B6472", bg: "#EDF0F4", border: "#D6DCE4" },
	processing: { fg: "#7D5A00", bg: "#FBF0D7", border: "#EEDDA9" },
	completed: { fg: "#1C6B41", bg: "#E5F2E9", border: "#C3E0CE" },
	failed: { fg: "#A32F22", bg: "#F9E9E4", border: "#EEC9BF" },
	/** Defensive fallback for data that fails runtime validation. */
	unknown: { fg: "#57504A", bg: "#F1EEE8", border: "#DDD7CB" },
} as const;

/** Soft elevation scale — subtle layering, no harsh drop shadows. */
export const shadows = {
	xs: "0 1px 2px rgba(41, 37, 33, 0.05)",
	sm: "0 1px 3px rgba(41, 37, 33, 0.07), 0 1px 2px rgba(41, 37, 33, 0.05)",
	md: "0 4px 12px rgba(41, 37, 33, 0.08), 0 1px 3px rgba(41, 37, 33, 0.06)",
	lg: "0 12px 32px rgba(41, 37, 33, 0.10), 0 2px 6px rgba(41, 37, 33, 0.06)",
} as const;

/** Consistent spacing scale (px) used by bespoke layout CSS. */
export const space = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
} as const;

/**
 * Minimum interactive target size in px. WCAG 2.5.8 (AA) requires >= 24;
 * we standardize on 40 for pointer comfort and keyboard hit consistency.
 */
export const MIN_TARGET_SIZE_PX = 40;

/**
 * Maximum animation frequency allowed anywhere in the UI, expressed in Hz.
 * WCAG 2.3.1 forbids more than three flashes per second; our slowest-pulse
 * token is ~0.4 Hz and the spin token is ~0.33 Hz — both far below the limit.
 * Exported so tests and future components reference one constant.
 */
export const MAX_ANIMATION_FREQUENCY_HZ = 3;
