import type {
	AUDIO_FILTERS,
	AUDIO_MUXER_EXTENSIONS,
	EXTENSIONS,
} from "./settings.types";

export const CONCURRENCY_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
	value: String(i + 1),
}));

export const FILTER_OPTIONS = {
	abench: {
		name: "abench",
		desc: "Benchmark part of a filtergraph.",
		options: [
			{
				label: "Abench option",
				defaultValue: "two",
				desc: "This is abench options",
				type: "select",
				options: ["one", "two"],
			},
			{
				type: "number",
				label: "acompressor Label",
				desc: "some desc",
				defaultValue: 1,
				max: 10,
				min: 0,
			},
			{
				type: "text",
				label: "text option",
				defaultValue: "def value",
				desc: "some desc",
			},
		],
	},

	// acompressor: {
	// 	name: "acompressor",
	// 	desc: "Audio compressor.",
	// 	options: [],
	// },
	// acontrast: {
	// 	name: "acontrast",
	// 	desc: "Simple audio dynamic range compression/expansion filter.",
	// 	options: [],
	// },
	// acrusher: {
	// 	name: "acrusher",
	// 	desc: "Reduce audio bit resolution.",
	// 	options: [],
	// },
	// adeclick: {
	// 	name: "adeclick",
	// 	desc: "Remove impulsive noise from input audio.",
	// 	options: [],
	// },
	// adeclip: {
	// 	name: "adeclip",
	// 	desc: "Remove clipping from input audio.",
	// 	options: [],
	// },
	// adecorrelate: {
	// 	name: "adecorrelate",
	// 	desc: "Apply decorrelation to input audio.",
	// 	options: [],
	// },
	// acopy: {
	// 	name: "acopy",
	// 	desc: "Copy the input audio unchanged to the output.",
	// 	options: [],
	// },
	// acue: { name: "acue", desc: "Delay filtering to match a cue.", options: [] },
	// acrossfade: {
	// 	name: "acrossfade",
	// 	desc: "Cross fade two input audio streams.",
	// 	options: [],
	// },
	// adelay: {
	// 	name: "adelay",
	// 	desc: "Delay one or more audio channels.",
	// 	options: [],
	// },
	// adenorm: {
	// 	name: "adenorm",
	// 	desc: "Remedy denormals by adding extremely low-level noise.",
	// 	options: [],
	// },
	// aderivative: {
	// 	name: "aderivative",
	// 	desc: "Compute derivative of input audio.",
	// 	options: [],
	// },
	// adrc: {
	// 	name: "adrc",
	// 	desc: "Audio Spectral Dynamic Range Controller.",
	// 	options: [],
	// },
	// adynamicequalizer: {
	// 	name: "adynamicequalizer",
	// 	desc: "Apply Dynamic Equalization of input audio.",
	// 	options: [],
	// },
	// adynamicsmooth: {
	// 	name: "adynamicsmooth",
	// 	desc: "Apply Dynamic Smoothing of input audio.",
	// 	options: [],
	// },
	// aecho: { name: "aecho", desc: "Add echoing to the audio.", options: [] },
	// aemphasis: { name: "aemphasis", desc: "Audio emphasis.", options: [] },
	// aeval: {
	// 	name: "aeval",
	// 	desc: "Filter audio signal according to a specified expression.",
	// 	options: [],
	// },
	// aexciter: {
	// 	name: "aexciter",
	// 	desc: "Enhance high frequency part of audio.",
	// 	options: [],
	// },
	// afade: { name: "afade", desc: "Fade in/out input audio.", options: [] },
	// afftdn: {
	// 	name: "afftdn",
	// 	desc: "Denoise audio samples using FFT.",
	// 	options: [],
	// },
	// afftfilt: {
	// 	name: "afftfilt",
	// 	desc: "Apply arbitrary expressions to samples in frequency domain.",
	// 	options: [],
	// },
	// aformat: {
	// 	name: "aformat",
	// 	desc: "Convert the input audio to one of the specified formats.",
	// 	options: [],
	// },
	// afreqshift: {
	// 	name: "afreqshift",
	// 	desc: "Apply frequency shifting to input audio.",
	// 	options: [],
	// },
	// afwtdn: {
	// 	name: "afwtdn",
	// 	desc: "Denoise audio stream using Wavelets.",
	// 	options: [],
	// },
	// agate: { name: "agate", desc: "Audio gate.", options: [] },
	// aintegral: {
	// 	name: "aintegral",
	// 	desc: "Compute integral of input audio.",
	// 	options: [],
	// },
	// alatency: {
	// 	name: "alatency",
	// 	desc: "Report audio filtering latency.",
	// 	options: [],
	// },
	// alimiter: { name: "alimiter", desc: "Audio lookahead limiter.", options: [] },
	// allpass: {
	// 	name: "allpass",
	// 	desc: "Apply a two-pole all-pass filter.",
	// 	options: [],
	// },
	// aloop: { name: "aloop", desc: "Loop audio samples.", options: [] },
	// ametadata: {
	// 	name: "ametadata",
	// 	desc: "Manipulate audio frame metadata.",
	// 	options: [],
	// },
	// amultiply: {
	// 	name: "amultiply",
	// 	desc: "Multiply two audio streams.",
	// 	options: [],
	// },
	// anlmdn: {
	// 	name: "anlmdn",
	// 	desc: "Reduce broadband noise from stream using Non-Local Means.",
	// 	options: [],
	// },
	// anlmf: {
	// 	name: "anlmf",
	// 	desc: "Apply Normalized Least-Mean-Fourth algorithm to first audio stream.",
	// 	options: [],
	// },
	// anlms: {
	// 	name: "anlms",
	// 	desc: "Apply Normalized Least-Mean-Squares algorithm to first audio stream.",
	// 	options: [],
	// },
	// anull: {
	// 	name: "anull",
	// 	desc: "Pass the source unchanged to the output.",
	// 	options: [],
	// },
	// apad: { name: "apad", desc: "Pad audio with silence.", options: [] },
	// aperms: {
	// 	name: "aperms",
	// 	desc: "Set permissions for the output audio frame.",
	// 	options: [],
	// },
	// aphaser: {
	// 	name: "aphaser",
	// 	desc: "Add a phasing effect to the audio.",
	// 	options: [],
	// },
	// aphaseshift: {
	// 	name: "aphaseshift",
	// 	desc: "Apply phase shifting to input audio.",
	// 	options: [],
	// },
	// apsnr: {
	// 	name: "apsnr",
	// 	desc: "Measure Audio Peak Signal-to-Noise Ratio.",
	// 	options: [],
	// },
	// apsyclip: {
	// 	name: "apsyclip",
	// 	desc: "Audio Psychoacoustic Clipper.",
	// 	options: [],
	// },
	// apulsator: { name: "apulsator", desc: "Audio pulsator.", options: [] },
	// arealtime: {
	// 	name: "arealtime",
	// 	desc: "Slow down filtering to match realtime.",
	// 	options: [],
	// },
	// aresample: { name: "aresample", desc: "Resample audio data.", options: [] },
	// areverse: { name: "areverse", desc: "Reverse an audio clip.", options: [] },
	// arls: {
	// 	name: "arls",
	// 	desc: "Apply Recursive Least Squares algorithm to first audio stream.",
	// 	options: [],
	// },
	// arnndn: {
	// 	name: "arnndn",
	// 	desc: "Reduce noise from speech using Recurrent Neural Networks.",
	// 	options: [],
	// },
	// asdr: {
	// 	name: "asdr",
	// 	desc: "Measure Audio Signal-to-Distortion Ratio.",
	// 	options: [],
	// },
	// asendcmd: {
	// 	name: "asendcmd",
	// 	desc: "Send commands to filters.",
	// 	options: [],
	// },
	// asetnsamples: {
	// 	name: "asetnsamples",
	// 	desc: "Set the number of samples for each output audio frames.",
	// 	options: [],
	// },
	// asetpts: {
	// 	name: "asetpts",
	// 	desc: "Set PTS for the output audio frame.",
	// 	options: [],
	// },
	// asetrate: {
	// 	name: "asetrate",
	// 	desc: "Change the sample rate without altering the data.",
	// 	options: [],
	// },
	// asettb: {
	// 	name: "asettb",
	// 	desc: "Set timebase for the audio output link.",
	// 	options: [],
	// },
	// ashowinfo: {
	// 	name: "ashowinfo",
	// 	desc: "Show textual information for each audio frame.",
	// 	options: [],
	// },
	// asidedata: {
	// 	name: "asidedata",
	// 	desc: "Manipulate audio frame side data.",
	// 	options: [],
	// },
	// asisdr: {
	// 	name: "asisdr",
	// 	desc: "Measure Audio Scale-Invariant Signal-to-Distortion Ratio.",
	// 	options: [],
	// },
	// asoftclip: { name: "asoftclip", desc: "Audio Soft Clipper.", options: [] },
	// aspectralstats: {
	// 	name: "aspectralstats",
	// 	desc: "Show frequency domain statistics about audio frames.",
	// 	options: [],
	// },
	// asr: { name: "asr", desc: "Automatic Speech Recognition.", options: [] },
	// astats: {
	// 	name: "astats",
	// 	desc: "Show time domain statistics about audio frames.",
	// 	options: [],
	// },
	// asubboost: {
	// 	name: "asubboost",
	// 	desc: "Boost subwoofer frequencies.",
	// 	options: [],
	// },
	// asubcut: { name: "asubcut", desc: "Cut subwoofer frequencies.", options: [] },
	// asupercut: { name: "asupercut", desc: "Cut super frequencies.", options: [] },
	// asuperpass: {
	// 	name: "asuperpass",
	// 	desc: "Apply high order Butterworth band-pass filter.",
	// 	options: [],
	// },
	// asuperstop: {
	// 	name: "asuperstop",
	// 	desc: "Apply high order Butterworth band-stop filter.",
	// 	options: [],
	// },
	// atempo: { name: "atempo", desc: "Adjust audio tempo.", options: [] },
	// atilt: { name: "atilt", desc: "Apply spectral tilt to audio.", options: [] },
	// atrim: {
	// 	name: "atrim",
	// 	desc: "Pick one continuous section from the input, drop the rest.",
	// 	options: [],
	// },
	// axcorrelate: {
	// 	name: "axcorrelate",
	// 	desc: "Cross-correlate two audio streams.",
	// 	options: [],
	// },
	// azmq: {
	// 	name: "azmq",
	// 	desc: "Receive commands through ZMQ and broker them to filters.",
	// 	options: [],
	// },
	// bandpass: {
	// 	name: "bandpass",
	// 	desc: "Apply a two-pole Butterworth band-pass filter.",
	// 	options: [],
	// },
	// bandreject: {
	// 	name: "bandreject",
	// 	desc: "Apply a two-pole Butterworth band-reject filter.",
	// 	options: [],
	// },
	// bass: { name: "bass", desc: "Boost or cut lower frequencies.", options: [] },
	// biquad: {
	// 	name: "biquad",
	// 	desc: "Apply a biquad IIR filter with the given coefficients.",
	// 	options: [],
	// },
	// bs2b: { name: "bs2b", desc: "Bauer stereo-to-binaural filter.", options: [] },
	// channelmap: {
	// 	name: "channelmap",
	// 	desc: "Remap audio channels.",
	// 	options: [],
	// },
	// chorus: {
	// 	name: "chorus",
	// 	desc: "Add a chorus effect to the audio.",
	// 	options: [],
	// },
	// compand: {
	// 	name: "compand",
	// 	desc: "Compress or expand audio dynamic range.",
	// 	options: [],
	// },
	// compensationdelay: {
	// 	name: "compensationdelay",
	// 	desc: "Audio Compensation Delay Line.",
	// 	options: [],
	// },
	// crossfeed: {
	// 	name: "crossfeed",
	// 	desc: "Apply headphone crossfeed filter.",
	// 	options: [],
	// },
	// crystalizer: {
	// 	name: "crystalizer",
	// 	desc: "Simple audio noise sharpening filter.",
	// 	options: [],
	// },
	// dcshift: {
	// 	name: "dcshift",
	// 	desc: "Apply a DC shift to the audio.",
	// 	options: [],
	// },
	// deesser: {
	// 	name: "deesser",
	// 	desc: "Apply de-essing to the audio.",
	// 	options: [],
	// },
	// dialoguenhance: {
	// 	name: "dialoguenhance",
	// 	desc: "Audio Dialogue Enhancement.",
	// 	options: [],
	// },
	// drmeter: {
	// 	name: "drmeter",
	// 	desc: "Measure audio dynamic range.",
	// 	options: [],
	// },
	// dynaudnorm: {
	// 	name: "dynaudnorm",
	// 	desc: "Dynamic Audio Normalizer.",
	// 	options: [],
	// },
	// earwax: { name: "earwax", desc: "Widen the stereo image.", options: [] },
	// equalizer: {
	// 	name: "equalizer",
	// 	desc: "Apply two-pole peaking equalization (EQ) filter.",
	// 	options: [],
	// },
	// extrastereo: {
	// 	name: "extrastereo",
	// 	desc: "Increase difference between stereo audio channels.",
	// 	options: [],
	// },
	// firequalizer: {
	// 	name: "firequalizer",
	// 	desc: "Finite Impulse Response Equalizer.",
	// 	options: [],
	// },
	// flanger: {
	// 	name: "flanger",
	// 	desc: "Apply a flanging effect to the audio.",
	// 	options: [],
	// },
	// haas: { name: "haas", desc: "Apply Haas Stereo Enhancer.", options: [] },
	// hdcd: {
	// 	name: "hdcd",
	// 	desc: "Apply High Definition Compatible Digital (HDCD) decoding.",
	// 	options: [],
	// },
	// highpass: {
	// 	name: "highpass",
	// 	desc: "Apply a high-pass filter with 3dB point frequency.",
	// 	options: [],
	// },
	// highshelf: {
	// 	name: "highshelf",
	// 	desc: "Apply a high shelf filter.",
	// 	options: [],
	// },
	// loudnorm: {
	// 	name: "loudnorm",
	// 	desc: "EBU R128 loudness normalization",
	// 	options: [],
	// },
	// lowpass: {
	// 	name: "lowpass",
	// 	desc: "Apply a low-pass filter with 3dB point frequency.",
	// 	options: [],
	// },
	// lowshelf: {
	// 	name: "lowshelf",
	// 	desc: "Apply a low shelf filter.",
	// 	options: [],
	// },
	// mcompand: {
	// 	name: "mcompand",
	// 	desc: "Multiband Compress or expand audio dynamic range.",
	// 	options: [],
	// },
	// pan: {
	// 	name: "pan",
	// 	desc: "Remix channels with coefficients (panning).",
	// 	options: [],
	// },
	// replaygain: { name: "replaygain", desc: "ReplayGain scanner.", options: [] },
	// rubberband: {
	// 	name: "rubberband",
	// 	desc: "Apply time-stretching and pitch-shifting.",
	// 	options: [],
	// },
	// sidechaincompress: {
	// 	name: "sidechaincompress",
	// 	desc: "Sidechain compressor.",
	// 	options: [],
	// },
	// sidechaingate: {
	// 	name: "sidechaingate",
	// 	desc: "Audio sidechain gate.",
	// 	options: [],
	// },
	// silencedetect: {
	// 	name: "silencedetect",
	// 	desc: "Detect silence.",
	// 	options: [],
	// },
	// silenceremove: {
	// 	name: "silenceremove",
	// 	desc: "Remove silence.",
	// 	options: [],
	// },
	// sofalizer: {
	// 	name: "sofalizer",
	// 	desc: "SOFAlizer (Spatially Oriented Format for Acoustics).",
	// 	options: [],
	// },
	// speechnorm: { name: "speechnorm", desc: "Speech Normalizer.", options: [] },
	// stereotools: {
	// 	name: "stereotools",
	// 	desc: "Apply various stereo tools.",
	// 	options: [],
	// },
	// stereowiden: {
	// 	name: "stereowiden",
	// 	desc: "Apply stereo widening effect.",
	// 	options: [],
	// },
	// superequalizer: {
	// 	name: "superequalizer",
	// 	desc: "Apply 18 band equalization filter.",
	// 	options: [],
	// },
	// surround: {
	// 	name: "surround",
	// 	desc: "Apply audio surround upmix filter.",
	// 	options: [],
	// },
	// tiltshelf: {
	// 	name: "tiltshelf",
	// 	desc: "Apply a tilt shelf filter.",
	// 	options: [],
	// },
	// treble: {
	// 	name: "treble",
	// 	desc: "Boost or cut upper frequencies.",
	// 	options: [],
	// },
	// tremolo: { name: "tremolo", desc: "Apply tremolo effect.", options: [] },
	// vibrato: { name: "vibrato", desc: "Apply vibrato effect.", options: [] },
	// virtualbass: {
	// 	name: "virtualbass",
	// 	desc: "Audio Virtual Bass.",
	// 	options: [],
	// },
	// volume: { name: "volume", desc: "Change input volume.", options: [] },
	// volumedetect: {
	// 	name: "volumedetect",
	// 	desc: "Detect audio volume.",
	// 	options: [],
	// },
	// afifo: {
	// 	name: "afifo",
	// 	desc: "Buffer input frames and send them when they are requested.",
	// 	options: [],
	// },
} satisfies Partial<AUDIO_FILTERS>;

// export const FILTERS_OPTIONS = [
// 	// { name: "abench", desc: "Benchmark part of a filtergraph." },
// 	{ name: "acompressor", desc: "Audio compressor." },
// 	{
// 		name: "acontrast",

// 		desc: "Simple audio dynamic range compression/expansion filter.",
// 	},
// 	{ name: "acrusher", desc: "Reduce audio bit resolution." },
// 	{
// 		name: "adeclick",

// 		desc: "Remove impulsive noise from input audio.",
// 	},
// 	{
// 		name: "adeclip",

// 		desc: "Remove clipping from input audio.",
// 	},
// 	{
// 		name: "adecorrelate",

// 		desc: "Apply decorrelation to input audio.",
// 	},
// 	// {
// 	// 	name: "acopy",

// 	// 	desc: "Copy the input audio unchanged to the output.",
// 	// },
// 	// { name: "acue", desc: "Delay filtering to match a cue." },
// 	// {
// 	// 	name: "acrossfade",

// 	// 	desc: "Cross fade two input audio streams.",
// 	// },
// 	{
// 		name: "adelay",

// 		desc: "Delay one or more audio channels.",
// 	},
// 	{
// 		name: "adenorm",

// 		desc: "Remedy denormals by adding extremely low-level noise.",
// 	},
// 	{
// 		name: "aderivative",

// 		desc: "Compute derivative of input audio.",
// 	},
// 	{
// 		name: "adrc",

// 		desc: "Audio Spectral Dynamic Range Controller.",
// 	},
// 	{
// 		name: "adynamicequalizer",

// 		desc: "Apply Dynamic Equalization of input audio.",
// 	},
// 	{
// 		name: "adynamicsmooth",

// 		desc: "Apply Dynamic Smoothing of input audio.",
// 	},
// 	{ name: "aecho", desc: "Add echoing to the audio." },
// 	{ name: "aemphasis", desc: "Audio emphasis." },
// 	{
// 		name: "aeval",

// 		desc: "Filter audio signal according to a specified expression.",
// 	},
// 	{
// 		name: "aexciter",

// 		desc: "Enhance high frequency part of audio.",
// 	},
// 	{ name: "afade", desc: "Fade in/out input audio." },
// 	{ name: "afftdn", desc: "Denoise audio samples using FFT." },
// 	{
// 		name: "afftfilt",

// 		desc: "Apply arbitrary expressions to samples in frequency domain.",
// 	},
// 	{
// 		name: "aformat",

// 		desc: "Convert the input audio to one of the specified formats.",
// 	},
// 	{
// 		name: "afreqshift",

// 		desc: "Apply frequency shifting to input audio.",
// 	},
// 	{
// 		name: "afwtdn",

// 		desc: "Denoise audio stream using Wavelets.",
// 	},
// 	{ name: "agate", desc: "Audio gate." },
// 	{
// 		name: "aintegral",

// 		desc: "Compute integral of input audio.",
// 	},
// 	{
// 		name: "alatency",

// 		desc: "Report audio filtering latency.",
// 	},
// 	{ name: "alimiter", desc: "Audio lookahead limiter." },
// 	{
// 		name: "allpass",

// 		desc: "Apply a two-pole all-pass filter.",
// 	},
// 	{ name: "aloop", desc: "Loop audio samples." },
// 	{
// 		name: "ametadata",

// 		desc: "Manipulate audio frame metadata.",
// 	},
// 	{
// 		name: "amultiply",

// 		desc: "Multiply two audio streams.",
// 	},
// 	{
// 		name: "anlmdn",

// 		desc: "Reduce broadband noise from stream using Non-Local Means.",
// 	},
// 	{
// 		name: "anlmf",

// 		desc: "Apply Normalized Least-Mean-Fourth algorithm to first audio stream.",
// 	},
// 	{
// 		name: "anlms",

// 		desc: "Apply Normalized Least-Mean-Squares algorithm to first audio stream.",
// 	},
// 	{
// 		name: "anull",

// 		desc: "Pass the source unchanged to the output.",
// 	},
// 	{ name: "apad", desc: "Pad audio with silence." },
// 	{
// 		name: "aperms",

// 		desc: "Set permissions for the output audio frame.",
// 	},
// 	{
// 		name: "aphaser",

// 		desc: "Add a phasing effect to the audio.",
// 	},
// 	{
// 		name: "aphaseshift",

// 		desc: "Apply phase shifting to input audio.",
// 	},
// 	{
// 		name: "apsnr",

// 		desc: "Measure Audio Peak Signal-to-Noise Ratio.",
// 	},
// 	{
// 		name: "apsyclip",

// 		desc: "Audio Psychoacoustic Clipper.",
// 	},
// 	{ name: "apulsator", desc: "Audio pulsator." },
// 	{
// 		name: "arealtime",

// 		desc: "Slow down filtering to match realtime.",
// 	},
// 	{ name: "aresample", desc: "Resample audio data." },
// 	{ name: "areverse", desc: "Reverse an audio clip." },
// 	{
// 		name: "arls",

// 		desc: "Apply Recursive Least Squares algorithm to first audio stream.",
// 	},
// 	{
// 		name: "arnndn",

// 		desc: "Reduce noise from speech using Recurrent Neural Networks.",
// 	},
// 	{
// 		name: "asdr",

// 		desc: "Measure Audio Signal-to-Distortion Ratio.",
// 	},
// 	{ name: "asendcmd", desc: "Send commands to filters." },
// 	{
// 		name: "asetnsamples",

// 		desc: "Set the number of samples for each output audio frames.",
// 	},
// 	{
// 		name: "asetpts",

// 		desc: "Set PTS for the output audio frame.",
// 	},
// 	{
// 		name: "asetrate",

// 		desc: "Change the sample rate without altering the data.",
// 	},
// 	{
// 		name: "asettb",

// 		desc: "Set timebase for the audio output link.",
// 	},
// 	{
// 		name: "ashowinfo",

// 		desc: "Show textual information for each audio frame.",
// 	},
// 	{
// 		name: "asidedata",

// 		desc: "Manipulate audio frame side data.",
// 	},
// 	{
// 		name: "asisdr",

// 		desc: "Measure Audio Scale-Invariant Signal-to-Distortion Ratio.",
// 	},
// 	{ name: "asoftclip", desc: "Audio Soft Clipper." },
// 	{
// 		name: "aspectralstats",

// 		desc: "Show frequency domain statistics about audio frames.",
// 	},
// 	{ name: "asr", desc: "Automatic Speech Recognition." },
// 	{
// 		name: "astats",

// 		desc: "Show time domain statistics about audio frames.",
// 	},
// 	{
// 		name: "asubboost",

// 		desc: "Boost subwoofer frequencies.",
// 	},
// 	{ name: "asubcut", desc: "Cut subwoofer frequencies." },
// 	{ name: "asupercut", desc: "Cut super frequencies." },
// 	{
// 		name: "asuperpass",

// 		desc: "Apply high order Butterworth band-pass filter.",
// 	},
// 	{
// 		name: "asuperstop",

// 		desc: "Apply high order Butterworth band-stop filter.",
// 	},
// 	{ name: "atempo", desc: "Adjust audio tempo." },
// 	{ name: "atilt", desc: "Apply spectral tilt to audio." },
// 	{
// 		name: "atrim",

// 		desc: "Pick one continuous section from the input, drop the rest.",
// 	},
// 	{
// 		name: "axcorrelate",

// 		desc: "Cross-correlate two audio streams.",
// 	},
// 	{
// 		name: "azmq",

// 		desc: "Receive commands through ZMQ and broker them to filters.",
// 	},
// 	{
// 		name: "bandpass",

// 		desc: "Apply a two-pole Butterworth band-pass filter.",
// 	},
// 	{
// 		name: "bandreject",

// 		desc: "Apply a two-pole Butterworth band-reject filter.",
// 	},
// 	{ name: "bass", desc: "Boost or cut lower frequencies." },
// 	{
// 		name: "biquad",

// 		desc: "Apply a biquad IIR filter with the given coefficients.",
// 	},
// 	{ name: "bs2b", desc: "Bauer stereo-to-binaural filter." },
// 	{ name: "channelmap", desc: "Remap audio channels." },
// 	{
// 		name: "chorus",

// 		desc: "Add a chorus effect to the audio.",
// 	},
// 	{
// 		name: "compand",

// 		desc: "Compress or expand audio dynamic range.",
// 	},
// 	{
// 		name: "compensationdelay",

// 		desc: "Audio Compensation Delay Line.",
// 	},
// 	{
// 		name: "crossfeed",

// 		desc: "Apply headphone crossfeed filter.",
// 	},
// 	{
// 		name: "crystalizer",

// 		desc: "Simple audio noise sharpening filter.",
// 	},
// 	{ name: "dcshift", desc: "Apply a DC shift to the audio." },
// 	{ name: "deesser", desc: "Apply de-essing to the audio." },
// 	{
// 		name: "dialoguenhance",

// 		desc: "Audio Dialogue Enhancement.",
// 	},
// 	{ name: "drmeter", desc: "Measure audio dynamic range." },
// 	{
// 		name: "dynaudnorm",

// 		desc: "Dynamic Audio Normalizer.",
// 	},
// 	{ name: "earwax", desc: "Widen the stereo image." },
// 	{
// 		name: "equalizer",

// 		desc: "Apply two-pole peaking equalization (EQ) filter.",
// 	},
// 	{
// 		name: "extrastereo",

// 		desc: "Increase difference between stereo audio channels.",
// 	},
// 	{
// 		name: "firequalizer",

// 		desc: "Finite Impulse Response Equalizer.",
// 	},
// 	{
// 		name: "flanger",

// 		desc: "Apply a flanging effect to the audio.",
// 	},
// 	{ name: "haas", desc: "Apply Haas Stereo Enhancer." },
// 	{
// 		name: "hdcd",

// 		desc: "Apply High Definition Compatible Digital (HDCD) decoding.",
// 	},
// 	{
// 		name: "highpass",

// 		desc: "Apply a high-pass filter with 3dB point frequency.",
// 	},
// 	{ name: "highshelf", desc: "Apply a high shelf filter." },
// 	{
// 		name: "loudnorm",

// 		desc: "EBU R128 loudness normalization",
// 	},
// 	{
// 		name: "lowpass",

// 		desc: "Apply a low-pass filter with 3dB point frequency.",
// 	},
// 	{ name: "lowshelf", desc: "Apply a low shelf filter." },
// 	{
// 		name: "mcompand",

// 		desc: "Multiband Compress or expand audio dynamic range.",
// 	},
// 	{
// 		name: "pan",

// 		desc: "Remix channels with coefficients (panning).",
// 	},
// 	{ name: "replaygain", desc: "ReplayGain scanner." },
// 	{
// 		name: "rubberband",

// 		desc: "Apply time-stretching and pitch-shifting.",
// 	},
// 	{
// 		name: "sidechaincompress",

// 		desc: "Sidechain compressor.",
// 	},
// 	{
// 		name: "sidechaingate",

// 		desc: "Audio sidechain gate.",
// 	},
// 	{ name: "silencedetect", desc: "Detect silence." },
// 	{ name: "silenceremove", desc: "Remove silence." },
// 	{
// 		name: "sofalizer",

// 		desc: "SOFAlizer (Spatially Oriented Format for Acoustics).",
// 	},
// 	{ name: "speechnorm", desc: "Speech Normalizer." },
// 	{
// 		name: "stereotools",

// 		desc: "Apply various stereo tools.",
// 	},
// 	{
// 		name: "stereowiden",

// 		desc: "Apply stereo widening effect.",
// 	},
// 	{
// 		name: "superequalizer",

// 		desc: "Apply 18 band equalization filter.",
// 	},
// 	{
// 		name: "surround",

// 		desc: "Apply audio surround upmix filter.",
// 	},
// 	{ name: "tiltshelf", desc: "Apply a tilt shelf filter." },
// 	{ name: "treble", desc: "Boost or cut upper frequencies." },
// 	{ name: "tremolo", desc: "Apply tremolo effect." },
// 	{ name: "vibrato", desc: "Apply vibrato effect." },
// 	{ name: "virtualbass", desc: "Audio Virtual Bass." },
// 	{ name: "volume", desc: "Change input volume." },
// 	{ name: "volumedetect", desc: "Detect audio volume." },
// 	{
// 		name: "afifo",

// 		desc: "Buffer input frames and send them when they are requested.",
// 	},
// ] satisfies AUDIO_FILTERS_OPTIONS;

export const EXTENSIONS_LIST = [
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
] satisfies EXTENSIONS;

export const MUXER_TO_EXTENSION = {
	alaw: ".al",
	daud: ".daud",
	dfpwm: ".dfpwm",
	f32be: ".pcm",
	f32le: ".pcm",
	f64be: ".pcm",
	f64le: ".pcm",
	mulaw: ".ul",
	s16be: ".pcm",
	s16le: ".pcm",
	s24be: ".pcm",
	s24le: ".pcm",
	s32be: ".pcm",
	s32le: ".pcm",
	s8: ".pcm",
	u16be: ".pcm",
	u16le: ".pcm",
	u24be: ".pcm",
	u24le: ".pcm",
	u32be: ".pcm",
	u32le: ".pcm",
	u8: ".pcm",
	vidc: ".vidc",
	ac3: ".ac3",
	ac4: ".ac4",
	adts: ".aac",
	adx: ".adx",
	aiff: ".aiff",
	alp: ".alp",
	amr: ".amr",
	apm: ".apm",
	aptx: ".aptx",
	aptx_hd: ".aptx",
	argo_asf: ".asf",
	argo_cvg: ".cvg",
	ast: ".ast",
	au: ".au",
	bit: ".bit",
	caf: ".caf",
	codec2: ".c2",
	codec2raw: ".c2",
	dts: ".dts",
	eac3: ".eac3",
	flac: ".flac",
	g722: ".g722",
	g723_1: ".g723",
	g726: ".g726",
	g726le: ".g726",
	gsm: ".gsm",
	ilbc: ".ilbc",
	ircam: ".sf",
	kvag: ".vag",
	latm: ".aac",
	mlp: ".mlp",
	mmf: ".mmf",
	mp2: ".mp2",
	mp3: ".mp3",
	oma: ".oma",
	opus: ".opus",
	rso: ".rso",
	sbc: ".sbc",
	sox: ".sox",
	spdif: ".spdif",
	spx: ".spx",
	tta: ".tta",
	truehd: ".thd",
	voc: ".voc",
	w64: ".w64",
	wav: ".wav",
	wsaud: ".wsa",
	wv: ".wv",
	alsa: "",
	oss: "",
	pulse: "",
	oga: ".oga",
} satisfies AUDIO_MUXER_EXTENSIONS;
