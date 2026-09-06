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
import { settingsRepository } from "@renderer/db/repositories/settingsRepository";
import settingsReducer, {
	getSettings,
	initialSettings,
	saveSettings,
	setSettings,
} from "./settingsSlice";

vi.mock("@renderer/db/repositories/settingsRepository", () => ({
	settingsRepository: {
		getSettings: vi.fn(),
		saveSettings: vi.fn(),
	},
}));

type SettingsFormLike = typeof initialSettings;
interface SettingsState {
	data: SettingsFormLike;
	loading: boolean;
	error: string | null;
}

type GetSettingsResult = Awaited<
	ReturnType<typeof settingsRepository.getSettings>
>;

type SaveSettingsResult = Awaited<
	ReturnType<typeof settingsRepository.saveSettings>
>;

function createDeferred<T>() {
	return Promise.withResolvers<T>();
}

const createTestStore = (preloadedState?: { settings: SettingsState }) =>
	configureStore({ reducer: { settings: settingsReducer }, preloadedState });

const customSettings: SettingsFormLike = {
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
};

const getTestState = ({
	initial = false,
	loading = false,
	error = null,
}: {
	initial?: boolean;
	loading?: boolean;
	error?: string | null;
} = {}): SettingsState => ({
	data: initial ? initialSettings : customSettings,
	loading,
	error,
});

const savedPayload: SettingsFormLike = {
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

describe("settingsSlice - initial state", () => {
	it("exposes initialSettings nested in data, plus loading:false and error:null", () => {
		const store = createTestStore();
		const mockState = getTestState({ initial: true });
		expect(store.getState().settings).toEqual(mockState);
	});

	it("reducer returns initial state for undefined state", () => {
		const mockState = getTestState({ initial: true });
		expect(settingsReducer(undefined, { type: "init" })).toEqual(mockState);
	});
});

describe("settingsSlice - setSettings reducer", () => {
	it("replaces state and forces loading:false, error:null", () => {
		const prev = getTestState({ loading: true });
		const next = settingsReducer(prev, setSettings(customSettings));
		expect(next).toEqual(getTestState());
		expect(next).not.toBe(prev);
	});
});

describe("settingsSlice - getSettings thunk", () => {
	beforeEach(() => vi.resetAllMocks());

	it("sets loading during pending and clears it after fulfilled", async () => {
		const deferred = createDeferred<GetSettingsResult>();
		vi.mocked(settingsRepository.getSettings).mockReturnValue(deferred.promise);
		const previousState = getTestState();
		const store = createTestStore({
			settings: previousState,
		});
		const dispatchPromise = store.dispatch(getSettings());
		expect(settingsRepository.getSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).not.toHaveBeenCalled();
		expect(store.getState().settings).toEqual(getTestState({ loading: true }));
		deferred.resolve({
			status: "valid",
			data: customSettings,
		} as GetSettingsResult);
		const result = await dispatchPromise;
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(result.payload).toEqual(customSettings);
		expect(store.getState().settings).toEqual(getTestState());
	});

	it("full lifecycle: pending sets loading, rejected clears loading and preserves prior settings", async () => {
		const deferred = createDeferred<GetSettingsResult>();
		vi.mocked(settingsRepository.getSettings).mockReturnValue(deferred.promise);
		const previousState = getTestState();
		const store = createTestStore({
			settings: previousState,
		});
		const dispatchPromise = store.dispatch(getSettings());
		expect(settingsRepository.getSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).not.toHaveBeenCalled();
		expect(store.getState().settings).toEqual(getTestState({ loading: true }));
		deferred.reject(new Error("fail"));
		const result = await dispatchPromise;
		expect(result.meta.requestStatus).toBe("rejected");
		expect(store.getState().settings.loading).toBe(false);
		expect(store.getState().settings.error).toBe("fail");
		expect(store.getState().settings.data).toEqual(previousState.data);
	});

	it("falls back to initialSettings when repository returns empty", async () => {
		const previousState = getTestState();
		vi.mocked(settingsRepository.getSettings).mockResolvedValue({
			status: "empty",
		} as GetSettingsResult);
		const store = createTestStore({
			settings: previousState,
		});
		const result = await store.dispatch(getSettings());
		expect(settingsRepository.getSettings).toHaveBeenCalledTimes(1);
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(result.payload).toEqual(initialSettings);
		expect(store.getState().settings).toEqual(getTestState({ initial: true }));
		expect(store.getState().settings).not.toEqual(previousState);
	});

	it("falls back to initialSettings when repository returns invalid", async () => {
		const previousState = getTestState();
		vi.mocked(settingsRepository.getSettings).mockResolvedValue({
			status: "invalid",
			issues: "test",
		} as GetSettingsResult);
		const store = createTestStore({
			settings: previousState,
		});
		const result = await store.dispatch(getSettings());
		expect(result.meta.requestStatus).toBe("rejected");
	});

	it("replaces non-initial prior state on fulfill", async () => {
		vi.mocked(settingsRepository.getSettings).mockResolvedValue({
			status: "valid",
			data: customSettings,
		} as GetSettingsResult);
		const previousState = getTestState();
		const store = createTestStore({
			settings: previousState,
		});
		const result = await store.dispatch(getSettings());
		expect(settingsRepository.getSettings).toHaveBeenCalledTimes(1);
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(result.payload).toEqual(customSettings);
		expect(store.getState().settings).toEqual(previousState);
		expect(store.getState().settings.data.global.outputDirectoryPath).toBe(
			"/custom/path",
		);
		expect(store.getState().settings.data.global.concurrency).toBe(8);
		expect(store.getState().settings.data.audio.audioFilter).toBe("volume");
	});

	it("applies valid stored settings", async () => {
		vi.mocked(settingsRepository.getSettings).mockResolvedValue({
			status: "valid",
			data: customSettings,
		} as GetSettingsResult);
		const store = createTestStore({
			settings: getTestState({ loading: true }),
		});
		const result = await store.dispatch(getSettings());
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(store.getState().settings.data).toEqual(customSettings);
		expect(store.getState().settings.loading).toBe(false);
	});
});

describe("settingsSlice - saveSettings thunk", () => {
	beforeEach(() => vi.resetAllMocks());

	it("persists settings and reflects them in store", async () => {
		(
			settingsRepository.saveSettings as ReturnType<typeof vi.fn>
		).mockResolvedValue(undefined);
		const store = createTestStore();
		const payload = {
			...initialSettings,
			global: { ...initialSettings.global, outputDirectoryPath: "/out" },
		};
		await store.dispatch(saveSettings(payload));
		expect(settingsRepository.saveSettings).toHaveBeenCalledWith(payload);
		expect(store.getState().settings.data.global.outputDirectoryPath).toBe(
			"/out",
		);
		expect(store.getState().settings.loading).toBe(false);
	});

	it("sets loading to true while save is pending", async () => {
		const deferred = createDeferred<SaveSettingsResult>();
		vi.mocked(settingsRepository.saveSettings).mockReturnValue(
			deferred.promise,
		);
		const state = getTestState();
		const store = createTestStore({
			settings: state,
		});
		const dispatchPromise = store.dispatch(saveSettings(savedPayload));
		expect(settingsRepository.saveSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).toHaveBeenCalledWith(savedPayload);
		expect(settingsRepository.getSettings).not.toHaveBeenCalled();
		expect(store.getState().settings.loading).toBe(true);
		deferred.resolve(undefined as SaveSettingsResult);
		const result = await dispatchPromise;
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(result.payload).toEqual(savedPayload);
		expect(store.getState().settings.loading).toBe(false);
	});

	it("persists settings and replaces full store state on success", async () => {
		vi.mocked(settingsRepository.saveSettings).mockResolvedValue(
			undefined as SaveSettingsResult,
		);
		const store = createTestStore({
			settings: getTestState(),
		});
		const result = await store.dispatch(saveSettings(savedPayload));
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(result.payload).toEqual(savedPayload);
		expect(settingsRepository.saveSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).toHaveBeenCalledWith(savedPayload);
		expect(settingsRepository.getSettings).not.toHaveBeenCalled();
		expect(store.getState().settings).toEqual({
			data: savedPayload,
			loading: false,
			error: null,
		});
	});

	it("forces loading:false on success even if loading was previously true", async () => {
		vi.mocked(settingsRepository.saveSettings).mockResolvedValue(
			undefined as SaveSettingsResult,
		);
		const store = createTestStore({
			settings: getTestState({ loading: true }),
		});
		await store.dispatch(saveSettings(savedPayload));
		expect(store.getState().settings.loading).toBe(false);
		expect(store.getState().settings.data).toEqual(savedPayload);
	});

	it("does not update store state when repository throws", async () => {
		vi.mocked(settingsRepository.saveSettings).mockRejectedValue(
			new Error("fail"),
		);
		const store = createTestStore();
		const before = store.getState().settings.data;
		const result = await store.dispatch(
			saveSettings({
				...initialSettings,
				global: { ...initialSettings.global, outputDirectoryPath: "/new" },
			}),
		);
		expect(result.meta.requestStatus).toBe("rejected");
		expect(store.getState().settings.data).toBe(before);
		expect(store.getState().settings.error).toBe("fail");
	});

	it("rejects without calling repository when settings are invalid", async () => {
		const store = createTestStore();
		const before = store.getState().settings;
		const invalidSettings = {
			...initialSettings,
			global: {
				...initialSettings.global,
				concurrency: 999,
			},
		};
		const result = await store.dispatch(saveSettings(invalidSettings));
		expect(result.meta.requestStatus).toBe("rejected");
		expect(settingsRepository.saveSettings).not.toHaveBeenCalled();
		expect(store.getState().settings.data).toEqual(before.data);
		expect(store.getState().settings.error).not.toBeNull();
	});
});
