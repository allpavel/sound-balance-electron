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
import { Button, Image, Modal, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCaretRight } from "@tabler/icons-react";
import type { Metadata } from "@/types";

export type InfoModalProps = {
	trackData: Metadata;
};

export default function InfoModal({ trackData }: InfoModalProps) {
	const [opened, { open, close }] = useDisclosure(false);
	return (
		<>
			<Button rightSection={<IconCaretRight />} onClick={open}>
				Details
			</Button>
			<Modal.Root opened={opened} onClose={close}>
				<Modal.Overlay blur={5} />
				<Modal.Content>
					<Modal.Header bg={"cyan"}>
						<Modal.Title fw={"bold"}>{trackData.file}</Modal.Title>
						<Modal.CloseButton aria-label="Close modal" />
					</Modal.Header>
					<Modal.Body>
						<Table
							stickyHeader
							stickyHeaderOffset={60}
							verticalSpacing={"sm"}
							highlightOnHover
							withColumnBorders
						>
							<Table.Thead>
								<Table.Tr>
									<Table.Th>Tag</Table.Th>
									<Table.Th>Value</Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{Object.entries(trackData.common).map(([key, value]) => {
									if (Array.isArray(value)) {
										if (key === "picture") {
											return (
												<Table.Tr key={key}>
													<Table.Td>Album Art</Table.Td>
													<Table.Td>
														{value.map((item) => (
															<Image
																fit="contain"
																src={`data:${item.format};base64,${item.data}`}
																key={item.name}
															/>
														))}
													</Table.Td>
												</Table.Tr>
											);
										}
										return (
											<Table.Tr key={key}>
												<Table.Td>{key}</Table.Td>
												<Table.Td>{value.join(", ")}</Table.Td>
											</Table.Tr>
										);
									} else if (typeof value === "object" && value !== null) {
										return (
											<Table.Tr key={key}>
												<Table.Td>{key}</Table.Td>
												<Table.Td>
													{value.no && value.of
														? `${value.no} of ${value.of}`
														: "n/a"}
												</Table.Td>
											</Table.Tr>
										);
									} else {
										return (
											<Table.Tr key={key}>
												<Table.Td>{key}</Table.Td>
												<Table.Td>{value ?? "n/a"}</Table.Td>
											</Table.Tr>
										);
									}
								})}
								{Object.entries(trackData.format).map(([key, value]) => {
									if (Array.isArray(value)) {
										if (key === "picture") {
											return (
												<Table.Tr key={key}>
													<Table.Td>Album Art</Table.Td>
													<Table.Td>
														{value.map((item) => (
															<Image
																fit="contain"
																src={`data:${item.format};base64,${item.data}`}
																key={item.name}
															/>
														))}
													</Table.Td>
												</Table.Tr>
											);
										}
										return (
											<Table.Tr key={key}>
												<Table.Td>{key}</Table.Td>
												<Table.Td>{value.join(", ")}</Table.Td>
											</Table.Tr>
										);
									} else if (typeof value === "object" && value !== null) {
										return (
											<Table.Tr key={key}>
												<Table.Td>{key}</Table.Td>
												<Table.Td>
													{value.no && value.of
														? `${value.no} of ${value.of}`
														: "n/a"}
												</Table.Td>
											</Table.Tr>
										);
									} else {
										return (
											<Table.Tr key={key}>
												<Table.Td>{key}</Table.Td>
												<Table.Td>{value ?? "n/a"}</Table.Td>
											</Table.Tr>
										);
									}
								})}
							</Table.Tbody>
						</Table>
					</Modal.Body>
				</Modal.Content>
			</Modal.Root>
		</>
	);
}
