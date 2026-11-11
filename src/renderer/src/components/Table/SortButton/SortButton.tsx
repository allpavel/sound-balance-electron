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

import { ActionIcon } from "@mantine/core";
import type { AppTableFeatures } from "@renderer/components/Table/Table";
import type { Metadata } from "@shared/schemas/track.schema";
import type { Column, SortDirection } from "@tanstack/react-table";
import { ArrowDown, ArrowDownUp, ArrowUp, type LucideIcon } from "lucide-react";
import type { JSX } from "react";

/**
 * Minimal structural contract the button needs from a TanStack column.
 */
export type SortableColumnInfo = {
	getCanSort: () => boolean;
	getIsSorted: () => false | SortDirection;
	getToggleSortingHandler: () => (() => void) | undefined;
	columnDef: { header?: unknown };
};

/** Tri-state used by both the label and the icon. */
export type SortState = "asc" | "desc" | "unsorted";

/** Value for the `<th aria-sort>` attribute (ARIA spec vocabulary). */
export type AriaSortValue = "ascending" | "descending" | "none";

export type SortControlDescription = {
	/** Full accessible name: current state + resulting action. */
	readonly ariaLabel: string;
	/** Attribute for the header cell that owns this button. */
	readonly ariaSort: AriaSortValue;
	/** Icon shape representing the CURRENT state. */
	readonly Icon: LucideIcon;
};

const SORT_ICONS: Readonly<Record<SortState, LucideIcon>> = {
	asc: ArrowUp,
	desc: ArrowDown,
	unsorted: ArrowDownUp,
};

/** Plain-language next-step copy per state (Understandable: predictable cycle). */
const NEXT_ACTION_COPY: Readonly<Record<SortState, string>> = {
	unsorted: "Activate to sort ascending.",
	asc: "Activate to sort descending.",
	desc: "Activate to clear sorting.",
};

const CURRENT_STATE_COPY: Readonly<Record<SortState, string>> = {
	unsorted: "not sorted",
	asc: "sorted ascending",
	desc: "sorted descending",
};

const FALLBACK_HEADER_TEXT = "column";
const SORT_ICON_SIZE = 16;

/**
 * Maps sort direction to the internal tri-state.
 *
 * @param sortDirection - Value returned by `column.getIsSorted()`.
 * @returns `"asc" | "desc" | "unsorted"`.
 */
export function toSortState(sortDirection: false | SortDirection): SortState {
	return sortDirection === false ? "unsorted" : sortDirection;
}

/**
 * Extracts display text from a column definition header without assertions.
 *
 * Narrowing strategy: `typeof header === "string"` — the only header form
 * this control can name; function/element headers fall back to a generic
 * label (the table passes string headers for all sortable columns).
 *
 * @param header - Raw `columnDef.header` value.
 * @returns Trimmed header text or the generic fallback.
 */
export function getHeaderText(header: unknown): string {
	if (typeof header === "string" && header.trim().length > 0) {
		return header.trim();
	}
	return FALLBACK_HEADER_TEXT;
}

/**
 * Maps the internal tri-state to the ARIA `aria-sort` vocabulary.
 *
 * Exported so the owning `<th>` and the button share one mapping (DRY).
 *
 * @param state - Current sort state.
 * @returns `"ascending" | "descending" | "none"`.
 */
export function toAriaSort(state: SortState): AriaSortValue {
	if (state === "asc") return "ascending";
	if (state === "desc") return "descending";
	return "none";
}

/**
 * Builds the accessible description for a sortable column header.
 *
 * Pure and exported so the table can apply `ariaSort` to the `<th>` while the
 * button consumes `ariaLabel`/`Icon` — one source of truth for both (DRY).
 *
 * @param headerText - Human-readable column name.
 * @param state - Current sort state.
 * @returns Label, `aria-sort` value, and state icon.
 */
export function describeSortControl(
	headerText: string,
	state: SortState,
): SortControlDescription {
	return {
		ariaLabel: `${headerText}, ${CURRENT_STATE_COPY[state]}. ${NEXT_ACTION_COPY[state]}`,
		ariaSort: toAriaSort(state),
		Icon: SORT_ICONS[state],
	};
}

export type SortButtonProps = {
	/** Column whose sorting this button toggles. The real TanStack `Column`
	 * satisfies {@link SortableColumnInfo} structurally. */
	column: SortableColumnInfo | Column<AppTableFeatures, Metadata>;
};

/**
 * Renders the sort toggle for one table column, or `null` when the column is
 * not sortable.
 *
 * @param props - See {@link SortButtonProps}.
 * @returns An `ActionIcon`-backed `<button>` or `null`.
 */
export function SortButton({ column }: SortButtonProps): JSX.Element | null {
	if (!column.getCanSort()) {
		return null;
	}

	const state = toSortState(column.getIsSorted());
	const headerText = getHeaderText(column.columnDef.header);
	const { ariaLabel, Icon } = describeSortControl(headerText, state);
	const toggle = column.getToggleSortingHandler();

	return (
		<ActionIcon
			variant="subtle"
			color="gray"
			size="md"
			aria-label={ariaLabel}
			onClick={toggle}
		>
			<Icon size={SORT_ICON_SIZE} aria-hidden="true" focusable="false" />
		</ActionIcon>
	);
}

export default SortButton;
