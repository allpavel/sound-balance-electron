import type { ElectronAPI } from "@electron-toolkit/preload";

type API = {
  showDialog: () => void;
};

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
  }
}
