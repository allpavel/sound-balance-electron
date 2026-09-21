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

import type { Status } from "@shared/schemas/track.schema";

export const STATUS_TRANSITIONS: Record<Status, readonly Status[]> = {
	pending: ["processing", "completed", "failed"],
	processing: ["completed", "failed"],
	completed: ["processing"],
	failed: ["processing"],
} as const;

/**
 * Checks whether a status transition is permitted by the track lifecycle state machine.
 *
 * Enforced transactionally in the repository (atomic read-check-write) to prevent
 * TOCTOU races and ensure idempotency for stale IPC events.
 *
 * Allowed edges:
 * - pending    -> processing           (normal start)
 * - pending    -> completed | failed   (forward-skip: tolerates out-of-order IPC delivery
 *                                       where a fast completion lands before "processing")
 * - processing -> completed | failed   (normal terminal states)
 * - completed  -> processing           (explicit re-run)
 * - failed     -> processing           (explicit retry)
 *
 * Deliberately absent:
 * - All self-transitions (duplicates are no-ops returning 0).
 * - All backward edges (e.g., completed -> pending).
 * - Any edge targeting "pending" (re-queueing must use an explicit repository operation,
 *   not the event pipeline).
 *
 * @param from - The current persisted status of the track.
 * @param to - The target status requested by the event.
 * @returns `true` if the transition is legal; `false` otherwise.
 */
export function isLegalStatusTransition(from: Status, to: Status): boolean {
	return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
