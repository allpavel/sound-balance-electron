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

import { Button, Modal, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { palette } from "@renderer/theme/tokens";
import type { Metadata } from "@shared/schemas/track.schema";
import { ChevronRight } from "lucide-react";
import { type JSX, useMemo } from "react";
import { buildMetadataRows, type MetadataRow } from "./metadataRows";

export type InfoModalProps = {
	trackData: Metadata;
};

/**
 * Renders one metadata section ("Tag metadata" / "Audio format") as a
 * semantic two-column table.
 *
 * @param props - Section heading, caption, and the rows to render.
 * @returns A `<table>` section with proper `scope` attributes.
 */
function MetadataSection({
	heading,
	caption,
	rows,
}: {
	heading: string;
	caption: string;
	rows: MetadataRow[];
}): JSX.Element {
	return (
		<section aria-labelledby={`info-section-${heading.replace(/\s+/g, "-")}`}>
			<Text
				id={`info-section-${heading.replace(/\s+/g, "-")}`}
				component="h3"
				fw={600}
				fz="md"
				mb="xs"
				mt="md"
			>
				{heading}
			</Text>
			{rows.length === 0 ? (
				<Text fz="sm" style={{ color: palette.inkSecondary }}>
					No {caption} available for this file.
				</Text>
			) : (
				<Table
					className="sb-data-table"
					withTableBorder
					withColumnBorders={false}
					verticalSpacing={6}
					horizontalSpacing="sm"
					fz="sm"
				>
					<Table.Caption className="visually-hidden">{caption}</Table.Caption>
					<Table.Thead>
						<Table.Tr>
							<Table.Th scope="col" style={{ width: "38%" }}>
								Tag
							</Table.Th>
							<Table.Th scope="col">Value</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{rows.map((row) => (
							<Table.Tr key={row.key}>
								<Table.Th
									scope="row"
									fw={500}
									style={{ color: palette.inkSecondary }}
								>
									{row.label}
								</Table.Th>
								<Table.Td style={{ wordBreak: "break-word" }}>
									{row.value}
								</Table.Td>
							</Table.Tr>
						))}
					</Table.Tbody>
				</Table>
			)}
		</section>
	);
}

/**
 * Track details dialog: tag metadata + audio format for one track.
 *
 * @param props - The track whose metadata is displayed.
 * @returns Details button + modal dialog.
 */
export default function InfoModal({ trackData }: InfoModalProps): JSX.Element {
	const [opened, { open, close }] = useDisclosure(false);

	const commonRows = useMemo(
		() => buildMetadataRows(trackData.common),
		[trackData.common],
	);
	const formatRows = useMemo(
		() => buildMetadataRows(trackData.format),
		[trackData.format],
	);

	const trackTitle =
		typeof trackData.common.title === "string" &&
		trackData.common.title.length > 0
			? trackData.common.title
			: trackData.file;

	return (
		<>
			<Button
				size="xs"
				variant="light"
				rightSection={<ChevronRight size={14} aria-hidden="true" />}
				aria-label={`Show details for "${trackTitle}"`}
				onClick={open}
			>
				Details
			</Button>
			<Modal.Root opened={opened} onClose={close} size="lg">
				<Modal.Overlay />
				<Modal.Content className="allow-text-select">
					<Modal.Header>
						<Modal.Title fw={600}>{trackData.file}</Modal.Title>
						<Modal.CloseButton aria-label="Close details" />
					</Modal.Header>
					<Modal.Body>
						<MetadataSection
							heading="Tag metadata"
							caption="tag metadata values"
							rows={commonRows}
						/>
						<MetadataSection
							heading="Audio format"
							caption="audio format values"
							rows={formatRows}
						/>
					</Modal.Body>
				</Modal.Content>
			</Modal.Root>
		</>
	);
}
