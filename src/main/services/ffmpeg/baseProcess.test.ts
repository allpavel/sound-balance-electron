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

import { spawn } from "node:child_process";
import EventEmitter from "node:events";
import { BaseProcess } from "./baseProcess";

class TestProcess extends BaseProcess {
	run(args: string[]): Promise<void> {
		return this.runProcessing(args);
	}

	getStderrData(): string {
		return this.stderrData;
	}

	getFfmpegPath(): string {
		return this.ffmpeg;
	}

	getProcess() {
		return this.process;
	}
}

function createMockChildProcess() {
	const mockChildProcess = new EventEmitter() as any;
	mockChildProcess.stdout = new EventEmitter();
	mockChildProcess.stderr = new EventEmitter();
	mockChildProcess.stdin = { write: vi.fn(), end: vi.fn() };
	mockChildProcess.kill = vi.fn();
	mockChildProcess.pid = 12345;
	return mockChildProcess;
}

const MAX_STDERR_BUFFER = 1024 * 1024; // 1MB

describe("BaseProcess", () => {
	let mockSpawn: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockSpawn = vi.mocked(spawn);
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("should initialize ffmpeg path from ffmpeg-static when no argument is given", () => {
			const proc = new TestProcess("/fake/ffmpeg");
			expect(proc.getFfmpegPath()).toBe("/fake/ffmpeg");
		});
		it("should initialize ffmpeg path from provided ffmpegPath", () => {
			const proc = new TestProcess("/anotherFake/ffmpegPath");
			expect(proc.getFfmpegPath()).toBe("/anotherFake/ffmpegPath");
		});
		it("should throw if ffmpeg path is an empty string", () => {
			expect(() => new TestProcess("")).toThrow(
				"FFmpeg binary not found. Please ensure ffmpeg-static is installed correctly.",
			);
		});
		it("should initialize stderrData to an empty string", () => {
			const proc = new TestProcess();
			expect(proc.getStderrData()).toBe("");
		});
		it("should initialize stderrData to null", () => {
			const proc = new TestProcess();
			expect(proc.getProcess()).toBeNull();
		});
		it("should extend EventEmitter", () => {
			const proc = new TestProcess();
			expect(proc).toBeInstanceOf(EventEmitter);
		});
	});

	describe("runProcessing", () => {
		it("should spawn ffmpeg with correct args", async () => {
			const mockProc = createMockChildProcess();
			mockSpawn.mockReturnValueOnce(mockProc);

			const proc = new TestProcess();
			const args = ["-i", "input.mp3", "output.mp3"];
			const promise = proc.run(args);
			expect(mockSpawn).toHaveBeenCalledWith("/fake/ffmpeg", args, {
				windowsHide: true,
				stdio: ["pipe", "pipe", "pipe"],
			});
			mockProc.emit("close", 0, null);
			await promise;
		});
		it("handles an empty args array", async () => {
			const mockProc = createMockChildProcess();
			mockSpawn.mockReturnValueOnce(mockProc);

			const proc = new TestProcess();
			const args = [];
			const promise = proc.run(args);
			expect(mockSpawn).toHaveBeenCalledWith("/fake/ffmpeg", args, {
				windowsHide: true,
				stdio: ["pipe", "pipe", "pipe"],
			});
			mockProc.emit("close", 0, null);
			await promise;
		});
		it("should reject when spawn throws an Error", async () => {
			mockSpawn.mockImplementationOnce(() => {
				throw new Error("spawn ENOENT");
			});
			const proc = new TestProcess();
			await expect(proc.run([])).rejects.toThrow(
				"Failed to spawn FFmpeg: spawn ENOENT",
			);
		});
		it("should reject when spawn throws an non-Error value", async () => {
			mockSpawn.mockImplementationOnce(() => {
				throw "string error";
			});
			const proc = new TestProcess();
			await expect(proc.run([])).rejects.toThrow(
				"Failed to spawn FFmpeg: string error",
			);
		});
		it("should not leave process set when spawn throws", async () => {
			mockSpawn.mockImplementationOnce(() => {
				throw new Error("test error");
			});
			const proc = new TestProcess();
			await expect(proc.run([])).rejects.toThrow();
			expect(proc.getProcess()).toBeNull();
		});
	});
});
