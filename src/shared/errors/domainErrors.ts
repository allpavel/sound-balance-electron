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

import type { AddManyProgress, AddManyResult } from "@shared/types";
import type { TrackValidationError } from "./TrackValidationError";

/**
 * Discriminated map of machine-readable error codes.
 * Allows UI consumers to exhaustively switch on `error.code` without stringly-typed branching.
 */
export const TrackErrorCode = {
	Validation: "validation",
	Conflict: "conflict",
	ReferentialIntegrity: "referential_integrity",
	StorageCapacity: "storage_capacity",
	StorageUnavailable: "storage_unavailable",
	PayloadLimitExceeded: "payload_limit_exceeded",
	ImportAborted: "import_aborted",
} as const;

export type TrackErrorCode =
	(typeof TrackErrorCode)[keyof typeof TrackErrorCode];

export class ConflictError extends Error {
	readonly code: TrackErrorCode = TrackErrorCode.Conflict;
	constructor(message: string) {
		super(message);
		this.name = "ConflictError";
		Object.setPrototypeOf(this, ConflictError.prototype);
	}
}

export class ReferentialIntegrityError extends Error {
	readonly code: TrackErrorCode = TrackErrorCode.ReferentialIntegrity;
	constructor(message: string) {
		super(message);
		this.name = "ReferentialIntegrityError";
		Object.setPrototypeOf(this, ReferentialIntegrityError.prototype);
	}
}

export class StorageCapacityError extends Error {
	readonly code: TrackErrorCode = TrackErrorCode.StorageCapacity;
	constructor(message: string) {
		super(message);
		this.name = "StorageCapacityError";
		Object.setPrototypeOf(this, StorageCapacityError.prototype);
	}
}

export class StorageUnavailableError extends Error {
	readonly code: TrackErrorCode = TrackErrorCode.StorageUnavailable;
	constructor(message: string) {
		super(message);
		this.name = "StorageUnavailableError";
		Object.setPrototypeOf(this, StorageUnavailableError.prototype);
	}
}

export class PayloadLimitExceededError extends Error {
	readonly code: TrackErrorCode = TrackErrorCode.PayloadLimitExceeded;
	constructor(message: string) {
		super(message);
		this.name = "PayloadLimitExceededError";
		Object.setPrototypeOf(this, PayloadLimitExceededError.prototype);
	}
}

/**
 * Thrown when `tracksRepository.addMany` aborts mid-import (a batch failed
 * after one or more prior batches committed, or the caller cancelled via
 * `AbortSignal`). Carries the partial outcome so the UI can render
 * "imported N of M before failure" and the user can re-run (idempotent).
 *
 * @property partial  - Counts committed before the abort (batches 1..k−1,
 *                      including pre-batch `filePath`-dedupe `skipped` ids).
 * @property progress - Cumulative `processed/total` + counts at the abort.
 * @property cause    - The underlying failure (domain storage error, mid-batch
 *                      `ReferentialIntegrityError`, or `AbortError`).
 */
export class ImportAbortedError extends Error {
	readonly code: TrackErrorCode = TrackErrorCode.ImportAborted;
	readonly partial: AddManyResult;
	readonly progress: AddManyProgress;
	constructor(
		message: string,
		partial: AddManyResult,
		progress: AddManyProgress,
		cause: unknown,
	) {
		super(message, { cause });
		this.name = "ImportAbortedError";
		this.partial = partial;
		this.progress = progress;
		Object.setPrototypeOf(this, ImportAbortedError.prototype);
	}
}

export type TrackRepositoryError =
	| TrackValidationError
	| ConflictError
	| ReferentialIntegrityError
	| StorageCapacityError
	| StorageUnavailableError
	| PayloadLimitExceededError
	| ImportAbortedError;
