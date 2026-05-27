import type { GeneralSettings } from "@/types";
import { buildFilter } from "./buildFilter";

export const getTrackSettings = (
	initialSettings: GeneralSettings["audio"],
	settings: GeneralSettings["audio"],
) => {
	const result: string[] = [];

	if (settings.audioCodec !== initialSettings.audioCodec) {
		result.push(`-codec:a ${settings.audioCodec}`);
	}
	if (settings.audioQuality !== initialSettings.audioQuality) {
		result.push(`-q:a ${settings.audioQuality}`);
	}
	if (settings.audioFilter) {
		const filter = buildFilter(settings.audioFilter, settings.filterOptions);
		if (filter) {
			result.push(...filter);
		}
	}
	return result;
};
