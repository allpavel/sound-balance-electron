import type { ElectronAPI } from "@electron-toolkit/preload";
import type { Data, Metadata, ProcessingStats } from "types";

type API = {
	showDialog: () => Promise<Metadata[]>;
	getOutputDirectoryPath: () => Promise<Electron.OpenDialogReturnValue>;
	startProcessing: (data: Data) => Promise<ProcessingStats>;
	stopProcessing: () => Promise<boolean>;
	startProcessingReply: (cb: (message: string) => void) => void;
};

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
