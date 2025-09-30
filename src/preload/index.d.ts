import type { ElectronAPI } from "@electron-toolkit/preload";
import type { Data, Metadata } from "types";

type API = {
	showDialog: () => Promise<Metadata[]>;
	getOutputDirectoryPath: () => Promise<Electron.OpenDialogReturnValue>;
	startProcessing: (data: Data) => Data;
	stopProcessing: () => Promise<boolean>;
};

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
