import type { GeneralSettings, OptionMapperKeys } from "../../../types";

export const getTrackSettings = (
	initialSettings: GeneralSettings,
	settings: GeneralSettings["audio"],
	mapper: (option: OptionMapperKeys) => string,
) => {
	const result: string[] = [];
	for (const s in settings) {
		const key = s as OptionMapperKeys;
		if (settings[key] !== initialSettings.audio[key]) {
			result.push(`${mapper(key)} ${settings[key]}`);
		}
	}
	return result;
};
