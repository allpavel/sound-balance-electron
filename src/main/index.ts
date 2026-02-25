import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import type { IpcMainInvokeEvent } from "electron/main";
import ffmpegPath from "ffmpeg-static";
import { parseFile } from "music-metadata";
import { INITIALSETTINGS } from "../../constants";
import icon from "../../resources/icon.png?asset";
import type { Data, Metadata, ProcessingStatus } from "../../types";
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

		if (!current || !current.filePath) {
			continue;
		}
		const inputFile = current.filePath;
		const trackSettings = getTrackSettings(
			INITIALSETTINGS,
			data.settings.audio,
			optionsMapper,
		);
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
				const result = {
					id: current.id,
					status: "processing",
				} satisfies ProcessingStatus;
				event.sender.send("processing-result", result);
			}

			ffmpeg.on("close", (code, signal) => {
				if (code === 0) {
					// biome-ignore lint: temp console
					console.log("close with 0");
					const result = {
						id: current.id,
						status: "completed",
					} satisfies ProcessingStatus;
					event.sender.send("processing-result", result);
				} else {
					if (signal === "SIGINT") {
						event.sender.send(
							"response-on-stop",
							"Processing was successfully stopped.",
						);
					} else {
						// biome-ignore lint: temp console
						console.log(`Close with signal: ${signal}`);
					}
				}
			});

			ffmpeg.on("error", (error) => {
				// biome-ignore lint: temp console
				console.error(error);
				const result = {
					id: current.id,
					status: "failed",
					message: error.message,
				} satisfies ProcessingStatus;
				event.sender.send("processing-result", result);
			});
		} catch (error) {
			// biome-ignore lint: temp console
			console.error(error);
		}
	}
	canRunning = false;
	return data;
};

const stopProcessing = async (event: IpcMainInvokeEvent) => {
	ffmpeg.kill("SIGINT");
	canRunning = false;
	if (ffmpeg.killed) {
		event.sender.send(
			"response-on-stop",
			"Start to gracefully terminate the processing...",
		);
	} else {
		event.sender.send(
			"response-on-stop",
			"Failed to start termination of the processing...",
		);
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
