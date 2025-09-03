import { ActionIcon, Popover, Select } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import type { Column } from "@tanstack/react-table";
import { useMemo } from "react";
import type { Metadata } from "types";

export default function FilterSelect({
	column,
}: {
	column: Column<Metadata, unknown>;
}) {
	const filterValue = column.getFilterValue()?.toString();
	const uniqueValues = column.getFacetedUniqueValues();

	const sortedUniqueValues = useMemo(() => {
		return Array.from(uniqueValues.keys()).toSorted();
	}, [uniqueValues]);

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
