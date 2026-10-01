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

export type TrackRepositoryError =
	| TrackValidationError
	| ConflictError
	| ReferentialIntegrityError
	| StorageCapacityError
	| StorageUnavailableError
	| PayloadLimitExceededError;
