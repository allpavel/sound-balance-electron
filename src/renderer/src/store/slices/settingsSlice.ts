import { createSlice } from "@reduxjs/toolkit";
import type { GeneralSettings } from "types";

export const initialSettings: GeneralSettings = {
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

const settingsSlice = createSlice({
	name: "settings",
	initialState: initialSettings,
	reducers: {
		setSettings(_, action) {
			return action.payload;
		},
	},
});

export const { setSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
