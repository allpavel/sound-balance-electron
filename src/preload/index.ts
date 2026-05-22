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
import { electronAPI } from "@electron-toolkit/preload";
import { EVENT_CHANNELS, INVOKE_CHANNELS } from "@main/constants";
import { contextBridge, ipcRenderer } from "electron";
import type { API, ProcessingStatus } from "@/types";

const api = {
	showDialog: () => ipcRenderer.invoke(INVOKE_CHANNELS.SHOW_DIALOG),
	getOutputDirectoryPath: () =>
		ipcRenderer.invoke(INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY),
	startProcessing: (data) =>
		ipcRenderer.invoke(INVOKE_CHANNELS.START_PROCESSING, data),
	stopProcessing: () => ipcRenderer.invoke(INVOKE_CHANNELS.STOP_PROCESSING),
	responseOnStart: (cb) => {
		ipcRenderer.on(EVENT_CHANNELS.RESPONSE_ON_START, (_, msg) => cb(msg));
		return () =>
			ipcRenderer.removeAllListeners(EVENT_CHANNELS.RESPONSE_ON_START);
	},
	responseOnStop: (cb) => {
		ipcRenderer.on(EVENT_CHANNELS.RESPONSE_ON_STOP, (_, msg) => cb(msg));
		return () =>
			ipcRenderer.removeAllListeners(EVENT_CHANNELS.RESPONSE_ON_STOP);
	},
	processingResult: (cb) => {
		ipcRenderer.on(
			EVENT_CHANNELS.PROCESSING_RESULT,
			(_, msg: ProcessingStatus) => cb(msg),
		);
		return () =>
			ipcRenderer.removeAllListeners(EVENT_CHANNELS.PROCESSING_RESULT);
	},
} satisfies API;

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("api", api);
	} catch (error) {
		throw new Error(
			`Preload script failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
} else {
	// @ts-expect-error (define in dts)
	window.electron = electronAPI;
	// @ts-expect-error (define in dts)
	window.api = api;
}
