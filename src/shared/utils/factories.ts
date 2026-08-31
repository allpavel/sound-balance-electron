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
import { SYSTEM_COLLECTION_ID } from "@shared/constants";
import {
	SETTINGS_SCHEMA_VERSION,
	type SettingsForm,
} from "@shared/schemas/settings.schema";
import type { Metadata } from "@shared/schemas/track.schema";
import type { CollectionType } from "@/types";

let collectionSeq = 0;
let trackSeq = 0;

export function resetFactorySequences() {
	collectionSeq = 0;
	trackSeq = 0;
}

export function makeCollection(
	overrides: Partial<CollectionType> = {},
): CollectionType {
	collectionSeq += 1;
	return {
		id: `col-${collectionSeq}`,
		title: `Collection ${collectionSeq}`,
		...overrides,
	};
}

export function makeTrack(overrides: Partial<Metadata> = {}): Metadata {
	trackSeq += 1;
	return {
		id: `track-${trackSeq}`,
		file: `track-${trackSeq}.mp3`,
		filePath: `/music/track-${trackSeq}.mp3`,
		status: "pending",
		selected: 0,
		collectionIds: [SYSTEM_COLLECTION_ID],
		common: {},
		format: {},
		...overrides,
	} as Metadata;
}

export function getValidSettings(
	overrides: Partial<SettingsForm> = {},
): SettingsForm {
	return {
		version: SETTINGS_SCHEMA_VERSION,
		global: {
			outputDirectoryPath: "/music/output",
			openOutputFolderOnComplete: true,
			concurrency: 4,
			overwrite: false,
			noOverwrite: true,
		},
		audio: {
			audioCodec: "libmp3lame",
			codecOptions: { compression_level: 5 },
			audioQuality: "vbr",
			audioQualityValue: "4",
			outputExtension: ".mp3",
			audioFilter: "loudnorm",
			filterOptions: { I: -24, LRA: 7 },
		},
		...overrides,
	};
}
