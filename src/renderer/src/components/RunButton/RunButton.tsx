import { Button, Flex, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { getAllSelectedTracks } from "@renderer/store/slices/selectedTracksSlice";
import { IconAlertHexagon, IconPlayerPlayFilled } from "@tabler/icons-react";
import type { Data } from "types";

export default function RunButton() {
	const [opened, { open, close }] = useDisclosure();
	const selectedTracks = useAppSelector((state) => state.selectedTracks);
	const settings = useAppSelector((state) => state.settings);

	const sendData = () => {
		if (!settings.global.outputDirectoryPath) {
			open();
			return;
		} else {
			const tracks = getAllSelectedTracks(selectedTracks);
			const data: Data = { tracks, settings };
			return window.api.startProcessing(data);
		}
	};

	return (
		<>
			<Modal
				opened={opened}
				onClose={close}
				centered
				title={
					<Flex gap={"xs"}>
						<IconAlertHexagon color="red" />
						<Text>Attention!</Text>
					</Flex>
				}
			>
				<Text>
					Please specify the output folder in the settings before starting
					processing.
				</Text>
			</Modal>
			<Button
				leftSection={<IconPlayerPlayFilled size={14} />}
				onClick={sendData}
			>
				Run
			</Button>
		</>
	);
}
