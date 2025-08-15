import type { ElectronAPI } from "@electron-toolkit/preload";
import type { AudioCommonMetadata } from "types";

type API = {
	showDialog: () => AudioCommonMetadata[];
};

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
