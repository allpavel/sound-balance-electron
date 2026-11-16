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

import { withOverrides } from "@renderer/utils/humanizeLabel";
import type { FilterOption } from "@shared/schemas/settings.schema";

/**
 * Exact-match overrides shared by filter and encoder option forms.
 * Keys are raw FFmpeg parameter names.
 */
const OPTION_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
	// --- Loudness normalization (loudnorm / speechnorm / dynaudnorm) ---
	I: "Target Volume (LUFS)",
	LRA: "Loudness Range (LU)",
	TP: "True Peak Limit (dBTP)",
	measured_I: "Measured Input Loudness (LUFS)",
	measured_LRA: "Measured Loudness Range (LU)",
	measured_TP: "Measured Input True Peak (dBTP)",
	measured_thresh: "Measured Input Threshold (LUFS)",
	offset: "Gain Offset (dB)",
	linear: "Linear Normalization",
	dual_mono: "Treat Dual-Mono as Stereo",
	target: "Target Compression",
	compression: "Compression Amount",
	// --- Dynamics (acompressor / agate / alimiter) ---
	level_in: "Input Level",
	level_out: "Output Level",
	level: "Level",
	threshold: "Threshold",
	ratio: "Compression Ratio",
	attack: "Attack Time (ms)",
	release: "Release Time (ms)",
	makeup: "Makeup Gain",
	knee: "Knee Softness (dB)",
	autoMakeup: "Automatic Makeup Gain",
	sidechain: "Use Sidechain Input",
	detection: "Detection Mode",
	link: "Stereo Link Mode",
	listen: "Listen to Sidechain Only",
	// --- General DSP vocabulary ---
	mode: "Mode",
	mix: "Effect Mix",
	type: "Type",
	freq: "Center Frequency (Hz)",
	frequency: "Frequency (Hz)",
	width: "Width",
	qfactor: "Quality Factor (Q)",
	dqfactor: "Q Factor",
	gain: "Gain (dB)",
	in_gain: "Input Gain (dB)",
	out_gain: "Output Gain (dB)",
	phasetype: "Phase Type",
	order: "Filter Order",
	levels: "Level Detection Mode",
	channels: "Channels to Apply",
	// --- Encoder vocabulary ---
	b: "Target Bitrate",
	abr: "Average Bitrate Mode",
	cutoff: "Cutoff Frequency (Hz)",
	cutoff_freq: "Cutoff Frequency (Hz)",
	compression_level: "Compression Level",
	application: "Encoding Application Profile",
	frame_duration: "Frame Duration (ms)",
	frame_size: "Frame Size",
	joint_stereo: "Joint Stereo",
	copyright: "Mark as Copyrighted",
	fec: "In-Band Forward Error Correction",
	dtx: "Discontinuous Transmission (save bandwidth in silence)",
	vbr_quality: "Variable Bitrate Quality",
	channel_layout: "Channel Layout",
	delay: "Delay (ms)",
	delays: "Delay per Channel (ms)",
	decays: "Decay per Channel",
	duration: "Duration (seconds)",
	speed: "Speed Factor",
	tempo: "Tempo Factor",
	pitch: "Pitch Factor",
};

/**
 * Resolves a plain-language label for one FFmpeg option.
 *
 * @param rawLabel - The raw FFmpeg parameter name from settings constants.
 * @returns Human-readable label (override when known, generic split otherwise).
 */
export const humanizeOptionLabel = withOverrides(OPTION_LABEL_OVERRIDES);

/**
 * Builds tooltip copy for an advanced parameter: keeps the exact FFmpeg
 * identifier (so documentation stays searchable) plus the technical
 * description.
 *
 * @param field - The option definition from `FILTER_OPTIONS`/`ENCODER_OPTIONS`.
 * @returns Multi-line tooltip text: `ffmpeg_name — description`.
 */
export function buildAdvancedHelp(
	field: Pick<FilterOption, "label" | "desc">,
): string {
	return `FFmpeg parameter: ${field.label}\n${field.desc}`;
}

/**
 * Human-readable names for the three bitrate modes shown in the segmented
 * control (the stored values remain "cbr"/"vbr"/"auto" — display only).
 */
export const BITRATE_MODE_LABELS: Readonly<
	Record<"cbr" | "vbr" | "auto", string>
> = {
	cbr: "Constant",
	vbr: "Variable",
	auto: "Auto",
};

/**
 * Plain-language display names for FFmpeg encoder identifiers.
 */
const CODEC_DISPLAY_NAMES: Readonly<Record<string, string>> = {
	aac: "AAC — native FFmpeg encoder",
	ac3: "AC-3 (Dolby Digital)",
	ac3_fixed: "AC-3 (fixed-point, slower)",
	flac: "FLAC — lossless",
	libmp3lame: "MP3 (LAME)",
	libopencore_amrnb: "AMR-NB — narrowband speech",
	libopus: "Opus — modern, recommended",
	libtwolame: "MP2 (TwoLAME)",
	libshine: "MP3 (Shine — fast)",
	libvo_amrwbenc: "AMR-WB — wideband speech",
	libvorbis: "Vorbis (OGG)",
	wavpack: "WavPack — lossless",
	copy: "Copy audio stream as-is (no re-encoding)",
};

/**
 * Resolves a display label for an encoder value.
 *
 * @param codecValue - Raw FFmpeg encoder name (or `"copy"`).
 * @returns Friendly label, falling back to the raw name when unmapped.
 */
export const codecDisplayName = withOverrides(CODEC_DISPLAY_NAMES);
