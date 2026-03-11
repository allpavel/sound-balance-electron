import type { OptionMapperKeys } from "../../../../types";

const MAPPING: Record<OptionMapperKeys, string> = {
	overwrite: "-y",
	noOverwrite: "-n",
	statsPeriod: "-stats_period",
	recastMedia: "-recast_media",

	audioCodec: "-codec:a",
	audioQuality: "-q:a",
	audioFilter: "-filter:a",
} as const;

export const optionsMapper = (option: OptionMapperKeys): string => {
	if (MAPPING[option]) {
		return MAPPING[option];
	}
	throw new Error(
		`Unexpected setting: ${option}. Valid options are: ${Object.keys(MAPPING).join(", ")}`,
	);
};
