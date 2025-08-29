import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";

// Custom APIs for renderer
const api = {
	showDialog: () => ipcRenderer.invoke("showDialog"),
	getOutputDirectoryPath: () => ipcRenderer.invoke("getOutputDirectoryPath"),
	startProcessing: (data) => ipcRenderer.invoke("startProcessing", data),
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
