import type { AUDIO_FILTERS_OPTIONS } from "./settings.types";

export const CONCURRENCY_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
	value: String(i + 1),
}));

export const FILTERS_OPTIONS = [
	{ name: "abench", desc: "Benchmark part of a filtergraph." },
	{ name: "acompressor", desc: "Audio compressor." },
	{
		name: "acontrast",

		desc: "Simple audio dynamic range compression/expansion filter.",
	},
	{
		name: "acopy",

		desc: "Copy the input audio unchanged to the output.",
	},
	{ name: "acue", desc: "Delay filtering to match a cue." },
	{
		name: "acrossfade",

		desc: "Cross fade two input audio streams.",
	},
	{ name: "acrusher", desc: "Reduce audio bit resolution." },
	{
		name: "adeclick",

		desc: "Remove impulsive noise from input audio.",
	},
	{
		name: "adeclip",

		desc: "Remove clipping from input audio.",
	},
	{
		name: "adecorrelate",

		desc: "Apply decorrelation to input audio.",
	},
	{
		name: "adelay",

		desc: "Delay one or more audio channels.",
	},
	{
		name: "adenorm",

		desc: "Remedy denormals by adding extremely low-level noise.",
	},
	{
		name: "aderivative",

		desc: "Compute derivative of input audio.",
	},
	{
		name: "adrc",

		desc: "Audio Spectral Dynamic Range Controller.",
	},
	{
		name: "adynamicequalizer",

		desc: "Apply Dynamic Equalization of input audio.",
	},
	{
		name: "adynamicsmooth",

		desc: "Apply Dynamic Smoothing of input audio.",
	},
	{ name: "aecho", desc: "Add echoing to the audio." },
	{ name: "aemphasis", desc: "Audio emphasis." },
	{
		name: "aeval",

		desc: "Filter audio signal according to a specified expression.",
	},
	{
		name: "aexciter",

		desc: "Enhance high frequency part of audio.",
	},
	{ name: "afade", desc: "Fade in/out input audio." },
	{ name: "afftdn", desc: "Denoise audio samples using FFT." },
	{
		name: "afftfilt",

		desc: "Apply arbitrary expressions to samples in frequency domain.",
	},
	{
		name: "aformat",

		desc: "Convert the input audio to one of the specified formats.",
	},
	{
		name: "afreqshift",

		desc: "Apply frequency shifting to input audio.",
	},
	{
		name: "afwtdn",

		desc: "Denoise audio stream using Wavelets.",
	},
	{ name: "agate", desc: "Audio gate." },
	{
		name: "aintegral",

		desc: "Compute integral of input audio.",
	},
	{
		name: "alatency",

		desc: "Report audio filtering latency.",
	},
	{ name: "alimiter", desc: "Audio lookahead limiter." },
	{
		name: "allpass",

		desc: "Apply a two-pole all-pass filter.",
	},
	{ name: "aloop", desc: "Loop audio samples." },
	{
		name: "ametadata",

		desc: "Manipulate audio frame metadata.",
	},
	{
		name: "amultiply",

		desc: "Multiply two audio streams.",
	},
	{
		name: "anlmdn",

		desc: "Reduce broadband noise from stream using Non-Local Means.",
	},
	{
		name: "anlmf",

		desc: "Apply Normalized Least-Mean-Fourth algorithm to first audio stream.",
	},
	{
		name: "anlms",

		desc: "Apply Normalized Least-Mean-Squares algorithm to first audio stream.",
	},
	{
		name: "anull",

		desc: "Pass the source unchanged to the output.",
	},
	{ name: "apad", desc: "Pad audio with silence." },
	{
		name: "aperms",

		desc: "Set permissions for the output audio frame.",
	},
	{
		name: "aphaser",

		desc: "Add a phasing effect to the audio.",
	},
	{
		name: "aphaseshift",

		desc: "Apply phase shifting to input audio.",
	},
	{
		name: "apsnr",

		desc: "Measure Audio Peak Signal-to-Noise Ratio.",
	},
	{
		name: "apsyclip",

		desc: "Audio Psychoacoustic Clipper.",
	},
	{ name: "apulsator", desc: "Audio pulsator." },
	{
		name: "arealtime",

		desc: "Slow down filtering to match realtime.",
	},
	{ name: "aresample", desc: "Resample audio data." },
	{ name: "areverse", desc: "Reverse an audio clip." },
	{
		name: "arls",

		desc: "Apply Recursive Least Squares algorithm to first audio stream.",
	},
	{
		name: "arnndn",

		desc: "Reduce noise from speech using Recurrent Neural Networks.",
	},
	{
		name: "asdr",

		desc: "Measure Audio Signal-to-Distortion Ratio.",
	},
	{ name: "asendcmd", desc: "Send commands to filters." },
	{
		name: "asetnsamples",

		desc: "Set the number of samples for each output audio frames.",
	},
	{
		name: "asetpts",

		desc: "Set PTS for the output audio frame.",
	},
	{
		name: "asetrate",

		desc: "Change the sample rate without altering the data.",
	},
	{
		name: "asettb",

		desc: "Set timebase for the audio output link.",
	},
	{
		name: "ashowinfo",

		desc: "Show textual information for each audio frame.",
	},
	{
		name: "asidedata",

		desc: "Manipulate audio frame side data.",
	},
	{
		name: "asisdr",

		desc: "Measure Audio Scale-Invariant Signal-to-Distortion Ratio.",
	},
	{ name: "asoftclip", desc: "Audio Soft Clipper." },
	{
		name: "aspectralstats",

		desc: "Show frequency domain statistics about audio frames.",
	},
	{ name: "asr", desc: "Automatic Speech Recognition." },
	{
		name: "astats",

		desc: "Show time domain statistics about audio frames.",
	},
	{
		name: "asubboost",

		desc: "Boost subwoofer frequencies.",
	},
	{ name: "asubcut", desc: "Cut subwoofer frequencies." },
	{ name: "asupercut", desc: "Cut super frequencies." },
	{
		name: "asuperpass",

		desc: "Apply high order Butterworth band-pass filter.",
	},
	{
		name: "asuperstop",

		desc: "Apply high order Butterworth band-stop filter.",
	},
	{ name: "atempo", desc: "Adjust audio tempo." },
	{ name: "atilt", desc: "Apply spectral tilt to audio." },
	{
		name: "atrim",

		desc: "Pick one continuous section from the input, drop the rest.",
	},
	{
		name: "axcorrelate",

		desc: "Cross-correlate two audio streams.",
	},
	{
		name: "azmq",

		desc: "Receive commands through ZMQ and broker them to filters.",
	},
	{
		name: "bandpass",

		desc: "Apply a two-pole Butterworth band-pass filter.",
	},
	{
		name: "bandreject",

		desc: "Apply a two-pole Butterworth band-reject filter.",
	},
	{ name: "bass", desc: "Boost or cut lower frequencies." },
	{
		name: "biquad",

		desc: "Apply a biquad IIR filter with the given coefficients.",
	},
	{ name: "bs2b", desc: "Bauer stereo-to-binaural filter." },
	{ name: "channelmap", desc: "Remap audio channels." },
	{
		name: "chorus",

		desc: "Add a chorus effect to the audio.",
	},
	{
		name: "compand",

		desc: "Compress or expand audio dynamic range.",
	},
	{
		name: "compensationdelay",

		desc: "Audio Compensation Delay Line.",
	},
	{
		name: "crossfeed",

		desc: "Apply headphone crossfeed filter.",
	},
	{
		name: "crystalizer",

		desc: "Simple audio noise sharpening filter.",
	},
	{ name: "dcshift", desc: "Apply a DC shift to the audio." },
	{ name: "deesser", desc: "Apply de-essing to the audio." },
	{
		name: "dialoguenhance",

		desc: "Audio Dialogue Enhancement.",
	},
	{ name: "drmeter", desc: "Measure audio dynamic range." },
	{
		name: "dynaudnorm",

		desc: "Dynamic Audio Normalizer.",
	},
	{ name: "earwax", desc: "Widen the stereo image." },
	{
		name: "equalizer",

		desc: "Apply two-pole peaking equalization (EQ) filter.",
	},
	{
		name: "extrastereo",

		desc: "Increase difference between stereo audio channels.",
	},
	{
		name: "firequalizer",

		desc: "Finite Impulse Response Equalizer.",
	},
	{
		name: "flanger",

		desc: "Apply a flanging effect to the audio.",
	},
	{ name: "haas", desc: "Apply Haas Stereo Enhancer." },
	{
		name: "hdcd",

		desc: "Apply High Definition Compatible Digital (HDCD) decoding.",
	},
	{
		name: "highpass",

		desc: "Apply a high-pass filter with 3dB point frequency.",
	},
	{ name: "highshelf", desc: "Apply a high shelf filter." },
	{
		name: "loudnorm",

		desc: "EBU R128 loudness normalization",
	},
	{
		name: "lowpass",

		desc: "Apply a low-pass filter with 3dB point frequency.",
	},
	{ name: "lowshelf", desc: "Apply a low shelf filter." },
	{
		name: "mcompand",

		desc: "Multiband Compress or expand audio dynamic range.",
	},
	{
		name: "pan",

		desc: "Remix channels with coefficients (panning).",
	},
	{ name: "replaygain", desc: "ReplayGain scanner." },
	{
		name: "rubberband",

		desc: "Apply time-stretching and pitch-shifting.",
	},
	{
		name: "sidechaincompress",

		desc: "Sidechain compressor.",
	},
	{
		name: "sidechaingate",

		desc: "Audio sidechain gate.",
	},
	{ name: "silencedetect", desc: "Detect silence." },
	{ name: "silenceremove", desc: "Remove silence." },
	{
		name: "sofalizer",

		desc: "SOFAlizer (Spatially Oriented Format for Acoustics).",
	},
	{ name: "speechnorm", desc: "Speech Normalizer." },
	{
		name: "stereotools",

		desc: "Apply various stereo tools.",
	},
	{
		name: "stereowiden",

		desc: "Apply stereo widening effect.",
	},
	{
		name: "superequalizer",

		desc: "Apply 18 band equalization filter.",
	},
	{
		name: "surround",

		desc: "Apply audio surround upmix filter.",
	},
	{ name: "tiltshelf", desc: "Apply a tilt shelf filter." },
	{ name: "treble", desc: "Boost or cut upper frequencies." },
	{ name: "tremolo", desc: "Apply tremolo effect." },
	{ name: "vibrato", desc: "Apply vibrato effect." },
	{ name: "virtualbass", desc: "Audio Virtual Bass." },
	{ name: "volume", desc: "Change input volume." },
	{ name: "volumedetect", desc: "Detect audio volume." },
	{
		name: "afifo",

		desc: "Buffer input frames and send them when they are requested.",
	},
] satisfies AUDIO_FILTERS_OPTIONS;
