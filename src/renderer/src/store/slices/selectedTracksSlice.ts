import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { Metadata } from "types";
import { removeTracks } from "./tracksSlice";

export const selectedTracksAdapter = createEntityAdapter<Metadata>({
	sortComparer: (a: Metadata, b: Metadata) => a.id.localeCompare(b.id),
});

export const selectedTracksSlice = createSlice({
	name: "selectedTracks",
	initialState: selectedTracksAdapter.getInitialState(),
	reducers: {
		setAllSelectedTracks: selectedTracksAdapter.setAll,
		setSelectedTrack: selectedTracksAdapter.setOne,
		removeSelectedTrack: selectedTracksAdapter.removeOne,
		removeSelectedTracks: selectedTracksAdapter.removeMany,
		removeAllSelectedTracks: selectedTracksAdapter.removeAll,
	},
	extraReducers: (builder) => {
		builder.addCase(removeTracks, (state, action) => {
			selectedTracksAdapter.removeMany(state, action.payload);
		});
	},
});

const selectors = selectedTracksAdapter.getSelectors();
export const {
	selectAll: getAllSelectedTracks,
	selectById: getSelectedTrackById,
	selectIds: getSelectedTracksIds,
} = selectors;

export const {
	removeAllSelectedTracks,
	removeSelectedTracks,
	removeSelectedTrack,
	setAllSelectedTracks,
	setSelectedTrack: addSelectedTrack,
} = selectedTracksSlice.actions;

export default selectedTracksSlice.reducer;
