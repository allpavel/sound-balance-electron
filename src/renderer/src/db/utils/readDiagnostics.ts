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

import { describeThrownValue } from "@renderer/db/utils/trackRepositoryUtils";
import {
	MAX_LOGGED_ERROR_NAME_LENGTH,
	TRACK_READ_STORAGE_MESSAGE,
	TRACK_READ_UNKNOWN_MESSAGE,
	TRACK_READ_VALIDATION_MESSAGE,
} from "@shared/constants";
import {
	StorageCapacityError,
	StorageUnavailableError,
	TrackValidationError,
} from "@shared/errors";
import { sanitizeControlChars } from "@shared/utils";

/**
 * Classification of a guarded-read failure for the managed UI surface.
 *
 * - `validation` — the read was rejected by argument/data validation.
 * - `storage`    — the engine/database is unusable (includes DB open
 *                  failures, the read-path leg of U-08).
 * - `unknown`    — anything else; user-facing copy stays generic.
 */
export type ReadFailureKind = "validation" | "storage" | "unknown";

/**
 * Typed failure state exposed by guarded live queries.
 *
 * @property kind    - Machine-readable failure class for UI branching.
 * @property message - Designed user-facing copy; raw error text never
 *                     crosses into it (Zero Trust).
 * @property scope   - Repository/hook scope tag correlating the failure
 *                     with developer logs and the toast identity.
 * @property detail  - Sanitized, bounded developer hint (validation context
 *                     or error name); safe to surface in diagnostics UI.
 */
export type LiveQueryFailure = {
	readonly kind: ReadFailureKind;
	readonly message: string;
	readonly scope: string;
	readonly detail: string;
};

/**
 * Records skipped by the structural read guard on one guarded read.
 *
 * @property count - Number of quarantined records (0 when the read was clean).
 * @property ids   - Log-safe descriptors produced by the read guard
 *                   (sanitized, per-id length-capped); complete list.
 */
export type TrackQuarantine = {
	readonly count: number;
	readonly ids: readonly string[];
};

/** Shared empty-quarantine value; frozen and allocation-free per render. */
export const EMPTY_TRACK_QUARANTINE: TrackQuarantine = Object.freeze({
	count: 0,
	ids: Object.freeze([]),
});

export const USER_MESSAGE_BY_KIND: Readonly<Record<ReadFailureKind, string>> = {
	validation: TRACK_READ_VALIDATION_MESSAGE,
	storage: TRACK_READ_STORAGE_MESSAGE,
	unknown: TRACK_READ_UNKNOWN_MESSAGE,
};

/**
 * Engine error `name`s meaning "storage is unusable" on the read path.
 *
 * Includes the DB open-failure family so U-08's read-path leg lands in the
 * managed surface. Deliberately NOT derived from `ENGINE_ERROR_MAP`: that
 * map is the write-path translation (name → domain error factory), while
 * this set is read-path classification (name → failure kind); e.g.
 * `ConstraintError` is a write-only concern and must stay `unknown` here.
 */
const ENGINE_UNAVAILABLE_NAMES: ReadonlySet<string> = new Set([
	"OpenFailedError",
	"DatabaseClosedError",
	"NoSuchDatabaseError",
	"InvalidStateError",
	"AbortError",
	"UnknownError",
	"VersionError",
]);

function createFailure(
	kind: ReadFailureKind,
	scope: string,
	detail: string,
): LiveQueryFailure {
	return { kind, message: USER_MESSAGE_BY_KIND[kind], scope, detail };
}

/**
 * Maps an unknown thrown value onto the typed read-failure contract.
 *
 * @param error - Value caught from a guarded read.
 * @param scope - Scope tag for log/toast correlation.
 * @returns The classified failure.
 */
export function toLiveQueryFailure(
	error: unknown,
	scope: string,
): LiveQueryFailure {
	if (error instanceof TrackValidationError) {
		return createFailure(
			"validation",
			scope,
			sanitizeControlChars(error.context).slice(
				0,
				MAX_LOGGED_ERROR_NAME_LENGTH,
			),
		);
	}
	if (
		error instanceof StorageUnavailableError ||
		error instanceof StorageCapacityError
	) {
		return createFailure("storage", scope, describeThrownValue(error));
	}
	if (error instanceof Error && ENGINE_UNAVAILABLE_NAMES.has(error.name)) {
		return createFailure("storage", scope, describeThrownValue(error));
	}
	return createFailure("unknown", scope, describeThrownValue(error));
}

/**
 * Dedupe key for failure reporting channels.
 *
 * @param failure - Current failure state, or `null` when the read is healthy.
 * @returns A stable signature, or `null` when there is nothing to report.
 */
export function readFailureSignature(
	failure: LiveQueryFailure | null,
): string | null {
	if (failure === null) return null;
	return `${failure.kind}|${failure.scope}|${failure.detail}`;
}

/**
 * Lifts the guard's quarantined-id list into UI-facing quarantine state.
 *
 * @param quarantinedIds - Ids from a guarded-read emission; `undefined`
 *                         before the first emission.
 * @returns Quarantine state; {@link EMPTY_TRACK_QUARANTINE} when clean.
 */
export function toTrackQuarantine(
	quarantinedIds: readonly string[] | undefined,
): TrackQuarantine {
	if (quarantinedIds === undefined || quarantinedIds.length === 0) {
		return EMPTY_TRACK_QUARANTINE;
	}
	return { count: quarantinedIds.length, ids: quarantinedIds };
}

/**
 * Dedupe key for quarantine reporting channels.
 *
 * @param quarantine - Current quarantine state of one guarded read.
 * @returns A stable signature, or `null` when nothing is quarantined.
 */
export function quarantineSignature(
	quarantine: TrackQuarantine,
): string | null {
	// FE-132 WP-1: JSON-encoded rather than delimiter-joined — ids are
	// descriptors of untrusted rows, so a crafted id containing a naive join
	// delimiter could otherwise forge the identity of a different quarantine
	// set and freeze the toast on a stale count. The signature is opaque:
	// compared for equality only, never parsed.
	return quarantine.count === 0 ? null : JSON.stringify(quarantine.ids);
}
