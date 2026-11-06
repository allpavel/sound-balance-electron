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

import { createTheme, type MantineThemeOverride } from "@mantine/core";
import {
	brandRamp,
	dangerRamp,
	MONO_FONT_STACK,
	palette,
	SYSTEM_FONT_STACK,
	shadows,
	successRamp,
	warningRamp,
} from "@renderer/theme/tokens";

/**
 * Builds the application theme.
 *
 * Exported as a factory (rather than a bare constant) so tests can derive
 * variants without mutating a shared object.
 *
 * @returns A fully-typed Mantine theme override for `MantineProvider`.
 */
export function createAppTheme(): MantineThemeOverride {
	return createTheme({
		// Light-only product; color scheme is pinned by App via defaultColorScheme.
		focusRing: "auto",
		respectReducedMotion: true,
		cursorType: "pointer",
		fontFamily: SYSTEM_FONT_STACK,
		fontFamilyMonospace: MONO_FONT_STACK,
		fontSmoothing: true,
		primaryColor: "brand",
		primaryShade: 6,
		autoContrast: false,
		defaultRadius: "md",
		colors: {
			brand: [...brandRamp],
			danger: [...dangerRamp],
			success: [...successRamp],
			warning: [...warningRamp],
		},
		radius: {
			xs: "4px",
			sm: "6px",
			md: "10px",
			lg: "14px",
			xl: "18px",
		},
		shadows: {
			xs: shadows.xs,
			sm: shadows.sm,
			md: shadows.md,
			lg: shadows.lg,
			xl: shadows.lg,
		},
		headings: {
			fontFamily: SYSTEM_FONT_STACK,
			fontWeight: "600",
			textWrap: "balance",
			sizes: {
				h1: { fontSize: "1.5rem", lineHeight: "1.25", fontWeight: "650" },
				h2: { fontSize: "1.25rem", lineHeight: "1.3", fontWeight: "600" },
				h3: { fontSize: "1.0625rem", lineHeight: "1.4", fontWeight: "600" },
				h4: { fontSize: "1rem", lineHeight: "1.45", fontWeight: "600" },
				h5: { fontSize: "0.875rem", lineHeight: "1.5", fontWeight: "600" },
				h6: { fontSize: "0.8125rem", lineHeight: "1.5", fontWeight: "600" },
			},
		},
		other: {
			canvas: palette.canvas,
			surface: palette.surface,
			surfaceSunken: palette.surfaceSunken,
			borderControl: palette.borderControl,
			borderDecorative: palette.borderDecorative,
		},
		components: {
			Button: {
				defaultProps: { size: "md", radius: "md" },
			},
			Input: {
				styles: () => ({
					input: {
						"--input-bd": palette.borderControl,
						"--input-bg": palette.surface,
						"--input-bd-focus": palette.focusRing,
						"--input-placeholder-color": palette.inkTertiary,
						"--input-color": palette.inkPrimary,
					},
				}),
			},
			ActionIcon: {
				defaultProps: { size: "lg", radius: "md", variant: "subtle" },
			},
			CloseButton: {
				defaultProps: { size: "lg", radius: "md" },
			},
			TextInput: { defaultProps: { size: "md", radius: "md" } },
			Textarea: { defaultProps: { size: "md", radius: "md" } },
			NumberInput: { defaultProps: { size: "md", radius: "md" } },
			Select: { defaultProps: { size: "md", radius: "md" } },
			NativeSelect: { defaultProps: { size: "md", radius: "md" } },
			Checkbox: { defaultProps: { size: "md", radius: "sm" } },
			Switch: { defaultProps: { size: "md", radius: "md" } },
			SegmentedControl: { defaultProps: { size: "md", radius: "md" } },
			Tabs: { defaultProps: { radius: "md" } },
			Tooltip: {
				defaultProps: { withArrow: true, radius: "md", withinPortal: true },
			},
			Modal: {
				defaultProps: {
					radius: "lg",
					shadow: "lg",
					padding: "lg",
					centered: true,
				},
			},
			Alert: { defaultProps: { radius: "md" } },
			NavLink: { defaultProps: { radius: "md" } },
			Loader: { defaultProps: { type: "bars" } },
		},
	});
}

/** Singleton theme instance consumed by `MantineProvider` in `App.tsx`. */
export const appTheme = createAppTheme();
