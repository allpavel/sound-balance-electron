import { createSlice } from "@reduxjs/toolkit";

type ActiveCollection = {
	id: string;
	title: string;
};

const initialState: ActiveCollection = {
	id: "all",
	title: "All",
};

const activeCollectionSlice = createSlice({
	name: "activeCollection",
	initialState,
	reducers: {
		setActiveCollection: (_, action) => {
			return action.payload;
		},
	},
});

export const { setActiveCollection } = activeCollectionSlice.actions;
export default activeCollectionSlice.reducer;
