import { join } from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { type IAudioMetadata, parseFile } from "music-metadata";
import { v4 as uuidv4 } from "uuid";
import icon from "../../resources/icon.png?asset";

const showDialog = async () => {
	const paths = await dialog.showOpenDialog({
		properties: ["multiSelections"],
		title: "Select files",
		filters: [{ name: "Music", extensions: ["mp3"] }],
	});
	const fileData: IAudioMetadata[] = await Promise.all(
		paths.filePaths.map((path) => parseFile(path)),
	);
	const result = fileData.map((file) => ({ ...file, id: uuidv4() }));
	console.log(result);
	return result;
};

function createWindow(): void {
	const mainWindow = new BrowserWindow({
		width: 900,
		height: 670,
		show: false,
		autoHideMenuBar: true,
		...(process.platform === "linux" ? { icon } : {}),
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
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

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
		mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
	}
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	electronApp.setAppUserModelId("com.electron");

	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	// IPC test
	// ipcMain.on("ping", () => console.log("pong"));

	ipcMain.handle("showDialog", showDialog);

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
