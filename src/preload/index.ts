import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import type { ProcessingStatus } from "../../types";

// Custom APIs for renderer
const api = {
	showDialog: () => ipcRenderer.invoke("showDialog"),
	getOutputDirectoryPath: () => ipcRenderer.invoke("getOutputDirectoryPath"),
	startProcessing: (data) => ipcRenderer.invoke("startProcessing", data),
	stopProcessing: () => ipcRenderer.invoke("stopProcessing"),
	responseOnStart: (cb) => {
		ipcRenderer.on("response-on-start", (_, msg) => cb(msg));
		return () => ipcRenderer.removeAllListeners("response-on-start");
	},
	responseOnStop: (cb) => {
		ipcRenderer.on("response-on-stop", (_, msg) => cb(msg));
		return () => ipcRenderer.removeAllListeners("response-on-stop");
	},
	processingResult: (cb) => {
		ipcRenderer.on("processing-result", (_, msg: ProcessingStatus) => cb(msg));
		return () => ipcRenderer.removeAllListeners("processing-result");
	},
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("electron", electronAPI);
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
