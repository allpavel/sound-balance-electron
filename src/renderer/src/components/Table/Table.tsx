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
	Text,
	TextInput,
} from "@mantine/core";
import ColumnSelect from "@renderer/components/ColumnSelect/ColumnSelect";
import FilterSelect from "@renderer/components/FilterSelect/FilterSelect";
import InfoModal from "@renderer/components/InfoModal/InfoModal";
import StatusBadge from "@renderer/components/StatusBadge/StatusBadge";
import {
	SortButton,
	toAriaSort,
	toSortState,
} from "@renderer/components/Table/SortButton/SortButton";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useTracks } from "@renderer/hooks/useTracks";
import { palette } from "@renderer/theme/tokens";
import type { Metadata } from "@shared/schemas/track.schema";
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
import { FolderOpen, SearchX, X } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

/**
 * Builds a screen-reader-friendly name for a track row, used by checkbox and
 * details-control labels so every row action is identifiable out of context.
 *
 * @param track - The row's track record.
 * @returns Title when present, otherwise the file name.
 */
function describeTrack(track: Metadata): string {
	const title = track.common.title;
	if (typeof title === "string" && title.trim().length > 0) {
		return title.trim();
	}
	return track.file;
}

/**
 * Track table screen: sortable column headers, per-row status badges and
 * actions, row selection, and global plus per-column filtering.
 */
export default function TableComponent() {
	const activeCollection = useAppSelector((state) => state.activeCollection);
	const {
		tracks: files,
		isLoading,
		updateTrackAsync,
		updateManyTracksAsync,
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
					aria-label="Select all tracks in this view"
					checked={table.getIsAllRowsSelected()}
					indeterminate={
						!table.getIsAllRowsSelected() && table.getIsSomeRowsSelected()
					}
					onChange={async (e) => {
						const isAllSelected: 0 | 1 = e.currentTarget.checked ? 1 : 0;
						const previousRowSelection = { ...rowSelectionAtom.get() };
						table.getToggleAllRowsSelectedHandler()(e);
						const selectedIds = table.getRowModel().rows.map((row) => ({
							id: row.id,
							changes: { selected: isAllSelected },
						}));
						if (selectedIds.length === 0) return;
						try {
							await updateManyTracksAsync(selectedIds);
						} catch (error) {
							toast.error(
								error instanceof Error
									? error.message
									: "Failed to update bulk selection.",
							);
							rowSelectionAtom.set(previousRowSelection);
						}
					}}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					type="checkbox"
					aria-label={`Select "${describeTrack(row.original)}"`}
					checked={row.getIsSelected()}
					onChange={async (e) => {
						const isChecked = e.currentTarget.checked ? 1 : 0;
						const previousRowSelection = { ...rowSelectionAtom.get() };
						row.getToggleSelectedHandler()(e);
						try {
							await updateTrackAsync({
								id: row.id,
								changes: { selected: isChecked },
							});
						} catch (error) {
							toast.error(
								error instanceof Error
									? error.message
									: "Failed to update track selection.",
							);
							rowSelectionAtom.set(previousRowSelection);
						}
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
			header: "Details",
			cell: ({ row }) => <InfoModal trackData={row.original} />,
			enableSorting: false,
			enableColumnFilter: false,
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			cell: ({ row }) => (
				<StatusBadge
					status={row.original.status}
					reason={
						row.original.status === "failed" ? row.original.reason : undefined
					}
				/>
			),
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

	const visibleRowCount = table.getRowModel().rows.length;
	const selectedRowCount = table.getSelectedRowModel().rows.length;
	const visibleColumnCount = table.getAllLeafColumns().length;

	return (
		<>
			<Group grow mb="md" gap="md" align="flex-end">
				<TextInput
					label="Search tracks"
					type="search"
					placeholder="Search by artist, title, album or year…"
					leftSection={<SearchX size={16} aria-hidden="true" />}
					value={globalFilter}
					onChange={handleGlobalFilterChange}
				/>
				<ColumnSelect
					allColumns={selectedColumns}
					columnVisibility={columnVisibility}
					onColumnVisibilityChange={setColumnVisibility}
				/>
			</Group>
			<Group justify="space-between" mb="sm" gap="md">
				<Text
					fz="sm"
					aria-live="polite"
					style={{ color: palette.inkSecondary }}
				>
					{isLoading
						? "Loading tracks…"
						: `Showing ${visibleRowCount} of ${files.length} tracks`}
				</Text>
				{isFiltersActive && (
					<Button
						variant="subtle"
						color="gray"
						size="sm"
						leftSection={<X size={14} aria-hidden="true" />}
						onClick={() => table.resetColumnFilters()}
					>
						Clear column filters
					</Button>
				)}
			</Group>
			<div className="sb-surface-card" aria-busy={isLoading}>
				<Table.ScrollContainer minWidth={760}>
					<Table
						className="sb-data-table"
						horizontalSpacing="md"
						verticalSpacing="sm"
						withTableBorder={false}
					>
						<Table.Caption className="visually-hidden">
							Audio tracks in collection “{activeCollection.title}”. Column
							headers provide sorting and filtering controls.
						</Table.Caption>
						<Table.Thead>
							{table.getHeaderGroups().map((group) => (
								<Table.Tr key={group.id}>
									{group.headers.map((header) => {
										const canSort = header.column.getCanSort();
										const ariaSort = canSort
											? toAriaSort(toSortState(header.column.getIsSorted()))
											: undefined;
										return (
											<Table.Th
												key={header.id}
												scope="col"
												aria-sort={ariaSort}
												style={
													header.column.id === "select"
														? { width: 52, minWidth: 52 }
														: undefined
												}
											>
												<Group gap={4} wrap="nowrap">
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
													<SortButton column={header.column} />
													{header.column.getCanFilter() && (
														<FilterSelect
															column={header.column}
															values={
																uniqueValues[header.column.id] ?? new Map()
															}
														/>
													)}
												</Group>
											</Table.Th>
										);
									})}
								</Table.Tr>
							))}
						</Table.Thead>
						<Table.Tbody>
							{isLoading ? (
								<Table.Tr>
									<Table.Td colSpan={visibleColumnCount}>
										<Flex justify="center" align="center" gap="sm" my="xl">
											<Loader size="sm" aria-hidden="true" />
											<Text fz="sm" style={{ color: palette.inkSecondary }}>
												Loading tracks…
											</Text>
										</Flex>
									</Table.Td>
								</Table.Tr>
							) : visibleRowCount === 0 && files.length > 0 ? (
								<Table.Tr>
									<Table.Td colSpan={visibleColumnCount}>
										<div className="sb-table-state">
											<SearchX size={28} aria-hidden="true" />
											<Text fw={600} style={{ color: palette.inkPrimary }}>
												No tracks match your search or filters
											</Text>
											<Text fz="sm">
												Try a different search term, or clear the column filters
												above.
											</Text>
										</div>
									</Table.Td>
								</Table.Tr>
							) : visibleRowCount === 0 ? (
								<Table.Tr>
									<Table.Td colSpan={visibleColumnCount}>
										<div className="sb-table-state">
											<FolderOpen size={28} aria-hidden="true" />
											<Text fw={600} style={{ color: palette.inkPrimary }}>
												No tracks in this collection yet
											</Text>
											<Text fz="sm">
												Choose “Add Files” in the toolbar to import audio files.
											</Text>
										</div>
									</Table.Td>
								</Table.Tr>
							) : (
								table.getRowModel().rows.map((row) => (
									<Table.Tr
										key={row.id}
										data-selected={
											table.state.rowSelection[row.id] ? "true" : undefined
										}
									>
										{row.getVisibleCells().map((cell) => (
											<Table.Td
												key={cell.id}
												miw={cell.column.id === "select" ? 52 : 140}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</Table.Td>
										))}
									</Table.Tr>
								))
							)}
						</Table.Tbody>
						<Table.Tfoot>
							<Table.Tr>
								<Table.Td colSpan={visibleColumnCount} aria-live="polite">
									<Text fz="sm" style={{ color: palette.inkSecondary }}>
										{selectedRowCount} of {files.length} tracks selected
									</Text>
								</Table.Td>
							</Table.Tr>
						</Table.Tfoot>
					</Table>
				</Table.ScrollContainer>
			</div>
		</>
	);
}
