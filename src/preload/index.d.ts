import type { ElectronAPI } from "@electron-toolkit/preload";
import type { IAudioMetadata } from "music-metadata";

type API = {
	showDialog: () => Promise<IAudioMetadata[]>;
};

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
