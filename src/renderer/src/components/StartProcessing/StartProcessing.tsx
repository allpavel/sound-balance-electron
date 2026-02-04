import { useDisclosure } from "@mantine/hooks";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { getAllSelectedTracks } from "@renderer/store/slices/selectedTracksSlice";
import { useState } from "react";
import type { Data } from "types";
import ErrorModal from "../ErrorModal/ErrorModal";
import RunButton from "../RunButton/RunButton";

export default function StartProcessing() {
	const [opened, { open, close }] = useDisclosure();
	const [isRunning, setIsRunning] = useState(false);
	const selectedTracks = useAppSelector((state) => state.selectedTracks);
	const settings = useAppSelector((state) => state.settings);

	const sendData = () => {
		if (!settings.global.outputDirectoryPath) {
			open();
			return;
		} else {
			setIsRunning(true);
			const tracks = getAllSelectedTracks(selectedTracks);
			const data: Data = { tracks, settings };
			return window.api.startProcessing(data);
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
			<ErrorModal
				message="Please specify the output folder in the settings before starting
          processing."
				onClose={close}
				opened={opened}
				centered
			/>
			<RunButton isRunning={isRunning} handleButtonClick={handleButtonClick} />
		</>
	);
}
