import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { Metadata } from "types";

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
		removeAllSelectedTracks: selectedTracksAdapter.removeAll,
	},
});

const selectors = selectedTracksAdapter.getSelectors();
export const {
	selectAll: getAllSelectedTracks,
	selectById: getSelectedTrackById,
} = selectors;

export const {
	removeAllSelectedTracks,
	removeSelectedTrack,
	setAllSelectedTracks,
	setSelectedTrack: addSelectedTrack,
} = selectedTracksSlice.actions;
export default selectedTracksSlice.reducer;
