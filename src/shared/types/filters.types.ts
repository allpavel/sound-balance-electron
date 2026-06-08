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
export type FILTERS = [
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
];

type BaseOption = {
	label: string;
	desc: string;
};

type NumberOption = BaseOption & {
	type: "number";
	min: number;
	max: number;
	defaultValue: number;
};

type SelectOption = BaseOption & {
	type: "select";
	options:
		| [string, ...string[]]
		| [{ label: string; value: string }, ...{ label: string; value: string }[]];
	defaultValue: string;
};

type SwitchOption = BaseOption & {
	type: "switch";
	defaultValue: boolean;
};

type TextOption = BaseOption & {
	type: "text";
	defaultValue: string;
};

type Option = NumberOption | SelectOption | TextOption | SwitchOption;

type AUDIO_FILTER<T extends AUDIO_FILTER_NAMES> = {
	name: T;
	desc: string;
	options: Option[];
};

export type AUDIO_FILTER_NAMES = FILTERS[number];
export type AUDIO_FILTERS = {
	[K in AUDIO_FILTER_NAMES]: AUDIO_FILTER<K>;
};
