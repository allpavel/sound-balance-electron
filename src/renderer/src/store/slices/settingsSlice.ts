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
import {
	createAsyncThunk,
	createSlice,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { settingsRepository } from "@renderer/db/repositories/settingsRepository";
import {
	type SettingsValidationIssue,
	safeParseSettings,
} from "@shared/validators";
import {
	SETTINGS_SCHEMA_VERSION,
	type SettingsForm,
} from "@/src/shared/schemas/settings.schema";

const SETTINGS_ACTIONS = {
	loadFromDB: "settings/loadFromDB",
	saveToDB: "settings/saveToDB",
	reset: "settings/reset",
} as const;

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

export interface SettingsState {
	data: SettingsForm;
	loading: boolean;
	error: string | null;
}

const initialState: SettingsState = {
	data: initialSettings,
	loading: false,
	error: null,
};

export const getSettings = createAsyncThunk(
	SETTINGS_ACTIONS.loadFromDB,
	async () => {
		const result = await settingsRepository.getSettings();
		if (result.status === "valid") {
			return result.data;
		}
		if (result.status === "empty") {
			return initialSettings;
		}
		throw new Error(`Stored settings are corrupted: ${result.issues}`);
	},
);

export const saveSettings = createAsyncThunk<
	SettingsForm,
	SettingsForm,
	{ rejectValue: SettingsValidationIssue[] }
>(
	SETTINGS_ACTIONS.saveToDB,
	async (settings: SettingsForm, { dispatch, rejectWithValue }) => {
		const parsed = safeParseSettings(settings, { mode: "loose" });
		if (!parsed.success) {
			return rejectWithValue(parsed.issues);
		}
		try {
			await settingsRepository.saveSettings(parsed.data);
		} catch (error) {
			return rejectWithValue([
				{
					path: "",
					code: "persist_error",
					message:
						error instanceof Error
							? error.message
							: "Unable to persist settings.",
				},
			]);
		}
		return parsed.data;
	},
);

export const resetSettings = createAsyncThunk(
	SETTINGS_ACTIONS.reset,
	async () => {
		await settingsRepository.clear();
		return initialSettings;
	},
);

const settingsSlice = createSlice({
	name: "settings",
	initialState,
	reducers: {
		setSettings(state, action: PayloadAction<SettingsForm>) {
			const parsed = safeParseSettings(action.payload, { mode: "loose" });
			if (!parsed.success) {
				return;
			}
			state.data = parsed.data;
			state.loading = false;
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(getSettings.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(getSettings.fulfilled, (state, action) => {
				const parsed = safeParseSettings(action.payload, { mode: "loose" });
				state.loading = false;
				state.data = parsed.success ? parsed.data : action.payload;
				state.error = null;
			})
			.addCase(getSettings.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message ?? "Unable to load settings.";
			})
			.addCase(resetSettings.pending, (state) => {
				state.loading = true;
			})
			.addCase(resetSettings.fulfilled, (state, action) => {
				state.loading = false;
				state.data = action.payload;
				state.error = null;
			})
			.addCase(resetSettings.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message ?? "Unable to reset settings.";
			})
			.addCase(saveSettings.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(saveSettings.fulfilled, (state, action) => {
				state.loading = false;
				state.data = action.payload;
				state.error = null;
			})
			.addCase(saveSettings.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message ?? "Unable to save settings.";
			});
	},
});

export const { setSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
