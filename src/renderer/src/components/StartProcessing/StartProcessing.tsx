import { Flex } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { setResults } from "@renderer/store/slices/resultsSlice";
import { getAllSelectedTracks } from "@renderer/store/slices/selectedTracksSlice";
import { updateTrack } from "@renderer/store/slices/tracksSlice";
import { useEffect, useState } from "react";
import type { Data, ProcessingStatus } from "types";
import ErrorModal from "../ErrorModal/ErrorModal";
import ResultsModal from "../ResultsModal/ResultsModal";
import RunButton from "../RunButton/RunButton";

export default function StartProcessing() {
	const [opened, { open, close }] = useDisclosure();
	const [isRunning, setIsRunning] = useState(false);
	const selectedTracks = useAppSelector((state) => state.selectedTracks);
	const settings = useAppSelector((state) => state.settings);
	const dispatch = useAppDispatch();

	// biome-ignore-start lint: temp console.log
	useEffect(() => {
		const unsubscribe = window.api.responseOnStop((msg) => console.log(msg));
		return () => unsubscribe();
	}, []);
	// biome-ignore-end lint: temp console.log

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
			const tracks = getAllSelectedTracks(selectedTracks);
			const data: Data = { tracks, settings };
			const results = await window.api.startProcessing(data);
			dispatch(setResults(results));
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
