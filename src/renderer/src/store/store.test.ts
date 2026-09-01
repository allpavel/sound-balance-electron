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

import { settingsRepository } from "@renderer/db/repositories/settingsRepository";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import type { ProcessingResult } from "@/types";
import { setActiveCollection } from "./slices/collectionSlice";
import { setResults } from "./slices/resultsSlice";
import {
	loadSelectedTracks,
	setAllSelectedTracks,
	setSelectedTrack,
} from "./slices/selectedTracksSlice";
import {
	getSettings,
	initialSettings,
	saveSettings,
	setSettings,
} from "./slices/settingsSlice";
import { type AppDispatch, createAppStore, type RootState } from "./store";

vi.mock("@renderer/db/repositories/trackRepository", () => ({
	tracksRepository: {
		getAll: vi.fn(),
		update: vi.fn(),
		updateMany: vi.fn(),
		removeMany: vi.fn(),
	},
}));
vi.mock("@renderer/db/repositories/settingsRepository", () => ({
	settingsRepository: {
		getSettings: vi.fn(),
		saveSettings: vi.fn(),
	},
}));

type SettingsState = RootState["settings"];
type SelectedTracksState = RootState["selectedTracks"];
type ResultsState = RootState["results"];
type ActiveCollectionState = RootState["activeCollection"];
type SettingsFormLike = Omit<SettingsState, "loading">;

type GetSettingsResult = Awaited<
	ReturnType<typeof settingsRepository.getSettings>
>;
type SaveSettingsResult = Awaited<
	ReturnType<typeof settingsRepository.saveSettings>
>;
type GetAllTracksResult = Awaited<ReturnType<typeof tracksRepository.getAll>>;

const customSettings: SettingsState = {
	...initialSettings,
	global: {
		...initialSettings.global,
		outputDirectoryPath: "/custom/path",
		openOutputFolderOnComplete: true,
		overwrite: false,
		noOverwrite: true,
		concurrency: 8,
	},
	audio: {
		...initialSettings.audio,
		audioFilter: "volume",
	},
	loading: false,
};

const savedSettings: SettingsFormLike = {
	...initialSettings,
	global: {
		...initialSettings.global,
		outputDirectoryPath: "/saved",
		concurrency: 3,
	},
	audio: {
		...initialSettings.audio,
		audioFilter: "loudnorm",
	},
};

const storedSettings: SettingsFormLike = {
	...initialSettings,
	global: {
		...initialSettings.global,
		outputDirectoryPath: "/stored",
		concurrency: 5,
	},
	audio: {
		...initialSettings.audio,
		audioFilter: "highpass",
	},
};

const mockSelectedTracks: SelectedTracksState = {
	t1: true,
	t2: false,
};

const mockCollection: ActiveCollectionState = {
	id: "custom",
	title: "Custom",
};

const mockResults: ResultsState = {
	successful: 2,
	failed: [
		{
			id: "f1",
			title: "Failed track",
			reason: "error",
		},
	],
	total: 3,
};

const fullPreloadedState: RootState = {
	selectedTracks: mockSelectedTracks,
	settings: customSettings,
	results: mockResults,
	activeCollection: mockCollection,
};

const getPreloadedState = (): RootState => structuredClone(fullPreloadedState);

const expectNoTrackRepositoryCalls = (): void => {
	expect(tracksRepository.getAll).not.toHaveBeenCalled();
	expect(tracksRepository.update).not.toHaveBeenCalled();
	expect(tracksRepository.updateMany).not.toHaveBeenCalled();
	expect(tracksRepository.removeMany).not.toHaveBeenCalled();
};

const expectNoSettingsRepositoryCalls = (): void => {
	expect(settingsRepository.getSettings).not.toHaveBeenCalled();
	expect(settingsRepository.saveSettings).not.toHaveBeenCalled();
};

const expectNoRepositoryCalls = (): void => {
	expectNoTrackRepositoryCalls();
	expectNoSettingsRepositoryCalls();
};

describe("Store shape and initialization", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("creates the actual app store with exact root keys and initial state", () => {
		const initialSettingsSnapshot = structuredClone(initialSettings);
		const store = createAppStore();
		const state = store.getState();
		expect(Object.keys(state).sort()).toEqual([
			"activeCollection",
			"results",
			"selectedTracks",
			"settings",
		]);
		expect(state.selectedTracks).toEqual({});
		expect(state.activeCollection).toEqual({
			id: "all",
			title: "All",
		});
		expect(state.results).toEqual({
			successful: 0,
			failed: [],
			total: 0,
		});
		expect(state.settings).toEqual({
			...initialSettings,
			loading: false,
		});
		expect(initialSettings).toEqual(initialSettingsSnapshot);
		expectNoRepositoryCalls();
	});

	it("leaves state unchanged for an unknown action", () => {
		const store = createAppStore();
		const before = store.getState();
		store.dispatch({ type: "unknown/action" });
		const after = store.getState();
		expect(after).toBe(before);
		expectNoRepositoryCalls();
	});
});

describe("Synchronous slice isolation", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("replaces the results and leaves the other slices unchanged when setResults is dispatched", () => {
		const payload: ProcessingResult = {
			successful: 3,
			failed: [
				{
					id: "1",
					title: "Track 1",
					reason: "error",
				},
			],
			total: 4,
		};
		const store = createAppStore(getPreloadedState());
		const before = store.getState();
		store.dispatch(setResults(payload));
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.results).toEqual(payload);
		expect(after.results).not.toBe(before.results);
		expect(after.selectedTracks).toBe(before.selectedTracks);
		expect(after.settings).toBe(before.settings);
		expect(after.activeCollection).toBe(before.activeCollection);
		expectNoRepositoryCalls();
		expect(() => structuredClone(after)).not.toThrow();
	});

	it("replaces the active collection and leaves the other slices unchanged when setActiveCollection is dispatched", () => {
		const nextCollection: ActiveCollectionState = {
			id: "favs",
			title: "Favs",
		};
		const store = createAppStore(getPreloadedState());
		const before = store.getState();
		store.dispatch(setActiveCollection(nextCollection));
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.activeCollection).toEqual(nextCollection);
		expect(after.activeCollection).not.toBe(before.activeCollection);
		expect(after.selectedTracks).toBe(before.selectedTracks);
		expect(after.settings).toBe(before.settings);
		expect(after.results).toBe(before.results);
		expectNoRepositoryCalls();
		expect(() => structuredClone(after)).not.toThrow();
	});

	it("updates the selected tracks and leaves the other slices unchanged when setSelectedTrack is dispatched", () => {
		const store = createAppStore(getPreloadedState());
		const before = store.getState();
		store.dispatch(setSelectedTrack({ id: "t1", selected: false }));
		store.dispatch(setSelectedTrack({ id: "t3", selected: true }));
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.selectedTracks).toEqual({
			...mockSelectedTracks,
			t1: false,
			t3: true,
		});
		expect(after.selectedTracks).not.toBe(before.selectedTracks);
		expect(after.settings).toBe(before.settings);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expectNoRepositoryCalls();
		expect(() => structuredClone(after)).not.toThrow();
	});

	it("replaces the entire selected tracks map when setAllSelectedTracks is dispatched", () => {
		const store = createAppStore(getPreloadedState());
		const before = store.getState();
		store.dispatch(setAllSelectedTracks({ only: true }));
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.selectedTracks).toEqual({
			only: true,
		});
		expect(after.selectedTracks).not.toBe(before.selectedTracks);
		expect(after.settings).toBe(before.settings);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expectNoRepositoryCalls();
	});

	it("replaces the settings, forces loading to false, and leaves the other slices unchanged when setSettings is dispatched", () => {
		const preloaded = getPreloadedState();
		preloaded.settings = {
			...customSettings,
			loading: true,
		};
		const store = createAppStore(preloaded);
		const before = store.getState();
		store.dispatch(setSettings(savedSettings));
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.settings).toEqual({
			...savedSettings,
			loading: false,
		});
		expect(after.settings).not.toBe(before.settings);
		expect(after.settings.global).not.toBe(before.settings.global);
		expect(after.settings.audio).not.toBe(before.settings.audio);
		expect(after.selectedTracks).toBe(before.selectedTracks);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expectNoRepositoryCalls();
		expect(() => structuredClone(after)).not.toThrow();
	});

	it("supports a realistic mixed sequence of synchronous updates", () => {
		const payload: ProcessingResult = {
			successful: 1,
			failed: [],
			total: 1,
		};
		const store = createAppStore(getPreloadedState());
		store.dispatch(setActiveCollection({ id: "seq", title: "Seq" }));
		store.dispatch(setSelectedTrack({ id: "t9", selected: true }));
		store.dispatch(setSettings(savedSettings));
		store.dispatch(setResults(payload));
		const state = store.getState();
		expect(state.activeCollection).toEqual({
			id: "seq",
			title: "Seq",
		});
		expect(state.selectedTracks).toEqual({
			...mockSelectedTracks,
			t9: true,
		});
		expect(state.settings).toEqual({
			...savedSettings,
			loading: false,
		});
		expect(state.results).toEqual(payload);
		expect(() => structuredClone(state)).not.toThrow();
		expectNoRepositoryCalls();
	});
});

describe("Thunk integration smoke tests", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("updates only the settings slice when the getSettings thunk is dispatched", async () => {
		vi.mocked(settingsRepository.getSettings).mockResolvedValue({
			status: "valid",
			data: storedSettings,
		} as GetSettingsResult);
		const store = createAppStore(getPreloadedState());
		const dispatch: AppDispatch = store.dispatch;
		const before = store.getState();
		const result = await dispatch(getSettings());
		expect(result.meta.requestStatus).toBe("fulfilled");
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.settings).toEqual({
			...storedSettings,
			loading: false,
		});
		expect(after.settings).not.toBe(before.settings);
		expect(after.selectedTracks).toBe(before.selectedTracks);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expect(settingsRepository.getSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).not.toHaveBeenCalled();
		expectNoTrackRepositoryCalls();
	});

	it("updates only the settings slice when the saveSettings thunk is dispatched", async () => {
		vi.mocked(settingsRepository.saveSettings).mockResolvedValue(
			undefined as SaveSettingsResult,
		);
		const store = createAppStore(getPreloadedState());
		const dispatch: AppDispatch = store.dispatch;
		const before = store.getState();
		const result = await dispatch(saveSettings(savedSettings));
		expect(result.meta.requestStatus).toBe("fulfilled");
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.settings).toEqual({
			...savedSettings,
			loading: false,
		});
		expect(after.settings).not.toBe(before.settings);
		expect(after.selectedTracks).toBe(before.selectedTracks);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expect(settingsRepository.saveSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).toHaveBeenCalledWith(savedSettings);
		expect(settingsRepository.getSettings).not.toHaveBeenCalled();
		expectNoTrackRepositoryCalls();
	});

	it("updates only the selected tracks slice when the loadSelectedTracks thunk is dispatched", async () => {
		const tracks = [
			{ id: "a", selected: 1 },
			{ id: "b", selected: 0 },
		] as unknown as GetAllTracksResult;
		vi.mocked(tracksRepository.getAll).mockResolvedValue(tracks);
		const store = createAppStore(getPreloadedState());
		const dispatch: AppDispatch = store.dispatch;
		const before = store.getState();
		const result = await dispatch(loadSelectedTracks());
		expect(result.meta.requestStatus).toBe("fulfilled");
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.selectedTracks).toEqual({
			a: true,
			b: false,
		});
		expect(after.selectedTracks).not.toBe(before.selectedTracks);
		expect(after.settings).toBe(before.settings);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expect(tracksRepository.getAll).toHaveBeenCalledTimes(1);
		expect(tracksRepository.getAll).toHaveBeenCalledWith("all");
		expect(tracksRepository.update).not.toHaveBeenCalled();
		expect(tracksRepository.updateMany).not.toHaveBeenCalled();
		expect(tracksRepository.removeMany).not.toHaveBeenCalled();
		expectNoSettingsRepositoryCalls();
	});
});
