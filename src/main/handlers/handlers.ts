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
import { openOutputFolder } from "@main/services/shell.service";
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
	ipcMain.handle(INVOKE_CHANNELS.OPEN_OUTPUT_FOLDER, openOutputFolder);

	ipcMain.handle(INVOKE_CHANNELS.START_PROCESSING, startProcessing);
	ipcMain.handle(INVOKE_CHANNELS.STOP_PROCESSING, stopProcessing);
}
