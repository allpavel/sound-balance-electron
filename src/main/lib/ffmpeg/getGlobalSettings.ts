import type { GeneralSettings } from "@/types";

export const getGlobalSettings = (settings: GeneralSettings["global"]) => {
	const result: string[] = [];

	if (settings.overwrite) {
		result.push("-y");
	}
	if (settings.noOverwrite) {
		result.push("-n");
	}
	return result;
};
