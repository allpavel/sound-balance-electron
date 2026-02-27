import { createSlice } from "@reduxjs/toolkit";
import type { ProcessingResult } from "types";

const initialState: ProcessingResult = {
	successful: 0,
	failed: [],
	total: 0,
};

const resultssSlice = createSlice({
	name: "results",
	initialState,
	reducers: {
		setResults(_, action) {
			return action.payload;
		},
	},
});

export const { setResults } = resultssSlice.actions;
export default resultssSlice.reducer;
