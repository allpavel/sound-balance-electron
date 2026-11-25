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
import type { ProcessingStatus } from "@shared/schemas/track.schema";
import { formatValidationIssues } from "@shared/utils";
import { safeParseData } from "@shared/validators";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { StoppingStatus } from "@/types";
import { processingStatusToTrackChanges } from "./utils/processingStatusToTrackChanges";

/**
 * Presentation state for the error dialog: a precise title per failure mode
 * plus the detail message.
 */
type ProcessingError = { readonly title: string; readonly message: string };

/**
 * Processing controls: Results dialog + Start/Stop button + error dialog,
 * plus the IPC subscriptions that keep per-track status live.
 *
 * @returns The processing control group for the app toolbar.
 */
export default function StartProcessing() {
	const [opened, { open, close }] = useDisclosure();
	const [isRunning, setIsRunning] = useState(false);
	const [processingError, setProcessingError] =
		useState<ProcessingError | null>(null);
	const { selectedTracks: tracks, updateTrack } = useTracks();
	const settings = useAppSelector((state) => state.settings.data);
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
		const unsubscribe = window.api.processingResult(
			(data: ProcessingStatus) => {
				updateTrack({
					id: data.id,
					changes: processingStatusToTrackChanges(data),
				});
			},
		);
		return () => unsubscribe();
	}, [updateTrack]);

	const sendData = async () => {
		if (!settings.global.outputDirectoryPath) {
			setProcessingError({
				title: "Processing could not start",
				message:
					"Please specify the output folder in the settings before starting processing.",
			});
			toast.error("Set the output folder in Settings before processing.");
			open();
			return;
		} else if (tracks.length === 0) {
			setProcessingError({
				title: "Processing could not start",
				message:
					"No tracks selected. Please select at least one track to process.",
			});
			toast.info("Select at least one track to process.");
			open();
			return;
		} else {
			setIsRunning(true);
			const data = { tracks, settings };
			const validatedData = safeParseData(data);
			if (!validatedData.success) {
				const formattedIssues = formatValidationIssues(validatedData.issues);
				setProcessingError({
					title: "Processing could not start",
					message:
						`Pre-flight validation failed — the processing payload is invalid and will not be sent. ` +
						`Details: ${formattedIssues}`,
				});
				open();
				return;
			}
			try {
				const results = await window.api.startProcessing(validatedData.data);
				dispatch(setResults(results));
				if (
					settings.global.openOutputFolderOnComplete &&
					settings.global.outputDirectoryPath
				) {
					window.api.openOutputFolder(settings.global.outputDirectoryPath);
				}
			} catch (error) {
				setProcessingError({
					title: "Processing failed",
					message: `An error occurred during processing: ${error instanceof Error ? error.message : String(error)}`,
				});
				open();
			} finally {
				setIsRunning(false);
			}
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
				title={processingError?.title}
				message={processingError?.message ?? ""}
				onClose={close}
				opened={opened}
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
