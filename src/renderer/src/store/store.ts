import { configureStore } from "@reduxjs/toolkit";
import resultsSlice from "./slices/resultsSlice";
import settingsReducer from "./slices/settingsSlice";
import tracksReducer from "./slices/tracksSlice";

export const store = configureStore({
	reducer: {
		tracks: tracksReducer,
		settings: settingsReducer,
		results: resultsSlice,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
