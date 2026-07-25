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
import { EVENT_CHANNELS, INVOKE_CHANNELS } from "@main/constants";
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
		it("exposes exactly the expected 8 methods", () => {
			expect(Object.keys(api).sort()).toEqual([
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
	});

	describe("IPC Invoke routing", () => {
		beforeEach(() => {
			vi.mocked(ipcRenderer.invoke).mockReset();
		});

		it("showDialog routes to SHOW_DIALOG and resolves", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValue([]);
			await api.showDialog();
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.SHOW_DIALOG,
			);
		});

		it("getOutputDirectoryPath routes to GET_OUTPUT_DIRECTORY", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValue({
				canceled: false,
				filePaths: [],
			});
			await api.getOutputDirectoryPath();
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY,
			);
		});

		it("startProcessing routes to START_PROCESSING and forwards data payload", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValue({
				total: 0,
				successful: 0,
				failed: [],
			});
			const data = { tracks: [], settings: {} };
			await api.startProcessing(data);
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.START_PROCESSING,
				data,
			);
		});

		it("stopProcessing routes to STOP_PROCESSING", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValue(undefined);
			await api.stopProcessing();
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.STOP_PROCESSING,
			);
		});

		it("openOutputFolder routes to OPEN_OUTPUT_FOLDER and forwards path", async () => {
			vi.mocked(ipcRenderer.invoke).mockResolvedValue({
				success: true,
				reason: "",
			});
			const path = "/output";
			await api.openOutputFolder(path);
			expect(ipcRenderer.invoke).toHaveBeenCalledWith(
				INVOKE_CHANNELS.OPEN_OUTPUT_FOLDER,
				path,
			);
		});

		it("propagates rejections from ipcRenderer.invoke", async () => {
			vi.mocked(ipcRenderer.invoke).mockRejectedValue(new Error("IPC failed"));
			await expect(api.showDialog()).rejects.toThrow("IPC failed");
		});
	});

	describe("IPC Event routing", () => {
		describe("responseOnStart mechanics", () => {
			it("registers on RESPONSE_ON_START, strips event, passes payload to callback", () => {
				const cb = vi.fn();
				api.responseOnStart(cb);
				expect(ipcRenderer.on).toHaveBeenCalledWith(
					EVENT_CHANNELS.RESPONSE_ON_START,
					expect.any(Function),
				);

				const handler = vi.mocked(ipcRenderer.on).mock.calls[0][1];
				const mockEvent = { sender: {} };
				const mockMsg = "started";

				handler(mockEvent as any, mockMsg);
				expect(cb).toHaveBeenCalledWith(mockMsg);
				expect(cb).not.toHaveBeenCalledWith(mockEvent, mockMsg);
			});

			it("returns a cleanup function that removes the specific channel listener", () => {
				const cleanup = api.responseOnStart(vi.fn());
				expect(typeof cleanup).toBe("function");

				cleanup();
				expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith(
					EVENT_CHANNELS.RESPONSE_ON_START,
				);
			});
		});

		it("responseOnStop registers on RESPONSE_ON_STOP", () => {
			api.responseOnStop(vi.fn());
			expect(ipcRenderer.on).toHaveBeenCalledWith(
				EVENT_CHANNELS.RESPONSE_ON_STOP,
				expect.any(Function),
			);
		});

		it("processingResult registers on PROCESSING_RESULT", () => {
			api.processingResult(vi.fn());
			expect(ipcRenderer.on).toHaveBeenCalledWith(
				EVENT_CHANNELS.PROCESSING_RESULT,
				expect.any(Function),
			);
		});
	});

	describe("contextBridge exposure (contextIsolated = true)", () => {
		it("calls exposeInMainWorld with 'api' key and the api object", () => {
			expect(exposeCalls).toHaveLength(1);
			expect(exposeCalls[0][0]).toBe("api");
			expect(exposeCalls[0][1]).toBe(api);
		});

		it("wraps contextBridge errors with 'Preload script failed:'", async () => {
			vi.resetModules();
			vi.mocked(contextBridge.exposeInMainWorld).mockImplementationOnce(() => {
				throw new Error("Bridge error");
			});
			await expect(import("./index")).rejects.toThrow(
				"Preload script failed: Bridge error",
			);
		});
	});

	describe("non-contextIsolated branch", () => {
		let originalWindow: any;

		beforeEach(async () => {
			vi.resetModules();
			originalWindow = (global as any).window;
			(global as any).window = {};
			Object.defineProperty(process, "contextIsolated", {
				value: false,
				configurable: true,
			});
		});

		afterEach(() => {
			if (originalWindow === undefined) delete (global as any).window;
			else (global as any).window = originalWindow;
			Object.defineProperty(process, "contextIsolated", {
				value: true,
				configurable: true,
			});
		});

		it("assigns electronAPI and api to global window object", async () => {
			await import("./index");
			expect((global as any).window.electron).toEqual({ _isElectronAPI: true });
			expect((global as any).window.api).toBeTypeOf("object");
			expect((global as any).window.api.showDialog).toBeTypeOf("function");
		});

		it("does not call contextBridge.exposeInMainWorld", async () => {
			await import("./index");
			expect(contextBridge.exposeInMainWorld).not.toHaveBeenCalled();
		});
	});
});
