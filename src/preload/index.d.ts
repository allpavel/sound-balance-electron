import type { ElectronAPI } from "@electron-toolkit/preload";
import type { Metadata } from "types";

type API = {
	showDialog: () => Promise<Metadata[]>;
	getOutputDirectoryPath: () => Promise<Electron.OpenDialogReturnValue>;
};

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
