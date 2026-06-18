import type { Metadata } from "@/types";
import type { CBR, VBR } from "./bitrate.types";
import type { AUDIO_ENCODER_NAMES } from "./encoders.types";

export type SettingsForm = {
	audio: {
		audioCodec: AUDIO_ENCODER_NAMES | "copy";
		codecOptions: Record<string, string | number | boolean>;
		audioQuality: "cbr" | "vbr" | "auto";
		audioQualityValue: VBR | CBR | "auto";
		outputExtension: string;
		audioFilter: string;
		filterOptions: Record<string, string | number | boolean>;
	};
	global: {
		outputDirectoryPath: string;
		openOutputFolderOnComplete: boolean;
		concurrency: number;
		overwrite: boolean;
		noOverwrite: boolean;
	};
};

export type Data = {
	tracks: Metadata[];
	settings: SettingsForm;
};
