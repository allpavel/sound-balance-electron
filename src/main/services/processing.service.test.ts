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

import { getGlobalSettings, getTrackSettings } from "@main/lib/ffmpeg";
import { isDirectory } from "@main/lib/utils";
import PQueue from "p-queue";
import { ProcessManager } from "./ffmpeg/processManager";
import { TwoPassProcessManager } from "./ffmpeg/twoPassProcessManager";
import { startProcessing } from "./processing.service";

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
			add: vi.fn(),
			onIdle: vi.fn(() => Promise.resolve()),
		};
		// biome-ignore-start lint/complexity/useArrowFunction: arrow functions do not have the internal [[Construct]] method
		vi.mocked(PQueue).mockImplementation(function () {
			return mockQueue;
		});

		mockProcessManager = {
			run: vi.fn().mockRejectedValue(undefined),
			kill: vi.fn(),
		};
		vi.mocked(ProcessManager).mockImplementation(function () {
			activeProcesses.push(mockProcessManager);
			return mockProcessManager;
		});

		mockTwoPassProcessManager = {
			run: vi.fn().mockRejectedValue(undefined),
			kill: vi.fn(),
		};
		vi.mocked(TwoPassProcessManager).mockImplementation(function () {
			activeProcesses.push(mockTwoPassProcessManager);
			return mockTwoPassProcessManager;
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
			mockQueue.add.mockImplementation(async (fn: any) => {
				await fn();
			});
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
			mockQueue.add.mockImplementation(async (fn: any) => {
				await fn();
			});
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
			mockQueue.add.mockImplementation(async (fn: any) => {
				await fn();
			});
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
			mockQueue.add.mockImplementation(async (fn: any) => {
				await fn();
			});
			const result = await startProcessing(mockEvent, data as any);
			expect(result.total).toBe(0);
			expect(result.successful).toBe(0);
			expect(mockProcessManager.run).not.toHaveBeenCalled();
			expect(mockEvent.sender.send).not.toHaveBeenCalled();
		});
	});
});
