import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";

// type SelectedTrack = {
// 	id: string;
// 	selected: boolean;
// };

// export const selectedTracksAdapter = createEntityAdapter<SelectedTrack>({
// 	sortComparer: (a: SelectedTrack, b: SelectedTrack) =>
// 		a.id.localeCompare(b.id),
// });

// export const loadSelectedTracks = createAsyncThunk(
// 	"selectedTracks/load",
// 	async (_, { dispatch }) => {
// 		const tracks = await tracksRepository.getAll();
// 		console.log(tracks);
// 		const res = tracks.map((track) => ({
// 			id: track.id,
// 			selected: track.selected === 1,
// 		}));
// 		dispatch(selectedTracksSlice.actions.setAllTracks(res));
// 	},
// );

// const selectedTracksSlice = createSlice({
// 	name: "selectedTracks",
// 	initialState: selectedTracksAdapter.getInitialState(),
// 	reducers: {
// 		setAllTracks: selectedTracksAdapter.setAll,
// 	},
// });

// const selectors = selectedTracksAdapter.getSelectors();
// export const { selectAll } = selectors;

// export const getAllSelectedTracks = createSelector([selectAll], (tracks) =>
// 	tracks.reduce((acc: Record<string, boolean>, value) => {
// 		acc[value.id] = value.selected;
// 		return acc;
// 	}, {}),
// );

// export const { setAllTracks } = selectedTracksSlice.actions;

// export default selectedTracksSlice.reducer;
type SelectedTracksState = Record<string, boolean>;

const initialState: SelectedTracksState = {};

export const loadSelectedTracks = createAsyncThunk(
	"selectedTracks/load",
	async (_, { dispatch }) => {
		const tracks = await tracksRepository.getAll("all");
		const res = tracks.reduce((acc: SelectedTracksState, item) => {
			acc[item.id] = item.selected === 1;
			return acc;
		}, {});
		dispatch(setAllSelectedTracks(res));
		return res;
	},
);

const selectedTracksSlice = createSlice({
	name: "selectedTracks",
	initialState,
	reducers: {
		setAllSelectedTracks(
			_,
			action: { payload: SelectedTracksState; type: string },
		) {
			return action.payload;
		},
		setSelectedTrack(
			state,
			action: { payload: { id: string; selected: boolean }; type: string },
		) {
			state[action.payload.id] = action.payload.selected;
		},
	},
});

export const { setAllSelectedTracks, setSelectedTrack } =
	selectedTracksSlice.actions;

export default selectedTracksSlice.reducer;
