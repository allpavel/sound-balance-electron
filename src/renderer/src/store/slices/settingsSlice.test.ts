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
type SettingsState = SettingsFormLike & { loading: boolean };

type GetSettingsResult = Awaited<
	ReturnType<typeof settingsRepository.getSettings>
>;

type SaveSettingsResult = Awaited<
	ReturnType<typeof settingsRepository.saveSettings>
>;

function createDeferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
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
		audioFilter: "volume=2",
	},
};

const getTestState = ({
	initial = false,
	loading = false,
}: {
	initial?: boolean;
	loading?: boolean;
} = {}): SettingsState => ({
	...(initial ? initialSettings : customSettings),
	loading,
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
	it("exposes initialSettings plus loading:false", () => {
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
	it("replaces state and forces loading:false", () => {
		const prev = getTestState({ loading: true });
		const next = settingsReducer(prev, setSettings(customSettings));
		expect(next).toEqual(getTestState());
		expect(next).not.toBe(prev);
	});

	it("strips loading from payload if present at runtime", () => {
		const prev = getTestState();
		const payloadWithLoading = getTestState({ loading: true });
		const next = settingsReducer(prev, setSettings(payloadWithLoading));
		expect(next).toEqual(prev);
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
		deferred.resolve(customSettings as GetSettingsResult);
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
		expect(store.getState().settings).toEqual(getTestState());
	});

	it("falls back to initialSettings when repository returns null", async () => {
		const previousState = getTestState();
		vi.mocked(settingsRepository.getSettings).mockResolvedValue(null);
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

	it("falls back to initialSettings when repository returns undefined", async () => {
		const previousState = getTestState();
		vi.mocked(settingsRepository.getSettings).mockResolvedValue(
			undefined as any,
		);
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

	it("replaces non-initial prior state on fulfill", async () => {
		vi.mocked(settingsRepository.getSettings).mockResolvedValue(
			customSettings as GetSettingsResult,
		);
		const previousState = getTestState();
		const store = createTestStore({
			settings: previousState,
		});
		const result = await store.dispatch(getSettings());
		expect(settingsRepository.getSettings).toHaveBeenCalledTimes(1);
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(result.payload).toEqual(customSettings);
		expect(store.getState().settings).toEqual(previousState);
		expect(store.getState().settings.global.outputDirectoryPath).toBe(
			"/custom/path",
		);
		expect(store.getState().settings.global.concurrency).toBe(8);
		expect(store.getState().settings.audio.audioFilter).toBe("volume=2");
	});

	it("applies partial stored settings as-is and does not merge with initialSettings", async () => {
		const partialStored = {
			global: {
				concurrency: 3,
			},
		};
		vi.mocked(settingsRepository.getSettings).mockResolvedValue(
			partialStored as any,
		);
		const store = createTestStore({
			settings: getTestState({ loading: true }),
		});
		const result = await store.dispatch(getSettings());
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(store.getState().settings).toEqual({
			...partialStored,
			loading: false,
		} as any);
	});

	it("handles malformed non-object stored settings by spreading into an empty object", async () => {
		vi.mocked(settingsRepository.getSettings).mockResolvedValue(false as any);
		const store = createTestStore({
			settings: getTestState({ loading: true }),
		});
		const result = await store.dispatch(getSettings());
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(store.getState().settings).toEqual({
			loading: false,
		} as any);
	});

	it("handles malformed array stored settings by spreading array indices", async () => {
		vi.mocked(settingsRepository.getSettings).mockResolvedValue([] as any);
		const store = createTestStore({
			settings: getTestState({ loading: true }),
		});
		const result = await store.dispatch(getSettings());
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(store.getState().settings).toEqual({
			loading: false,
		} as any);
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
		expect(store.getState().settings.global.outputDirectoryPath).toBe("/out");
		expect(store.getState().settings.loading).toBe(false);
	});

	it("does not update state while save is pending because there is no optimistic update", async () => {
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
		expect(store.getState().settings).toEqual(state);
		deferred.resolve(undefined as SaveSettingsResult);
		const result = await dispatchPromise;
		expect(result.meta.requestStatus).toBe("fulfilled");
		expect(result.payload).toBeUndefined();
		expect(store.getState().settings).toEqual({
			...savedPayload,
			loading: false,
		});
	});

	it("does not set loading to true while save is pending", async () => {
		const deferred = createDeferred<SaveSettingsResult>();
		vi.mocked(settingsRepository.saveSettings).mockReturnValue(
			deferred.promise,
		);
		const store = createTestStore();
		const dispatchPromise = store.dispatch(saveSettings(savedPayload));
		expect(store.getState().settings.loading).toBe(false);
		deferred.resolve(undefined as SaveSettingsResult);
		await dispatchPromise;
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
		expect(result.payload).toBeUndefined();
		expect(settingsRepository.saveSettings).toHaveBeenCalledTimes(1);
		expect(settingsRepository.saveSettings).toHaveBeenCalledWith(savedPayload);
		expect(settingsRepository.getSettings).not.toHaveBeenCalled();
		expect(store.getState().settings).toEqual({
			...savedPayload,
			loading: false,
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
		expect(store.getState().settings).toEqual({
			...savedPayload,
			loading: false,
		});
	});

	it("does not update store state when repository throws", async () => {
		vi.mocked(settingsRepository.saveSettings).mockRejectedValue(
			new Error("fail"),
		);
		const store = createTestStore();
		const before = store.getState().settings.global.outputDirectoryPath;
		const result = await store.dispatch(
			saveSettings({
				...initialSettings,
				global: { ...initialSettings.global, outputDirectoryPath: "/new" },
			}),
		);
		expect(result.meta.requestStatus).toBe("rejected");
		expect(store.getState().settings.global.outputDirectoryPath).toBe(before);
	});
});
