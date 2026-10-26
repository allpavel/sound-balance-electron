/*
 * sound-balance-electron
 * Copyright (C) 2026 Pavel Alloyarov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import {
	createAsyncThunk,
	createSlice,
	type PayloadAction,
} from "@reduxjs/toolkit";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import { SYSTEM_COLLECTION_ID } from "@shared/constants";

type SelectedTracksState = Record<string, boolean>;

const initialState: SelectedTracksState = {};

/**
 * Loads every track in the system collection and derives the selection map
 * (`trackId → selected`).
 *
 * The state transition is applied by the slice's `extraReducers` on
 * fulfillment; the thunk performs data access and projection only.
 *
 * @returns The complete selection map; replaces prior state wholesale.
 */
export const loadSelectedTracks = createAsyncThunk(
	"selectedTracks/load",
	async (): Promise<SelectedTracksState> => {
		const tracks = await tracksRepository.getAll(SYSTEM_COLLECTION_ID);
		return tracks.reduce((acc: SelectedTracksState, item) => {
			acc[item.id] = item.selected === 1;
			return acc;
		}, {});
	},
);

const selectedTracksSlice = createSlice({
	name: "selectedTracks",
	initialState,
	reducers: {
		/**
		 * Replaces the entire selection map wholesale.
		 *
		 * Retained public slice API (R-1 fallback): a live consumer was identified
		 * at removal time. `loadSelectedTracks.fulfilled` remains the canonical
		 * bulk write for the load flow; this reducer serves imperative bulk
		 * selection only — do not use it for load results.
		 */
		setAllSelectedTracks(_, action: PayloadAction<SelectedTracksState>) {
			return action.payload;
		},
		setSelectedTrack(
			state,
			action: PayloadAction<{ id: string; selected: boolean }>,
		) {
			state[action.payload.id] = action.payload.selected;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(
			loadSelectedTracks.fulfilled,
			(_, action) => action.payload,
		);
	},
});

export const { setAllSelectedTracks, setSelectedTrack } =
	selectedTracksSlice.actions;

export default selectedTracksSlice.reducer;
