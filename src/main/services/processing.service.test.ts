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

import path from "node:path";
import { getGlobalSettings, getTrackSettings } from "@main/lib/ffmpeg";
import { isDirectory } from "@main/lib/utils";
import PQueue from "p-queue";
import { ProcessManager } from "./ffmpeg/processManager";
import { TwoPassProcessManager } from "./ffmpeg/twoPassProcessManager";
import {
	processingState,
	startProcessing,
	stopProcessing,
} from "./processing.service";

vi.mock("p-queue", () => ({ default: vi.fn() }));
vi.mock("./ffmpeg/twoPassProcessManager", () => ({
	TwoPassProcessManager: vi.fn(),
}));
vi.mock("./ffmpeg/processManager", () => ({
	ProcessManager: vi.fn(),
}));
vi.mock("@main/lib/ffmpeg", () => ({
	getGlobalSettings: vi.fn(() => ["-y"]),
	getTrackSettings: vi.fn(() => []),
}));
vi.mock("@main/lib/utils", () => ({
	isDirectory: vi.fn(async () => true),
	getTrackTitle: vi.fn((artist, title) => `${artist} - ${title}`),
}));

describe("processing.service", () => {
	const mockEvent = { sender: { send: vi.fn() } } as any;
	let mockQueue: any;
	let mockProcessManager: any;
	let mockTwoPassProcessManager: any;
	const activeProcesses: any[] = [];
	const twoPassArgs = {
		audioFilter: "loudnorm",
		filterOptions: {
			linear: true,
		},
	};

	function createMockTrack(overrides: Partial<any> = {}) {
		return {
			id: "track-1",
			filePath: "/input/track1.flac",
			file: "track1.mp3",
			status: "pending",
			common: { artist: "Artist", title: "Title" },
			...overrides,
		};
	}

	const createMockData = (tracks: any[], audioSettings: any = {}) => {
		return {
			tracks,
			settings: {
				global: {
					outputDirectoryPath: "/output",
					concurrency: 2,
				},
				audio: {
					filterOptions: {},
					...audioSettings,
				},
			},
		};
	};

	beforeEach(() => {
		vi.resetAllMocks();
		activeProcesses.length = 0;

		mockQueue = {
			add: vi.fn().mockImplementation(async (fn: any) => {
				await fn();
			}),
			onIdle: vi.fn(() => Promise.resolve()),
		};
		// biome-ignore-start lint/complexity/useArrowFunction: arrow functions do not have the internal [[Construct]] method
		vi.mocked(PQueue).mockImplementation(function () {
			return mockQueue;
		});

		mockProcessManager = {
			run: vi.fn().mockResolvedValue(undefined),
			kill: vi.fn(),
		};
		vi.mocked(ProcessManager).mockImplementation(function (this: any) {
			this.run = mockProcessManager.run;
			this.kill = mockProcessManager.kill;
			activeProcesses.push(mockProcessManager);
		});

		mockTwoPassProcessManager = {
			run: vi.fn().mockResolvedValue(undefined),
			kill: vi.fn(),
		};
		vi.mocked(TwoPassProcessManager).mockImplementation(function (this: any) {
			this.run = mockTwoPassProcessManager.run;
			this.kill = mockTwoPassProcessManager.kill;
			activeProcesses.push(mockTwoPassProcessManager);
		});
		// biome-ignore-end lint/complexity/useArrowFunction: arrow functions do not have the internal [[Construct]] method

		vi.mocked(isDirectory).mockResolvedValue(true);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("startProcessing - input validation", () => {
		it("should throw early if output directory is invalid", async () => {
			vi.mocked(isDirectory).mockResolvedValueOnce(false);
			const data = createMockData([createMockTrack()]);
			await expect(startProcessing(mockEvent, data as any)).rejects.toThrow(
				"Output directory validation failed.",
			);
		});

		it("should initialize PQueue with concurrency from settings", async () => {
			const data = createMockData([createMockTrack()]);
			data.settings.global.concurrency = 5;
			await startProcessing(mockEvent, data as any);
			expect(PQueue).toHaveBeenCalledTimes(1);
			expect(PQueue).toHaveBeenCalledWith({ concurrency: 5 });
		});

		it("should extract global and track settings", async () => {
			const data = createMockData([createMockTrack()]);
			await startProcessing(mockEvent, data as any);
			expect(getGlobalSettings).toHaveBeenCalledWith(data.settings.global);
			expect(getTrackSettings).toHaveBeenCalledWith(
				expect.any(Object),
				data.settings.audio,
			);
		});
	});

	describe("startProcessing - track filtering", () => {
		it("should skip tracks where status is not 'pending'", async () => {
			const tracks = [
				createMockTrack(),
				createMockTrack({ id: "1", status: "completed " }),
				createMockTrack({ id: "2", status: "failed " }),
			];
			const data = createMockData(tracks);
			const result = await startProcessing(mockEvent, data as any);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(1);
		});

		it("should skip tracks without filePath", async () => {
			const tracks = [
				createMockTrack(),
				createMockTrack({ id: "1", filePath: null }),
			];
			const data = createMockData(tracks);
			const result = await startProcessing(mockEvent, data as any);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(1);
		});

		it("should return 0 total if all tracks are skipped", async () => {
			const tracks = [
				createMockTrack({ id: "1", status: "failed" }),
				createMockTrack({ id: "2", status: "completed" }),
			];
			const data = createMockData(tracks);
			const result = await startProcessing(mockEvent, data as any);
			expect(result.total).toBe(0);
			expect(result.successful).toBe(0);
			expect(mockProcessManager.run).not.toHaveBeenCalled();
			expect(mockEvent.sender.send).not.toHaveBeenCalled();
		});
	});

	describe("runProcessing - execution", () => {
		it("should use ProcessManager for standart filters", async () => {
			const tracks = [createMockTrack()];
			const data = createMockData(tracks, { audioFilter: "volume" });
			await startProcessing(mockEvent, data as any);
			expect(ProcessManager).toHaveBeenCalled();
			expect(TwoPassProcessManager).not.toHaveBeenCalled();
		});

		it("should use TwoProcessManager when filter is loudnorm and linear is true", async () => {
			const tracks = [createMockTrack(), createMockTrack()];
			const data = createMockData(tracks, twoPassArgs);
			await startProcessing(mockEvent, data as any);
			expect(ProcessManager).not.toHaveBeenCalled();
			expect(TwoPassProcessManager).toHaveBeenCalledTimes(2);
		});

		it("should use TwoProcessManager when filter is loudnorm and linear is not set", async () => {
			const tracks = [createMockTrack(), createMockTrack()];
			const data = createMockData(tracks, {
				audioFilter: "loudnorm",
			});
			await startProcessing(mockEvent, data as any);
			expect(ProcessManager).not.toHaveBeenCalled();
			expect(TwoPassProcessManager).toHaveBeenCalledTimes(2);
		});

		it("should use ProcessManager when filter is loudnorm and linear is false", async () => {
			const tracks = [createMockTrack()];
			const data = createMockData(tracks, {
				audioFilter: "loudnorm",
				filterOptions: { linear: false },
			});
			await startProcessing(mockEvent, data as any);
			expect(ProcessManager).toHaveBeenCalledTimes(1);
			expect(TwoPassProcessManager).not.toHaveBeenCalled();
		});

		it("should call run with correct arguments for single pass process", async () => {
			const tracks = [createMockTrack()];
			const data = createMockData(tracks);
			await startProcessing(mockEvent, data as any);
			expect(mockProcessManager.run).toHaveBeenCalledWith({
				input: "/input/track1.flac",
				output: path.join("/output", "track1.mp3"),
				globalSettings: ["-y"],
				trackSettings: [],
			});
		});

		it("should call run with correct arguments for two pass process", async () => {
			const tracks = [createMockTrack()];
			const data = createMockData(tracks, twoPassArgs);
			await startProcessing(mockEvent, data as any);
			expect(mockTwoPassProcessManager.run).toHaveBeenCalledWith({
				input: "/input/track1.flac",
				output: path.join("/output", "track1.mp3"),
				globalSettings: ["-y"],
				trackSettings: [],
				filterOptions: {
					linear: true,
				},
				signal: expect.any(AbortSignal),
			});
		});
	});

	describe("runProcessing - events", () => {
		it("should emit processing and completed events on success", async () => {
			const tracks = [createMockTrack()];
			const data = createMockData(tracks, twoPassArgs);
			await startProcessing(mockEvent, data as any);
			expect(mockEvent.sender.send).toHaveBeenCalledWith("processing-result", {
				id: "track-1",
				status: "processing",
			});
			expect(mockEvent.sender.send).toHaveBeenCalledWith("processing-result", {
				id: "track-1",
				status: "completed",
			});
		});

		it("should handle failure and emit failed event", async () => {
			mockProcessManager.run.mockImplementation(() =>
				Promise.reject(new Error("FFmpeg crashed")),
			);
			const tracks = [createMockTrack()];
			const data = createMockData(tracks);
			const result = await startProcessing(mockEvent, data as any);
			expect(mockEvent.sender.send).toHaveBeenCalledWith("processing-result", {
				id: "track-1",
				status: "failed",
				message: "FFmpeg crashed",
			});
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0]).toStrictEqual({
				id: "track-1",
				title: "Artist - Title",
				reason: "FFmpeg crashed",
			});
		});

		it("should handle failure and emit failed event with non-Error string", async () => {
			mockProcessManager.run.mockImplementation(() =>
				Promise.reject("FFmpeg crashed"),
			);
			const tracks = [createMockTrack()];
			const data = createMockData(tracks);
			const result = await startProcessing(mockEvent, data as any);
			expect(mockEvent.sender.send).toHaveBeenCalledWith("processing-result", {
				id: "track-1",
				status: "failed",
				message: "FFmpeg crashed",
			});
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0]).toStrictEqual({
				id: "track-1",
				title: "Artist - Title",
				reason: "FFmpeg crashed",
			});
		});

		it("should process multiple tracks independently", async () => {
			const tracks = [
				createMockTrack({ id: "0", file: "0.mp3" }),
				createMockTrack({ id: "1", file: "1.mp3" }),
				createMockTrack({ id: "2", file: "2.mp3" }),
			];
			const data = createMockData(tracks);
			mockProcessManager.run.mockImplementation((track) => {
				if (track?.output === "/output/2.mp3") {
					return Promise.reject(new Error("FFmpeg crashed"));
				}
				return Promise.resolve(undefined);
			});
			const result = await startProcessing(mockEvent, data as any);
			expect(result.total).toBe(3);
			expect(result.successful).toBe(2);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0]).toStrictEqual({
				id: "2",
				title: "Artist - Title",
				reason: "FFmpeg crashed",
			});
		});
	});
});

describe("stopProcessing", () => {
	const mockEvent = { sender: { send: vi.fn() } } as any;

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		processingState.activeProcesses.clear();
		processingState.abortController = null;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const flush = async () => {
		await vi.advanceTimersByTimeAsync(100);
	};

	describe("AbortController", () => {
		it("aborts the abortController and clears the reference when one exists", async () => {
			const controller = new AbortController();
			const abortSpy = vi.spyOn(controller, "abort");
			processingState.abortController = controller;
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			expect(abortSpy).toHaveBeenCalledOnce();
			expect(controller.signal.aborted).toBe(true);
			expect(processingState.abortController).toBeNull();
		});

		it("does not throw when there is no abortController", async () => {
			processingState.abortController = null;
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			expect(processingState.abortController).toBeNull();
			expect(mockEvent.sender.send).toHaveBeenLastCalledWith(
				"response-on-stop",
				{
					success: true,
				},
			);
		});

		it("does not call abort on a controller that was already cleared", async () => {
			processingState.abortController = null;
			const controller = new AbortController();
			const abortSpy = vi.spyOn(controller, "abort");
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			expect(abortSpy).not.toHaveBeenCalled();
		});
	});

	describe("activeProcesses", () => {
		it("kills every active precess with SIGINT and removes it from the map", async () => {
			const procs = Array.from({ length: 5 }, () => ({ kill: vi.fn() }) as any);
			procs.forEach((p, i) => {
				processingState.activeProcesses.set(`track-${i}`, p);
			});
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			for (const p of procs) {
				expect(p.kill).toHaveBeenCalledWith("SIGINT");
			}
			expect(processingState.activeProcesses.size).toBe(0);
		});

		it("handles an empty activeProcesses map without errors", async () => {
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			expect(processingState.activeProcesses.size).toBe(0);
			expect(mockEvent.sender.send).toHaveBeenCalledTimes(1);
		});

		it("kills each process exactly once (no double kills)", async () => {
			const procs = Array.from({ length: 5 }, () => ({ kill: vi.fn() }) as any);
			procs.forEach((p, i) => {
				processingState.activeProcesses.set(`track-${i}`, p);
			});
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			for (const p of procs) {
				expect(p.kill).toHaveBeenCalledOnce();
				expect(p.kill).toHaveBeenCalledWith("SIGINT");
			}
			expect(processingState.activeProcesses.size).toBe(0);
		});

		it("still kills remaining processes if one process's kill throws", async () => {
			const throwing = {
				kill: vi.fn(() => {
					throw new Error("Error");
				}),
			} as any;
			const ok = { kill: vi.fn() } as any;
			processingState.activeProcesses.set("track-1", throwing);
			processingState.activeProcesses.set("track-2", ok);
			const promise = stopProcessing(mockEvent);
			promise.catch(() => {});
			await expect(promise).rejects.toThrow("Error");
			expect(throwing.kill).toHaveBeenCalledWith("SIGINT");
			expect(ok.kill).not.toHaveBeenCalled();
			expect(mockEvent.sender.send).not.toHaveBeenCalled();
			expect(processingState.activeProcesses.size).toBe(2);
		});
	});

	describe("timing/order", () => {
		it("waits 100ms before sending response", async () => {
			const promise = stopProcessing(mockEvent);
			await vi.advanceTimersByTimeAsync(99);
			expect(mockEvent.sender.send).not.toHaveBeenCalled();
			await flush();
			await vi.advanceTimersByTimeAsync(1);
			await promise;
			expect(mockEvent.sender.send).toHaveBeenCalledTimes(1);
			expect(mockEvent.sender.send).toHaveBeenCalledWith("response-on-stop", {
				success: true,
			});
		});

		it("aborts the controller before killing processes", async () => {
			const callOrder: string[] = [];
			const controller = new AbortController();
			vi.spyOn(controller, "abort").mockImplementationOnce(() => {
				callOrder.push("abort");
			});
			processingState.abortController = controller;
			const proc = {
				kill: vi.fn(() => callOrder.push("kill")),
			} as any;
			processingState.activeProcesses.set("track-1", proc);
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			expect(callOrder).toEqual(["abort", "kill"]);
		});
	});

	describe("ipc response/reuse", () => {
		it("sends response-on-stop with success: true exactly once", async () => {
			const controller = new AbortController();
			processingState.abortController = controller;
			const proc = {
				kill: vi.fn(),
			} as any;
			processingState.activeProcesses.set("track-1", proc);
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			expect(mockEvent.sender.send).toHaveBeenCalledTimes(1);
			expect(mockEvent.sender.send).toHaveBeenCalledWith("response-on-stop", {
				success: true,
			});
		});

		it("reports success: true when there was nothing to stop", async () => {
			const promise = stopProcessing(mockEvent);
			await flush();
			await promise;
			expect(mockEvent.sender.send).toHaveBeenCalledTimes(1);
			expect(mockEvent.sender.send).toHaveBeenCalledWith("response-on-stop", {
				success: true,
			});
		});

		it("can be called multiple times in sequence without errors", async () => {
			const first = stopProcessing(mockEvent);
			await flush();
			await first;
			const second = stopProcessing(mockEvent);
			await flush();
			await second;
			expect(mockEvent.sender.send).toHaveBeenCalledTimes(2);
			expect(mockEvent.sender.send).toHaveBeenNthCalledWith(
				2,
				"response-on-stop",
				{
					success: true,
				},
			);
		});

		it("can be called multiple times in sequence without errors", async () => {
			const first = stopProcessing(mockEvent);
			await flush();
			await first;
			const second = stopProcessing(mockEvent);
			await flush();
			await second;
			expect(mockEvent.sender.send).toHaveBeenCalledTimes(2);
			expect(mockEvent.sender.send).toHaveBeenNthCalledWith(
				2,
				"response-on-stop",
				{
					success: true,
				},
			);
		});
	});
});
