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
	getSettings,
	initialSettings,
	saveSettings,
} from "@renderer/store/slices/settingsSlice";
import { type AppStore, createAppStore } from "@renderer/store/store";
import { toast } from "sonner";

export const CORRUPTION_SETTINGS_TOAST =
	"Stored settings are corrupted and were reset to defaults.";
export const SAVE_ERROR_TOAST = "Unable to save settings. Please try again.";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

vi.mock("@renderer/db/repositories/settingsRepository", () => ({
	settingsRepository: {
		getSettings: vi.fn(),
		saveSettings: vi.fn(),
		clear: vi.fn(),
	},
}));

const repo = vi.mocked(settingsRepository);

const validSettingsPayload = {
	...initialSettings,
	global: {
		...initialSettings.global,
		outputDirectoryPath: "/test/output",
	},
};

type GetSettingsResult = Awaited<
	ReturnType<typeof settingsRepository.getSettings>
>;

function mockGetSettingsResult(result: GetSettingsResult): void {
	repo.getSettings.mockResolvedValue(result);
}

describe("settingsMiddleware", () => {
	let store: AppStore;

	beforeEach(() => {
		vi.clearAllMocks();
		store = createAppStore();
	});

	afterEach(() => {
		store.dispatch = vi.fn() as unknown as typeof store.dispatch;
	});

	describe("getSettings.rejected listener", () => {
		it("shows a corruption error toast and triggers storage reset when stored settings are invalid", async () => {
			mockGetSettingsResult({
				status: "invalid",
				issues: "global.outputDirectoryPath: Invalid input",
			});
			await store.dispatch(getSettings());
			await vi.waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(CORRUPTION_SETTINGS_TOAST);
			});
			await vi.waitFor(() => {
				expect(repo.clear).toHaveBeenCalled();
			});
		});

		it("shows corruption toast when getSettings throws an unexpected error", async () => {
			repo.getSettings.mockRejectedValue(new Error("DB connection lost"));
			await store.dispatch(getSettings());
			await vi.waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(CORRUPTION_SETTINGS_TOAST);
			});
		});

		it("does not trigger toast or reset when settings load succeeds (empty)", async () => {
			mockGetSettingsResult({ status: "empty" });
			await store.dispatch(getSettings());
			expect(toast.error).not.toHaveBeenCalled();
			expect(repo.clear).not.toHaveBeenCalled();
		});

		it("does not trigger toast or reset when settings load succeeds (valid)", async () => {
			mockGetSettingsResult({
				status: "valid",
				data: validSettingsPayload,
			});
			await store.dispatch(getSettings());
			expect(toast.error).not.toHaveBeenCalled();
			expect(repo.clear).not.toHaveBeenCalled();
		});
	});

	describe("saveSettings.rejected listener", () => {
		it("shows a save error toast when repository persistence fails", async () => {
			repo.saveSettings.mockRejectedValue(new Error("Save failed"));
			await store.dispatch(saveSettings(validSettingsPayload));
			await vi.waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(SAVE_ERROR_TOAST);
			});
			expect(repo.clear).not.toHaveBeenCalled();
		});

		it("shows save error toast when payload fails schema validation", async () => {
			const invalidPayload = {
				...initialSettings,
				global: {
					...initialSettings.global,
					concurrency: 999,
				},
			};
			await store.dispatch(saveSettings(invalidPayload));
			await vi.waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(SAVE_ERROR_TOAST);
			});
			expect(repo.saveSettings).not.toHaveBeenCalled();
			expect(repo.clear).not.toHaveBeenCalled();
		});

		it("does not trigger toast or reset when save succeeds", async () => {
			repo.saveSettings.mockResolvedValue(undefined);
			await store.dispatch(saveSettings(initialSettings));
			expect(toast.error).not.toHaveBeenCalled();
			expect(repo.clear).not.toHaveBeenCalled();
		});
	});

	describe("resetSettings failure isolation", () => {
		it("still shows corruption toast even if storage clear fails", async () => {
			mockGetSettingsResult({
				status: "invalid",
				issues: "corrupted data",
			});
			repo.clear.mockRejectedValue(new Error("Clear failed"));
			await store.dispatch(getSettings());
			await vi.waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(CORRUPTION_SETTINGS_TOAST);
			});
		});
	});
});
