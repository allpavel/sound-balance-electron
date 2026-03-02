import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import type { IpcMainInvokeEvent } from "electron/main";
import ffmpegPath from "ffmpeg-static";
import { parseFile } from "music-metadata";
import { INITIALSETTINGS } from "../../constants";
import icon from "../../resources/icon.png?asset";
import type {
	Data,
	Failed,
	Metadata,
	ProcessingResult,
	ProcessingStatus,
	StoppingStatus,
} from "../../types";
import { optionsMapper } from "./lib/ffmpeg/optionsMapper";
import { getGlobalSettings } from "./lib/getGlobalSettings";
import { getMetadata } from "./lib/getMetadata";
import { getTrackSettings } from "./lib/getTrackSettings";
import { isDirectory } from "./lib/isDirectory";

let canRunning: boolean = false;
let ffmpeg: ChildProcessWithoutNullStreams;

let mainWindow: BrowserWindow;

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

const startProcessing = async (event: IpcMainInvokeEvent, data: Data) => {
	const dirPath = data.settings.global.outputDirectoryPath;
	let successful = 0;
	const failed: Failed[] = [];
	let total = 0;

	const resDir = await isDirectory(dirPath);
	if (!resDir) {
		throw new Error("Output directory validation failed");
	}
	const globalSettings = getGlobalSettings(
		INITIALSETTINGS,
		data.settings.global,
		optionsMapper,
	);
	canRunning = true;

	for (
		let currentIndex = 0;
		currentIndex < data.tracks.length && canRunning;
		currentIndex++
	) {
		const current = data.tracks[currentIndex];

		if (!current || !current.filePath || current.status !== "pending") {
			continue;
		}
		const trackSettings = getTrackSettings(
			INITIALSETTINGS,
			data.settings.audio,
			optionsMapper,
		);

		try {
			await new Promise<void>((resolve, reject) => {
				if (!ffmpegPath) {
					reject(new Error("FFmpeg now found"));
				}

				const inputFile = current.filePath;
				const outputFile = path.join(dirPath, current.file);
				const args = [
					...globalSettings,
					"-i",
					inputFile,
					...trackSettings,
					outputFile,
				];
				if (ffmpegPath) {
					ffmpeg = spawn(ffmpegPath, args, {
						windowsHide: true,
						stdio: ["pipe", "pipe", "pipe"],
					});
					const result = {
						id: current.id,
						status: "processing",
					} satisfies ProcessingStatus;
					event.sender.send("processing-result", result);
				}
				total++;
				let resolved = false;
				ffmpeg.once("close", (code, signal) => {
					if (resolved) return;
					resolved = true;
					if (code === 0) {
						const result = {
							id: current.id,
							status: "completed",
						} satisfies ProcessingStatus;
						event.sender.send("processing-result", result);
						resolve();
					} else {
						if (code === 255) {
							const result = {
								id: current.id,
								status: "completed",
							} satisfies ProcessingStatus;
							event.sender.send("processing-result", result);

							const stoppingStatus: StoppingStatus = { status: "stopped" };
							event.sender.send("response-on-stop", stoppingStatus);
							resolve();
						} else {
							const result = {
								id: current.id,
								status: "failed",
								message: "Failed to processed this file",
							} satisfies ProcessingStatus;
							// biome-ignore lint: temp console
							console.log(`Close with signal: ${signal}`);
							event.sender.send("processing-result", result);

							const stoppingStatus: StoppingStatus = { status: "stopped" };
							event.sender.send("response-on-stop", stoppingStatus);
							resolve();
						}
					}
				});
				ffmpeg.once("error", (error) => {
					// biome-ignore lint: temp console
					console.error(error);
					if (resolved) return;
					resolved = true;
					const result = {
						id: current.id,
						status: "failed",
						message: error.message,
					} satisfies ProcessingStatus;
					event.sender.send("processing-result", result);
					reject();
				});
			});
			successful++;
		} catch (error) {
			if (
				error instanceof Error &&
				(error.message.includes("SIGINT") || error.message.includes("killed"))
			) {
				break;
			} else {
				failed.push({
					id: current.id,
					reason: error instanceof Error ? error.message : String(error),
					title: current.file,
				});
				// biome-ignore lint: temp console
				console.error(error);
			}
		}
	}
	canRunning = false;

	const result = {
		successful,
		failed,
		total,
	} satisfies ProcessingResult;

	return result;
};

const stopProcessing = async (event: IpcMainInvokeEvent) => {
	ffmpeg.kill("SIGINT");
	canRunning = false;
	if (ffmpeg.killed) {
		event.sender.send("response-on-stop", { success: true });
	} else {
		event.sender.send("response-on-stop", { success: false });
	}
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
