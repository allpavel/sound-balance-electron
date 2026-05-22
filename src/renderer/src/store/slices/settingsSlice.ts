/*
 * sound-balance-electron
 * Copyright (C) 2026 Pavel Alloyarov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
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
		outputExtension: "copy",
		filterOptions: {},
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
		setSettings(_, action) {
			return { ...action.payload, loading: false };
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
