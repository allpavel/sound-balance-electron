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
import EventEmitter from "node:events";
import ffmpegPath from "ffmpeg-static";

export abstract class BaseProcess extends EventEmitter {
	protected process: ChildProcessWithoutNullStreams | null = null;
	protected readonly ffmpeg: string;

	constructor() {
		super();
		if (!ffmpegPath) {
			throw new Error(
				"FFmpeg binary not found. Please ensure ffmpeg-static is installed correctly.",
			);
		}
		this.ffmpeg = ffmpegPath;
	}

	protected runProcessing(args: string[]): Promise<void> {
		let resolved = false;
		let stderrData = "";
		const MAX_STDERR_BUFFER = 1024 * 1024;

		return new Promise((resolve, reject) => {
			if (this.process) {
				reject(new Error("FFmpeg process is already running"));
				return;
			}

			try {
				this.process = spawn(this.ffmpeg, args, {
					windowsHide: true,
					stdio: ["pipe", "pipe", "pipe"],
				});
			} catch (error) {
				reject(
					new Error(
						`Failed to spawn FFmpeg: ${error instanceof Error ? error.message : String(error)}`,
					),
				);
				return;
			}

			const stdoutHandler = (data: Buffer) =>
				this.emit("stdout", data.toString());
			const stderrHandler = (data: Buffer) => {
				const chunk = data.toString();
				stderrData += chunk;
				if (stderrData.length > MAX_STDERR_BUFFER) {
					stderrData = stderrData.slice(-MAX_STDERR_BUFFER / 2);
				}
				this.emit("stderr", chunk);
			};

			this.process.stdout.on("data", stdoutHandler);
			this.process.stderr.on("data", stderrHandler);

			const cleanup = () => {
				if (this.process) {
					this.process.stdout.off("data", stdoutHandler);
					this.process.stderr.off("data", stderrHandler);
					this.process.removeAllListeners();
					this.process = null;
				}
			};

			const onError = (err: Error) => {
				if (resolved) return;
				resolved = true;
				cleanup();
				reject(new Error(`FFmpeg process error: ${err.message}`));
			};

			const onClose = (code: number | null, signal: NodeJS.Signals | null) => {
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
					reject(new Error(`FFmpeg exited with code ${code}\n${stderrData}`));
				}
			};

			this.process.once("error", onError);
			this.process.once("close", onClose);
		});
	}

	kill(signal: NodeJS.Signals = "SIGINT"): void {
		if (this.process) {
			this.process.kill(signal);
		}
	}

	isRunning(): boolean {
		return this.process !== null;
	}
}
