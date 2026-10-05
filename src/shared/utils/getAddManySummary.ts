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

import type { AddManyResult, AddManySummary } from "@shared/types";

/**
 * Derives a summary with counts and ratios from an {@link AddManyResult}.
 *
 * This is a pure function — it does not mutate the input. When `total` is 0,
 * all ratios are defined as 0 (not `NaN`) to simplify downstream rendering.
 *
 * @param result - The {@link AddManyResult} returned by `addMany`.
 * @returns A frozen {@link AddManySummary} suitable for telemetry, toast
 *          notifications, or progress display.
 *
 * @example
 * ```ts
 * const result = await tracksRepository.addMany(tracks, { onProgress });
 * const summary = getAddManySummary(result);
 * toast.success(`Added ${summary.added}, merged ${summary.merged}, skipped ${summary.skipped}`);
 * ```
 */
export function getAddManySummary(result: AddManyResult): AddManySummary {
	const total =
		result.added.length + result.merged.length + result.skipped.length;
	const safeDiv = (n: number): number => (total > 0 ? n / total : 0);
	return Object.freeze({
		total,
		added: result.added.length,
		merged: result.merged.length,
		skipped: result.skipped.length,
		addedRatio: safeDiv(result.added.length),
		mergedRatio: safeDiv(result.merged.length),
		skippedRatio: safeDiv(result.skipped.length),
	});
}
