import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { Metadata } from "types";

export const tracksAdapter = createEntityAdapter<Metadata>({
	sortComparer: (a: Metadata, b: Metadata) => a.id.localeCompare(b.id),
});

export const tracksSlice = createSlice({
	name: "tracks",
	initialState: tracksAdapter.getInitialState(),
	reducers: {
		addTracks: tracksAdapter.addMany,
		removeTracks: tracksAdapter.removeMany,
		updateTrack: tracksAdapter.updateOne,
	},
});

const selectors = tracksAdapter.getSelectors();
export const { selectAll: selectAllTracks, selectById: selectTrackById } =
	selectors;

export const { addTracks, removeTracks, updateTrack } = tracksSlice.actions;
export default tracksSlice.reducer;
