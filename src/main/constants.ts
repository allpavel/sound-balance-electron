import type { GeneralSettings } from "@/types";

export const INITIALSETTINGS = {
	global: {
		outputDirectoryPath: "",
		overwrite: true,
		noOverwrite: false,
		statsPeriod: 0.5,
		recastMedia: false,
		concurrency: 1,
	},
	audio: {
		audioCodec: "copy",
		audioQuality: "4",
		audioFilter: "loudnorm",
	},
} satisfies GeneralSettings;

export const EVENT_CHANNELS = {
	RESPONSE_ON_STOP: "response-on-stop",
	RESPONSE_ON_START: "response-on-start",
	PROCESSING_RESULT: "processing-result",
} as const;

export const INVOKE_CHANNELS = {
	SHOW_DIALOG: "showDialog",
	GET_OUTPUT_DIRECTORY: "getOutputDirectoryPath",
	START_PROCESSING: "startProcessing",
	STOP_PROCESSING: "stopProcessing",
} as const;
