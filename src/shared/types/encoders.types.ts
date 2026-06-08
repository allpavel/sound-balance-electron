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

type OPTION = NumberOption | SelectOption | SwitchOption;

export type ENCODERS = [
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
];

type ENCODER_CATEGORY =
	| "Lossy General Audio"
	| "Speech & Voice Codecs"
	| "Lossless Audio";

export type AUDIO_ENCODER_NAMES = ENCODERS[number];

type AUDIO_ENCODER<T extends AUDIO_ENCODER_NAMES> = {
	name: T;
	desc: string;
	category: ENCODER_CATEGORY;
	options: OPTION[];
};
export type AUDIO_ENCODERS = {
	[K in AUDIO_ENCODER_NAMES]: AUDIO_ENCODER<K>;
};
