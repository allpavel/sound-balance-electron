import type { ElectronAPI } from "@electron-toolkit/preload";
import type { Metadata } from "types";

type API = {
	showDialog: () => Promise<Metadata[]>;
};

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
