import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";

// Custom APIs for renderer
const api = {
	showDialog: () => ipcRenderer.invoke("showDialog"),
	getOutputDirectoryPath: () => ipcRenderer.invoke("getOutputDirectoryPath"),
	startProcessing: (data) => ipcRenderer.invoke("startProcessing", data),
	stopProcessing: () => ipcRenderer.invoke("stopProcessing"),
	responseOnStart: (cb) =>
		ipcRenderer.on("response-on-start", (_, result) => cb(result)),
	startProcessingReply: (cb) => {
		const subscription = (_event: IpcRendererEvent, message: string) =>
			cb(message);
		ipcRenderer.on("PROCESSING_STARTED", subscription);
		return () => ipcRenderer.removeListener("PROCESSING_STARTED", subscription);
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
	// @ts-ignore (define in dts)
	window.electron = electronAPI;
	// @ts-ignore (define in dts)
	window.api = api;
}
