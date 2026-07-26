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
import { describe, expect, it } from "vitest";
import type { ProcessingResult } from "@/types";
import resultsReducer, { setResults } from "./resultsSlice";

describe("resultsSlice", () => {
	const store = configureStore({
		reducer: { results: resultsReducer },
	});

	it("has the correct initial state", () => {
		expect(store.getState().results).toEqual({
			successful: 0,
			failed: [],
			total: 0,
		});
	});

	it("setResults replaces the entire state", () => {
		const payload: ProcessingResult = {
			successful: 5,
			failed: [{ id: "1", title: "Track1", reason: "error" }],
			total: 6,
		};
		store.dispatch(setResults(payload));
		expect(store.getState().results).toEqual(payload);
	});
});
