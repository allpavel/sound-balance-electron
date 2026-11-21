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
import type { ProcessingStatus } from "@shared/schemas/track.schema";
import { normalizePlatform } from "@shared/utils";
import { contextBridge, ipcRenderer } from "electron";
import type { API, StoppingStatus } from "@/types";

/**
 * Registers a typed listener on an IPC event channel and returns a
 * per-subscription teardown function.
 *
 * **Listener ownership:** the returned closure removes *only* the
 * handler registered by this call (`ipcRenderer.removeListener`),
 * leaving any concurrent subscribers on the same channel intact.
 * Callers must invoke the teardown exactly once when they no longer
 * need the subscription (e.g., in a React `useEffect` cleanup).
 *
 * **Teardown order:** subscriptions are independent; no ordering
 * constraint exists between teardowns on the same channel.
 *
 * @typeParam T - Payload type delivered to the callback.
 * @param channel  - IPC event channel name from `EVENT_CHANNELS`.
 * @param callback - Application-level consumer of the event payload.
 * @returns A cleanup function that detaches this subscription only.
 */
function subscribeToEvent<T>(
	channel: string,
	callback: (payload: T) => void,
): () => void {
	const handler = (_event: unknown, payload: T): void => {
		callback(payload);
	};
	ipcRenderer.on(channel, handler);
	return () => {
		ipcRenderer.removeListener(channel, handler);
	};
}

const api = {
	showDialog: () => ipcRenderer.invoke(INVOKE_CHANNELS.SHOW_DIALOG),
	getOutputDirectoryPath: () =>
		ipcRenderer.invoke(INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY),
	startProcessing: (data) =>
		ipcRenderer.invoke(INVOKE_CHANNELS.START_PROCESSING, data),
	stopProcessing: () => ipcRenderer.invoke(INVOKE_CHANNELS.STOP_PROCESSING),
	responseOnStart: (cb) =>
		subscribeToEvent<string>(EVENT_CHANNELS.RESPONSE_ON_START, cb),
	responseOnStop: (cb) =>
		subscribeToEvent<StoppingStatus>(EVENT_CHANNELS.RESPONSE_ON_STOP, cb),
	processingResult: (cb) =>
		subscribeToEvent<ProcessingStatus>(EVENT_CHANNELS.PROCESSING_RESULT, cb),
	openOutputFolder: (outputDirectoryPath: string) =>
		ipcRenderer.invoke(INVOKE_CHANNELS.OPEN_OUTPUT_FOLDER, outputDirectoryPath),
	platform: normalizePlatform(process.platform),
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
