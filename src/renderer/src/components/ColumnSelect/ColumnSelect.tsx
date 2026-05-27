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
import {
	Checkbox,
	Combobox,
	Group,
	Input,
	Pill,
	PillsInput,
	useCombobox,
} from "@mantine/core";
import type { VisibilityState } from "@tanstack/react-table";
import { useMemo } from "react";

type ColumnSelectProps = {
	allColumns: {
		id: string;
		header: string;
	}[];
	columnVisibility: VisibilityState;
	onColumnVisibilityChange: (newVisibility: VisibilityState) => void;
};

export default function ColumnSelect({
	allColumns,
	columnVisibility,
	onColumnVisibilityChange,
}: ColumnSelectProps) {
	const combobox = useCombobox();

	const selectedColumns = useMemo(() => {
		return allColumns
			.filter((column) => columnVisibility[column.id] !== false)
			.map((col) => col.id);
	}, [allColumns, columnVisibility]);

	const handleSelectColumn = (value: string) => {
		const newVisibility = {
			...columnVisibility,
			[value]: !columnVisibility[value],
		};
		onColumnVisibilityChange(newVisibility);
	};

	const handleRemoveColumn = (value: string) => {
		const newVisibility = {
			...columnVisibility,
			[value]: false,
		};
		onColumnVisibilityChange(newVisibility);
	};

	const columnValues = selectedColumns.map((item) => {
		const column = allColumns.find((col) => col.id === item);
		const label = column?.header || item;
		return (
			<Pill
				key={item}
				withRemoveButton
				onRemove={() => handleRemoveColumn(item)}
			>
				{label}
			</Pill>
		);
	});

	const options = allColumns.map((column) => {
		const isVisible = columnVisibility[column.id] !== false;
		return (
			<Combobox.Option value={column.id} key={column.id} active={isVisible}>
				<Group gap="sm">
					<Checkbox
						checked={isVisible}
						onChange={() => {}}
						aria-hidden
						tabIndex={-1}
						style={{ pointerEvents: "none" }}
					/>
					<span>{column.header}</span>
				</Group>
			</Combobox.Option>
		);
	});

	return (
		<Combobox store={combobox} onOptionSubmit={handleSelectColumn}>
			<Combobox.DropdownTarget>
				<PillsInput
					pointer
					onClick={() => combobox.toggleDropdown()}
					maw={"50%"}
					label="Select columns:"
				>
					<Pill.Group>
						{columnValues.length > 0 ? (
							columnValues
						) : (
							<Input.Placeholder>Pick one or more columns</Input.Placeholder>
						)}
						<Combobox.EventsTarget>
							<PillsInput.Field
								type="hidden"
								onBlur={() => combobox.closeDropdown()}
								onKeyDown={(e) => {
									if (e.key === "Backspace" && selectedColumns.length > 0) {
										e.preventDefault();
										const last = selectedColumns[selectedColumns.length - 1];
										if (last) handleRemoveColumn(last);
									}
								}}
							/>
						</Combobox.EventsTarget>
					</Pill.Group>
				</PillsInput>
			</Combobox.DropdownTarget>
			<Combobox.Dropdown>
				<Combobox.Options>{options}</Combobox.Options>
			</Combobox.Dropdown>
		</Combobox>
	);
}
