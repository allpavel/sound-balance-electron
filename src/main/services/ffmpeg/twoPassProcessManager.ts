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
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	buildLoudnormFirstPassOptions,
	buildLoudnormSecondPassOptions,
} from "@main/lib/ffmpeg/utils/buildLoudnormOptions";
import ffmpegPath from "ffmpeg-static";

export type LoudnormTwoPassOptions = {
	input: string;
	output: string;
	globalSettings: string[];
	filterOptions: Record<string, string | number | boolean>;
	signal: AbortSignal;
};

type LoudnormStats = {
	input_i: number;
	input_lra: number;
	input_tp: number;
	input_thresh: number;
	output_i: number;
	output_lra: number;
	output_tp: number;
	output_thresh: number;
	target_offset: number;
	measured_I: number;
	measured_LRA: number;
	measured_TP: number;
	measured_thresh: number;
	measured_offset: number;
};

type Stats = {
	measured_I: number;
	measured_LRA: number;
	measured_TP: number;
	measured_thresh: number;
	measured_offset: number;
};

export class TwoPassProcessManager extends EventEmitter {
	private proc: ChildProcessWithoutNullStreams | null = null;
	private tempDir: string | null = null;
	private ffmpeg: string;

	constructor() {
		super();
		if (!ffmpegPath) {
			throw new Error(
				"FFmpeg binary not found. Please ensure ffmpeg-static is installed correctly.",
			);
		}
		this.ffmpeg = ffmpegPath;
	}

	async run(options: LoudnormTwoPassOptions): Promise<void> {
		const { input, output, globalSettings, filterOptions, signal } = options;

		if (signal.aborted) {
			throw new Error("Processing aborted before start");
		}

		this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "loudnorm-"));
		const statsFile = path.join(this.tempDir, "stats.json");

		const analysisFilter = buildLoudnormFirstPassOptions(options, statsFile);

		const firstPassArgs = [
			...globalSettings,
			"-i",
			input,
			...analysisFilter,
			"-f",
			"null",
			"-",
		];

		// run first pass
		await this.runPass(firstPassArgs);

		// read and parse statistics
		let stats: LoudnormStats;
		try {
			const statsRaw = await fs.readFile(statsFile, "utf-8");
			stats = JSON.parse(statsRaw) as LoudnormStats;
		} catch (err) {
			throw new Error(
				`Failed to read or parse loudnorm stats file: ${err instanceof Error ? err.message : String(err)}`,
			);
		}

		// prepare second pass with measured values
		const measuredParams: Stats = {
			measured_I: stats.measured_I,
			measured_LRA: stats.measured_LRA,
			measured_TP: stats.measured_TP,
			measured_thresh: stats.measured_thresh,
			measured_offset: stats.measured_offset,
		};

		const secondPassFilter = buildLoudnormSecondPassOptions(
			filterOptions,
			measuredParams,
		);
		const secondPassArgs = [
			...globalSettings,
			"-i",
			input,
			...secondPassFilter,
			output,
		];

		// run second pass
		await this.runPass(secondPassArgs);

		// cleanup temporary files
		await this.cleanup();
	}

	private runPass(args: string[]): Promise<void> {
		let resolved = false;
		let stderr = "";
		const MAX_STDERR_BUFFER = 1024 * 1024;

		if (!ffmpegPath) {
			return Promise.reject(new Error("FFmpeg binary not found."));
		}

		return new Promise((resolve, reject) => {
			try {
				this.proc = spawn(this.ffmpeg, args, {
					windowsHide: true,
					stdio: ["pipe", "pipe", "pipe"],
				});
			} catch (error) {
				reject(
					new Error(
						`Failed to spawn FFmpeg: ${error instanceof Error ? error.message : String(error)}`,
					),
				);
			}

			const stdoutHandler = (data: Buffer) =>
				this.emit("stdout", data.toString());
			const stderrHandler = (data: Buffer) => {
				const chunk = data.toString();
				stderr += chunk;
				if (stderr.length > MAX_STDERR_BUFFER) {
					stderr = stderr.slice(-MAX_STDERR_BUFFER / 2);
				}
				this.emit("stderr", chunk);
			};

			this.proc?.stdout.on("data", stdoutHandler);
			this.proc?.stderr.on("data", stderrHandler);

			const cleanup = () => {
				if (this.proc) {
					this.proc.stdout.off("data", stdoutHandler);
					this.proc.stderr.off("data", stderrHandler);
					this.proc.removeAllListeners();
				}
			};

			const onError = (err: Error) => {
				if (resolved) return;
				resolved = true;
				cleanup();
				reject(new Error(`FFmpeg pass error: ${err.message}`));
			};

			const onClose = (code: number | null, signal: NodeJS.Signals) => {
				if (resolved) return;
				resolved = true;
				cleanup();

				if (code === 0 || code === 255) {
					resolve();
				} else if (signal) {
					reject(
						new Error(`FFmpeg process was terminated by signal: ${signal}`),
					);
				} else {
					reject(
						new Error(`FFmpeg process exited with code ${code}\n${stderr}`),
					);
				}
			};

			this.proc?.once("error", onError);
			this.proc?.once("close", onClose);
		});
	}

	async kill(signal: NodeJS.Signals = "SIGINT"): Promise<void> {
		if (this.proc) {
			this.proc.kill(signal);
		}
		await this.cleanup();
	}

	private async cleanup(): Promise<void> {
		if (this.tempDir) {
			try {
				await fs.rm(this.tempDir, { recursive: true, force: true });
			} catch {
				// Non-critical, log if needed but don't throw
			} finally {
				this.tempDir = null;
			}
		}
	}

	isRunning(): boolean {
		return this.proc !== null;
	}
}
