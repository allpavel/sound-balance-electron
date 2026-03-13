import type { ElectronAPI } from "@electron-toolkit/preload";
import type { API } from "@/types";

declare global {
	interface Window {
		electron: ElectronAPI;
		api: API;
	}
}
