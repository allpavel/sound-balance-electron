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

import { Tooltip } from "@mantine/core";
import type { CSSProperties, JSX } from "react";
import { getStatusPresentation, isTrackStatus } from "./statusPresentation";

export type StatusBadgeProps = {
	/**
	 * Raw status value from a track row. Typed `unknown` on purpose: rows come
	 * from IndexedDB/IPC and are narrowed at runtime inside the badge
	 * (zero trust — never `as Status`).
	 */
	status: unknown;
	/** Failure reason; rendered for assistive tech and shown in the tooltip. */
	reason?: string | undefined;
	/** Hide the visible text label (icon-only). Only for space-constrained
	 * contexts — the accessible name still contains the full label + reason. */
	compact?: boolean;
};

/**
 * Renders a track's processing status as an icon + text chip.
 *
 * The wrapper uses `role="img"` with a computed `aria-label`, the standard
 * pattern for atomic badges: screen readers announce one coherent string
 * ("Failed — processing did not complete: FFmpeg crashed") instead of
 * fragmented icon/text nodes, while sighted users read the visible label.
 *
 * @param props - See {@link StatusBadgeProps}.
 * @returns The status chip. Never throws: unrecognized statuses fall back to
 * the explicit "Unknown" presentation.
 */
export default function StatusBadge({
	status,
	reason,
	compact = false,
}: StatusBadgeProps): JSX.Element {
	const { Icon, tone, label, announcement } = getStatusPresentation(status);

	const trimmedReason = typeof reason === "string" ? reason.trim() : "";
	const hasReason = trimmedReason.length > 0;

	const accessibleName = hasReason
		? `${announcement}: ${trimmedReason}`
		: announcement;

	const isProcessing = isTrackStatus(status) && status === "processing";

	const chipStyle: CSSProperties = {
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
		padding: compact ? "2px 8px" : "4px 10px",
		borderRadius: 999,
		fontSize: "0.8125rem",
		fontWeight: 600,
		lineHeight: 1.4,
		whiteSpace: "nowrap",
		color: tone.fg,
		backgroundColor: tone.bg,
		border: `1px solid ${tone.border}`,
	};

	const chip = (
		<span role="img" aria-label={accessibleName} style={chipStyle}>
			<Icon
				size={15}
				aria-hidden="true"
				focusable="false"
				// slow ~0.33 Hz rotation for the in-progress state only.
				className={isProcessing ? "sb-spin-slow" : undefined}
				style={{ flexShrink: 0 }}
			/>
			{compact ? null : <span aria-hidden="true">{label}</span>}
		</span>
	);

	if (hasReason) {
		return (
			<Tooltip label={trimmedReason} multiline maw={320} withinPortal>
				{chip}
			</Tooltip>
		);
	}
	return chip;
}
