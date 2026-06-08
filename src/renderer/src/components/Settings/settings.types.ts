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
export type MUXERS = [
	"alaw",
	"daud",
	"dfpwm",
	"f32be",
	"f32le",
	"f64be",
	"f64le",
	"mulaw",
	"s16be",
	"s16le",
	"s24be",
	"s24le",
	"s32be",
	"s32le",
	"s8",
	"u16be",
	"u16le",
	"u24be",
	"u24le",
	"u32be",
	"u32le",
	"u8",
	"vidc",
	"ac3",
	"ac4",
	"adts",
	"adx",
	"aiff",
	"alp",
	"amr",
	"apm",
	"aptx",
	"aptx_hd",
	"argo_asf",
	"argo_cvg",
	"ast",
	"au",
	"bit",
	"caf",
	"codec2",
	"codec2raw",
	"dts",
	"eac3",
	"flac",
	"g722",
	"g723_1",
	"g726",
	"g726le",
	"gsm",
	"ilbc",
	"ircam",
	"kvag",
	"latm",
	"mlp",
	"mmf",
	"mp2",
	"mp3",
	"oma",
	"opus",
	"rso",
	"sbc",
	"sox",
	"spdif",
	"spx",
	"tta",
	"truehd",
	"voc",
	"w64",
	"wav",
	"wsaud",
	"wv",
	"alsa",
	"oss",
	"pulse",
	"oga",
];

export type EXTENSIONS = [
	".aac",
	".ac3",
	".ac4",
	".adx",
	".aiff",
	".al",
	".alp",
	".amr",
	".apm",
	".aptx",
	".asf",
	".ast",
	".au",
	".bit",
	".c2",
	".caf",
	".cvg",
	".daud",
	".dfpwm",
	".dts",
	".eac3",
	".flac",
	".g722",
	".g723",
	".g726",
	".gsm",
	".ilbc",
	".mlp",
	".mmf",
	".mp2",
	".mp3",
	".oma",
	".opus",
	".pcm",
	".rso",
	".sbc",
	".sf",
	".sox",
	".spdif",
	".spx",
	".thd",
	".tta",
	".ul",
	".vag",
	".vidc",
	".voc",
	".w64",
	".wav",
	".wsa",
	".wv",
];

type AUDIO_MUXERS = MUXERS[number];

export type AUDIO_MUXER_OPTION<T extends AUDIO_MUXERS> = {
	name: T;
	desc: string;
};

export type AUDIO_MUXERS_OPTIONS = AUDIO_MUXER_OPTION<AUDIO_MUXERS>[];

export type AUDIO_MUXER_EXTENSIONS = {
	alaw: ".al";
	daud: ".daud";
	dfpwm: ".dfpwm";
	f32be: ".pcm";
	f32le: ".pcm";
	f64be: ".pcm";
	f64le: ".pcm";
	mulaw: ".ul";
	s16be: ".pcm";
	s16le: ".pcm";
	s24be: ".pcm";
	s24le: ".pcm";
	s32be: ".pcm";
	s32le: ".pcm";
	s8: ".pcm";
	u16be: ".pcm";
	u16le: ".pcm";
	u24be: ".pcm";
	u24le: ".pcm";
	u32be: ".pcm";
	u32le: ".pcm";
	u8: ".pcm";
	vidc: ".vidc";
	ac3: ".ac3";
	ac4: ".ac4";
	adts: ".aac";
	adx: ".adx";
	aiff: ".aiff";
	alp: ".alp";
	amr: ".amr";
	apm: ".apm";
	aptx: ".aptx";
	aptx_hd: ".aptx";
	argo_asf: ".asf";
	argo_cvg: ".cvg";
	ast: ".ast";
	au: ".au";
	bit: ".bit";
	caf: ".caf";
	codec2: ".c2";
	codec2raw: ".c2";
	dts: ".dts";
	eac3: ".eac3";
	flac: ".flac";
	g722: ".g722";
	g723_1: ".g723";
	g726: ".g726";
	g726le: ".g726";
	gsm: ".gsm";
	ilbc: ".ilbc";
	ircam: ".sf";
	kvag: ".vag";
	latm: ".aac";
	mlp: ".mlp";
	mmf: ".mmf";
	mp2: ".mp2";
	mp3: ".mp3";
	oma: ".oma";
	opus: ".opus";
	rso: ".rso";
	sbc: ".sbc";
	sox: ".sox";
	spdif: ".spdif";
	spx: ".spx";
	tta: ".tta";
	truehd: ".thd";
	voc: ".voc";
	w64: ".w64";
	wav: ".wav";
	wsaud: ".wsa";
	wv: ".wv";
	alsa: "";
	oss: "";
	pulse: "";
	oga: ".oga";
};
