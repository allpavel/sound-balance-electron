import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import EventEmitter from "node:events";
import ffmpegPath from "ffmpeg-static";

export type ProcessManagerOptions = {
	input: string;
	output: string;
	globalSettings: string[];
	trackSettings: string[];
};

export class ProcessManager extends EventEmitter {
	private process: ChildProcessWithoutNullStreams | null = null;
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

	run(options: ProcessManagerOptions): Promise<void> {
		let resolved = false;
		let stderrData = "";
		const MAX_STDERR_BUFFER = 1024 * 1024;

		return new Promise((resolve, reject) => {
			if (this.process) {
				reject(new Error("FFmpeg process is already running"));
				return;
			}

			const args = [
				...options.globalSettings,
				"-i",
				options.input,
				...options.trackSettings,
				options.output,
			];

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

			this.process?.stdout.on("data", stdoutHandler);
			this.process?.stderr.on("data", stderrHandler);

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

			const onClose = (code: number | null, signal: NodeJS.Signals) => {
				if (resolved) return;
				resolved = true;

				if (code === 0) {
					resolve();
				} else if (code === 255) {
					resolve();
				} else if (signal) {
					reject(
						new Error(`FFmpeg process was terminated by signal: ${signal}`),
					);
				} else {
					reject(new Error(`FFmpeg exited with code ${code}\n${stderrData}`));
				}
			};

			this.process?.once("error", onError);
			this.process?.once("close", onClose);
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
