import { createSlice } from "@reduxjs/toolkit";

// import type { GeneralSettings } from "types";

type GeneralSettings = {
	// ===== GLOBAL OPTIONS =====
	global: {
		/** Output directory path */
		outputDirectoryPath: string;
		/** Overwrite output files without prompt (-y) */
		overwrite: boolean;
		/** Fail if output file exists (-n) */
		noOverwrite: boolean;
		/** Set stats update interval in seconds (-stats_period) */
		statsPeriod: number;
		/** Recast media type when needed (-recast_media) */
		recastMedia: boolean;
	};
	// ===== AUDIO ENCODING =====
	audio: {
		/** Audio codec (e.g., 'libmp3lame', 'flac', 'copy') (-c:a) */
		audioCodec: string;
		/** Audio quality (VBR scale, 0-9 for MP3) (-q:a) */
		audioQuality: string;
		/** Audio filter chain (e.g., 'volume=0.8, loudnorm') (-af) */
		audioFilter: string;
	};
};

const initialSettings: GeneralSettings = {
	global: {
		outputDirectoryPath: "output",
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
