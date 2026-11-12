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

import { isTrackStatus } from "@renderer/components/StatusBadge/statusPresentation";

/** Aggregate counts across one batch of tracks. */
export type TrackStatusSummary = {
	/** Total tracks in the batch. */
	readonly total: number;
	/** Tracks waiting to start (`pending`). */
	readonly queued: number;
	/** Tracks currently being processed. */
	readonly processing: number;
	/** Tracks that finished successfully (`completed`). */
	readonly processed: number;
	/** Tracks that failed. */
	readonly failed: number;
};

/**
 * Counts tracks per processing status.
 *
 * @param tracks - Read-only track list; only `status` is inspected, so any
 * row shape is accepted (structural typing — no assertions needed).
 * @returns Frozen summary counts. `total` always equals the sum of the four
 * buckets plus any rows whose status failed validation (they land in none of
 * the buckets, keeping the discrepancy visible rather than silently dropped).
 */
export function summarizeTrackStatuses(
	tracks: readonly { status: unknown }[],
): TrackStatusSummary {
	let queued = 0;
	let processing = 0;
	let processed = 0;
	let failed = 0;

	for (const track of tracks) {
		if (!isTrackStatus(track.status)) {
			continue;
		}
		switch (track.status) {
			case "pending":
				queued += 1;
				break;
			case "processing":
				processing += 1;
				break;
			case "completed":
				processed += 1;
				break;
			case "failed":
				failed += 1;
				break;
		}
	}

	return { total: tracks.length, queued, processing, processed, failed };
}

/**
 * Completed share of the batch as a 0–100 percentage for progress bars.
 *
 * "Completed" counts both successes and failures — either way the track has
 * left the queue, so the bar never appears stuck while failures accumulate.
 *
 * @param summary - Counts from {@link summarizeTrackStatuses}.
 * @returns Integer percentage; 0 for an empty batch (never NaN).
 */
export function summarizeProgressPercent(summary: TrackStatusSummary): number {
	if (summary.total === 0) {
		return 0;
	}
	const done = summary.processed + summary.failed;
	return Math.round((done / summary.total) * 100);
}
