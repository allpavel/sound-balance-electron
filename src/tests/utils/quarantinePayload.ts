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

import { MAX_DISPLAY_MISSING } from "@shared/constants";
import { quarantineMessage } from "@shared/utils";

/**
 * Shape of the quarantine diagnostic payload emitted by `warnQuarantined`.
 */
type QuarantineWarnPayload = {
	readonly count: number;
	readonly ids: readonly string[];
};

/**
 * Builds the expected `[message, payload]` pair that `warnQuarantined` passes
 * to `console.warn`, so log-assertion tests reference a single source of truth
 * instead of re-typing the message string and payload shape inline.
 *
 * The payload's `ids` array is capped at `MAX_DISPLAY_MISSING` to match the
 * production emission; pass the **full** quarantined-id list and this helper
 * applies the cap.
 *
 * @param scope                - Repository operation tag (e.g. `"tracksRepository.getAll"`).
 * @param allQuarantinedIds    - Every quarantined id (the helper caps for the log).
 * @returns A readonly `[message, payload]` tuple for `toHaveBeenCalledWith(...)`.
 *
 * @example
 * ```ts
 * const warnSpy = spyOnConsoleWarn();
 * guardTracks([corruptRow], "tracksRepository.getAll");
 * expect(warnSpy).toHaveBeenCalledWith(
 *     ...expectedQuarantineWarning("tracksRepository.getAll", ["corrupt-1"]),
 * );
 * ```
 */
export function expectedQuarantineWarning(
	scope: string,
	allQuarantinedIds: readonly string[],
): readonly [string, QuarantineWarnPayload] {
	const payload: QuarantineWarnPayload = Object.freeze({
		count: allQuarantinedIds.length,
		ids: Object.freeze(allQuarantinedIds.slice(0, MAX_DISPLAY_MISSING)),
	});
	return Object.freeze([quarantineMessage(scope), payload] as const);
}
