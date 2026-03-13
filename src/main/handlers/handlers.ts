import { INVOKE_CHANNELS } from "@main/constants";
import {
	getOutputDirectoryPath,
	showDialog as selectAudioFiles,
} from "@main/services/dialogs.service";
import { parseMetadata } from "@main/services/metadata.service";
import {
	startProcessing,
	stopProcessing,
} from "@main/services/processing.service";
import { ipcMain } from "electron";

export function registerIpcHandlers(): void {
	ipcMain.handle(INVOKE_CHANNELS.SHOW_DIALOG, async () => {
		const filePaths = await selectAudioFiles();
		if (filePaths.length === 0) {
			return [];
		}
		return await parseMetadata(filePaths);
	});
	ipcMain.handle(INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY, getOutputDirectoryPath);

	ipcMain.handle(INVOKE_CHANNELS.START_PROCESSING, startProcessing);
	ipcMain.handle(INVOKE_CHANNELS.STOP_PROCESSING, stopProcessing);
}
