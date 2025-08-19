import { Modal } from "@mantine/core";
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
		<Modal
			opened={isOpen}
			onClose={onClose}
			title="Details"
			size={"lg"}
			padding={"xl"}
			overlayProps={{ blur: 3 }}
		>
			{trackData.common.artist}
		</Modal>
	);
}
