import { Modal } from "@mantine/core";
import type { InfoModalProps } from "types";

export default function InfoModal({
	trackId,
	data,
	isOpen,
	onClose,
}: InfoModalProps) {
	const trackData = data.find((item) => item.id === trackId);

	if (!trackData) return null;

	return (
		<Modal
			opened={isOpen}
			onClose={onClose}
			title="Details"
			size={"lg"}
			padding={"xl"}
			overlayProps={{ blur: 3 }}
		>
			This is a content for track: {trackData.common.artist} -{" "}
			{trackData.common.album}.
		</Modal>
	);
}
