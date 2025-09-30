export const optionsMapper = (option: string) => {
	const mapping = {
		overwrite: "-y",
		noOverwrite: "-n",
		statsPeriod: "-stats_period",
		recastMedia: "-recast_media",

		audioCodec: "-codec:a",
		audioQuality: "-q:a",
		audioFilter: "-filter:a",
	};
	return mapping[option];
};
