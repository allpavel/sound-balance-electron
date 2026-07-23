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
import {
	getOutputDirectoryPath,
	showDialog as selectAudioFiles,
} from "@main/services/dialogs.service";
import { parseMetadata } from "@main/services/metadata.service";
import {
	startProcessing,
	stopProcessing,
} from "@main/services/processing.service";
import { openOutputFolder } from "@main/services/shell.service";
import { ipcMain } from "electron";
import { registerIpcHandlers } from "./handlers";

vi.mock("@main/services/dialogs.service", () => ({
	showDialog: vi.fn(),
	getOutputDirectoryPath: vi.fn(),
}));

vi.mock("@main/services/metadata.service", () => ({
	parseMetadata: vi.fn(),
}));

vi.mock("@main/services/processing.service", () => ({
	startProcessing: vi.fn(),
	stopProcessing: vi.fn(),
}));

vi.mock("@main/services/shell.service", () => ({
	openOutputFolder: vi.fn(),
}));

vi.mock("@main/constants", () => ({
	INVOKE_CHANNELS: {
		SHOW_DIALOG: "showDialog",
		GET_OUTPUT_DIRECTORY: "getOutputDirectoryPath",
		START_PROCESSING: "startProcessing",
		STOP_PROCESSING: "stopProcessing",
		OPEN_OUTPUT_FOLDER: "openOutputFolder",
	},
}));

describe("handlers", () => {
	const mockIpcMainHandle = vi.mocked(ipcMain.handle);
	const mockSelectAudioFiles = vi.mocked(selectAudioFiles);
	const mockParseMetadata = vi.mocked(parseMetadata);
	const mockGetOutputDirectoryPath = vi.mocked(getOutputDirectoryPath);
	const mockStartProcessing = vi.mocked(startProcessing);
	const mockStopProcessing = vi.mocked(stopProcessing);
	const mockOpenOutputFolder = vi.mocked(openOutputFolder);
	const handlers = {} as any;

	beforeEach(() => {
		vi.resetAllMocks();
		for (const key of Object.keys(handlers)) delete handlers[key];

		mockIpcMainHandle.mockImplementation(
			(channel: string, fn: (...args: any[]) => any) => {
				handlers[channel] = fn;
			},
		);

		registerIpcHandlers();
	});

	describe("registerIpcHandlers", () => {
		it("should call ipcMain.handle exactly 5 times", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledTimes(5);
		});

		it("should register SHOW_DIALOG handler", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.SHOW_DIALOG,
				expect.any(Function),
			);
		});

		it("should register GET_OUTPUT_DIRECTORY handler", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY,
				expect.any(Function),
			);
		});

		it("should register START_PROCESSING handler", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.START_PROCESSING,
				expect.any(Function),
			);
		});

		it("should register STOP_PROCESSING handler", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.STOP_PROCESSING,
				expect.any(Function),
			);
		});

		it("should register OPEN_OUTPUT_FOLDER handler", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.OPEN_OUTPUT_FOLDER,
				expect.any(Function),
			);
		});

		it("should register each handler exactly once", () => {
			const calls = mockIpcMainHandle.mock.calls.map((i) => i[0]);
			const unique = new Set(calls);
			expect(unique.size).toBe(calls.length);
		});

		it("should be idempotent across multiple invocations", () => {
			mockIpcMainHandle.mockReset();
			registerIpcHandlers();
			registerIpcHandlers();
			expect(mockIpcMainHandle).toHaveBeenCalledTimes(10);
		});
	});

	describe("SHOW_DIALOG handler", () => {
		const invoke = (...args: any[]) =>
			handlers[INVOKE_CHANNELS.SHOW_DIALOG](...args);

		it("calls selectAudioFiles once with no arguments", async () => {
			mockSelectAudioFiles.mockResolvedValueOnce([]);
			await invoke();
			expect(mockSelectAudioFiles).toHaveBeenCalledTimes(1);
			expect(mockSelectAudioFiles).toHaveBeenCalledWith();
		});

		it("returns [] when selectAudioFiles return empty array", async () => {
			mockSelectAudioFiles.mockResolvedValueOnce([]);
			const result = await invoke();
			expect(result).toEqual([]);
		});

		it("does not call parseMetadata when no file paths are returned", async () => {
			mockSelectAudioFiles.mockResolvedValueOnce([]);
			await invoke();
			expect(mockParseMetadata).not.toHaveBeenCalled();
		});

		it("calls parseMetadata with returned file paths", async () => {
			const paths = ["/music/song1.mp3", "/music/song2.mp3"];
			const parsed = [{ id: "1" }, { id: "2" }];
			mockSelectAudioFiles.mockResolvedValueOnce(paths);
			mockParseMetadata.mockResolvedValueOnce(parsed as any);
			await invoke();
			expect(mockParseMetadata).toHaveBeenCalledTimes(1);
			expect(mockParseMetadata).toHaveBeenCalledWith(paths);
		});

		it("returns the result of parseMetadata", async () => {
			const paths = ["/music/song1.mp3", "/music/song2.mp3"];
			const parsed = [{ id: "1" }, { id: "2" }];
			mockSelectAudioFiles.mockResolvedValueOnce(paths);
			mockParseMetadata.mockResolvedValueOnce(parsed as any);
			const result = await invoke();
			expect(result).toEqual(parsed);
		});

		it("forwards ipcMain event as first argument when provided", async () => {
			const event = { sender: { send: vi.fn() } } as any;
			mockSelectAudioFiles.mockResolvedValueOnce(["/track1.mp3"]);
			mockParseMetadata.mockResolvedValueOnce([]);
			await invoke(event);
			expect(mockSelectAudioFiles).toHaveBeenCalledWith();
		});

		it("propagates error from selectAudioFiles", async () => {
			const error = new Error("Unexpected error");
			mockSelectAudioFiles.mockRejectedValueOnce(error);
			await expect(invoke()).rejects.toThrow(error);
			expect(mockParseMetadata).not.toHaveBeenCalled();
		});

		it("propagates error from parseMetadata", async () => {
			const error = new Error("Unexpected error");
			mockSelectAudioFiles.mockResolvedValueOnce(["/bad.mp3"]);
			mockParseMetadata.mockRejectedValueOnce(error);
			await expect(invoke()).rejects.toThrow(error);
		});

		it("propagates non-Error from selectAudioFiles", async () => {
			const error = "Unexpected error";
			mockSelectAudioFiles.mockRejectedValueOnce(error);
			await expect(invoke()).rejects.toBe(error);
			expect(mockParseMetadata).not.toHaveBeenCalled();
		});

		it("propagates error from parseMetadata", async () => {
			const error = "Unexpected error";
			mockSelectAudioFiles.mockResolvedValueOnce(["/bad.mp3"]);
			mockParseMetadata.mockRejectedValueOnce(error);
			await expect(invoke()).rejects.toBe(error);
		});

		it("handles a single file path", async () => {
			const paths = ["/music/track1.mp3"];
			const parsedResult = [{ id: "1" }];
			mockSelectAudioFiles.mockResolvedValueOnce(paths);
			mockParseMetadata.mockResolvedValueOnce(parsedResult as any);
			const result = await invoke();
			expect(mockParseMetadata).toHaveBeenCalledWith(paths);
			expect(result).toEqual(parsedResult);
		});

		it("handles a multiple file paths", async () => {
			const paths = Array.from({ length: 1000 }, (_, i) => `/file${i}.mp3`);
			const parsedResult = paths.map((_, i) => ({ id: String(i) }));
			mockSelectAudioFiles.mockResolvedValueOnce(paths);
			mockParseMetadata.mockResolvedValueOnce(parsedResult as any);
			const result = await invoke();
			expect(mockParseMetadata).toHaveBeenCalledWith(paths);
			expect(result).toEqual(parsedResult);
		});

		it("handles file paths with special characters", async () => {
			const paths = ["/music/ünïcödé(1)[feat.x]&y.mp3"];
			const parsedResult = [{ id: "1" }];
			mockSelectAudioFiles.mockResolvedValueOnce(paths);
			mockParseMetadata.mockResolvedValueOnce(parsedResult as any);
			const result = await invoke();
			expect(mockParseMetadata).toHaveBeenCalledWith(paths);
			expect(result).toEqual(parsedResult);
		});

		it("handles file paths with spaces", async () => {
			const paths = ["/music/track name with spaces.mp3"];
			const parsedResult = [{ id: "1" }];
			mockSelectAudioFiles.mockResolvedValueOnce(paths);
			mockParseMetadata.mockResolvedValueOnce(parsedResult as any);
			const result = await invoke();
			expect(mockParseMetadata).toHaveBeenCalledWith(paths);
			expect(result).toEqual(parsedResult);
		});

		it("handles Windows-like file paths", async () => {
			const paths = ["C:\\Users\\Music\\track1.mp3"];
			const parsedResult = [{ id: "1" }];
			mockSelectAudioFiles.mockResolvedValueOnce(paths);
			mockParseMetadata.mockResolvedValueOnce(parsedResult as any);
			const result = await invoke();
			expect(mockParseMetadata).toHaveBeenCalledWith(paths);
			expect(result).toEqual(parsedResult);
		});

		it("returnes empty array when no paths", async () => {
			const paths = [];
			mockSelectAudioFiles.mockResolvedValueOnce(paths);
			const result = await invoke();
			expect(result).toEqual([]);
		});
	});

	describe("GET_OUTPUT_DIRECTORY handler", () => {
		const invoke = (...args: any[]) =>
			handlers[INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY](...args);

		it("calls getOutputDirectoryPath and returns its result", async () => {
			const mockResult = { canceled: false, filePaths: ["/music"] };
			mockGetOutputDirectoryPath.mockResolvedValueOnce(mockResult);
			const result = await invoke();
			expect(mockGetOutputDirectoryPath).toHaveBeenCalledTimes(1);
			expect(mockGetOutputDirectoryPath).toHaveBeenCalledWith();
			expect(result).toEqual(mockResult);
		});

		it("forwards multiple arguments to getOutputDirectoryPath", async () => {
			const mockResult = { canceled: false, filePaths: ["/music"] };
			const event = {} as any;
			const extraArg = "/some/path";
			mockGetOutputDirectoryPath.mockResolvedValueOnce(mockResult);
			await invoke(event, extraArg);
			expect(mockGetOutputDirectoryPath).toHaveBeenCalledWith(event, extraArg);
		});

		it("propagates error from getOutputDirectoryPath", async () => {
			const error = new Error("Unexpected error");
			mockGetOutputDirectoryPath.mockRejectedValueOnce(error);
			await expect(invoke()).rejects.toThrow(error);
		});

		it("propagates non-Error from getOutputDirectoryPath", async () => {
			const error = "Unexpected error";
			mockGetOutputDirectoryPath.mockRejectedValueOnce(error);
			await expect(invoke()).rejects.toBe(error);
		});

		it("returns undefined when getOutputDirectoryPath returns undefined", async () => {
			mockGetOutputDirectoryPath.mockResolvedValueOnce(undefined as any);
			const result = await invoke();
			expect(result).toBeUndefined();
		});
	});

	describe("OPEN_OUTPUT_DIRECTORY handler", () => {
		const invoke = (...args: any[]) =>
			handlers[INVOKE_CHANNELS.OPEN_OUTPUT_FOLDER](...args);

		it("calls openOutputDirectory and returns its result", async () => {
			const mockResult = { success: true, reason: "" };
			const folderPath = "/output";
			mockOpenOutputFolder.mockResolvedValueOnce(mockResult);
			const result = await invoke(folderPath);
			expect(mockOpenOutputFolder).toHaveBeenCalledTimes(1);
			expect(mockOpenOutputFolder).toHaveBeenCalledWith(folderPath);
			expect(result).toEqual(mockResult);
		});

		it("returns failure result when folder does not exist", async () => {
			const mockResult = { success: false, reason: "Folder does not exist" };
			const folderPath = "/output";
			mockOpenOutputFolder.mockResolvedValueOnce(mockResult);
			const result = await invoke(folderPath);
			expect(result).toEqual(mockResult);
		});

		it("propagates errors from openOutputFolder", async () => {
			const error = new Error("Unexpected error");
			mockOpenOutputFolder.mockRejectedValueOnce(error);
			await expect(invoke("/folder")).rejects.toThrow("Unexpected error");
		});
	});

	describe("START_PROCESSING handler", () => {
		const invoke = (...args: any[]) =>
			handlers[INVOKE_CHANNELS.START_PROCESSING](...args);

		it("calls startProcessing and returns its result", async () => {
			const mockResult = { successful: 5, failed: [], total: 5 };
			const data = {
				tracks: [],
				settings: { global: {}, audio: {} },
			};
			mockStartProcessing.mockResolvedValueOnce(mockResult);
			const result = await invoke(data);
			expect(mockStartProcessing).toHaveBeenCalledTimes(1);
			expect(mockStartProcessing).toHaveBeenCalledWith(data);
			expect(result).toEqual(mockResult);
		});

		it("propagates error when output folder validation failed", async () => {
			const error = new Error("Output directory validation failed");
			mockStartProcessing.mockRejectedValueOnce(error);
			await expect(invoke({} as any)).rejects.toThrow(error);
		});

		it("propagates non-Error rejection values", async () => {
			const error = { code: 500 };
			mockStartProcessing.mockRejectedValueOnce(error);
			await expect(invoke({} as any)).rejects.toThrow(error);
		});

		it("returns the failed array from startProcessing", async () => {
			const failed = [{ id: "1", title: "A - B", reason: "FFmpeg error" }];
			mockStartProcessing.mockResolvedValue({
				successful: 0,
				failed,
				total: 1,
			});
			const result = await invoke({} as any, {} as any);
			expect(result.failed).toEqual(failed);
		});

		it("forwards extra arguments beyond event and data", async () => {
			const event = {} as any;
			const data = {} as any;
			const extra = "extra-arg";
			mockStartProcessing.mockResolvedValue({} as any);
			await invoke(event, data, extra);
			expect(mockStartProcessing).toHaveBeenCalledWith(event, data, extra);
		});
	});

	describe("STOP_PROCESSING handler", () => {
		const invoke = (...args: any[]) =>
			handlers[INVOKE_CHANNELS.STOP_PROCESSING](...args);

		it("calls stopProcessing and returns its result", async () => {
			mockStopProcessing.mockResolvedValue(undefined);
			const event = { sender: { send: vi.fn() } } as any;
			const result = await invoke(event);
			expect(mockStopProcessing).toHaveBeenCalledTimes(1);
			expect(mockStopProcessing).toHaveBeenCalledWith(event);
			expect(result).toBeUndefined();
		});

		it("forwards event to stopProcessing", async () => {
			const event = { sender: { send: vi.fn() } } as any;
			mockStopProcessing.mockResolvedValue(undefined);
			await invoke(event);
			expect(mockStopProcessing).toHaveBeenCalledWith(event);
		});

		it("propagates errors from stopProcessing", async () => {
			const err = new Error("Kill error");
			mockStopProcessing.mockRejectedValue(err);
			await expect(invoke({} as any)).rejects.toThrow("Kill error");
		});

		it("propagates non-Error rejection values", async () => {
			mockStopProcessing.mockRejectedValue(42);
			await expect(invoke({} as any)).rejects.toBe(42);
		});

		it("handles being called with no arguments", async () => {
			mockStopProcessing.mockResolvedValue(undefined);
			await expect(invoke()).resolves.toBeUndefined();
			expect(mockStopProcessing).toHaveBeenCalledWith();
		});

		it("can be invoked multiple times in sequence", async () => {
			mockStopProcessing.mockResolvedValue(undefined);
			await invoke({} as any);
			await invoke({} as any);
			await invoke({} as any);
			expect(mockStopProcessing).toHaveBeenCalledTimes(3);
		});
	});

	describe("handler isolation", () => {
		it("does not call unrelated services when invoking SHOW_DIALOG", async () => {
			mockSelectAudioFiles.mockResolvedValue([]);
			await handlers[INVOKE_CHANNELS.SHOW_DIALOG]();
			expect(mockGetOutputDirectoryPath).not.toHaveBeenCalled();
			expect(mockStartProcessing).not.toHaveBeenCalled();
			expect(mockStopProcessing).not.toHaveBeenCalled();
			expect(mockOpenOutputFolder).not.toHaveBeenCalled();
		});

		it("does not call unrelated services when invoking GET_OUTPUT_DIRECTORY", async () => {
			mockGetOutputDirectoryPath.mockResolvedValue({
				canceled: false,
				filePaths: [],
			});
			await handlers[INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY]({} as any);
			expect(mockSelectAudioFiles).not.toHaveBeenCalled();
			expect(mockParseMetadata).not.toHaveBeenCalled();
			expect(mockStartProcessing).not.toHaveBeenCalled();
			expect(mockStopProcessing).not.toHaveBeenCalled();
			expect(mockOpenOutputFolder).not.toHaveBeenCalled();
		});

		it("does not call unrelated services when invoking START_PROCESSING", async () => {
			mockStartProcessing.mockResolvedValue({
				successful: 0,
				failed: [],
				total: 0,
			});
			await handlers[INVOKE_CHANNELS.START_PROCESSING]({} as any, {} as any);
			expect(mockSelectAudioFiles).not.toHaveBeenCalled();
			expect(mockParseMetadata).not.toHaveBeenCalled();
			expect(mockGetOutputDirectoryPath).not.toHaveBeenCalled();
			expect(mockStopProcessing).not.toHaveBeenCalled();
			expect(mockOpenOutputFolder).not.toHaveBeenCalled();
		});

		it("does not call unrelated services when invoking STOP_PROCESSING", async () => {
			mockStopProcessing.mockResolvedValue(undefined);
			await handlers[INVOKE_CHANNELS.STOP_PROCESSING]({} as any);
			expect(mockSelectAudioFiles).not.toHaveBeenCalled();
			expect(mockParseMetadata).not.toHaveBeenCalled();
			expect(mockGetOutputDirectoryPath).not.toHaveBeenCalled();
			expect(mockStartProcessing).not.toHaveBeenCalled();
			expect(mockOpenOutputFolder).not.toHaveBeenCalled();
		});

		it("does not call unrelated services when invoking OPEN_OUTPUT_FOLDER", async () => {
			mockOpenOutputFolder.mockResolvedValue({ success: true, reason: "" });
			await handlers[INVOKE_CHANNELS.OPEN_OUTPUT_FOLDER]({} as any, "/x");
			expect(mockSelectAudioFiles).not.toHaveBeenCalled();
			expect(mockParseMetadata).not.toHaveBeenCalled();
			expect(mockGetOutputDirectoryPath).not.toHaveBeenCalled();
			expect(mockStartProcessing).not.toHaveBeenCalled();
			expect(mockStopProcessing).not.toHaveBeenCalled();
		});
	});

	describe("handler function references", () => {
		it("passes the same function reference for GET_OUTPUT_DIRECTORY", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.GET_OUTPUT_DIRECTORY,
				getOutputDirectoryPath,
			);
		});

		it("passes the same function reference for OPEN_OUTPUT_FOLDER", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.OPEN_OUTPUT_FOLDER,
				openOutputFolder,
			);
		});

		it("passes the same function reference for START_PROCESSING", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.START_PROCESSING,
				startProcessing,
			);
		});

		it("passes the same function reference for STOP_PROCESSING", () => {
			expect(mockIpcMainHandle).toHaveBeenCalledWith(
				INVOKE_CHANNELS.STOP_PROCESSING,
				stopProcessing,
			);
		});

		it("passes a new wrapper function (not selectAudioFiles) for SHOW_DIALOG", () => {
			const calls = mockIpcMainHandle.mock.calls.filter(
				(c) => c[0] === "showDialog",
			);
			expect(calls).toHaveLength(1);
			expect(calls[0][1]).not.toBe(selectAudioFiles);
			expect(typeof calls[0][1]).toBe("function");
		});
	});
});
