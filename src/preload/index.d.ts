import type { ElectronAPI } from "@electron-toolkit/preload";
import type { AudioMetadata } from "types";

type API = {
	showDialog: () => AudioMetadata[];
};

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
