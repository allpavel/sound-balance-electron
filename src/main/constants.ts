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

import type { SettingsForm } from "@types";

export const INITIALSETTINGS = {
	global: {
		outputDirectoryPath: "",
		openOutputFolderOnComplete: false,
		overwrite: true,
		noOverwrite: false,
		concurrency: 1,
	},
	audio: {
		outputExtension: ".aac",
		audioCodec: "copy",
		audioQuality: "auto",
		audioQualityValue: "auto",
		audioFilter: "",
		filterOptions: {},
		codecOptions: {},
	},
} satisfies SettingsForm;

export const EVENT_CHANNELS = {
	RESPONSE_ON_STOP: "response-on-stop",
	RESPONSE_ON_START: "response-on-start",
	PROCESSING_RESULT: "processing-result",
} as const;

export const INVOKE_CHANNELS = {
	SHOW_DIALOG: "showDialog",
	GET_OUTPUT_DIRECTORY: "getOutputDirectoryPath",
	START_PROCESSING: "startProcessing",
	STOP_PROCESSING: "stopProcessing",
	OPEN_OUTPUT_FOLDER: "openOutputFolder",
} as const;

const ESC_CONTROL = String.fromCharCode(0x1b);
const CSI_CONTROL = String.fromCharCode(0x9b);
export const BANNER_PATTERNS = [
	/^ffmpeg version\b/i,
	/^\s*built with\b/i,
	/^\s*configuration:/i,
	/^\s*lib\w+\s+\d+\.\s*\d+\.\s*\d+/i,
] as const;
export const BOM_PATTERN = /^\uFEFF+/;
export const LINE_ENDING_PATTERN = /\r\n|\r|\n/;
export const LEADING_BRACKET_PREFIX_PATTERN = /^(?:\[[^\]]*\]\s*)+/;
export const ERROR_PREFIX_PATTERN = /^Error\b/i;
export const ANSI_ESCAPE_PATTERN = new RegExp(
	`${ESC_CONTROL}\\[[0-9;?]*[a-zA-Z]|${CSI_CONTROL}[0-9;?]*[a-zA-Z]`,
	"g",
);
export const DIAGNOSTIC_HINT_PATTERN =
	/\b(?:error|fail(?:ed|ure)?|cannot|denied|invalid|not found|no such file|unable to)\b/i;
