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

export type SortableColumn = {
	getCanSort: () => boolean;
	getIsSorted: () => false | SortDirection;
	columnDef: { header?: unknown };
};

type SortState = "asc" | "desc" | "unsorted";

const SORT_ICON_SIZE = 16;
const FALLBACK_HEADER_TEXT = "column";

const SORT_ICONS: Record<SortState, LucideIcon> = {
	asc: ArrowUp,
	desc: ArrowDown,
	unsorted: ArrowDownUp,
};

const SORT_ARIA_LABELS: Record<SortState, (headerText: string) => string> = {
	asc: (headerText) => `Sort ${headerText} in ascending order`,
	desc: (headerText) => `Sort ${headerText} in descending order`,
	unsorted: (headerText) => `Default ${headerText} Sorting`,
};

function getSortState(sortDirection: false | SortDirection): SortState {
	return sortDirection === false ? "unsorted" : sortDirection;
}

function getHeaderText(header: unknown): string {
	if (typeof header === "string" && header.trim().length > 0) {
		return header.trim();
	}
	return FALLBACK_HEADER_TEXT;
}

export function getSortingIcon(column: Column<AppTableFeatures, Metadata>) {
	if (!column.getCanSort()) {
		return null;
	}

	const sortState = getSortState(column.getIsSorted());
	const headerText = getHeaderText(column.columnDef.header);
	const Icon = SORT_ICONS[sortState];

	return (
		<ActionIcon
			variant="subtle"
			color="dark"
			aria-label={SORT_ARIA_LABELS[sortState](headerText)}
		>
			<Icon size={SORT_ICON_SIZE} />
		</ActionIcon>
	);
}
