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

import { stat } from "node:fs/promises";
import path from "node:path";
import { isDirectory } from "@main/lib/utils";
import type { Data } from "@shared/schemas/data.schema";
import {
	getValidData,
	makeTrack,
	resetFactorySequences,
} from "@shared/utils/factories";
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

const STRUCTURAL_ERROR_PREFIX = "Processing payload validation failed";
const SETTINGS_ERROR_PREFIX =
	"Processing payload validation failed — settings are invalid";
const OUTPUT_DIR_ERROR = "Output directory validation failed.";
const SKIPPED_TRACK_TITLE = "Skipped (corrupted track data)";
const TRACK_VALIDATION_REASON_PREFIX = "Track validation failed:";

async function expectStartProcessingRejects(
	event: any,
	data: Data,
	messageSubstring: string,
): Promise<void> {
	await expect(startProcessing(event, data)).rejects.toThrow(messageSubstring);
}

function expectSkippedTrackEntry(
	entry: { id: string; title: string; reason: string },
	expectedId: string,
): void {
	expect(entry.id).toBe(expectedId);
	expect(entry.title).toBe(SKIPPED_TRACK_TITLE);
	expect(entry.reason).toContain(TRACK_VALIDATION_REASON_PREFIX);
}

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

	beforeEach(() => {
		vi.resetAllMocks();
		activeProcesses.length = 0;
		resetFactorySequences();

		vi.mocked(stat).mockResolvedValue({
			isFile: () => true,
			isDirectory: () => false,
		} as any);

		const pendingTasks: Promise<unknown>[] = [];
		mockQueue = {
			add: vi.fn().mockImplementation((fn: any) => {
				const result = fn();
				pendingTasks.push(result);
				return result;
			}),
			onIdle: vi.fn(() => Promise.all(pendingTasks)),
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

	describe("startProcessing - structural validation", () => {
		it("rejects null payload", async () => {
			await expectStartProcessingRejects(
				mockEvent,
				null as any,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects undefined payload", async () => {
			await expectStartProcessingRejects(
				mockEvent,
				undefined as any,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects string payload", async () => {
			await expectStartProcessingRejects(
				mockEvent,
				"not-an-object" as any,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects numeric payload", async () => {
			await expectStartProcessingRejects(
				mockEvent,
				42 as any,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects array payload", async () => {
			await expectStartProcessingRejects(
				mockEvent,
				[makeTrack()] as any,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects boolean payload", async () => {
			await expectStartProcessingRejects(
				mockEvent,
				true as any,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects when tracks property is missing", async () => {
			const data = getValidData();
			delete (data as any).tracks;
			await expectStartProcessingRejects(
				mockEvent,
				data,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects when settings property is missing", async () => {
			const data = getValidData();
			delete (data as any).settings;
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		it("rejects when tracks is not an array", async () => {
			const data = getValidData();
			(data as any).tracks = "not-an-array";
			await expectStartProcessingRejects(
				mockEvent,
				data,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects when tracks is a number", async () => {
			const data = getValidData();
			(data as any).tracks = 42;
			await expectStartProcessingRejects(
				mockEvent,
				data,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects when tracks is null", async () => {
			const data = getValidData();
			(data as any).tracks = null;
			await expectStartProcessingRejects(
				mockEvent,
				data,
				STRUCTURAL_ERROR_PREFIX,
			);
		});

		it("rejects when tracks is an object instead of an array", async () => {
			const data = getValidData();
			(data as any).tracks = { 0: makeTrack() };
			await expectStartProcessingRejects(
				mockEvent,
				data,
				STRUCTURAL_ERROR_PREFIX,
			);
		});
	});

	describe("startProcessing - settings validation", () => {
		it("rejects when concurrency is out of range", async () => {
			const data = getValidData();
			data.settings.global.concurrency = 0;
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		it("rejects when concurrency exceeds maximum", async () => {
			const data = getValidData();
			data.settings.global.concurrency = 999;
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		it("rejects when outputDirectoryPath is empty", async () => {
			const data = getValidData();
			data.settings.global.outputDirectoryPath = "";
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		// [SECURITY] Null-byte rejection in outputDirectoryPath is enforced
		//            by the strict settings schema.
		it("rejects outputDirectoryPath containing null bytes", async () => {
			const data = getValidData();
			data.settings.global.outputDirectoryPath = "/music/\0output";
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		// [SECURITY] Path-traversal rejection in outputDirectoryPath is
		//            enforced by the strict settings schema.
		it("rejects outputDirectoryPath containing traversal sequences", async () => {
			const data = getValidData();
			data.settings.global.outputDirectoryPath = "/music/../../etc/passwd";
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		it("rejects when audioCodec is invalid", async () => {
			const data = getValidData();
			(data.settings.audio as any).audioCodec = "invalid_codec";
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		it("rejects when audioFilter contains shell metacharacters", async () => {
			const data = getValidData();
			(data.settings.audio as any).audioFilter = "loudnorm$(whoami)";
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		it("rejects when settings is not an object", async () => {
			const data = getValidData();
			(data as any).settings = "not-an-object";
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});

		it("rejects when settings is null", async () => {
			const data = getValidData();
			(data as any).settings = null;
			await expectStartProcessingRejects(
				mockEvent,
				data,
				SETTINGS_ERROR_PREFIX,
			);
		});
	});

	describe("startProcessing - track validation (LENIENT → skip corrupted)", () => {
		it("skips a track with invalid status and reports it in failed", async () => {
			const tracks = [makeTrack({ status: "invalid_status" } as any)];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expectSkippedTrackEntry(result.failed[0], "track-1");
		});

		it("skips a track with empty filePath and reports it in failed", async () => {
			const tracks = [makeTrack({ filePath: "" })];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expectSkippedTrackEntry(result.failed[0], "track-1");
		});

		it("skips a track with whitespace-only filePath", async () => {
			const tracks = [makeTrack({ filePath: "   " })];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expectSkippedTrackEntry(result.failed[0], "track-1");
		});

		it("skips a track with empty id", async () => {
			const tracks = [makeTrack({ id: "" })];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].id).toBe("unknown-track-at-index-0");
			expect(result.failed[0].title).toBe(SKIPPED_TRACK_TITLE);
		});

		it("skips a track with null bytes in filePath", async () => {
			const tracks = [makeTrack({ filePath: "/music/\0track.mp3" })];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expectSkippedTrackEntry(result.failed[0], "track-1");
		});

		it("skips a track with filePath exceeding 4096 characters", async () => {
			const tracks = [
				makeTrack({ filePath: `/music/${"a".repeat(4100)}.mp3` }),
			];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expectSkippedTrackEntry(result.failed[0], "track-1");
		});

		it("skips a track with missing required fields", async () => {
			const track = makeTrack();
			delete (track as any).file;
			const data = getValidData({ tracks: [track] });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expectSkippedTrackEntry(result.failed[0], "track-1");
		});

		it("skips a track with invalid selected value", async () => {
			const tracks = [makeTrack({ selected: 99 } as any)];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expectSkippedTrackEntry(result.failed[0], "track-1");
		});

		it("skips a non-object track entry", async () => {
			const data = getValidData();
			(data as any).tracks = ["not-a-track-object"];
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].id).toBe("unknown-track-at-index-0");
			expect(result.failed[0].title).toBe(SKIPPED_TRACK_TITLE);
		});

		it("skips a null track entry", async () => {
			const data = getValidData();
			(data as any).tracks = [null];
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].id).toBe("unknown-track-at-index-0");
		});

		it("skips a numeric track entry", async () => {
			const data = getValidData();
			(data as any).tracks = [42];
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].id).toBe("unknown-track-at-index-0");
		});

		it("includes validation details in the skip reason", async () => {
			const tracks = [makeTrack({ status: "invalid_status" } as any)];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].reason).toContain(TRACK_VALIDATION_REASON_PREFIX);
			expect(result.failed[0].reason).toContain("status");
		});

		it("reports multiple corrupted tracks in failed", async () => {
			const tracks = [
				makeTrack({ status: "invalid_status" } as any),
				makeTrack({ filePath: "" }),
				makeTrack({ id: "" }),
			];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(3);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(3);
			expectSkippedTrackEntry(result.failed[0], "track-1");
			expectSkippedTrackEntry(result.failed[1], "track-2");
			expect(result.failed[2].id).toBe("unknown-track-at-index-2");
			expect(result.failed[2].title).toBe(SKIPPED_TRACK_TITLE);
		});
	});

	describe("startProcessing - file existence check", () => {
		it("should reject when input file does not exist", async () => {
			vi.mocked(stat).mockRejectedValueOnce(
				Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
			);
			const data = getValidData();
			const result = await startProcessing(mockEvent, data);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].reason).toContain(
				"does not exist or is inaccessible",
			);
		});

		it("should reject when input path is a directory", async () => {
			vi.mocked(stat).mockResolvedValueOnce({
				isFile: () => false,
				isDirectory: () => true,
			} as any);
			const data = getValidData();
			const result = await startProcessing(mockEvent, data);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].reason).toContain("not a regular file");
		});
	});

	describe("startProcessing - mixed valid and corrupted tracks", () => {
		it("processes valid tracks and skips corrupted ones in the same batch", async () => {
			const tracks = [
				makeTrack(),
				makeTrack({ status: "invalid_status" } as any),
				makeTrack(),
			];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(3);
			expect(result.successful).toBe(2);
			expect(result.failed).toHaveLength(1);
			expectSkippedTrackEntry(result.failed[0], "track-2");
		});

		it("returns correct counts when all tracks are corrupted", async () => {
			const tracks = [
				makeTrack({ status: "invalid_status" } as any),
				makeTrack({ filePath: "" }),
				makeTrack({ id: "" }),
			];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(3);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(3);
			expect(mockProcessManager.run).not.toHaveBeenCalled();
			expect(mockTwoPassProcessManager.run).not.toHaveBeenCalled();
		});

		it("returns empty result for an empty tracks array", async () => {
			const data = getValidData({ tracks: [] });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(0);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(0);
			expect(mockProcessManager.run).not.toHaveBeenCalled();
		});

		it("combines skipped tracks and processing failures in the failed array", async () => {
			mockProcessManager.run.mockImplementation(() =>
				Promise.reject(new Error("FFmpeg crashed")),
			);
			const tracks = [
				makeTrack({ status: "invalid_status" } as any),
				makeTrack(),
			];
			const settings = {
				audio: { audioFilter: "volume", filterOptions: {} } as any,
			};
			const data = getValidData({ tracks, settings });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(2);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(2);
			expectSkippedTrackEntry(result.failed[0], "track-1");
			expect(result.failed[1].id).toBe("track-2");
			expect(result.failed[1].reason).toBe("FFmpeg crashed");
		});
	});

	describe("startProcessing - output directory validation", () => {
		it("throws when output directory is invalid", async () => {
			vi.mocked(isDirectory).mockResolvedValueOnce(false);
			const data = getValidData();
			await expect(startProcessing(mockEvent, data)).rejects.toThrow(
				OUTPUT_DIR_ERROR,
			);
		});

		it("does not process any tracks when output directory is invalid", async () => {
			vi.mocked(isDirectory).mockResolvedValueOnce(false);
			const data = getValidData();
			await expect(startProcessing(mockEvent, data)).rejects.toThrow(
				OUTPUT_DIR_ERROR,
			);
			expect(mockProcessManager.run).not.toHaveBeenCalled();
			expect(mockTwoPassProcessManager.run).not.toHaveBeenCalled();
		});
	});

	describe("startProcessing - file existence check", () => {
		it("rejects when input file does not exist", async () => {
			vi.mocked(stat).mockRejectedValueOnce(
				Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
			);
			const data = getValidData();
			const result = await startProcessing(mockEvent, data);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].reason).toContain(
				"does not exist or is inaccessible",
			);
		});

		it("rejects when input path is a directory", async () => {
			vi.mocked(stat).mockResolvedValueOnce({
				isFile: () => false,
				isDirectory: () => true,
			} as any);
			const data = getValidData();
			const result = await startProcessing(mockEvent, data);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0].reason).toContain("not a regular file");
		});
	});

	describe("startProcessing - business rule filtering", () => {
		it("skips tracks where status is not 'pending'", async () => {
			const tracks = [
				makeTrack(),
				makeTrack({ status: "completed" }),
				makeTrack({ status: "failed", reason: "error" }),
			];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(1);
			expect(result.successful).toBe(1);
			expect(result.failed).toHaveLength(0);
		});

		it("skips tracks without filePath", async () => {
			const tracks = [makeTrack(), makeTrack({ filePath: null } as any)];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(2);
			expect(result.successful).toBe(1);
		});

		it("returns 0 total if all tracks are filtered by business rules", async () => {
			const tracks = [
				makeTrack({ status: "failed", reason: "error" }),
				makeTrack({ status: "completed" }),
			];
			const data = getValidData({ tracks });
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(0);
			expect(result.successful).toBe(0);
			expect(result.failed).toHaveLength(0);
			expect(mockProcessManager.run).not.toHaveBeenCalled();
			expect(mockEvent.sender.send).not.toHaveBeenCalled();
		});
	});

	describe("startProcessing - execution", () => {
		it("uses ProcessManager for standard filters", async () => {
			const tracks = [makeTrack()];
			const settings = {
				audio: { audioFilter: "volume" } as any,
			};
			const data = getValidData({ tracks, settings });
			await startProcessing(mockEvent, data);
			expect(ProcessManager).toHaveBeenCalled();
			expect(TwoPassProcessManager).not.toHaveBeenCalled();
		});

		it("uses TwoPassProcessManager when filter is loudnorm and linear is true", async () => {
			const tracks = [makeTrack(), makeTrack()];
			const settings = {
				audio: twoPassArgs as any,
			};
			const data = getValidData({ tracks, settings });
			await startProcessing(mockEvent, data);
			expect(ProcessManager).not.toHaveBeenCalled();
			expect(TwoPassProcessManager).toHaveBeenCalledTimes(2);
		});

		it("uses TwoPassProcessManager when filter is loudnorm and linear is not set", async () => {
			const tracks = [makeTrack(), makeTrack()];
			const settings = {
				audio: { audioFilter: "loudnorm" } as any,
			};
			const data = getValidData({ tracks, settings });
			await startProcessing(mockEvent, data);
			expect(ProcessManager).not.toHaveBeenCalled();
			expect(TwoPassProcessManager).toHaveBeenCalledTimes(2);
		});

		it("uses ProcessManager when filter is loudnorm and linear is false", async () => {
			const tracks = [makeTrack()];
			const settings = {
				audio: {
					audioFilter: "loudnorm",
					filterOptions: { linear: false },
				} as any,
			};
			const data = getValidData({ tracks, settings });
			await startProcessing(mockEvent, data);
			expect(ProcessManager).toHaveBeenCalledTimes(1);
			expect(TwoPassProcessManager).not.toHaveBeenCalled();
		});

		it("calls run with correct arguments for single pass process", async () => {
			const tracks = [makeTrack()];
			const settings = {
				audio: { audioFilter: "volume", filterOptions: {} } as any,
			};
			const data = getValidData({ tracks, settings });
			await startProcessing(mockEvent, data);
			expect(mockProcessManager.run).toHaveBeenCalledWith({
				input: "/music/track-1.mp3",
				output: path.join("/music/output", "track-1.mp3"),
				globalSettings: ["-y"],
				trackSettings: [],
			});
		});

		it("calls run with correct arguments for two pass process", async () => {
			const tracks = [makeTrack()];
			const settings = {
				audio: twoPassArgs as any,
			};
			const data = getValidData({ tracks, settings });
			await startProcessing(mockEvent, data);
			expect(mockTwoPassProcessManager.run).toHaveBeenCalledWith({
				input: "/music/track-1.mp3",
				output: path.join("/music/output", "track-1.mp3"),
				globalSettings: ["-y"],
				trackSettings: [],
				filterOptions: {
					I: -24,
					LRA: 7,
					linear: true,
				},
				signal: expect.any(AbortSignal),
			});
		});
	});

	describe("startProcessing - events", () => {
		it("emits processing and completed events on success", async () => {
			const tracks = [makeTrack()];
			const settings = {
				audio: twoPassArgs as any,
			};
			const data = getValidData({ tracks, settings });
			await startProcessing(mockEvent, data);
			expect(mockEvent.sender.send).toHaveBeenCalledWith("processing-result", {
				id: "track-1",
				status: "processing",
			});
			expect(mockEvent.sender.send).toHaveBeenCalledWith("processing-result", {
				id: "track-1",
				status: "completed",
			});
		});

		it("does not emit processing events for skipped tracks", async () => {
			const tracks = [makeTrack({ status: "invalid_status" } as any)];
			const data = getValidData({ tracks });
			await startProcessing(mockEvent, data);
			expect(mockEvent.sender.send).not.toHaveBeenCalled();
		});

		it("handles failure and emits failed event", async () => {
			mockProcessManager.run.mockImplementation(() =>
				Promise.reject(new Error("FFmpeg crashed")),
			);
			const tracks = [
				makeTrack({
					common: {
						artist: "Artist",
						title: "Title",
					},
				}),
			];
			const settings = {
				audio: { audioFilter: "volume", filterOptions: {} } as any,
			};
			const data = getValidData({ tracks, settings });
			const result = await startProcessing(mockEvent, data);
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

		it("handles failure and emits failed event with non-Error string", async () => {
			mockProcessManager.run.mockImplementation(() =>
				Promise.reject("FFmpeg crashed"),
			);
			const tracks = [
				makeTrack({
					common: {
						artist: "Artist",
						title: "Title",
					},
				}),
			];
			const settings = {
				audio: { audioFilter: "volume", filterOptions: {} } as any,
			};
			const data = getValidData({ tracks, settings });
			const result = await startProcessing(mockEvent, data);
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

		it("processes multiple tracks independently", async () => {
			const tracks = [
				makeTrack({
					common: { artist: "Artist", title: "Title" },
				}),
				makeTrack({
					common: { artist: "Artist", title: "Title" },
				}),
				makeTrack({
					common: { artist: "Artist", title: "Title" },
				}),
			];
			const settings = {
				audio: { audioFilter: "volume", filterOptions: {} } as any,
			};
			const data = getValidData({ tracks, settings });
			mockProcessManager.run.mockImplementation((track) => {
				if (track?.output === "/music/output/track-2.mp3") {
					return Promise.reject(new Error("FFmpeg crashed"));
				}
				return Promise.resolve(undefined);
			});
			const result = await startProcessing(mockEvent, data);
			expect(result.total).toBe(3);
			expect(result.successful).toBe(2);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0]).toStrictEqual({
				id: "track-2",
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
				{ success: true },
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
		it("kills every active process with SIGINT and removes it from the map", async () => {
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

		it("stops killing remaining processes if one kill throws", async () => {
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
		it("waits for the grace period before sending response", async () => {
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
			const proc = { kill: vi.fn() } as any;
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
				{ success: true },
			);
		});
	});
});
