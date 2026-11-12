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
	summarizeProgressPercent,
	summarizeTrackStatuses,
} from "./summarizeTrackStatuses";

/** Minimal track-like row carrying only a `status` field. */
const row = (status: unknown) => ({ status });

describe("summarizeTrackStatuses", () => {
	it("returns a zeroed summary for an empty batch", () => {
		expect(summarizeTrackStatuses([])).toEqual({
			total: 0,
			queued: 0,
			processing: 0,
			processed: 0,
			failed: 0,
		});
	});

	it("counts every canonical status", () => {
		const summary = summarizeTrackStatuses([
			row("pending"),
			row("pending"),
			row("processing"),
			row("completed"),
			row("failed"),
		]);
		expect(summary).toEqual({
			total: 5,
			queued: 2,
			processing: 1,
			processed: 1,
			failed: 1,
		});
	});

	it("counts malformed statuses toward total only (zero trust)", () => {
		const summary = summarizeTrackStatuses([
			row("completed"),
			row("exploded"),
			row(undefined),
		]);
		expect(summary.total).toBe(3);
		expect(summary.processed).toBe(1);
		expect(summary.queued + summary.processing + summary.failed).toBe(0);
	});
});

describe("summarizeProgressPercent", () => {
	it("is 0 for an empty batch (never NaN)", () => {
		expect(summarizeProgressPercent(summarizeTrackStatuses([]))).toBe(0);
	});

	it("counts failures as finished so the bar never stalls", () => {
		const summary = summarizeTrackStatuses([
			row("completed"),
			row("failed"),
			row("pending"),
			row("processing"),
		]);
		expect(summarizeProgressPercent(summary)).toBe(50);
	});

	it("rounds to whole percentages", () => {
		const summary = summarizeTrackStatuses([
			row("completed"),
			row("pending"),
			row("pending"),
		]);
		expect(summarizeProgressPercent(summary)).toBe(33);
	});
});
