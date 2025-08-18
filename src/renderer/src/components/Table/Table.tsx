import { Button, Checkbox, Table } from "@mantine/core";
import { IconCaretRight } from "@tabler/icons-react";
import {
	flexRender,
	getCoreRowModel,
	type Table as ITable,
	type Row,
	type RowSelectionState,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { Metadata } from "types";
import InfoModal from "../InfoModal/InfoModal";

export default function TableComponent({ files }: { files: Metadata[] }) {
	const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
	const [selectedTrack, setSelectedTrack] = useState<string>("");
	const [modalOpened, setModalOpened] = useState(false);

	const columns = useMemo(
		() => [
			{
				id: "select",
				header: ({ table }: { table: ITable<Metadata> }) => (
					<Checkbox
						type="checkbox"
						checked={table.getIsAllRowsSelected()}
						onChange={table.getToggleAllPageRowsSelectedHandler()}
					/>
				),
				cell: ({ row }: { row: Row<Metadata> }) => (
					<Checkbox
						type="checkbox"
						checked={row.getIsSelected()}
						onChange={row.getToggleSelectedHandler()}
					/>
				),
			},
			{
				header: "Artist",
				accessorKey: "common.artist",
			},
			{
				header: "Title",
				accessorKey: "common.title",
			},
			{
				header: "Album",
				accessorKey: "common.album",
			},
			{
				header: "Year",
				accessorKey: "common.year",
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
			},
		],
		[],
	);

	const table = useReactTable<Metadata>({
		data: files,
		columns,
		state: {
			rowSelection: selectedRows,
		},
		getCoreRowModel: getCoreRowModel(),
		onRowSelectionChange: setSelectedRows,
		getRowId: (row) => row.id.toString(),
	});

	return (
		<>
			<Table highlightOnHover withColumnBorders>
				<Table.Thead>
					{table.getHeaderGroups().map((group) => (
						<Table.Tr key={group.id}>
							{group.headers.map((header) => (
								<Table.Th key={header.id}>
									{flexRender(
										header.column.columnDef.header,
										header.getContext(),
									)}
								</Table.Th>
							))}
						</Table.Tr>
					))}
				</Table.Thead>
				<Table.Tbody>
					{table.getRowModel().rows.map((row) => (
						<Table.Tr
							key={row.id}
							bg={
								Object.keys(selectedRows).includes(row.id)
									? "var(--mantine-color-blue-light)"
									: undefined
							}
						>
							{row.getVisibleCells().map((cell) => (
								<Table.Td key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</Table.Td>
							))}
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>
			<InfoModal
				trackId={selectedTrack}
				data={files}
				isOpen={modalOpened}
				onClose={() => setModalOpened(false)}
			/>
		</>
	);
}
