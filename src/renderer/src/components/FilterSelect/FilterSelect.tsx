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

import { ActionIcon, Popover, Select } from "@mantine/core";
import { getHeaderText } from "@renderer/components/Table/SortButton/SortButton";
import type { Metadata } from "@shared/schemas/track.schema";
import type { Column } from "@tanstack/react-table";
import { Funnel } from "lucide-react";
import { useMemo } from "react";
import type { AppTableFeatures } from "../Table/Table";

/**
 * Per-column value filter (funnel icon in the table header).
 *
 * @param props - The column and its faceted unique values.
 * @returns Filter trigger + popover with a value select.
 */
export default function FilterSelect({
	column,
	values,
}: {
	column: Column<AppTableFeatures, Metadata>;
	values: ReturnType<typeof column.getFacetedUniqueValues>;
}) {
	const filterValue = column.getFilterValue()?.toString();

	const sortedUniqueValues = useMemo(() => {
		return Array.from(values.keys()).sort();
	}, [values]);

	const handleChange = (value: string | null) => {
		column.setFilterValue(value);
	};

	const headerText = getHeaderText(column.columnDef.header);
	const hasFilter = typeof filterValue === "string" && filterValue.length > 0;
	const triggerLabel = hasFilter
		? `Filter ${headerText} values, currently: ${filterValue}`
		: `Filter ${headerText} values`;

	return (
		<Popover shadow="md" trapFocus position="bottom">
			<Popover.Target>
				<ActionIcon
					variant={hasFilter ? "light" : "subtle"}
					color={hasFilter ? "brand" : "gray"}
					aria-label={triggerLabel}
				>
					<Funnel size={16} aria-hidden="true" />
				</ActionIcon>
			</Popover.Target>
			<Popover.Dropdown>
				<Select
					label={`Filter by ${headerText}`}
					placeholder="All values"
					data={sortedUniqueValues}
					comboboxProps={{
						withinPortal: false,
					}}
					value={filterValue}
					onChange={handleChange}
					clearable
				/>
			</Popover.Dropdown>
		</Popover>
	);
}
