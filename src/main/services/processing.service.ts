import path from "node:path";
import { EVENT_CHANNELS, INITIALSETTINGS } from "@main/constants";
import {
	getGlobalSettings,
	getTrackSettings,
	optionsMapper,
} from "@main/lib/ffmpeg";
import { getTrackTitle, isDirectory } from "@main/lib/utils";
import { ProcessManager } from "@main/services/ffmpeg/processManager";
import type { IpcMainInvokeEvent } from "electron";
import PQueue from "p-queue";
import type { Data, Failed, ProcessingStatus } from "@/types";

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

	const globalSettings = getGlobalSettings(
		INITIALSETTINGS,
		data.settings.global,
		optionsMapper,
	);
	const trackSettings = getTrackSettings(
		INITIALSETTINGS,
		data.settings.audio,
		optionsMapper,
	);

	for (const track of data.tracks) {
		if (!track.filePath || track.status !== "pending") continue;

		queue.add(async () => {
			if (signal.aborted) return;

			const proc = new ProcessManager();
			activeProcesses.set(track.id, proc);

			try {
				event.sender.send(EVENT_CHANNELS.PROCESSING_RESULT, {
					id: track.id,
					status: "processing",
				} satisfies ProcessingStatus);

				const inputFile = track.filePath;
				const outputFile = path.join(dirPath, track.file);

				total++;

				await proc.run({
					input: inputFile,
					output: outputFile,
					globalSettings,
					trackSettings,
				});

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
