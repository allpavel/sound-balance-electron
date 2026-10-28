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

import type { PLATFORM } from "@shared/constants";

/**
 * Runtime context that supplies the normalization platform to the schema
 * transform.
 */
let currentPlatform: PLATFORM = "linux";

/**
 * Type guard that safely narrows an `unknown` value to
 * {@link PLATFORM} without type assertions.
 */
export function isValidPlatform(value: unknown): value is PLATFORM {
	return value === "win32" || value === "darwin" || value === "linux";
}

/**
 * Safely normalizes an unknown value to a {@link PLATFORM}.
 * Falls back to "linux" (case-sensitive, non-mutating) for unsupported platforms.
 *
 * @param value - The raw value to normalize (typically `process.platform`).
 * @returns A validated `NormalizationPlatform`.
 */
export function normalizePlatform(value: unknown): PLATFORM {
	return isValidPlatform(value) ? value : "linux";
}

/**
 * Sets the runtime normalization platform. Called once at renderer
 * bootstrap with the platform obtained from the main process via
 * preload. Calling again overrides the previous value.
 *
 * @param platform - The case-sensitivity policy to apply.
 */
export function configurePlatform(platform: unknown): PLATFORM {
	const normalizedPlatform = normalizePlatform(platform);
	currentPlatform = normalizedPlatform;
	return normalizedPlatform;
}

/**
 * Returns the currently configured normalization platform.
 *
 * @returns The configured platform; defaults to `"linux"` (fail-open)
 *          until {@link configurePlatform} is called.
 */
export function getPlatform(): PLATFORM {
	return currentPlatform;
}

/**
 * Resets the context to the fail-open default. Test-only; used in
 * `afterEach`/`afterAll` to prevent leakage when a suite pins a
 * non-default platform.
 */
export function resetPlatform(): void {
	currentPlatform = "linux";
}
