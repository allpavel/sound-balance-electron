export const INITIALSETTINGS = {
	global: {
		outputDirectoryPath: "",
		overwrite: true,
		noOverwrite: false,
		statsPeriod: 0.5,
		recastMedia: false,
	},
	audio: {
		audioCodec: "copy",
		audioQuality: "4",
		audioFilter: "loudnorm",
	},
};

export const IPC_CHANNELS = {
	RESPONSE_ON_STOP: "response-on-stop",
	PROCESSING_RESULT: "processing-result",
} as const;
