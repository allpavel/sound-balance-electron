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
import { configureStore } from "@reduxjs/toolkit";
import collectionReducer, { setActiveCollection } from "./collectionSlice";

describe("collectionSlice", () => {
	const store = configureStore({
		reducer: { activeCollection: collectionReducer },
	});

	it("has the correct initial state", () => {
		expect(store.getState().activeCollection).toEqual({
			id: "all",
			title: "All",
		});
	});

	it("setActiveCollection replaces the active collection", () => {
		const newCollection = { id: "custom", title: "My Collection" };
		store.dispatch(setActiveCollection(newCollection));
		expect(store.getState().activeCollection).toEqual(newCollection);
	});
});
