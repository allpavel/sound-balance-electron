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
	strictSettingsSchema,
} from "@shared/schemas/settings.schema";
import type {
	IngestionMetadata,
	Metadata,
	Picture,
} from "@shared/schemas/track.schema";
import type { ValidationIssue } from "@shared/validators";
import { type DeepPartial, deepMerge } from "@tests/utils";
import type { CollectionType } from "@/types";

/** In-place corruption applied to a raw row fixture. */
export type RowCorruptor = (row: Record<string, unknown>) => void;

let collectionSeq = 0;
let trackSeq = 0;
const DEFAULT_SETTINGS: SettingsForm = {
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
};

export function resetFactorySequences(): void {
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

/**
 * Builds a stored-track row fixture.
 *
 * `id`, `file` and `filePath` are all derived from the shared track sequence.
 * Overriding `id` does **not** re-derive `file`/`filePath`; pass those
 * explicitly when the file identity matters. For repeatable output across
 * calls, reset the sequence first.
 *
 * @param overrides - Fields applied over the generated defaults.
 * @returns A raw row. Not schema-validated — invalid overrides pass through.
 * @see resetFactorySequences
 */
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
 * Builds a raw pending-lane ingestion track fixture with sensible defaults.
 *
 * The builder constructs the complete shape structurally (all required
 * fields, including `common` and `format`) and performs no schema
 * validation`.
 *
 * @param overrides - Ingestion fields to override (pending lane only).
 * @param pictures  - Binary artwork entries written to `common.picture`.
 * @returns A structurally complete ingestion track.
 */
export function makeIngestionTrack(
	overrides: Partial<
		Pick<
			IngestionMetadata,
			"id" | "file" | "filePath" | "selected" | "collectionIds" | "statusSeq"
		>
	> & {
		common?: Omit<IngestionMetadata["common"], "picture">;
		format?: IngestionMetadata["format"];
	} = {},
	pictures?: readonly Picture[],
): IngestionMetadata {
	const base = makeTrack();
	return {
		id: base.id,
		file: base.file,
		filePath: base.filePath,
		status: "pending",
		selected: base.selected,
		collectionIds: base.collectionIds,
		format: base.format,
		...overrides,
		common: {
			...(overrides.common ?? {}),
			...(pictures && pictures.length > 0 ? { picture: [...pictures] } : {}),
		},
	};
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

/**
 * Builds a structurally corrupt stored-row fixture without type assertions,
 * for seeding engine-level corruption via the raw table API.
 *
 * `common` is always removed after overrides are applied, so the row fails
 * the structural read guard regardless of overrides.
 *
 * @param id        - Row primary key (defaults to `"corrupt-1"`).
 * @param overrides - Extra raw fields applied before `common` is removed.
 * @returns A raw row rejected by the structural track guard.
 */
export function makeCorruptTrackRow(
	id = "corrupt-1",
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	const row: Record<string, unknown> = { ...makeTrack({ id }), ...overrides };
	delete row.common;
	return row;
}

/**
 * Builds a structurally corrupt track row by applying a mutator function
 * to a fresh `makeTrack` copy.
 *
 * Unlike {@link makeCorruptTrackRow} (which always removes `common`), this
 * factory supports arbitrary corruption patterns — field deletion, type
 * coercion, invalid enum values, etc. — making it suitable for exhaustive
 * guard tests that enumerate every corruption flavor.
 *
 * **Type-safety note:** the mutator receives `Record<string, unknown>` (not
 * `Metadata`) because corruption by definition breaks the typed contract.
 *
 * @param mutate - Function that mutates the row in place to introduce corruption.
 * @param id     - Row primary key (defaults to `"corrupt-1"`).
 * @returns A raw row rejected by the structural track guard.
 *
 * @example
 * ```ts
 * // Row missing `common`
 * const missingCommon = makeTrackWithCorruption((r) => { delete r.common; });
 * // Row with invalid `selected` value
 * const badSelected = makeTrackWithCorruption((r) => { r.selected = 2; });
 * ```
 */
export function makeTrackWithCorruption(
	mutate: RowCorruptor,
	id = "corrupt-1",
): Record<string, unknown> {
	const row: Record<string, unknown> = { ...makeTrack({ id }) };
	mutate(row);
	return row;
}

/**
 * Builds a schema-valid settings fixture with deep-partial overrides.
 *
 * @param overrides - Nested partial patch; arrays/primitives replace whole.
 * @returns The merged, schema-parsed settings.
 * @throws {ZodError} When an override produces invalid settings.
 */
export function getValidSettings(
	overrides: DeepPartial<SettingsForm> = {},
): SettingsForm {
	const base: Record<string, unknown> = { ...DEFAULT_SETTINGS };
	const patch: Record<string, unknown> = { ...overrides };
	return strictSettingsSchema.parse(deepMerge(base, patch));
}

/**
 * Builds a schema-valid IPC processing payload (`Data`).
 *
 * Tracks use the **ingestion** lane: `common.picture` carries binary
 * `Picture` entries, not the stored lane's artwork UUID references.
 *
 * @param overrides.tracks   - Ingestion-lane rows; defaults to one `makeIngestionTrack()`.
 * @param overrides.settings - Settings patch forwarded to `getValidSettings`.
 * @returns A payload satisfying `dataSchema`.
 */
export function getValidData(
	overrides: {
		tracks?: IngestionMetadata[];
		settings?: DeepPartial<SettingsForm>;
	} = {},
): Data {
	return {
		tracks: overrides.tracks ?? [makeIngestionTrack()],
		settings: getValidSettings(overrides.settings),
	};
}
