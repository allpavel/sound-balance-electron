import { Button, Flex, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { getAllSelectedTracks } from "@renderer/store/slices/selectedTracksSlice";
import {
	IconAlertHexagon,
	IconPlayerPlayFilled,
	IconPlayerStop,
	IconTrophy,
} from "@tabler/icons-react";
import { useState } from "react";
import type { Data, ProcessingStats } from "types";

export default function RunButton() {
	const [opened, { open, close }] = useDisclosure();
	const [showResults, { open: openResults, close: closeResults }] =
		useDisclosure(false);
	const [isRunning, setIsRunning] = useState(false);
	const [processingResult, setProcessingResult] = useState<ProcessingStats>();
	const selectedTracks = useAppSelector((state) => state.selectedTracks);
	const settings = useAppSelector((state) => state.settings);

	const sendData = async () => {
		if (!settings.global.outputDirectoryPath) {
			open();
			return;
		} else {
			setIsRunning(true);
			const tracks = getAllSelectedTracks(selectedTracks);
			const data: Data = { tracks, settings };
			const res = await window.api.startProcessing(data);
			setProcessingResult(res);
			setIsRunning(false);
			openResults();
		}
	};

	const handleButtonClick = () => {
		if (isRunning) {
			setIsRunning(false);
			window.api.stopProcessing();
		} else {
			sendData();
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
			{isRunning ? (
				<Button
					leftSection={<IconPlayerStop size={14} />}
					onClick={handleButtonClick}
				>
					Stop
				</Button>
			) : (
				<Button
					leftSection={<IconPlayerPlayFilled size={14} />}
					onClick={handleButtonClick}
				>
					Run
				</Button>
			)}
			{processingResult && (
				<Modal
					opened={showResults}
					onClose={closeResults}
					centered
					title={
						<Flex gap={"xs"}>
							<IconTrophy color="blue" />
							<Text>Results:</Text>
						</Flex>
					}
				>
					<Text>Total Files: {processingResult.totalFiles}</Text>
				</Modal>
			)}
		</>
	);
}
