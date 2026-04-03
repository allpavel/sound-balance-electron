import {
	createAsyncThunk,
	createEntityAdapter,
	createSelector,
	createSlice,
} from "@reduxjs/toolkit";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import type { Metadata } from "types";

const TRACKS_DB_ACTIONS = {
	loadFromDB: "tracks/loadFromDB",
	addManyToDB: "tracks/addManyToDB",
	updateInDB: "tracks/updateInDB",
	updateManyInDB: "tracks/updateManyToDB",
	removeFromDB: "tracks/removeFromDB",
	removeManyFromDB: "tracks/removeManyFromDB",
};

export const tracksAdapter = createEntityAdapter<Metadata>({
	sortComparer: (a: Metadata, b: Metadata) => a.id.localeCompare(b.id),
});

export const loadTracksFromDB = createAsyncThunk(
	TRACKS_DB_ACTIONS.loadFromDB,
	async () => {
		return await tracksRepository.getAll();
	},
);

export const addManyToDB = createAsyncThunk(
	TRACKS_DB_ACTIONS.addManyToDB,
	async (tracks: Metadata[], { dispatch }) => {
		await tracksRepository.addMany(tracks);
		dispatch(tracksSlice.actions.addTracks(tracks));
	},
);

export const updateInDB = createAsyncThunk(
	TRACKS_DB_ACTIONS.updateInDB,
	async (payload: { id: string; changes: Partial<Metadata> }, { dispatch }) => {
		await tracksRepository.update(payload.id, payload.changes);
		dispatch(tracksSlice.actions.updateTrack(payload));
	},
);

export const updateManyInDB = createAsyncThunk(
	TRACKS_DB_ACTIONS.updateManyInDB,
	async (
		updates: { id: string; changes: Partial<Metadata> }[],
		{ dispatch },
	) => {
		await tracksRepository.updateMany(updates);
		dispatch(tracksSlice.actions.updateAllTracks(updates));
	},
);

export const removeManyFromDB = createAsyncThunk(
	TRACKS_DB_ACTIONS.removeManyFromDB,
	async (ids: string[], { dispatch }) => {
		await tracksRepository.removeMany();
		dispatch(tracksSlice.actions.removeTracks(ids));
	},
);

const tracksSlice = createSlice({
	name: "tracks",
	initialState: { ...tracksAdapter.getInitialState(), loading: false },
	reducers: {
		addTracks: tracksAdapter.addMany,
		removeTracks: tracksAdapter.removeMany,
		updateTrack: tracksAdapter.updateOne,
		updateAllTracks: tracksAdapter.updateMany,
	},
	extraReducers: (builder) => {
		builder.addCase(loadTracksFromDB.pending, (state) => {
			state.loading = true;
		});
		builder.addCase(loadTracksFromDB.fulfilled, (state, action) => {
			tracksAdapter.setAll(state, action.payload);
			state.loading = false;
		});
		builder.addCase(loadTracksFromDB.rejected, (state) => {
			state.loading = false;
		});
	},
});

const selectors = tracksAdapter.getSelectors();
export const {
	selectAll: selectAllTracks,
	// selectById: selectTrackById
} = selectors;

export const selectTrackById: (
	state: ReturnType<typeof tracksAdapter.getInitialState>,
	id: string,
) => Metadata | undefined = selectors.selectById;

export const selectAllSelectedTracks = createSelector(
	[selectAllTracks],
	(tracks) => tracks.filter((track) => track.selected),
);

export default tracksSlice.reducer;
