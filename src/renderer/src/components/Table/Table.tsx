import { Button, Checkbox, Flex, Group, Table, TextInput } from "@mantine/core";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import {
	addSelectedTrack,
	removeAllSelectedTracks,
	removeSelectedTrack,
	setAllSelectedTracks,
} from "@renderer/store/slices/selectedTracksSlice";
import { selectAllTracks } from "@renderer/store/slices/tracksSlice";
import { getSortingIcon } from "@renderer/utils/getSortingIcons";
import { IconCaretRight, IconSearch } from "@tabler/icons-react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getSortedRowModel,
	type Table as ITable,
	type Row,
	type RowSelectionState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { type ChangeEvent, useMemo, useState } from "react";
import type { Metadata } from "types";
import ColumnSelect from "../ColumnSelect/ColumnSelect";
import FilterSelect from "../FilterSelect/FilterSelect";
import InfoModal from "../InfoModal/InfoModal";

export default function TableComponent() {
	const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
	const [selectedTrack, setSelectedTrack] = useState<string>("");
	const [modalOpened, setModalOpened] = useState(false);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	const dispatch = useAppDispatch();
	const files = useAppSelector((state) => selectAllTracks(state.tracks));

	const columns = useMemo<ColumnDef<Metadata>[]>(
		() => [
			{
				id: "select",
				header: ({ table }: { table: ITable<Metadata> }) => (
					<Checkbox
						type="checkbox"
						checked={table.getIsAllRowsSelected()}
						onChange={(e) => {
							if (e.target.checked) {
								dispatch(
									setAllSelectedTracks(
										table.getRowModel().rows.map((item) => item.original),
									),
								);
							} else {
								dispatch(removeAllSelectedTracks());
							}
							table.getToggleAllRowsSelectedHandler()(e);
						}}
					/>
				),
				cell: ({ row }: { row: Row<Metadata> }) => (
					<Checkbox
						type="checkbox"
						checked={row.getIsSelected()}
						onChange={(e) => {
							if (e.target.checked) {
								dispatch(addSelectedTrack(row.original));
							} else {
								dispatch(removeSelectedTrack(row.original.id));
							}
							row.getToggleSelectedHandler()(e);
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
				enableFacetedFilter: true,
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
				enableFacetedFilter: true,
			},
			{
				id: "year",
				header: "Year",
				accessorFn: (row) => row.common.year?.toString(),
				enableSorting: true,
				enableFacetedFilter: true,
			},
			{
				id: "info",
				header: "Info",
				cell: ({ row }: { row: Row<Metadata> }) => (
					<Button
						rightSection={<IconCaretRight />}
						onClick={() => {
							setSelectedTrack(row.original.id);
							setModalOpened(true);
						}}
					>
						Details
					</Button>
				),
				enableSorting: false,
				enableColumnFilter: false,
			},
		],
		[dispatch],
	);

	const table = useReactTable({
		data: files,
		columns,
		state: {
			rowSelection: selectedRows,
			columnVisibility,
			sorting,
			globalFilter,
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		onRowSelectionChange: setSelectedRows,
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
					leftSection={<IconSearch size={16} />}
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
					{table.getRowModel().rows.length === 0 && files.length > 0 ? (
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
									Object.keys(selectedRows).includes(row.id)
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
			<InfoModal
				trackId={selectedTrack}
				isOpen={modalOpened}
				onClose={() => setModalOpened(false)}
			/>
		</>
	);
}
