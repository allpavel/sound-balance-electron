import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import ffmpegPath from "ffmpeg-static";
import { parseFile } from "music-metadata";
import icon from "../../resources/icon.png?asset";
import type { Data, Metadata, ProcessingStats } from "../../types";
import { optionsMapper } from "./lib/ffmpeg/optionsMapper";
import { getMetadata } from "./lib/getMetadata";

let canRunning: boolean = false;
let ffmpeg: ChildProcessWithoutNullStreams;

let mainWindow: BrowserWindow;

const IPC_CHANNELS = {
	PROCESSING_FINISHED: "processing-finished",
	PROCESSING_ERROR: "processing-error",
	PROCESSING_PROGRESS: "processing-progress",
} as const;

const MAIN_ERROR = {
	VALIDATION_ERROR: "VALIDATION_ERROR",
	DIRECTORY_VALIDATION_ERROR: "DIRECTORY_VALIDATION_ERROR",
	DIRECTORY_ACCESS_ERROR: "DIRECTORY_ACCESS_ERROR",
	INVALID_TRACK_ERROR: "INVALID_TRACK_ERROR",
	FFMPEG_PROCESS_ERROR: "FFMPEG_PROCESS_ERROR",
} as const;

// const PROCESSING_PROGRESS = {
// 	PROCESSING_STARTED: "PROCESSING_STARTED",
// 	TRACK_STARTED: "TRACK_STARTED",
// 	TRACK_COMPLETED: "TRACK_COMPLETED",
// 	PROCESSING_FINISHED: "PROCESSING_FINISHED",
// } as const;

const showDialog = async () => {
	const paths = await dialog.showOpenDialog({
		properties: ["multiSelections"],
		title: "Select files",
		filters: [{ name: "Music", extensions: ["mp3"] }],
	});
	const result: Metadata[] = await getMetadata(paths.filePaths, parseFile);
	return result;
};

const getOutputDirectoryPath = async () => {
	const outputDirectoryPath = await dialog.showOpenDialog({
		title: "Select directory",
		properties: ["openDirectory"],
	});
	return outputDirectoryPath;
};

const startProcessing = async (_, data: Data) => {
	const initialSettings = {
		global: {
			outputDirectoryPath: "",
			overwrite: true,
			noOverwrite: false,
			statsPeriod: 0.5,
			recastMedia: false,
		},
		audio: {
			audioCodec: "copy",
			audioQuality: "4",
			audioFilter: "loudnorm",
		},
	};

	if (!data || !data.tracks || !Array.isArray(data.tracks)) {
		const message = "Invalid data: tracks array is missing or invalid";
		mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_ERROR, {
			type: MAIN_ERROR.VALIDATION_ERROR,
			message,
			timeStamp: new Date().toISOString(),
		});
		throw new Error(message);
	}

	async function isDirectory(dirPath: string) {
		if (typeof dirPath !== "string") {
			const message = `Expected string for output directory path, but got: ${typeof dirPath}`;
			mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_ERROR, {
				type: MAIN_ERROR.DIRECTORY_VALIDATION_ERROR,
				message,
				timeStamp: new Date().toISOString(),
			});
			throw new Error(message);
		}

		const normalizedPath = path.resolve(dirPath);

		try {
			const stats = await fs.stat(normalizedPath);
			return stats.isDirectory();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unexpected error";
			mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_ERROR, {
				type: MAIN_ERROR.DIRECTORY_ACCESS_ERROR,
				message,
				timeStamp: new Date().toISOString(),
			});
			throw new Error(message);
		}
	}

	const getGlobalSettings = (settings: {
		outputDirectoryPath: string;
		overwrite: boolean;
		noOverwrite: boolean;
		statsPeriod: number;
		recastMedia: boolean;
	}) => {
		const result: string[] = [];
		for (const s in settings) {
			if (settings[s] !== initialSettings.global[s]) {
				result.push(optionsMapper(s));
			}
		}
		return result;
	};

	const getTrackSettings = (settings: {
		audioCodec: string;
		audioQuality: string;
		audioFilter: string;
	}) => {
		const result: string[] = [];
		for (const s in settings) {
			if (settings[s] !== initialSettings.audio[s]) {
				result.push(`${optionsMapper(s)} ${settings[s]}`);
			}
		}
		return result;
	};

	const dirPath = data.settings.global.outputDirectoryPath;

	const resDir = await isDirectory(dirPath);
	if (!resDir) {
		const message = "Directory validation failed - path is not a directory";
		mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_ERROR, {
			type: MAIN_ERROR.DIRECTORY_VALIDATION_ERROR,
			message,
			timeStamp: new Date().toISOString(),
		});
		throw new Error(message);
	}
	const globalSettings = getGlobalSettings(data.settings.global);
	canRunning = true;

	let successCount = 0;
	let errorCount = 0;
	const errorFiles: string[] = [];

	for (
		let currentIndex = 0;
		currentIndex < data.tracks.length && canRunning;
		currentIndex++
	) {
		const current = data.tracks[currentIndex];

		// mainWindow.webContents.send(
		// 	PROCESSING_PROGRESS.PROCESSING_STARTED,
		// 	`Started processing: ${current.file}`,
		// );

		if (!current || !current.filePath) {
			errorCount++;
			errorFiles.push(data.tracks[currentIndex].file);
			// mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_ERROR, {
			// 	type: MAIN_ERROR.INVALID_TRACK_ERROR,
			// 	total: data.tracks.length,
			// 	processed: currentIndex,
			// 	successful: successCount,
			// 	failed: errorCount,
			// 	timestamp: new Date().toISOString(),
			// });
			continue;
		}
		const inputFile = current.filePath;

		const trackSettings = getTrackSettings(data.settings.audio);
		const args = [
			...globalSettings,
			"-i",
			`"${inputFile}"`,
			...trackSettings,
			`"${dirPath}/${current.file}"`,
		];

		try {
			if (ffmpegPath) {
				ffmpeg = spawn(ffmpegPath, args, {
					windowsHide: true,
					stdio: ["pipe", "pipe", "pipe"],
					shell: true,
				});
				// mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS, {
				// 	type: PROCESSING_PROGRESS.TRACK_STARTED,
				// 	total: data.tracks.length,
				// 	current: current.file,
				// 	processed: currentIndex,
				// 	successful: successfulTracks,
				// 	failed: failedTracks,
				// 	timestamp: new Date().toISOString(),
				// });
			}

			await new Promise((resolve, reject) => {
				ffmpeg.on("close", (code) => {
					if (code === 0) {
						successCount++;
						// mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_PROGRESS, {
						// 	type: PROCESSING_PROGRESS.TRACK_COMPLETED,
						// 	total: data.tracks.length,
						// 	current: current.file,
						// 	processed: currentIndex,
						// 	successful: successfulTracks,
						// 	failed: failedTracks,
						// 	timestamp: new Date().toISOString(),
						// });
						resolve(null);
					} else {
						errorCount++;
						errorFiles.push(current.file);
						const message = `FFmpeg process exited with code ${code} for file: ${current.file}`;
						// mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_ERROR, {
						// 	type: MAIN_ERROR.FFMPEG_PROCESS_ERROR,
						// 	message,
						// 	total: data.tracks.length,
						// 	processed: currentIndex,
						// 	successful: successfulTracks,
						// 	failed: failedTracks,
						// 	timestamp: new Date().toISOString(),
						// });
						reject(new Error(message));
					}
				});

				ffmpeg.on("error", (error) => {
					errorCount++;
					errorFiles.push(current.file);
					// const message = `Failed to spawn FFmpeg process: ${error.message}`;
					// mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_ERROR, {
					// 	type: MAIN_ERROR.FFMPEG_PROCESS_ERROR,
					// 	message,
					// 	total: data.tracks.length,
					// 	processed: currentIndex,
					// 	successful: successfulTracks,
					// 	failed: failedTracks,
					// 	timestamp: new Date().toISOString(),
					// });
					reject(error);
				});
			});
		} catch (error) {
			errorCount++;
			errorFiles.push(current.file);
			const message =
				error instanceof Error ? error.message : "Unexpected error";
			// mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_ERROR, {
			// 	type: MAIN_ERROR.FFMPEG_PROCESS_ERROR,
			// 	message,
			// 	total: data.tracks.length,
			// 	processed: currentIndex,
			// 	successful: successfulTracks,
			// 	failed: failedTracks,
			// 	timestamp: new Date().toISOString(),
			// });
			throw new Error(message);
		}
	}

	// mainWindow.webContents.send(IPC_CHANNELS.PROCESSING_FINISHED, {
	// 	type: PROCESSING_PROGRESS.PROCESSING_FINISHED,
	// 	total: data.tracks.length,
	// 	processed: data.tracks.length,
	// 	successful: successfulTracks,
	// 	failed: failedTracks,
	// 	timestamp: new Date().toISOString(),
	// });
	canRunning = false;
	const processingStats: ProcessingStats = {
		errorCount,
		successCount,
		totalFiles: data.tracks.length,
		errorFiles,
	};
	return processingStats;
};

const stopProcessing = async () => {
	ffmpeg.kill("SIGINT");
	canRunning = false;
};

function createWindow(): void {
	mainWindow = new BrowserWindow({
		width: 900,
		height: 670,
		show: false,
		autoHideMenuBar: true,
		...(process.platform === "linux" ? { icon } : {}),
		webPreferences: {
			preload: path.join(__dirname, "../preload/index.js"),
			sandbox: false,
		},
	});

	mainWindow.on("ready-to-show", () => {
		mainWindow.show();
	});

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url);
		return { action: "deny" };
	});

	if (is.dev && process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
	}
}

app.whenReady().then(() => {
	electronApp.setAppUserModelId("com.electron");

	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	ipcMain.handle("showDialog", showDialog);
	ipcMain.handle("getOutputDirectoryPath", getOutputDirectoryPath);
	ipcMain.handle("startProcessing", startProcessing);
	ipcMain.handle("stopProcessing", stopProcessing);

	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
