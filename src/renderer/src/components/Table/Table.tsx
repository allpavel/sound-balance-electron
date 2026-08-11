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
	Button,
	Checkbox,
	Flex,
	Group,
	Loader,
	Table,
	TextInput,
} from "@mantine/core";
import ColumnSelect from "@renderer/components/ColumnSelect/ColumnSelect";
import FilterSelect from "@renderer/components/FilterSelect/FilterSelect";
import InfoModal from "@renderer/components/InfoModal/InfoModal";
import StatusIcon from "@renderer/components/StatusIcon/StatusIcon";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useTracks } from "@renderer/hooks/useTracks";
import { getSortingIcon } from "@renderer/utils/getSortingIcons";
import { useCreateAtom } from "@tanstack/react-store";
import {
	type ColumnVisibilityState,
	columnFacetingFeature,
	columnFilteringFeature,
	columnVisibilityFeature,
	createColumnHelper,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createSortedRowModel,
	flexRender,
	globalFilteringFeature,
	type RowSelectionState,
	rowSelectionFeature,
	rowSortingFeature,
	type SortingState,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import type { Metadata } from "@/types";

const features = tableFeatures({
	rowSortingFeature,
	rowSelectionFeature,
	columnFilteringFeature,
	columnFacetingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	sortedRowModel: createSortedRowModel(),
	facetedRowModel: createFacetedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
});
export type AppTableFeatures = typeof features;

export default function TableComponent() {
	const activeCollection = useAppSelector((state) => state.activeCollection);
	const {
		tracks: files,
		isLoading,
		updateTrack,
		updateManyTracks,
	} = useTracks(activeCollection.id);

	const [columnVisibility, setColumnVisibility] =
		useState<ColumnVisibilityState>({});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const rowSelectionAtom = useCreateAtom<RowSelectionState>({});

	const rowSelectionFromDb = useMemo<RowSelectionState>(() => {
		return files.reduce<RowSelectionState>((acc, track) => {
			if (track.selected === 1) {
				acc[track.id] = true;
			}
			return acc;
		}, {});
	}, [files]);

	useEffect(() => {
		if (isLoading) {
			return;
		}
		rowSelectionAtom.set(rowSelectionFromDb);
	}, [isLoading, rowSelectionFromDb, rowSelectionAtom]);

	const columnHelper = createColumnHelper<AppTableFeatures, Metadata>();

	const columns = columnHelper.columns([
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					type="checkbox"
					checked={table.getIsAllRowsSelected()}
					onChange={(e) => {
						table.getToggleAllRowsSelectedHandler()(e);
						const isAllSelected: 0 | 1 = e.currentTarget.checked ? 1 : 0;
						const selectedIds = table.getSelectedRowIds().map((id) => ({
							id,
							changes: { selected: isAllSelected },
						}));
						updateManyTracks(selectedIds);
					}}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					type="checkbox"
					checked={row.getIsSelected()}
					onChange={(e) => {
						row.getToggleSelectedHandler()(e);
						const updates = e.currentTarget.checked ? 1 : 0;
						updateTrack({ id: row.id, changes: { selected: updates } });
					}}
				/>
			),
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			id: "artist",
			header: "Artist",
			accessorKey: "common.artist",
			enableSorting: true,
		},
		{
			id: "header",
			header: "Title",
			accessorKey: "common.title",
			enableSorting: true,
		},
		{
			id: "album",
			header: "Album",
			accessorKey: "common.album",
			enableSorting: true,
		},
		{
			id: "year",
			header: "Year",
			accessorFn: (row) => row.common.year?.toString(),
			enableSorting: true,
		},
		{
			id: "info",
			header: "Info",
			cell: ({ row }) => <InfoModal trackData={row.original} />,
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			cell: ({ row }) => <StatusIcon status={row.original.status} />,
		},
	]);

	const table = useTable({
		data: files,
		columns,
		features,
		atoms: {
			rowSelection: rowSelectionAtom,
		},
		state: {
			columnVisibility,
			sorting,
			globalFilter,
		},
		enableRowSelection: true,
		onSortingChange: setSorting,
		onColumnVisibilityChange: setColumnVisibility,
		onGlobalFilterChange: setGlobalFilter,
		getRowId: (row) => row.id,
	});

	const selectedColumns = useMemo(() => {
		return columns
			.filter((column) => column.id !== "select" && column.id !== "info")
			.map((column, index) => ({
				id: column.id ?? `column-${index}`,
				header:
					typeof column.header === "string"
						? column.header
						: (column.id ?? `column-${index}`),
			}));
	}, [columns]);

	const handleGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
		setGlobalFilter(e.target.value);
	};

	const uniqueValues: Record<string, Map<string, number>> = {};
	table.getAllLeafColumns().forEach((column) => {
		if (column.getCanFilter()) {
			uniqueValues[column.id] = column.getFacetedUniqueValues();
		}
	});

	const isFiltersActive = table
		.getAllColumns()
		.some((column) => !!column.getFilterValue());

	return (
		<>
			<Group grow mb={"lg"}>
				<ColumnSelect
					allColumns={selectedColumns}
					columnVisibility={columnVisibility}
					onColumnVisibilityChange={setColumnVisibility}
				/>
				<TextInput
					label="Search:"
					placeholder="Search all columns..."
					leftSection={<Search size={16} />}
					value={globalFilter}
					onChange={handleGlobalFilterChange}
				/>
			</Group>
			{isFiltersActive && (
				<Button mb={"lg"} onClick={() => table.resetColumnFilters()}>
					Clear filters
				</Button>
			)}
			<Table highlightOnHover withColumnBorders>
				<Table.Thead>
					{table.getHeaderGroups().map((group) => (
						<Table.Tr key={group.id}>
							{group.headers.map((header) => (
								<Table.Th key={header.id}>
									<Group gap={"xs"}>
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
										<Flex onClick={header.column.getToggleSortingHandler()}>
											{getSortingIcon(header.column)}
										</Flex>
										{header.column.getCanFilter() && (
											<Flex>
												<FilterSelect
													column={header.column}
													values={uniqueValues[header.column.id] ?? new Map()}
												/>
											</Flex>
										)}
									</Group>
								</Table.Th>
							))}
						</Table.Tr>
					))}
				</Table.Thead>
				<Table.Tbody>
					{isLoading ? (
						<Table.Tr>
							<Table.Td colSpan={columns.length}>
								<Flex justify={"center"} my="lg">
									<Loader type="bars" />
								</Flex>
							</Table.Td>
						</Table.Tr>
					) : table.getRowModel().rows.length === 0 && files.length > 0 ? (
						<Table.Tr>
							<Table.Td
								colSpan={table.getAllColumns().length}
								style={{ textAlign: "center" }}
							>
								No matching records found.
							</Table.Td>
						</Table.Tr>
					) : (
						table.getRowModel().rows.map((row) => (
							<Table.Tr
								key={row.id}
								bg={
									table.state.rowSelection[row.id]
										? "var(--mantine-color-blue-light)"
										: undefined
								}
							>
								{row.getVisibleCells().map((cell) => (
									<Table.Td key={cell.id} miw={150}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</Table.Td>
								))}
							</Table.Tr>
						))
					)}
				</Table.Tbody>
				<Table.Tfoot>
					<Table.Tr>
						<Table.Td colSpan={2}>
							Selected: {table.getSelectedRowModel().rows.length} of{" "}
							{files.length}
						</Table.Td>
					</Table.Tr>
				</Table.Tfoot>
			</Table>
		</>
	);
}
