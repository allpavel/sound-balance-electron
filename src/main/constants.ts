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
import type { GeneralSettings } from "@/types";

export const INITIALSETTINGS = {
	global: {
		outputDirectoryPath: "",
		overwrite: true,
		noOverwrite: false,
		statsPeriod: 0.5,
		recastMedia: false,
		concurrency: 1,
	},
	audio: {
		outputExtension: ".aac",
		audioCodec: "copy",
		audioQuality: "4",
		audioFilter: "",
		filterOptions: {},
	},
} satisfies GeneralSettings;

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
} as const;
