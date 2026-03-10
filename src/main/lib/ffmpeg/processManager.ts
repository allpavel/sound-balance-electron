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
	// biome-ignore-start lint/correctness/noUnusedPrivateClassMembers: captured in the following closure
	private stderrData: string;
	private resolved: boolean;
	// biome-ignore-end lint/correctness/noUnusedPrivateClassMembers: captured the following closure

	constructor() {
		super();
		if (!ffmpegPath) {
			throw new Error(
				"FFmpeg binary not found. Please ensure ffmpeg-static is installed correctly.",
			);
		}
		this.ffmpeg = ffmpegPath;
		this.stderrData = "";
		this.resolved = false;
	}

	run(options: ProcessManagerOptions): Promise<void> {
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
				reject(new Error(`Failed to spawn FFmpeg: ${error}`));
			}

			const stdoutHandler = (data: Buffer) =>
				this.emit("stdout", data.toString());
			const stderrHandler = (data: Buffer) => {
				const chunk = data.toString();
				this.stderrData += chunk;
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
				if (this.resolved) return;
				this.resolved = true;
				cleanup();
				reject(new Error(`FFmpeg process error: ${err.message}`));
			};

			const onClose = (code: number | null, signal: NodeJS.Signals) => {
				if (this.resolved) return;
				this.resolved = true;

				if (code === 0) {
					resolve();
				} else if (code === 255) {
					resolve();
				} else if (signal) {
					reject(
						new Error(`FFmpeg process was terminated by signal: ${signal}`),
					);
				} else {
					reject(
						new Error(`FFmpeg exited with code ${code}\n${this.stderrData}`),
					);
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

	isRunnig(): boolean {
		return this.process !== null;
	}
}
