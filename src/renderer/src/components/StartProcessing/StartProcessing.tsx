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
import { Flex } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import ErrorModal from "@renderer/components/ErrorModal/ErrorModal";
import ResultsModal from "@renderer/components/ResultsModal/ResultsModal";
import RunButton from "@renderer/components/RunButton/RunButton";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useTracks } from "@renderer/hooks/useTracks";
import { setResults } from "@renderer/store/slices/resultsSlice";
import { updateInDB } from "@renderer/store/slices/tracksSlice";
import { useEffect, useState } from "react";
import type { Data, ProcessingStatus, StoppingStatus } from "types";

export default function StartProcessing() {
	const [opened, { open, close }] = useDisclosure();
	const [isRunning, setIsRunning] = useState(false);
	const { selectedTracks: tracks } = useTracks();
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
			dispatch(updateInDB({ id: data.id, changes: { status: data.status } })),
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
