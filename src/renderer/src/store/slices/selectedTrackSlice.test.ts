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

import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import selectedTracksReducer, {
	loadSelectedTracks,
	setAllSelectedTracks,
	setSelectedTrack,
} from "./selectedTracksSlice";

vi.mock("@renderer/db/repositories/trackRepository", () => ({
	tracksRepository: {
		getAll: vi.fn(),
		update: vi.fn(),
		updateMany: vi.fn(),
		removeMany: vi.fn(),
	},
}));

const createTestStore = (
	preloadedState?: { selectedTracks: Record<string, boolean> },
	middleware?: Middleware[],
) =>
	configureStore({
		reducer: { selectedTracks: selectedTracksReducer },
		preloadedState,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware().concat(middleware || []),
	});

describe("selectedTracksSlice - reducers", () => {
	describe("reducers", () => {
		it("starts with an empty map", () => {
			expect(selectedTracksReducer(undefined, { type: "init" })).toEqual({});
		});

		it("is correctly registered in the store under 'selectedTracks'", () => {
			const store = createTestStore();
			expect(store.getState().selectedTracks).toEqual({});
		});

		it("setAllSelectedTracks replaces the entire state", () => {
			const initialState = { a: true, b: false };
			const selectedTracks = selectedTracksReducer(
				initialState,
				setAllSelectedTracks({ c: true }),
			);
			expect(selectedTracks).toEqual({ c: true });
			expect(selectedTracks).not.toBe(initialState);
		});

		it("setAllSelectedTracks with empty payload clears state", () => {
			const selectedTracks = selectedTracksReducer(
				{ a: true, b: false },
				setAllSelectedTracks({}),
			);
			expect(selectedTracks).toEqual({});
		});

		it("setSelectedTrack adds a new entry", () => {
			const selectedTracks = selectedTracksReducer(
				{},
				setSelectedTrack({ id: "x", selected: true }),
			);
			expect(selectedTracks).toEqual({ x: true });
		});

		it("setSelectedTrack overrides an existing entry", () => {
			const selectedTracks = selectedTracksReducer(
				{ x: true },
				setSelectedTrack({ id: "x", selected: false }),
			);
			expect(selectedTracks).toEqual({ x: false });
		});

		it("setSelectedTrack preserves other entries", () => {
			const selectedTracks = selectedTracksReducer(
				{ a: true, b: false },
				setSelectedTrack({ id: "c", selected: true }),
			);
			expect(selectedTracks).toEqual({ a: true, b: false, c: true });
		});
	});

	describe("loadSelectedTracks thunk", () => {
		beforeEach(() => vi.resetAllMocks());

		it("calls tracksRepository.getAll with all", async () => {
			vi.mocked(tracksRepository.getAll).mockResolvedValue([]);
			const store = createTestStore();
			await store.dispatch(loadSelectedTracks());
			expect(tracksRepository.getAll).toHaveBeenCalledTimes(1);
			expect(tracksRepository.getAll).toHaveBeenCalledWith("all");
			expect(tracksRepository.update).not.toHaveBeenCalled();
			expect(tracksRepository.updateMany).not.toHaveBeenCalled();
			expect(tracksRepository.removeMany).not.toHaveBeenCalled();
		});

		it("maps selected === 1 to true and anything else to false", async () => {
			const mockData = [
				{ id: "a", selected: 1 },
				{ id: "b", selected: 0 },
				{ id: "c", selected: 2 },
				{ id: "d", selected: undefined },
				{ id: "e" } as any,
			];
			const mockResult = {
				a: true,
				b: false,
				c: false,
				d: false,
				e: false,
			};
			vi.mocked(tracksRepository.getAll).mockResolvedValue(mockData);
			const store = createTestStore();
			const result = await store.dispatch(loadSelectedTracks());
			expect(store.getState().selectedTracks).toEqual(mockResult);
			expect(result.payload).toEqual(mockResult);
		});

		it("dispatches the correct sequence of actions", async () => {
			vi.mocked(tracksRepository.getAll).mockResolvedValue([
				{ id: "a", selected: 1 } as any,
			]);
			const actionLog: any[] = [];
			const logMiddleware: Middleware = () => (next) => (action) => {
				actionLog.push(action);
				return next(action);
			};
			const store = createTestStore(undefined, [logMiddleware]);
			await store.dispatch(loadSelectedTracks());
			const actionTypes = actionLog.map((a) => a.type);
			expect(actionTypes).toEqual([
				"selectedTracks/load/pending",
				"selectedTracks/setAllSelectedTracks",
				"selectedTracks/load/fulfilled",
			]);
		});

		it("handles an empty track list", async () => {
			vi.mocked(tracksRepository.getAll).mockResolvedValue([]);
			const store = createTestStore();
			await store.dispatch(loadSelectedTracks());
			expect(store.getState().selectedTracks).toEqual({});
		});

		it("overwrites the previous state, does not merge", async () => {
			vi.mocked(tracksRepository.getAll).mockResolvedValue([
				{ id: "1", selected: 1 } as any,
			]);
			const store = createTestStore({ selectedTracks: { stale: true } });
			await store.dispatch(loadSelectedTracks());
			expect(store.getState().selectedTracks).toEqual({ "1": true });
		});

		it("handles duplicate track IDs by keeping the last occurrence", async () => {
			vi.mocked(tracksRepository.getAll).mockResolvedValue([
				{ id: "1", selected: 1 },
				{ id: "1", selected: 0 },
			] as any);
			const store = createTestStore();
			await store.dispatch(loadSelectedTracks());
			expect(store.getState().selectedTracks).toEqual({ 1: false });
		});

		it("handles tracks with missing IDs by using 'undefined' as the key", async () => {
			vi.mocked(tracksRepository.getAll).mockResolvedValue([
				{ selected: 1 },
			] as any);
			const store = createTestStore();
			await store.dispatch(loadSelectedTracks());
			expect(store.getState().selectedTracks).toEqual({ undefined: true });
		});

		it("leaves state untouched when repository rejects", async () => {
			vi.mocked(tracksRepository.getAll).mockRejectedValue(
				new Error("db down"),
			);
			const store = createTestStore();
			store.dispatch(setSelectedTrack({ id: "1", selected: true }));
			const result = await store.dispatch(loadSelectedTracks());
			expect(result.meta.requestStatus).toBe("rejected");
			expect(store.getState().selectedTracks).toEqual({ "1": true });
		});

		it("rejects if repository resolves with null", async () => {
			vi.mocked(tracksRepository.getAll).mockResolvedValue(null as any);
			const store = createTestStore({ selectedTracks: { "1": true } });
			const result = await store.dispatch(loadSelectedTracks());
			expect(result.meta.requestStatus).toBe("rejected");
			expect(store.getState().selectedTracks).toEqual({ "1": true });
		});

		it("resolves concurrent loads with the last dispatched state", async () => {
			let resolveFirst: any;
			let resolveSecond: any;
			vi.mocked(tracksRepository.getAll)
				.mockImplementationOnce(
					() =>
						new Promise((res) => {
							resolveFirst = res;
						}),
				)
				.mockImplementationOnce(
					() =>
						new Promise((res) => {
							resolveSecond = res;
						}),
				);
			const store = createTestStore();
			const promise1 = store.dispatch(loadSelectedTracks());
			const promise2 = store.dispatch(loadSelectedTracks());
			resolveSecond([{ id: "second", selected: 1 }]);
			await promise2;
			expect(store.getState().selectedTracks).toEqual({ second: true });
			resolveFirst([{ id: "first", selected: 1 }]);
			await promise1;
			expect(store.getState().selectedTracks).toEqual({ first: true });
		});
	});
});
