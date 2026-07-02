import { z } from "zod";

const encoders = [
	"aac",
	"ac3",
	"ac3_fixed",
	"flac",
	"libmp3lame",
	"libopencore_amrnb",
	"libopus",
	"libtwolame",
	"libshine",
	"libvo_amrwbenc",
	"libvorbis",
	"wavpack",
] as const;
const cbrValues = [
	"320k",
	"256k",
	"224k",
	"192k",
	"160k",
	"128k",
	"112k",
	"96k",
	"80k",
	"64k",
	"48k",
	"40k",
	"32k",
	"24k",
	"16k",
	"8k",
] as const;
const vbrValues = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const cbrSchema = z.enum(cbrValues);
const vbrSchema = z.enum(vbrValues);
const encoderNames = z.enum(encoders);

export const settingsSchema = z.object({
	global: z.object({
		outputDirectoryPath: z.string().min(1, "Output directory is required"),
		openOutputFolderOnComplete: z.boolean(),
		concurrency: z.coerce
			.number()
			.int()
			.min(1)
			.max(10, "Concurrency must be between 1 and 10"),
		overwrite: z.boolean(),
		noOverwrite: z.boolean(),
	}),
	audio: z.object({
		audioCodec: z.union([encoderNames, z.literal("copy")]),
		codecOptions: z.record(
			z.string(),
			z.string().or(z.number()).or(z.boolean()),
		),
		audioQuality: z.enum(["cbr", "vbr", "auto"]),
		audioQualityValue: z.union([cbrSchema, vbrSchema, z.literal("auto")]),
		outputExtension: z.string(),
		audioFilter: z.string(),
		filterOptions: z.record(
			z.string(),
			z.string().or(z.number()).or(z.boolean()),
		),
	}),
});

export type SettingsForm = z.infer<typeof settingsSchema>;
