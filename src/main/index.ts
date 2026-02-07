import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import ffmpegPath from "ffmpeg-static";
import { parseFile } from "music-metadata";
import { INITIALSETTINGS } from "../../constants";
import icon from "../../resources/icon.png?asset";
import type { Data, Metadata } from "../../types";
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

const startProcessing = async (_, data: Data) => {
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
			}

			ffmpeg.on("close", (code) => {
				if (code === 0) {
					// biome-ignore lint: temp console
					console.log("close with 0");
				} else {
					// biome-ignore lint: temp console
					console.log("close from signal");
				}
			});

			ffmpeg.on("error", (error) => {
				// biome-ignore lint: temp console
				console.error(error);
			});
		} catch (error) {
			// biome-ignore lint: temp console
			console.error(error);
		}
	}
	canRunning = false;
	return data;
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
