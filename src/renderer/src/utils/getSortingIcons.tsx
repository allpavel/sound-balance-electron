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
