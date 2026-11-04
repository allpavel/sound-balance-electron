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
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
	SYSTEM_COLLECTION_ID,
	SYSTEM_COLLECTION_TITLE,
} from "@shared/constants";
import type { ActiveCollection } from "@shared/schemas/collection.schema";
import { safeParseActiveCollection } from "@shared/validators";

const initialState: ActiveCollection = {
	id: SYSTEM_COLLECTION_ID,
	title: SYSTEM_COLLECTION_TITLE,
};

const activeCollectionSlice = createSlice({
	name: "activeCollection",
	initialState,
	reducers: {
		setActiveCollection: (_, action: PayloadAction<ActiveCollection>) => {
			const parsed = safeParseActiveCollection(action.payload);
			if (!parsed.success) {
				return;
			}
			return parsed.data;
		},
	},
});

export const { setActiveCollection } = activeCollectionSlice.actions;
export default activeCollectionSlice.reducer;
