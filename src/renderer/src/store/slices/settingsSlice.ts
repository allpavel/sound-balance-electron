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
import { safeParseSettings } from "@shared/validators";
import { toast } from "sonner";
import {
	SETTINGS_SCHEMA_VERSION,
	type SettingsForm,
} from "@/src/shared/schemas/settings.schema";

const SETTINGS_ACTIONS = {
	loadFromDB: "settings/loadFromDB",
	saveToDB: "settings/saveToDB",
};

export const initialSettings: SettingsForm = {
	version: SETTINGS_SCHEMA_VERSION,
	global: {
		outputDirectoryPath: "",
		openOutputFolderOnComplete: false,
		overwrite: true,
		noOverwrite: false,
		concurrency: 1,
	},
	audio: {
		audioCodec: "copy",
		audioQuality: "auto",
		audioQualityValue: "auto",
		audioFilter: "",
		outputExtension: "copy",
		filterOptions: {},
		codecOptions: {},
	},
};

export const getSettings = createAsyncThunk(
	SETTINGS_ACTIONS.loadFromDB,
	async () => {
		const result = await settingsRepository.getSettings();
		if (result.status === "invalid") {
			toast.error("Stored settings are corrupted and were reset to defaults.");
			return initialSettings;
		}
		if (result.status === "valid") {
			return result.data;
		}
		return initialSettings;
	},
);

export const saveSettings = createAsyncThunk(
	SETTINGS_ACTIONS.saveToDB,
	async (settings: SettingsForm, { dispatch, rejectWithValue }) => {
		const parsed = safeParseSettings(settings, { mode: "loose" });
		if (!parsed.success) {
			return rejectWithValue(parsed.issues);
		}
		await settingsRepository.saveSettings(parsed.data);
		dispatch(setSettings(parsed.data));
		return parsed.data;
	},
);

const settingsSlice = createSlice({
	name: "settings",
	initialState: { ...initialSettings, loading: false },
	reducers: {
		setSettings(_, action) {
			const parsedPayload = safeParseSettings(action.payload, {
				mode: "loose",
			});
			if (!parsedPayload.success) return;
			return { ...parsedPayload.data, loading: false };
		},
	},
	extraReducers: (builder) => {
		builder.addCase(getSettings.pending, (state) => {
			state.loading = true;
		});
		builder.addCase(getSettings.fulfilled, (_, action) => {
			const parsedPayload = safeParseSettings(action.payload, {
				mode: "loose",
			});
			if (!parsedPayload.success) return;
			return { ...parsedPayload.data, loading: false };
		});
		builder.addCase(getSettings.rejected, (state) => {
			state.loading = false;
		});
	},
});

export const { setSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
