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
import { IconFilter } from "@tabler/icons-react";
import type { Column } from "@tanstack/react-table";
import { useMemo } from "react";
import type { Metadata } from "types";

export default function FilterSelect({
	column,
	values,
}: {
	column: Column<Metadata, unknown>;
	values: ReturnType<typeof column.getFacetedUniqueValues>;
}) {
	const filterValue = column.getFilterValue()?.toString();

	const sortedUniqueValues = useMemo(() => {
		return Array.from(values.keys()).sort();
	}, [values]);

	const handleChange = (value: string | null) => {
		column.setFilterValue(value);
	};

	return (
		<Popover shadow="lg" trapFocus>
			<Popover.Target>
				<ActionIcon variant="subtle" aria-label="Filter" color="dark">
					<IconFilter size={16} />
				</ActionIcon>
			</Popover.Target>
			<Popover.Dropdown>
				<Select
					label="Select filters:"
					placeholder="Pick a value"
					data={sortedUniqueValues}
					comboboxProps={{
						withinPortal: false,
					}}
					value={filterValue}
					onChange={handleChange}
				/>
			</Popover.Dropdown>
		</Popover>
	);
}
