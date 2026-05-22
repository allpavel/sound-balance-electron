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
import {
	IconArrowsSort,
	IconSortAscending,
	IconSortDescending,
} from "@tabler/icons-react";
import type { Column } from "@tanstack/react-table";
import type { Metadata } from "types";

export function getSortingIcon(column: Column<Metadata>) {
	if (!column.getCanSort()) {
		return null;
	}
	const dir = column.getIsSorted();
	const header = column.columnDef.header;
	if (dir === "asc") {
		return (
			<ActionIcon
				variant="subtle"
				color="dark"
				aria-label={`Sort ${header} in ascending order`}
			>
				<IconSortAscending size={16} />
			</ActionIcon>
		);
	} else if (dir === "desc") {
		return (
			<ActionIcon
				variant="subtle"
				color="dark"
				aria-label={`Sort ${header} in descending order`}
			>
				<IconSortDescending size={16} />
			</ActionIcon>
		);
	} else {
		return (
			<ActionIcon
				variant="subtle"
				color="dark"
				aria-label={`Default ${header} Sorting`}
			>
				<IconArrowsSort size={16} />
			</ActionIcon>
		);
	}
}
