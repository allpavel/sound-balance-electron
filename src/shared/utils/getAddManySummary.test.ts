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

import type { AddManyResult } from "@shared/types";
import { getAddManySummary } from "./getAddManySummary";

describe("getAddManySummary", () => {
	it("returns a frozen summary with zeroed counts and ratios for an empty result", () => {
		const result: AddManyResult = { added: [], merged: [], skipped: [] };
		const summary = getAddManySummary(result);

		expect(summary).toEqual({
			total: 0,
			added: 0,
			merged: 0,
			skipped: 0,
			addedRatio: 0,
			mergedRatio: 0,
			skippedRatio: 0,
		});
		expect(Object.isFrozen(summary)).toBe(true);
	});

	it("calculates correct counts and ratios for a mixed result", () => {
		const result: AddManyResult = {
			added: ["1", "2", "3"],
			merged: ["4"],
			skipped: ["5", "6"],
		};
		const summary = getAddManySummary(result);

		expect(summary.total).toBe(6);
		expect(summary.added).toBe(3);
		expect(summary.merged).toBe(1);
		expect(summary.skipped).toBe(2);
		expect(summary.addedRatio).toBeCloseTo(0.5);
		expect(summary.mergedRatio).toBeCloseTo(1 / 6);
		expect(summary.skippedRatio).toBeCloseTo(2 / 6);
	});

	it("avoids division by zero when total is 0 (defensive guard)", () => {
		const result: AddManyResult = { added: [], merged: [], skipped: [] };
		const summary = getAddManySummary(result);

		expect(summary.addedRatio).toBe(0);
		expect(summary.mergedRatio).toBe(0);
		expect(summary.skippedRatio).toBe(0);
		expect(Number.isNaN(summary.addedRatio)).toBe(false);
	});
});
