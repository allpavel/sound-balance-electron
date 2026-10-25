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

import {
	ConflictError,
	StorageCapacityError,
	StorageUnavailableError,
} from "@shared/errors";

/** The only domain errors an engine failure may be mapped to. */
export type EngineMappedError =
	| ConflictError
	| StorageCapacityError
	| StorageUnavailableError;

export type EngineErrorScope = "single" | "batch";

export type EngineErrorFactory = (
	raw: { readonly name: string; readonly message: string },
	scope: EngineErrorScope,
) => EngineMappedError;

const unavailable: EngineErrorFactory = (raw, scope) =>
	new StorageUnavailableError(
		`${scope === "batch" ? "Database batch operation failed" : "Database operation failed"}: ${raw.message || raw.name}`,
	);

/**
 * Single source of truth for the engine → domain translation.
 * Adding a new engine name = adding ONE entry here.
 * (Previously: the name map + two if-chains in mapStorageWriteError.)
 */
export const ENGINE_ERROR_MAP: Readonly<Record<string, EngineErrorFactory>> = {
	QuotaExceededError: (_raw, scope) =>
		new StorageCapacityError(
			scope === "batch"
				? "Storage quota exceeded during batch operation."
				: "Storage quota exceeded. Free disk space or reduce embedded artwork size, then retry.",
		),
	ConstraintError: (_raw, scope) =>
		new ConflictError(
			scope === "batch"
				? "One or more tracks collide with existing primary keys or unique filePaths."
				: "A track with the same primary key or unique filePath already exists in the database.",
		),
	InvalidStateError: unavailable,
	AbortError: unavailable,
	UnknownError: unavailable,
	VersionError: unavailable,
	NotFoundError: unavailable,
};
