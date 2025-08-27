import { createSlice } from "@reduxjs/toolkit";
import type { GeneralSettings } from "types";

const initialSettings: GeneralSettings = {
	outputDirectoryPath: "",
	overwrite: true,
	noOverwrite: false,
	audioCodec: "copy",
	audioQuality: "4",
	statsPeriod: 0.5,
	recastMedia: false,
	audioFilter: "loudnorm",
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
