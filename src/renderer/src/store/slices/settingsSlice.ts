import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { settingsRepository } from "@renderer/db/repositories/settingsRepository";
import type { GeneralSettings } from "types";

const SETTINGS_ACTIONS = {
	loadFromDB: "settings/loadFromDB",
	saveToDB: "settings/saveToDB",
};

export const initialSettings: GeneralSettings = {
	global: {
		outputDirectoryPath: "",
		overwrite: true,
		noOverwrite: false,
		statsPeriod: 0.5,
		recastMedia: false,
		concurrency: 1,
	},
	audio: {
		audioCodec: "copy",
		audioQuality: "4",
		audioFilter: "loudnorm",
	},
};

export const getSettings = createAsyncThunk(
	SETTINGS_ACTIONS.loadFromDB,
	async () => {
		const storedSettings = await settingsRepository.getSettings();
		return storedSettings ?? initialSettings;
	},
);

export const saveSettings = createAsyncThunk(
	SETTINGS_ACTIONS.saveToDB,
	async (settings: GeneralSettings, { dispatch }) => {
		await settingsRepository.saveSettings(settings);
		dispatch(setSettings(settings));
	},
);
const settingsSlice = createSlice({
	name: "settings",
	initialState: { ...initialSettings, loading: false },
	reducers: {
		setSettings(state, action) {
			state = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(getSettings.pending, (state) => {
			state.loading = true;
		});
		builder.addCase(getSettings.fulfilled, (_, action) => {
			return { ...action.payload, loading: false };
		});
		builder.addCase(getSettings.rejected, (state) => {
			state.loading = false;
		});
	},
});

export const { setSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
