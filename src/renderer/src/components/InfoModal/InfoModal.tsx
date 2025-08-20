import { Image, Modal, Table } from "@mantine/core";
import type { RootState } from "@renderer/store/store";
import { selectTrackById } from "@renderer/store/tracksSlice";
import { useSelector } from "react-redux";

export type InfoModalProps = {
	trackId: string;
	isOpen: boolean;
	onClose: () => void;
};

export default function InfoModal({
	trackId,
	isOpen,
	onClose,
}: InfoModalProps) {
	const trackData = useSelector((state: RootState) =>
		selectTrackById(state.tracks, trackId),
	);
	if (!trackData) return null;

	return (
		<Modal.Root opened={isOpen} onClose={onClose}>
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
													{value.map((item, index) => (
														<Image
															fit="contain"
															src={`data:${item.format};base64,${item.data}`}
															key={`${key}-${index + 1}`}
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
													{value.map((item, index) => (
														<Image
															fit="contain"
															src={`data:${item.format};base64,${item.data}`}
															key={`${key}-${index + 1}`}
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
	);
}
