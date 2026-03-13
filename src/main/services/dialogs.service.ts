import { dialog } from "electron";

export const showDialog = async () => {
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties: ["multiSelections"],
		title: "Select files",
		filters: [{ name: "Music", extensions: ["mp3"] }],
	});
	return canceled ? [] : filePaths;
};

export const getOutputDirectoryPath = async () => {
	const outputDirectoryPath = await dialog.showOpenDialog({
		title: "Select directory",
		properties: ["openDirectory"],
	});
	return outputDirectoryPath;
};
