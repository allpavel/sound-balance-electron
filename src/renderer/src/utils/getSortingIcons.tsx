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
	if (dir === "asc") {
		return <IconSortAscending size={16} style={{ cursor: "pointer" }} />;
	} else if (dir === "desc") {
		return <IconSortDescending size={16} style={{ cursor: "pointer" }} />;
	} else {
		return <IconArrowsSort size={16} style={{ cursor: "pointer" }} />;
	}
}
