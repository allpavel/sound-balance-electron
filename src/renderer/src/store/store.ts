import { configureStore } from "@reduxjs/toolkit";
import resultsSlice from "@renderer/store/slices/resultsSlice";
import selectedTracks from "@renderer/store/slices/selectedTracksSlice";
import settingsSlice from "@renderer/store/slices/settingsSlice";

export const store = configureStore({
	reducer: {
		selectedTracks,
		settings: settingsSlice,
		results: resultsSlice,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
