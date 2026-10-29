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
import {
	SYSTEM_COLLECTION_ID,
	SYSTEM_COLLECTION_TITLE,
} from "@shared/constants";
import type { ProcessingResult } from "@/types";
import { setActiveCollection } from "./slices/collectionSlice";
import { setResults } from "./slices/resultsSlice";
import {
	getSettings,
	initialSettings,
	saveSettings,
	setSettings,
} from "./slices/settingsSlice";
import { type AppDispatch, createAppStore, type RootState } from "./store";

vi.mock("@renderer/db/repositories/settingsRepository", () => ({
	settingsRepository: {
		getSettings: vi.fn(),
		saveSettings: vi.fn(),
	},
}));

type ResultsState = RootState["results"];
type ActiveCollectionState = RootState["activeCollection"];
type SettingsFormLike = typeof initialSettings;
type SettingsState = {
	data: SettingsFormLike;
	loading: boolean;
	error: string | null;
};

const customSettings: SettingsState = {
	data: {
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
	},
	loading: false,
	error: null,
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
	settings: customSettings,
	results: mockResults,
	activeCollection: mockCollection,
};

const getPreloadedState = (): RootState => structuredClone(fullPreloadedState);
const expectNoSettingsRepositoryCalls = (): void => {
	expect(settingsRepository.getSettings).not.toHaveBeenCalled();
	expect(settingsRepository.saveSettings).not.toHaveBeenCalled();
};

describe("Store shape and initialization", () => {
	it("creates the actual app store with exact root keys and initial state", () => {
		const initialSettingsSnapshot = structuredClone(initialSettings);
		const store = createAppStore();
		const state = store.getState();
		expect(Object.keys(state).sort()).toEqual([
			"activeCollection",
			"results",
			"settings",
		]);
		expect(state.activeCollection).toEqual({
			id: SYSTEM_COLLECTION_ID,
			title: SYSTEM_COLLECTION_TITLE,
		});
		expect(state.results).toEqual({
			successful: 0,
			failed: [],
			total: 0,
		});
		expect(state.settings).toEqual({
			data: initialSettings,
			loading: false,
			error: null,
		});
		expect(initialSettings).toEqual(initialSettingsSnapshot);
		expectNoSettingsRepositoryCalls();
	});

	it("leaves state unchanged for an unknown action", () => {
		const store = createAppStore();
		const before = store.getState();
		store.dispatch({ type: "unknown/action" });
		const after = store.getState();
		expect(after).toBe(before);
		expectNoSettingsRepositoryCalls();
	});
});

describe("Synchronous slice isolation", () => {
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
		expect(after.settings).toBe(before.settings);
		expect(after.activeCollection).toBe(before.activeCollection);
		expectNoSettingsRepositoryCalls();
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
		expect(after.settings).toBe(before.settings);
		expect(after.results).toBe(before.results);
		expectNoSettingsRepositoryCalls();
		expect(() => structuredClone(after)).not.toThrow();
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
			data: savedSettings,
			loading: false,
			error: null,
		});
		expect(after.settings).not.toBe(before.settings);
		expect(after.settings.data.global).not.toBe(before.settings.data.global);
		expect(after.settings.data.audio).not.toBe(before.settings.data.audio);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expectNoSettingsRepositoryCalls();
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
		store.dispatch(setSettings(savedSettings));
		store.dispatch(setResults(payload));
		const state = store.getState();
		expect(state.activeCollection).toEqual({
			id: "seq",
			title: "Seq",
		});
		expect(state.settings).toEqual({
			data: savedSettings,
			loading: false,
			error: null,
		});
		expect(state.results).toEqual(payload);
		expect(() => structuredClone(state)).not.toThrow();
		expectNoSettingsRepositoryCalls();
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
		});
		const store = createAppStore(getPreloadedState());
		const dispatch: AppDispatch = store.dispatch;
		const before = store.getState();
		const result = await dispatch(getSettings());
		expect(result.meta.requestStatus).toBe("fulfilled");
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.settings).toEqual({
			data: storedSettings,
			loading: false,
			error: null,
		});
		expect(after.settings).not.toBe(before.settings);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expect(settingsRepository.getSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).not.toHaveBeenCalled();
	});

	it("updates only the settings slice when the saveSettings thunk is dispatched", async () => {
		vi.mocked(settingsRepository.saveSettings).mockResolvedValue(undefined);
		const store = createAppStore(getPreloadedState());
		const dispatch: AppDispatch = store.dispatch;
		const before = store.getState();
		const result = await dispatch(saveSettings(savedSettings));
		expect(result.meta.requestStatus).toBe("fulfilled");
		const after = store.getState();
		expect(after).not.toBe(before);
		expect(after.settings).toEqual({
			data: savedSettings,
			loading: false,
			error: null,
		});
		expect(after.settings).not.toBe(before.settings);
		expect(after.results).toBe(before.results);
		expect(after.activeCollection).toBe(before.activeCollection);
		expect(settingsRepository.saveSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).toHaveBeenCalledWith(savedSettings);
		expect(settingsRepository.getSettings).not.toHaveBeenCalled();
	});
});
