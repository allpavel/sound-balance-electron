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

import { type StatusTone, statusTokens } from "@renderer/theme/tokens";
import { type Status, statusSchema } from "@shared/schemas/track.schema";
import {
	CircleAlert,
	CircleCheck,
	CircleX,
	Clock,
	LoaderCircle,
	type LucideIcon,
} from "lucide-react";

/** Visual + textual representation of one canonical track status. */
export type StatusPresentation = {
	/** Visible text label — status is never conveyed by color alone. */
	readonly label: string;
	/** Longer sentence for screen readers where the short label is too terse. */
	readonly announcement: string;
	/** Distinct icon shape per status (redundant channel #2). */
	readonly Icon: LucideIcon;
	/** Contrast-verified color tone (redundant channel #3). */
	readonly tone: StatusTone;
};

/**
 * Exhaustive map keyed by the shared `Status` union derived from
 * `STATUS_VALUES`. Adding a status to the schema without extending this map
 * is a compile-time error (Record<Status, …> exhaustiveness), so the UI can
 * never silently drop a state.
 */
const STATUS_PRESENTATIONS: Readonly<Record<Status, StatusPresentation>> = {
	pending: {
		label: "Queued",
		announcement: "Queued — waiting to be processed",
		Icon: Clock,
		tone: statusTokens.pending,
	},
	processing: {
		label: "Processing",
		announcement: "Processing — in progress",
		// Slow 0.33 Hz spin (`.sb-spin-slow`); never a >= 3 Hz flash.
		Icon: LoaderCircle,
		tone: statusTokens.processing,
	},
	completed: {
		label: "Processed",
		announcement: "Processed — completed successfully",
		Icon: CircleCheck,
		tone: statusTokens.completed,
	},
	failed: {
		label: "Failed",
		announcement: "Failed — processing did not complete",
		Icon: CircleX,
		tone: statusTokens.failed,
	},
};

/** Presentation used when runtime data fails the status guard. */
export const UNKNOWN_STATUS_PRESENTATION: StatusPresentation = {
	label: "Unknown",
	announcement: "Status unknown — the stored value could not be recognized",
	Icon: CircleAlert,
	tone: statusTokens.unknown,
};

/**
 * Type guard narrowing arbitrary runtime data to the canonical `Status` union.
 *
 * Narrowing strategy: delegates to the Zod `statusSchema` (single source of
 * truth shared with the DB layer) via `safeParse` — no type assertions.
 * Untrusted IPC/IndexedDB payloads are validated before they drive the UI.
 *
 * @param value - Unknown runtime value (e.g. a row read from IndexedDB).
 * @returns `true` when `value` is one of `STATUS_VALUES`.
 */
export function isTrackStatus(value: unknown): value is Status {
	return statusSchema.safeParse(value).success;
}

/**
 * Resolves the presentation for a runtime status value.
 *
 * Accepts `unknown` (zero trust): invalid values fall back to the explicit
 * "Unknown" presentation instead of throwing or rendering a blank cell.
 *
 * @param value - Raw status read from a track row.
 * @returns The presentation to render (label, icon, tone, announcement).
 */
export function getStatusPresentation(value: unknown): StatusPresentation {
	return isTrackStatus(value)
		? STATUS_PRESENTATIONS[value]
		: UNKNOWN_STATUS_PRESENTATION;
}
