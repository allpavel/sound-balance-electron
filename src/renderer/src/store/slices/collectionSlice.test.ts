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
import {
	SYSTEM_COLLECTION_ID,
	SYSTEM_COLLECTION_TITLE,
} from "@shared/constants";
import collectionReducer, { setActiveCollection } from "./collectionSlice";

describe("collectionSlice", () => {
	const store = configureStore({
		reducer: { activeCollection: collectionReducer },
	});

	it("has the correct initial state", () => {
		expect(store.getState().activeCollection).toEqual({
			id: SYSTEM_COLLECTION_ID,
			title: SYSTEM_COLLECTION_TITLE,
		});
	});

	it("setActiveCollection replaces the active collection", () => {
		const newCollection = { id: "custom", title: "My Collection" };
		store.dispatch(setActiveCollection(newCollection));
		expect(store.getState().activeCollection).toEqual(newCollection);
	});

	it.each([
		["an empty id", { id: "", title: "Mix" }],
		["a whitespace-only id", { id: "   ", title: "Mix" }],
		["an id with null bytes", { id: "col\u0000x", title: "Mix" }],
		["a non-string id", { id: 42, title: "Mix" }],
		["an empty title", { id: "custom", title: "" }],
		["a non-string title", { id: "custom", title: 7 }],
		["a missing title", { id: "custom" }],
		["a null payload", null],
		["unexpected extra keys", { id: "custom", title: "Mix", extra: 1 }],
	])("leaves the state untouched for %s", (_label, payload) => {
		const before = store.getState().activeCollection;
		store.dispatch({ type: setActiveCollection.type, payload });
		expect(store.getState().activeCollection).toBe(before);
	});

	it("accepts the system collection payload", () => {
		store.dispatch(
			setActiveCollection({
				id: SYSTEM_COLLECTION_ID,
				title: SYSTEM_COLLECTION_TITLE,
			}),
		);
		expect(store.getState().activeCollection).toEqual({
			id: SYSTEM_COLLECTION_ID,
			title: SYSTEM_COLLECTION_TITLE,
		});
	});

	it("keeps the previously valid selection when a later payload is invalid", () => {
		store.dispatch(setActiveCollection({ id: "valid", title: "Valid" }));
		const before = store.getState().activeCollection;
		store.dispatch({
			type: setActiveCollection.type,
			payload: { id: "  ", title: "Bad" },
		});
		expect(store.getState().activeCollection).toBe(before);
		expect(store.getState().activeCollection).toEqual({
			id: "valid",
			title: "Valid",
		});
	});
});
