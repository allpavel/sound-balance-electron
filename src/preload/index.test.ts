/*
 * sound-balance-electron
 * Copyright (C) 2026 Pavel Alloyarov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { INVOKE_CHANNELS } from "@main/constants";
import { contextBridge, ipcRenderer } from "electron";

vi.mock("electron", () => ({
	contextBridge: { exposeInMainWorld: vi.fn() },
	dialog: { showOpenDialog: vi.fn() },
	shell: { openPath: vi.fn() },
	ipcMain: { handle: vi.fn(), on: vi.fn() },
	ipcRenderer: {
		invoke: vi.fn(),
		on: vi.fn(),
		removeAllListeners: vi.fn(),
	},
}));

vi.mock("@electron-toolkit/preload", () => ({
	electronAPI: { _isElectronAPI: true },
}));

describe("preload", () => {
	let api: Record<string, (...args: any[]) => any>;
	let exposeCalls: any[][];

	beforeAll(async () => {
		Object.defineProperty(process, "contextIsolated", {
			value: true,
			configurable: true,
		});
		await import("./index");
		const mock = vi.mocked(contextBridge.exposeInMainWorld);
		exposeCalls = [...mock.mock.calls];
		api = mock.mock.calls.find((c) => c[0] === "api")?.[1];
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterAll(() => {
		Object.defineProperty(process, "contextIsolated", {
			value: undefined,
			configurable: true,
		});
	});

	describe("api object structure", () => {
		it("exposes exactly 8 methods", () => {
			const keys = Object.keys(api).sort();
			expect(keys).toEqual([
				"getOutputDirectoryPath",
				"openOutputFolder",
				"processingResult",
				"responseOnStart",
				"responseOnStop",
				"showDialog",
				"startProcessing",
				"stopProcessing",
			]);
		});

		it("all exposed values are functions", () => {
			for (const value of Object.values(api)) {
				expect(typeof value).toBe("function");
			}
		});

		it("does not expose non-function values", () => {
			const values = Object.values(api);
			expect(values.every((i) => typeof i === "function")).toBe(true);
		});
	});

	describe("api.showDialog", () => {
		it("invokes ipcRenderer with SHOW_DIALOG channel", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce([]);
			await api.showDialog();
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.SHOW_DIALOG,
			);
		});

		it("invokes exactly once per call", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce([]);
			await api.showDialog();
			expect(ipcRenderer.invoke).toHaveBeenCalledTimes(1);
		});

		it("passes only the channel argument (no extras)", async () => {
			const mockedIPC = vi.mocked(ipcRenderer.invoke);
			mockedIPC.mockResolvedValueOnce([]);
			await api.showDialog();
			expect(mockedIPC.mock.calls[0]).toHaveLength(1);
		});

		it("returns the value from ipcRenderer.invoke", async () => {
			const result = [{ id: "1" }, { id: "2" }];
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(result as any);
			expect(await api.showDialog()).toEqual(result);
		});

		it("returns empty array when invoke resolves with []", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce([]);
			expect(await api.showDialog()).toEqual([]);
		});

		it("returns undefined when invoke resolves with undefined", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(undefined);
			expect(await api.showDialog()).toBeUndefined();
		});

		it("returns null when invoke resolves with null", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(null);
			expect(await api.showDialog()).toBeNull();
		});

		it("propagates Error rejection from ipcRenderer.invoke", async () => {
			const error = new Error("IPC failed");
			vi.mocked(ipcRenderer.invoke).mockRejectedValue(error);
			await expect(api.showDialog()).rejects.toThrow(error);
		});

		it("propagates non-Error rejection from ipcRenderer.invoke", async () => {
			const error = "string error";
			vi.mocked(ipcRenderer.invoke).mockRejectedValue(error);
			await expect(api.showDialog()).rejects.toBe(error);
		});

		it("propagates null rejection", async () => {
			vi.mocked(ipcRenderer.invoke).mockRejectedValue(null);
			await expect(api.showDialog()).rejects.toBe(null);
		});

		it("can be called multiple times in sequence", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce([]);
			await api.showDialog();
			await api.showDialog();
			await api.showDialog();
			expect(ipcRenderer.invoke).toHaveBeenCalledTimes(3);
		});

		it("works when destructured from api object", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce([]);
			const { showDialog } = api;
			await showDialog();
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.SHOW_DIALOG,
			);
		});
	});

	describe("api.getOutputDirectoryPath", () => {
		it("invokes ipcRenderer with GET_OUTPUT_DIRECTORY channel", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce({} as any);
			await api.getOutputDirectoryPath();
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY,
			);
		});

		it("invokes exactly once per call", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce({} as any);
			await api.getOutputDirectoryPath();
			expect(ipcRenderer.invoke).toHaveBeenCalledTimes(1);
		});

		it("passes only the channel argument", async () => {
			const mockedIPC = vi.mocked(ipcRenderer.invoke);
			mockedIPC.mockResolvedValueOnce({} as any);
			await api.getOutputDirectoryPath();
			expect(mockedIPC.mock.calls[0]).toHaveLength(1);
		});

		it("returns the OpenDialogReturnValue from invoke", async () => {
			const result = { canceled: false, filePaths: ["/music"] };
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(result as any);
			expect(await api.getOutputDirectoryPath()).toEqual(result);
		});

		it("returns canceled result from invoke", async () => {
			const result = { canceled: true, filePaths: [] };
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(result as any);
			expect(await api.getOutputDirectoryPath()).toEqual(result);
		});

		it("returns result with multiple filePaths", async () => {
			const result = {
				canceled: false,
				filePaths: ["/music/dir1", "/music/dir2"],
			};
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce(result as any);
			expect(await api.getOutputDirectoryPath()).toEqual(result);
		});

		it("propagates rejection", async () => {
			const error = new Error("fail");
			vi.mocked(ipcRenderer.invoke).mockRejectedValue(error);
			await expect(api.getOutputDirectoryPath()).rejects.toThrow(error);
		});

		it("propagates non-Error rejection", async () => {
			const error = "string error";
			vi.mocked(ipcRenderer.invoke).mockRejectedValue(error);
			await expect(api.getOutputDirectoryPath()).rejects.toBe(error);
		});

		it("works when destructured", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValueOnce({} as any);
			const { getOutputDirectoryPath } = api;
			await getOutputDirectoryPath();
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY,
			);
		});
	});
});
