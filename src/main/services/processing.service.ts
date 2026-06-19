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
import path from "node:path";
import { EVENT_CHANNELS, INITIALSETTINGS } from "@main/constants";
import { getGlobalSettings, getTrackSettings } from "@main/lib/ffmpeg";
import { getTrackTitle, isDirectory } from "@main/lib/utils";
import { ProcessManager } from "@main/services/ffmpeg/processManager";
import type { Data } from "@types";
import type { IpcMainInvokeEvent } from "electron";
import PQueue from "p-queue";
import type { Failed, ProcessingStatus } from "@/types";
import { TwoPassProcessManager } from "./ffmpeg/twoPassProcessManager";

const activeProcesses = new Map<string, ProcessManager>();
let abortController: AbortController | null = null;

export const startProcessing = async (
	event: IpcMainInvokeEvent,
	data: Data,
) => {
	const dirPath = data.settings.global.outputDirectoryPath;
	const isDir = await isDirectory(dirPath);
	if (!isDir) {
		throw new Error("Output directory validation failed.");
	}

	let successful = 0;
	const failed: Failed[] = [];
	let total = 0;
	abortController = new AbortController();
	const { signal } = abortController;
	const queue = new PQueue({ concurrency: +data.settings.global.concurrency });

	const globalSettings = getGlobalSettings(data.settings.global);
	const trackSettings = getTrackSettings(
		INITIALSETTINGS.audio,
		data.settings.audio,
	);
	const isTwoPass =
		data.settings.audio.audioFilter === "loudnorm" &&
		data.settings.audio.filterOptions?.linear !== false;

	for (const track of data.tracks) {
		if (!track.filePath || track.status !== "pending") continue;

		queue.add(async () => {
			if (signal.aborted) return;
			const proc = isTwoPass
				? new TwoPassProcessManager()
				: new ProcessManager();
			activeProcesses.set(track.id, proc);

			try {
				event.sender.send(EVENT_CHANNELS.PROCESSING_RESULT, {
					id: track.id,
					status: "processing",
				} satisfies ProcessingStatus);

				const inputFile = track.filePath;
				const outputFile = path.join(dirPath, track.file);
				total++;

				if (proc instanceof TwoPassProcessManager) {
					await proc.run({
						input: inputFile,
						output: outputFile,
						globalSettings,
						trackSettings,
						filterOptions: data.settings.audio.filterOptions,
						signal: signal,
					});
				} else if (proc instanceof ProcessManager) {
					await proc.run({
						input: inputFile,
						output: outputFile,
						globalSettings,
						trackSettings,
					});
				}
				successful++;

				event.sender.send(EVENT_CHANNELS.PROCESSING_RESULT, {
					id: track.id,
					status: "completed",
				} satisfies ProcessingStatus);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				failed.push({
					id: track.id,
					title: getTrackTitle(
						track.common.artist,
						track.common.title,
						track.file,
					),
					reason: errorMessage,
				} satisfies Failed);

				event.sender.send(EVENT_CHANNELS.PROCESSING_RESULT, {
					id: track.id,
					status: "failed",
					message: errorMessage,
				} satisfies ProcessingStatus);
			} finally {
				activeProcesses.delete(track.id);
			}
		});
	}

	await queue.onIdle();

	abortController = null;

	return {
		successful,
		failed,
		total,
	};
};

export const stopProcessing = async (event: IpcMainInvokeEvent) => {
	if (abortController) {
		abortController.abort();
		abortController = null;
	}

	for (const [id, proc] of activeProcesses.entries()) {
		proc.kill("SIGINT");
		activeProcesses.delete(id);
	}

	await new Promise((resolve) => setTimeout(resolve, 100));

	event.sender.send(EVENT_CHANNELS.RESPONSE_ON_STOP, { success: true });
};
