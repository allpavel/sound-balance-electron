import type { GeneralSettings, OptionMapperKeys } from "../../../types";

export const getGlobalSettings = (
	initialSettings: GeneralSettings,
	settings: GeneralSettings["global"],
	mapper: (option: OptionMapperKeys) => string,
) => {
	const result: string[] = [];
	for (const s in settings) {
		const key = s as OptionMapperKeys;
		if (settings[key] !== initialSettings.global[key]) {
			result.push(mapper(key));
		}
	}
	return result;
};
