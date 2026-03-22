import { configureStore } from "@reduxjs/toolkit";
import resultsSlice from "@renderer/store/slices/resultsSlice";
import settingsReducer from "@renderer/store/slices/settingsSlice";
import tracksReducer from "@renderer/store/slices/tracksSlice";

export const store = configureStore({
	reducer: {
		tracks: tracksReducer,
		settings: settingsReducer,
		results: resultsSlice,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
