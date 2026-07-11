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

	function createProcess() {
		const mockProc = createMockChildProcess();
		mockSpawn.mockReturnValueOnce(mockProc);
		const proc = new TestProcess();
		return { mockProc, proc };
	}

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

	describe("runProcessing - spawn", () => {
		it("should spawn ffmpeg with correct args", async () => {
			const { mockProc, proc } = createProcess();
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
			const { mockProc, proc } = createProcess();
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

	describe("runProcessing - close event", () => {
		it("should resolve when process exits with code 0", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", 0, null);
			await expect(promise).resolves.toBeUndefined();
		});
		it("should resolve when process exits with code 255", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", 255, null);
			await expect(promise).resolves.toBeUndefined();
		});
		it("should resolve when process exits with code 0 even stderr data exists", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.stderr.emit("data", Buffer.from("Some warning"));
			mockProc.emit("close", 0, null);
			await expect(promise).resolves.toBeUndefined();
		});
		it("should reject when process exits with non-zero code", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.stderr.emit("data", Buffer.from("Some warning"));
			mockProc.emit("close", 1, null);
			await expect(promise).rejects.toThrow(
				"FFmpeg exited with code 1\nSome warning",
			);
		});
		it("should reject when process exits with code 137 (SIGKILL)", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", 137, null);
			await expect(promise).rejects.toThrow("FFmpeg exited with code 137");
		});
		it("should reject when process exits with code null and no signal", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.stderr.emit("data", Buffer.from("Another warning"));
			mockProc.emit("close", null, null);
			await expect(promise).rejects.toThrow(
				"FFmpeg exited with code null\nAnother warning",
			);
		});
		it("should reject when process exits with signal SIGTERM", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", null, "SIGTERM");
			await expect(promise).rejects.toThrow(
				"FFmpeg process was terminated by signal: SIGTERM",
			);
		});
		it("should reject when process exits with signal SIGINT", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", null, "SIGINT");
			await expect(promise).rejects.toThrow(
				"FFmpeg process was terminated by signal: SIGINT",
			);
		});
		it("should reject when process exits with signal SIGINT", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", null, "SIGINT");
			await expect(promise).rejects.toThrow(
				"FFmpeg process was terminated by signal: SIGINT",
			);
		});
		it("should prioritize signal over code 0", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", 0, "SIGTERM");
			await expect(promise).rejects.toThrow(
				"FFmpeg process was terminated by signal: SIGTERM",
			);
		});
		it("should prioritize signal over code 255", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", 255, "SIGTERM");
			await expect(promise).rejects.toThrow(
				"FFmpeg process was terminated by signal: SIGTERM",
			);
		});
		it("should prioritize signal over code other than 0 and 255", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", 1, "SIGTERM");
			await expect(promise).rejects.toThrow(
				"FFmpeg process was terminated by signal: SIGTERM",
			);
		});
		it("should include full stderr on non-zero exit", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.stderr.emit("data", Buffer.from("Error: codec not found"));
			mockProc.stderr.emit("data", Buffer.from("\nAt line 42"));
			mockProc.emit("close", 1, null);
			await expect(promise).rejects.toThrow(
				"FFmpeg exited with code 1\nError: codec not found\nAt line 42",
			);
		});
	});

	describe("runProcessing - error event", () => {
		it("should reject when error event fires", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("error", new Error("ENOENT"));
			await expect(promise).rejects.toThrow("FFmpeg process error: ENOENT");
		});
		it("should resolve when error and close events fires", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("error", new Error("ENOENT"));
			mockProc.emit("close", 0, null);
			await expect(promise).rejects.toThrow("FFmpeg process error: ENOENT");
		});
		it("should not reject twice when error and close events fires", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			promise.catch(() => {});
			mockProc.emit("close", 1, null);
			mockProc.on("error", () => {});
			mockProc.emit("error", new Error("Late error"));
			await expect(promise).rejects.toThrow("FFmpeg exited with code 1");
		});
		it("should not reject twice when double error events fires", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			promise.catch(() => {});
			mockProc.emit("error", new Error("First error"));
			mockProc.on("error", () => {});
			mockProc.emit("error", new Error("Second error"));
			await expect(promise).rejects.toThrow(
				"FFmpeg process error: First error",
			);
		});
		it("should not close twice when double close events fires", async () => {
			const { mockProc, proc } = createProcess();
			const promise = proc.run([]);
			mockProc.emit("close", 0, null);
			mockProc.emit("close", 1, null);
			await expect(promise).resolves.toBeUndefined();
		});
	});
});
