import { Flex } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { setResults } from "@renderer/store/slices/resultsSlice";
import {
	selectAllSelectedTracks,
	updateTrack,
} from "@renderer/store/slices/tracksSlice";
import { useEffect, useState } from "react";
import type { Data, ProcessingStatus, StoppingStatus } from "types";
import ErrorModal from "../ErrorModal/ErrorModal";
import ResultsModal from "../ResultsModal/ResultsModal";
import RunButton from "../RunButton/RunButton";

export default function StartProcessing() {
	const [opened, { open, close }] = useDisclosure();
	const [isRunning, setIsRunning] = useState(false);
	const tracks = useAppSelector((state) =>
		selectAllSelectedTracks(state.tracks),
	);
	const settings = useAppSelector((state) => state.settings);
	const dispatch = useAppDispatch();

	useEffect(() => {
		const unsubscribe = window.api.responseOnStop((msg: StoppingStatus) => {
			if (msg.status === "stopped") {
				setIsRunning(false);
			}
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		const unsubscribe = window.api.processingResult((data: ProcessingStatus) =>
			dispatch(updateTrack({ id: data.id, changes: { status: data.status } })),
		);
		return () => unsubscribe();
	}, [dispatch]);

	const sendData = async () => {
		if (!settings.global.outputDirectoryPath) {
			open();
			return;
		} else {
			setIsRunning(true);
			const data: Data = { tracks, settings };
			const results = await window.api.startProcessing(data);
			dispatch(setResults(results));
		}
	};

	const handleButtonClick = async () => {
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
			<Flex gap={"md"}>
				<ResultsModal />
				<RunButton
					isRunning={isRunning}
					handleButtonClick={handleButtonClick}
				/>
			</Flex>
		</>
	);
}
