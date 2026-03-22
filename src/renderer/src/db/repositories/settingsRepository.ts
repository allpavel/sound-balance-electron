import { db } from "@renderer/db/db";
import type { GeneralSettings } from "@/types";

const SETTINGS_ID = "globalSettings";

export const settingsRepository = {
	async getSettings(): Promise<GeneralSettings | null> {
		const result = await db.settings.get(SETTINGS_ID);
		return result?.settings ?? null;
	},
	async saveSettings(settings: GeneralSettings): Promise<void> {
		await db.settings.put({ id: SETTINGS_ID, settings });
	},
};
