import type { ElectronAPI } from "@electron-toolkit/preload";
import type { Data, Metadata, ProcessingStatus } from "types";

type API = {
	showDialog: () => Promise<Metadata[]>;
	getOutputDirectoryPath: () => Promise<Electron.OpenDialogReturnValue>;
	startProcessing: (data: Data) => Data;
	stopProcessing: () => void;
	responseOnStart: (cb: (msg: string) => void) => () => void;
	responseOnStop: (cb: (msg: string) => void) => () => void;
	processingResult: (cb: (msg: ProcessingStatus) => void) => () => void;
};

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
