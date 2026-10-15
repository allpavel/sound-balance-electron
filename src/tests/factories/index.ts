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
import type { Data } from "@shared/schemas/data.schema";
import {
	SETTINGS_SCHEMA_VERSION,
	type SettingsForm,
} from "@shared/schemas/settings.schema";
import {
	type IngestionMetadata,
	type Metadata,
	type Picture,
	trackInputSchema,
} from "@shared/schemas/track.schema";
import type { ValidationIssue } from "@shared/validators";
import { deepMerge } from "@tests/utils";
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

/**
 * Builds a parsed ingestion track with sensible defaults. Accepts scalar
 * overrides (id/filePath/collectionIds/status/…) and an optional binary
 * artwork list — the latter cannot go through `makeTrack` (its stored
 * `common.picture` is `string[]`). Prefer this over
 * `trackInputSchema.parse(makeTrack(...))`.
 *
 * @param overrides - Partial scalar fields (same shape as {@link makeTrack}.
 * @param pictures  - Optional binary artwork list for `common.picture`.
 * @returns A schema-validated {@link IngestionMetadata}.
 * @throws {TrackValidationError} If the combined input is invalid (callers
 *         that need issue inspection should use `makeTrack()` + spread +
 *         `trackInputSchema.safeParse` instead — this factory parses).
 */
export function makeIngestionTrack(
	overrides: Partial<Metadata> = {},
	pictures?: readonly Picture[],
): IngestionMetadata {
	const base = makeTrack(overrides);
	const input =
		pictures && pictures.length > 0
			? { ...base, common: { ...base.common, picture: [...pictures] } }
			: base;
	return trackInputSchema.parse(input);
}

/**
 * Factory for building a minimal frozen `ValidationIssue` in tests.
 */
export function makeIssue(
	pathString: string,
	message: string,
	code: string = "custom",
): ValidationIssue {
	return Object.freeze({
		path: Object.freeze(pathString ? pathString.split(".") : []),
		pathString,
		message,
		code,
	});
}

export function getValidSettings(
	overrides: Partial<SettingsForm> = {},
): SettingsForm {
	return deepMerge(
		{
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
		},
		overrides,
	);
}

export function getValidData(
	overrides: { tracks?: Metadata[]; settings?: Partial<SettingsForm> } = {},
): Data {
	return {
		tracks: overrides.tracks ?? [makeTrack()],
		settings: getValidSettings(overrides.settings),
	};
}
