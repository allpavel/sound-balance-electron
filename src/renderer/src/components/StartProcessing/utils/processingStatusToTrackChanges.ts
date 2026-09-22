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

import type {
	ProcessingStatus,
	TrackChanges,
} from "@shared/schemas/track.schema";

/**
 * Maps a status event delivered by the main process over IPC to a partial
 * track mutation payload consumable by the tracks repository.
 *
 * Behavioral contracts pinned by this mapper:
 *
 * 1. `seq` is forwarded verbatim and only when present.
 * 2. `reason` receives a defensive `"Unknown error"` fallback on failed
 *    events.
 * 3. The event's `id` is excluded from the returned payload.
 *
 * This function never throws.
 *
 * @param data - Status event received on the `processing-result` IPC
 * channel: the target track id, the new status, an optional monotonically
 * increasing per-track sequence number, and — for `failed` — the failure
 * reason.
 * @returns The status branch of `TrackChanges`, ready for
 * `tracksRepository.update` / `tracksRepository.updateMany`.
 *
 * @example
 * ```ts
 * // Completion carrying a sequence number — forwarded verbatim.
 * processingStatusToTrackChanges({ id: "t1", status: "completed", seq: 2 });
 * // => { status: "completed", seq: 2 }
 *
 * // Malformed/legacy failed event — fallback reason, no `seq` key emitted.
 * processingStatusToTrackChanges({ id: "t1", status: "failed" } as ProcessingStatus);
 * // => { status: "failed", reason: "Unknown error" }
 * ```
 */
export function processingStatusToTrackChanges(
	data: ProcessingStatus,
): TrackChanges {
	if (data.status === "failed") {
		return {
			status: "failed",
			reason: data.reason ?? "Unknown error",
			...(data.seq !== undefined ? { seq: data.seq } : {}),
		};
	}
	return {
		status: data.status,
		...(data.seq !== undefined ? { seq: data.seq } : {}),
	};
}
