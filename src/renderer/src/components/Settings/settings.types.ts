export type FILTERS = [
	"abench",
	"acompressor",
	"acontrast",
	"acopy",
	"acue",
	"acrossfade",
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

type AUDIO_FILTERS = FILTERS[number];
type AUDIO_MUXERS = MUXERS[number];

type AUDIO_FILTER_OPTION<T extends AUDIO_FILTERS> = {
	name: T;
	desc: string;
};
export type AUDIO_MUXER_OPTION<T extends AUDIO_MUXERS> = {
	name: T;
	desc: string;
};

export type AUDIO_FILTERS_OPTIONS = AUDIO_FILTER_OPTION<AUDIO_FILTERS>[];
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

export type SettingsForm = {
	audio: {
		audioCodec: string;
		audioQuality: string;
		audioFilter: string;
		outputExtension: string;
	};
	global: {
		outputDirectoryPath: string;
		concurrency: number;
		overwrite: boolean;
		noOverwrite: boolean;
		statsPeriod: number;
		recastMedia: boolean;
	};
};
