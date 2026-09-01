/*
 * sound-balance-electron
 * Copyright (C) 2026 Pavel Alloyarov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { optionsSchema } from "@shared/schemas/options.schema";
import { z } from "zod";

export const SETTINGS_SCHEMA_VERSION = 1;

export const FILTER_NAMES = [
	"acompressor",
	"acontrast",
	"acrusher",
	"adeclick",
	"adeclip",
	"adecorrelate",
	"adelay",
	"adenorm",
	"aderivative",
	"adrc",
	"adynamicequalizer",
	"adynamicsmooth",
	"aecho",
	"aemphasis",
	"aeval",
	"aexciter",
	"afade",
	"afftdn",
	"afftfilt",
	"aformat",
	"afreqshift",
	"afwtdn",
	"agate",
	"aintegral",
	"alatency",
	"alimiter",
	"allpass",
	"aloop",
	"ametadata",
	"amultiply",
	"anlmdn",
	"anlmf",
	"anlms",
	"anull",
	"apad",
	"aperms",
	"aphaser",
	"aphaseshift",
	"apsnr",
	"apsyclip",
	"apulsator",
	"arealtime",
	"aresample",
	"areverse",
	"arls",
	"arnndn",
	"asdr",
	"asendcmd",
	"asetnsamples",
	"asetpts",
	"asetrate",
	"asettb",
	"ashowinfo",
	"asidedata",
	"asisdr",
	"asoftclip",
	"aspectralstats",
	"asr",
	"astats",
	"asubboost",
	"asubcut",
	"asupercut",
	"asuperpass",
	"asuperstop",
	"atempo",
	"atilt",
	"atrim",
	"axcorrelate",
	"azmq",
	"bandpass",
	"bandreject",
	"bass",
	"biquad",
	"bs2b",
	"channelmap",
	"chorus",
	"compand",
	"compensationdelay",
	"crossfeed",
	"crystalizer",
	"dcshift",
	"deesser",
	"dialoguenhance",
	"drmeter",
	"dynaudnorm",
	"earwax",
	"equalizer",
	"extrastereo",
	"firequalizer",
	"flanger",
	"haas",
	"hdcd",
	"highpass",
	"highshelf",
	"loudnorm",
	"lowpass",
	"lowshelf",
	"mcompand",
	"pan",
	"replaygain",
	"rubberband",
	"sidechaincompress",
	"sidechaingate",
	"silencedetect",
	"silenceremove",
	"sofalizer",
	"speechnorm",
	"stereotools",
	"stereowiden",
	"superequalizer",
	"surround",
	"tiltshelf",
	"treble",
	"tremolo",
	"vibrato",
	"virtualbass",
	"volume",
	"volumedetect",
	"afifo",
] as const;
const ENCODER_NAMES = [
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
export const ENCODER_CATEGORIES = [
	"Lossy General Audio",
	"Speech & Voice Codecs",
	"Lossless Audio",
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
const encoderNames = z.enum(ENCODER_NAMES);
const encoderCategorySchema = z.enum(ENCODER_CATEGORIES);

const PATH_TRAVERSAL_PATTERN = /\.\.[/\\]/;
const NULL_BYTE_PATTERN = /\0/;
const MAX_PATH_LENGTH = 4096;

const outputDirectoryPathSchema = z
	.string()
	.min(1, "Output directory is required")
	.max(MAX_PATH_LENGTH, `Path exceeds ${MAX_PATH_LENGTH} characters`)
	.refine((path) => !NULL_BYTE_PATTERN.test(path), {
		message: "Path contains null bytes",
	})
	.refine((path) => !PATH_TRAVERSAL_PATTERN.test(path), {
		message: "Path contains traversal sequences (..)",
	});

const globalBaseSchema = z.object({
	outputDirectoryPath: outputDirectoryPathSchema,
	openOutputFolderOnComplete: z.boolean(),
	concurrency: z.coerce
		.number()
		.int()
		.min(1)
		.max(10, "Concurrency must be between 1 and 10"),
	overwrite: z.boolean(),
	noOverwrite: z.boolean(),
});

const audioFilterSchema = z.union([z.literal(""), z.enum(FILTER_NAMES)]);

const audioBaseSchema = z.object({
	audioCodec: z.union([encoderNames, z.literal("copy")]),
	codecOptions: z.record(z.string(), z.string().or(z.number()).or(z.boolean())),
	outputExtension: z.string(),
	audioFilter: audioFilterSchema,
	filterOptions: z.record(
		z.string(),
		z.string().or(z.number()).or(z.boolean()),
	),
});
const audioSchema = z.discriminatedUnion("audioQuality", [
	audioBaseSchema.extend({
		audioQuality: z.literal("cbr"),
		audioQualityValue: cbrSchema,
	}),
	audioBaseSchema.extend({
		audioQuality: z.literal("vbr"),
		audioQualityValue: vbrSchema,
	}),
	audioBaseSchema.extend({
		audioQuality: z.literal("auto"),
		audioQualityValue: z.literal("auto"),
	}),
]);

export const settingsSchema = z.object({
	version: z.number().int().min(1).default(1),
	global: globalBaseSchema,
	audio: audioSchema,
});

export const audioFilterConfigSchema = z
	.object({
		name: z.enum(FILTER_NAMES),
		desc: z.string().min(1, "Description must not be empty"),
		options: z.array(optionsSchema),
	})
	.strict();
export const audioEncoderConfigSchema = z
	.object({
		name: z.enum(ENCODER_NAMES),
		desc: z.string().min(1, "Description must not be empty"),
		category: encoderCategorySchema,
		options: z.array(optionsSchema),
	})
	.strict();

export type SettingsForm = z.infer<typeof settingsSchema>;
export type CBR = z.infer<typeof cbrSchema>;
export type VBR = z.infer<typeof vbrSchema>;

export type AUDIO_FILTER_NAMES = (typeof FILTER_NAMES)[number];
export type AUDIO_FILTERS = Record<AUDIO_FILTER_NAMES, AudioFilterConfig>;
export type FilterOption = z.infer<typeof optionsSchema>;
export type AudioFilterConfig = z.infer<typeof audioFilterConfigSchema>;

export type AUDIO_ENCODER_NAMES = (typeof ENCODER_NAMES)[number];
export type AUDIO_ENCODERS = Record<AUDIO_ENCODER_NAMES, AudioEncoderConfig>;
export type AudioEncoderConfig = z.infer<typeof audioEncoderConfigSchema>;
export type EncoderCategory = (typeof ENCODER_CATEGORIES)[number];
