import type { aacType } from "@/types";

export interface EncoderOption {
	value: string;
	label: string;
}

export interface EncoderGroup {
	category: string;
	encoders: EncoderOption[];
}

export const audioEncoderGroups: EncoderGroup[] = [
	{
		category: "Lossy General Audio",
		encoders: [
			{ value: "aac", label: "AAC (Advanced Audio Coding)" },
			{ value: "ac3", label: "ATSC A/52A (AC-3)" },
			{ value: "ac3_fixed", label: "ATSC A/52A (AC-3) fixed point" },
			{ value: "dca", label: "DCA (DTS Coherent Acoustics)" },
			{ value: "eac3", label: "ATSC A/52 E-AC-3" },
			{ value: "mp2", label: "MP2 (MPEG audio layer 2)" },
			{ value: "mp2fixed", label: "MP2 fixed point" },
			{ value: "libtwolame", label: "libtwolame MP2" },
			{ value: "libmp3lame", label: "libmp3lame MP3" },
			{ value: "libshine", label: "libshine MP3" },
			{ value: "opus", label: "Opus" },
			{ value: "libopus", label: "libopus Opus" },
			{ value: "vorbis", label: "Vorbis" },
			{ value: "libvorbis", label: "libvorbis" },
			{ value: "sonic", label: "Sonic (lossy)" },
			{ value: "wmav1", label: "Windows Media Audio 1" },
			{ value: "wmav2", label: "Windows Media Audio 2" },
			{ value: "dfpwm", label: "DFPWM1a audio" },
		],
	},
	{
		category: "Lossless Audio",
		encoders: [
			{ value: "alac", label: "ALAC (Apple Lossless Audio Codec)" },
			{ value: "flac", label: "FLAC (Free Lossless Audio Codec)" },
			{ value: "mlp", label: "MLP (Meridian Lossless Packing)" },
			{ value: "sonicls", label: "Sonic lossless" },
			{ value: "tta", label: "TTA (True Audio)" },
			{ value: "truehd", label: "TrueHD" },
			{ value: "wavpack", label: "WavPack" },
		],
	},
	{
		category: "PCM (Uncompressed)",
		encoders: [
			{ value: "pcm_alaw", label: "PCM A-law / G.711 A-law" },
			{
				value: "pcm_bluray",
				label: "PCM signed 16|20|24-bit big-endian for Blu-ray media",
			},
			{
				value: "pcm_dvd",
				label: "PCM signed 16|20|24-bit big-endian for DVD media",
			},
			{ value: "pcm_f32be", label: "PCM 32-bit floating point big-endian" },
			{ value: "pcm_f32le", label: "PCM 32-bit floating point little-endian" },
			{ value: "pcm_f64be", label: "PCM 64-bit floating point big-endian" },
			{ value: "pcm_f64le", label: "PCM 64-bit floating point little-endian" },
			{ value: "pcm_mulaw", label: "PCM mu-law / G.711 mu-law" },
			{ value: "pcm_s16be", label: "PCM signed 16-bit big-endian" },
			{
				value: "pcm_s16be_planar",
				label: "PCM signed 16-bit big-endian planar",
			},
			{ value: "pcm_s16le", label: "PCM signed 16-bit little-endian" },
			{
				value: "pcm_s16le_planar",
				label: "PCM signed 16-bit little-endian planar",
			},
			{ value: "pcm_s24be", label: "PCM signed 24-bit big-endian" },
			{ value: "pcm_s24daud", label: "PCM D-Cinema audio signed 24-bit" },
			{ value: "pcm_s24le", label: "PCM signed 24-bit little-endian" },
			{
				value: "pcm_s24le_planar",
				label: "PCM signed 24-bit little-endian planar",
			},
			{ value: "pcm_s32be", label: "PCM signed 32-bit big-endian" },
			{ value: "pcm_s32le", label: "PCM signed 32-bit little-endian" },
			{
				value: "pcm_s32le_planar",
				label: "PCM signed 32-bit little-endian planar",
			},
			{ value: "pcm_s64be", label: "PCM signed 64-bit big-endian" },
			{ value: "pcm_s64le", label: "PCM signed 64-bit little-endian" },
			{ value: "pcm_s8", label: "PCM signed 8-bit" },
			{ value: "pcm_s8_planar", label: "PCM signed 8-bit planar" },
			{ value: "pcm_u16be", label: "PCM unsigned 16-bit big-endian" },
			{ value: "pcm_u16le", label: "PCM unsigned 16-bit little-endian" },
			{ value: "pcm_u24be", label: "PCM unsigned 24-bit big-endian" },
			{ value: "pcm_u24le", label: "PCM unsigned 24-bit little-endian" },
			{ value: "pcm_u32be", label: "PCM unsigned 32-bit big-endian" },
			{ value: "pcm_u32le", label: "PCM unsigned 32-bit little-endian" },
			{ value: "pcm_u8", label: "PCM unsigned 8-bit" },
			{ value: "pcm_vidc", label: "PCM Archimedes VIDC" },
		],
	},
	{
		category: "ADPCM (Adaptive Differential PCM)",
		encoders: [
			{ value: "adpcm_adx", label: "SEGA CRI ADX ADPCM" },
			{ value: "adpcm_argo", label: "ADPCM Argonaut Games" },
			{ value: "g722", label: "G.722 ADPCM" },
			{ value: "g726", label: "G.726 ADPCM" },
			{ value: "g726le", label: "G.726 little endian ADPCM" },
			{ value: "adpcm_ima_alp", label: "ADPCM IMA High Voltage Software ALP" },
			{ value: "adpcm_ima_amv", label: "ADPCM IMA AMV" },
			{ value: "adpcm_ima_apm", label: "ADPCM IMA Ubisoft APM" },
			{ value: "adpcm_ima_qt", label: "ADPCM IMA QuickTime" },
			{
				value: "adpcm_ima_ssi",
				label: "ADPCM IMA Simon & Schuster Interactive",
			},
			{ value: "adpcm_ima_wav", label: "ADPCM IMA WAV" },
			{ value: "adpcm_ima_ws", label: "ADPCM IMA Westwood" },
			{ value: "adpcm_ms", label: "ADPCM Microsoft" },
			{ value: "adpcm_swf", label: "ADPCM Shockwave Flash" },
			{ value: "adpcm_yamaha", label: "ADPCM Yamaha" },
		],
	},
	{
		category: "Speech & Voice Codecs",
		encoders: [
			{
				value: "libopencore_amrnb",
				label: "OpenCORE AMR-NB (Adaptive Multi-Rate Narrow-Band)",
			},
			{
				value: "libvo_amrwbenc",
				label: "Android VisualOn AMR-WB (Adaptive Multi-Rate Wide-Band)",
			},
			{ value: "libcodec2", label: "codec2 encoder using libcodec2" },
			{ value: "libgsm", label: "libgsm GSM" },
			{ value: "libgsm_ms", label: "libgsm GSM Microsoft variant" },
			{ value: "nellymoser", label: "Nellymoser Asao" },
			{ value: "libspeex", label: "libspeex Speex" },
			{ value: "g723_1", label: "G.723.1" },
			{ value: "real_144", label: "RealAudio 1.0 (14.4K)" },
		],
	},
	{
		category: "Bluetooth Codecs",
		encoders: [
			{
				value: "aptx",
				label: "aptX (Audio Processing Technology for Bluetooth)",
			},
			{
				value: "aptx_hd",
				label: "aptX HD (Audio Processing Technology for Bluetooth)",
			},
			{ value: "sbc", label: "SBC (low-complexity subband codec)" },
		],
	},
	{
		category: "Special",
		encoders: [
			{ value: "comfortnoise", label: "RFC 3389 comfort noise generator" },
			{ value: "roq_dpcm", label: "id RoQ DPCM" },
			{ value: "s302m", label: "SMPTE 302M" },
		],
	},
];

const aacOptions = {
	name: "AAC (Advanced Audio Coding)",
	generalOptions: {
		generalCapabilities: ["drl", "delay", "small"],
		threadingCapabilities: null,
		supportedSampleRate: [
			"96000",
			"88200",
			"64000",
			"48000",
			"44100",
			"32000",
			"24000",
			"22050",
			"16000",
			"12000",
			"11025",
			"8000",
			"7350",
		],
		supportedSampleFormats: ["fltp"],
	},
	encoderOptions: {
		aac_coder: "anmr",
		aac_ms: "auto",
		aac_is: true,
		aac_pns: true,
		aac_tns: true,
		aac_ltp: false,
		aac_pred: false,
		aac_pce: false,
	},
} satisfies aacType;
