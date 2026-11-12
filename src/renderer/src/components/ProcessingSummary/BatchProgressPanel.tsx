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

import { useTracks } from "@renderer/hooks/useTracks";
import type { JSX } from "react";
import { useMemo } from "react";
import ProcessingSummary from "./ProcessingSummary";
import { summarizeTrackStatuses } from "./summarizeTrackStatuses";

/**
 * Container wiring live track data into the presentational
 * {@link ProcessingSummary}.
 *
 * @returns The progress panel, or `null` when no run has started.
 */
export default function BatchProgressPanel(): JSX.Element | null {
	const { selectedTracks } = useTracks();

	const summary = useMemo(
		() => summarizeTrackStatuses(selectedTracks),
		[selectedTracks],
	);

	const runStarted =
		summary.processing > 0 || summary.processed > 0 || summary.failed > 0;

	if (!runStarted) {
		return null;
	}

	return <ProcessingSummary tracks={selectedTracks} />;
}
