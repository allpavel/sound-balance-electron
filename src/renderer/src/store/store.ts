import { configureStore } from "@reduxjs/toolkit";
import selectedTracksReducer from "./slices/selectedTracksSlice";
import settingsReducer from "./slices/settingsSlice";
import tracksReducer from "./slices/tracksSlice";

export const store = configureStore({
	reducer: {
		tracks: tracksReducer,
		settings: settingsReducer,
		selectedTracks: selectedTracksReducer,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
