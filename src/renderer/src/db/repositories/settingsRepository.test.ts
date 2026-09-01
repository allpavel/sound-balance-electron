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
import { db } from "@renderer/db/db";
import {
	SETTINGS_ID,
	settingsRepository,
} from "@renderer/db/repositories/settingsRepository";
import { resetDatabase } from "@renderer/utils/test-utils/testFactories";
import {
	SETTINGS_SCHEMA_VERSION,
	type SettingsForm,
} from "@/src/shared/schemas/settings.schema";

function getValidSettings({
	concurrency = 4,
}: {
	concurrency?: number;
} = {}): SettingsForm {
	return {
		version: SETTINGS_SCHEMA_VERSION,
		global: {
			outputDirectoryPath: "/music/out",
			openOutputFolderOnComplete: true,
			concurrency: concurrency,
			overwrite: false,
			noOverwrite: true,
		},
		audio: {
			audioCodec: "libmp3lame",
			codecOptions: {
				compression_level: 5,
			},
			audioQuality: "vbr",
			audioQualityValue: "4",
			outputExtension: ".mp3",
			audioFilter: "loudnorm",
			filterOptions: {
				I: -24,
				LRA: 7,
			},
		},
	};
}

async function putSettings(row: unknown): Promise<void> {
	await db.settings.put(row as { id: string; settings: SettingsForm });
}

async function saveSettings(settings: unknown): Promise<void> {
	await settingsRepository.saveSettings(settings as SettingsForm);
}

describe("settingsRepository", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		3;
	});

	describe("getSettings", () => {
		it("returns empty status when no settings have been saved", async () => {
			expect(await settingsRepository.getSettings()).toEqual({
				status: "empty",
			});
		});

		it("returns the saved settings object", async () => {
			const validSettings = getValidSettings();
			await settingsRepository.saveSettings(validSettings);
			expect(await settingsRepository.getSettings()).toEqual({
				status: "valid",
				data: validSettings,
			});
		});

		it("ignores unrelated settings rows", async () => {
			const validSettings = getValidSettings();
			await db.settings.put({
				id: "otherSettings",
				settings: validSettings,
			});
			expect(await settingsRepository.getSettings()).toEqual({
				status: "empty",
			});
			await settingsRepository.saveSettings(validSettings);
			expect(await settingsRepository.getSettings()).toEqual({
				status: "valid",
				data: validSettings,
			});
			expect(await db.settings.count()).toBe(2);
		});

		it("returns empty status when the persisted row has no settings property", async () => {
			await putSettings({
				id: SETTINGS_ID,
			});
			expect(await settingsRepository.getSettings()).toEqual({
				status: "empty",
			});
			expect(await db.settings.count()).toBe(1);
		});

		it("returns empty status when persisted settings are null", async () => {
			await putSettings({
				id: SETTINGS_ID,
				settings: null,
			});
			expect(await settingsRepository.getSettings()).toEqual({
				status: "empty",
			});
			expect(await db.settings.count()).toBe(1);
		});

		it("returns invalid status when persisted settings are not an object", async () => {
			await putSettings({
				id: SETTINGS_ID,
				settings: "invalid",
			});
			const result = await settingsRepository.getSettings();
			expect(result.status).toBe("invalid");
			if (result.status === "invalid") {
				expect(result.issues).toContain(
					"Invalid input: expected object, received string",
				);
			}
			expect(await db.settings.count()).toBe(1);
		});

		it("returns invalid status when persisted settings are invalid", async () => {
			await putSettings({
				id: SETTINGS_ID,
				settings: {
					global: {
						concurrency: 999,
					},
				},
			});
			const result = await settingsRepository.getSettings();
			expect(result.status).toBe("invalid");
			expect(await db.settings.count()).toBe(1);
		});

		it("does not delete malformed persisted settings", async () => {
			await putSettings({
				id: SETTINGS_ID,
				settings: {
					global: {
						concurrency: 999,
					},
				},
			});
			const result = await settingsRepository.getSettings();
			expect(result.status).toBe("invalid");
			expect(await db.settings.count()).toBe(1);
		});

		it("returns a detached settings object", async () => {
			const validSettings = getValidSettings();
			await settingsRepository.saveSettings(validSettings);
			const first = await settingsRepository.getSettings();
			expect(first.status).toBe("valid");
			if (first.status === "valid") {
				const mutableSettings = first.data;
				mutableSettings.global.concurrency = 999;
				mutableSettings.audio.filterOptions.I = 999;
			}
			const second = await settingsRepository.getSettings();
			expect(second).toEqual({ status: "valid", data: validSettings });
		});

		it("propagates database read errors", async () => {
			vi.spyOn(db.settings, "get").mockRejectedValueOnce(
				new Error("read failed"),
			);
			await expect(settingsRepository.getSettings()).rejects.toThrow(
				"read failed",
			);
		});
	});

	describe("saveSettings", () => {
		it("stores settings under the singleton 'globalSettings' key", async () => {
			const validSettings = getValidSettings();
			await settingsRepository.saveSettings(validSettings);
			const row = await db.settings.get(SETTINGS_ID);
			expect(row?.id).toBe(SETTINGS_ID);
			expect(row?.settings).toEqual(validSettings);
		});

		it("overwrites the previous settings on re-save (no duplicate rows)", async () => {
			const first = getValidSettings({ concurrency: 1 });
			const second = getValidSettings({ concurrency: 8 });
			await settingsRepository.saveSettings(first);
			await settingsRepository.saveSettings(second);
			expect(await db.settings.count()).toBe(1);
			expect(await settingsRepository.getSettings()).toEqual({
				status: "valid",
				data: second,
			});
		});

		it("replaces nested fields rather than merging them", async () => {
			const validSettings = getValidSettings();
			const replacementSettings = getValidSettings();
			replacementSettings.audio.filterOptions = {
				I: -16,
			};
			await settingsRepository.saveSettings(validSettings);
			await settingsRepository.saveSettings(replacementSettings);
			const stored = await settingsRepository.getSettings();
			expect(stored).toEqual({ status: "valid", data: replacementSettings });
			if (stored.status === "valid") {
				expect(stored.data.audio.filterOptions).toEqual({ I: -16 });
				expect(stored.data.audio.filterOptions).not.toEqual(
					validSettings.audio.filterOptions,
				);
			}
		});

		it("persists string, number, and boolean option values", async () => {
			const validSettings = getValidSettings();
			validSettings.audio.codecOptions = {
				b: "320k",
				compression_level: 5,
				reservoir: false,
			};
			validSettings.audio.filterOptions = {
				I: "-24",
				LRA: 7,
				linear: true,
			};
			await settingsRepository.saveSettings(validSettings);
			expect(await settingsRepository.getSettings()).toEqual({
				status: "valid",
				data: validSettings,
			});
		});

		it("persists empty codecOptions and filterOptions objects", async () => {
			const validSettings = getValidSettings();
			validSettings.audio.codecOptions = {};
			validSettings.audio.filterOptions = {};
			await settingsRepository.saveSettings(validSettings);
			expect(await settingsRepository.getSettings()).toEqual({
				status: "valid",
				data: validSettings,
			});
		});

		it("coerces numeric concurrency provided as a string at runtime", async () => {
			const validSettings = getValidSettings();
			const runtimeSettings = {
				...validSettings,
				global: {
					...validSettings.global,
					concurrency: "4",
				},
			};
			await saveSettings(runtimeSettings);
			const stored = await settingsRepository.getSettings();
			expect(stored.status).toBe("valid");
			if (stored.status === "valid") {
				expect(stored.data.global.concurrency).toBe(4);
			}
			expect(await db.settings.count()).toBe(1);
		});

		it("overwrites malformed persisted settings with valid settings", async () => {
			await putSettings({
				id: SETTINGS_ID,
				settings: {
					invalid: true,
				},
			});
			const validSettings = getValidSettings();
			await settingsRepository.saveSettings(validSettings);
			expect(await settingsRepository.getSettings()).toEqual({
				status: "valid",
				data: validSettings,
			});
			expect(await db.settings.count()).toBe(1);
		});

		it("normalizes persisted settings by coercing values and stripping unknown fields", async () => {
			const validSettings = getValidSettings();
			await putSettings({
				id: SETTINGS_ID,
				settings: {
					...validSettings,
					unknownTopLevel: true,
					global: {
						...validSettings.global,
						concurrency: "4",
						unknownGlobal: true,
					},
				},
			});
			expect(await settingsRepository.getSettings()).toEqual({
				status: "valid",
				data: validSettings,
			});
			expect(await db.settings.count()).toBe(1);
		});

		it("propagates database write errors and leaves no settings row", async () => {
			const putSpy = vi
				.spyOn(db.settings, "put")
				.mockRejectedValueOnce(new Error("write failed"));
			await expect(
				settingsRepository.saveSettings(getValidSettings()),
			).rejects.toThrow("write failed");
			expect(putSpy).toHaveBeenCalledTimes(1);
			expect(await db.settings.count()).toBe(0);
			expect(await settingsRepository.getSettings()).toEqual({
				status: "empty",
			});
		});

		it("does not create duplicate rows when saves happen concurrently", async () => {
			const first = getValidSettings({ concurrency: 1 });
			const second = getValidSettings({ concurrency: 8 });
			await Promise.all([
				settingsRepository.saveSettings(first),
				settingsRepository.saveSettings(second),
			]);
			expect(await db.settings.count()).toBe(1);
			const stored = await settingsRepository.getSettings();
			expect(stored.status).toBe("valid");
			if (stored.status === "valid") {
				expect([first, second]).toContainEqual(stored.data);
			}
		});
	});
});
