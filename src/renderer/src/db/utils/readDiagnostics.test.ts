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
	MAX_LOGGED_ERROR_NAME_LENGTH,
	TRACK_READ_STORAGE_MESSAGE,
	TRACK_READ_UNKNOWN_MESSAGE,
	TRACK_READ_VALIDATION_MESSAGE,
} from "@shared/constants";
import {
	ConflictError,
	StorageCapacityError,
	StorageUnavailableError,
	TrackValidationError,
} from "@shared/errors";
import { createRootIssue } from "@shared/validators";
import {
	EMPTY_TRACK_QUARANTINE,
	type LiveQueryFailure,
	quarantineSignature,
	readFailureSignature,
	toLiveQueryFailure,
	toTrackQuarantine,
} from "./readDiagnostics";

const SCOPE = "tracksRepository.getAll";

describe("toLiveQueryFailure", () => {
	it("classifies TrackValidationError as validation with the context as detail", () => {
		const failure = toLiveQueryFailure(
			new TrackValidationError("id", [
				createRootIssue("invalid_type", "ID must be a non-empty string"),
			]),
			SCOPE,
		);
		expect(failure).toEqual({
			kind: "validation",
			message: TRACK_READ_VALIDATION_MESSAGE,
			scope: SCOPE,
			detail: "id",
		});
	});

	it("sanitizes and caps a hostile validation context", () => {
		const failure = toLiveQueryFailure(
			new TrackValidationError(`\u001b[31m${"x".repeat(500)}`, [
				createRootIssue("invalid_type", "bad"),
			]),
			SCOPE,
		);
		expect(failure.detail).not.toContain("\u001b");
		expect(failure.detail).toContain("\uFFFD");
		expect(failure.detail.length).toBeLessThanOrEqual(
			MAX_LOGGED_ERROR_NAME_LENGTH,
		);
	});

	it.each([
		["StorageUnavailableError", new StorageUnavailableError("closed")],
		["StorageCapacityError", new StorageCapacityError("quota")],
	])("classifies the domain error %s as storage", (label, error) => {
		const failure = toLiveQueryFailure(error, SCOPE);
		expect(failure.kind).toBe("storage");
		expect(failure.message).toBe(TRACK_READ_STORAGE_MESSAGE);
		expect(failure.detail).toBe(label);
	});

	it.each([
		"OpenFailedError",
		"DatabaseClosedError",
		"NoSuchDatabaseError",
		"InvalidStateError",
		"AbortError",
		"UnknownError",
		"VersionError",
	])(
		"classifies the engine open/unavailability error %s as storage (U-08 read-path leg)",
		(name) => {
			const engineError = new Error("engine said no");
			engineError.name = name;
			const failure = toLiveQueryFailure(engineError, SCOPE);
			expect(failure.kind).toBe("storage");
			expect(failure.detail).toBe(name);
		},
	);

	it("classifies ConstraintError as unknown (write-only concern on the read path)", () => {
		const failure = toLiveQueryFailure(new ConflictError("collision"), SCOPE);
		expect(failure.kind).toBe("unknown");
	});

	it("never leaks raw error text for unknown failures", () => {
		const failure = toLiveQueryFailure(
			new Error("C:/secret/library blew up"),
			SCOPE,
		);
		expect(failure.kind).toBe("unknown");
		expect(failure.message).toBe(TRACK_READ_UNKNOWN_MESSAGE);
		expect(failure.message).not.toContain("secret");
		expect(failure.detail).toBe("Error");
	});

	it.each([
		["a string", "just a string"],
		["null", null],
		["undefined", undefined],
		["a number", 42],
		["a plain object", { message: "not an Error" }],
	])("maps the non-Error thrown value %s to unknown", (_label, thrown) => {
		const failure = toLiveQueryFailure(thrown, SCOPE);
		expect(failure.kind).toBe("unknown");
		expect(failure.message).toBe(TRACK_READ_UNKNOWN_MESSAGE);
		expect(failure.scope).toBe(SCOPE);
	});

	it("extracts the name from an Error-like object without instanceof Error", () => {
		const failure = toLiveQueryFailure(
			{ name: "WeirdEngineError", message: "raw" },
			SCOPE,
		);
		expect(failure.kind).toBe("unknown");
		expect(failure.detail).toBe("WeirdEngineError");
	});
});

describe("readFailureSignature", () => {
	const base: LiveQueryFailure = {
		kind: "validation",
		message: TRACK_READ_VALIDATION_MESSAGE,
		scope: SCOPE,
		detail: "id",
	};

	it("returns null for a healthy read", () => {
		expect(readFailureSignature(null)).toBeNull();
	});

	it("is stable for equal failures and differs on kind, scope, or detail", () => {
		expect(readFailureSignature(base)).toBe(readFailureSignature({ ...base }));
		expect(readFailureSignature(base)).not.toBe(
			readFailureSignature({ ...base, detail: "changes" }),
		);
		expect(readFailureSignature(base)).not.toBe(
			readFailureSignature({ ...base, kind: "storage" }),
		);
		expect(readFailureSignature(base)).not.toBe(
			readFailureSignature({ ...base, scope: "other" }),
		);
	});

	it("ignores the user-facing message (copy changes must not re-fire deduped channels)", () => {
		expect(readFailureSignature(base)).toBe(
			readFailureSignature({ ...base, message: "rewritten copy" }),
		);
	});
});

describe("toTrackQuarantine", () => {
	it("returns the shared frozen empty value for undefined and empty lists", () => {
		expect(toTrackQuarantine(undefined)).toBe(EMPTY_TRACK_QUARANTINE);
		expect(toTrackQuarantine([])).toBe(EMPTY_TRACK_QUARANTINE);
		expect(Object.isFrozen(EMPTY_TRACK_QUARANTINE)).toBe(true);
		expect(EMPTY_TRACK_QUARANTINE).toEqual({ count: 0, ids: [] });
	});

	it("exposes the complete quarantined list and count", () => {
		const quarantine = toTrackQuarantine(["a", "b"]);
		expect(quarantine).toEqual({ count: 2, ids: ["a", "b"] });
	});
});

describe("quarantineSignature", () => {
	it("is null when nothing is quarantined", () => {
		expect(quarantineSignature(EMPTY_TRACK_QUARANTINE)).toBeNull();
	});

	it("is a stable key over the quarantined ids", () => {
		expect(quarantineSignature({ count: 2, ids: ["a", "b"] })).toBe(
			'["a","b"]',
		);
		expect(quarantineSignature({ count: 2, ids: ["a", "b"] })).toBe(
			quarantineSignature({ count: 2, ids: ["a", "b"] }),
		);
		expect(quarantineSignature({ count: 2, ids: ["a", "b"] })).not.toBe(
			quarantineSignature({ count: 2, ids: ["b", "a"] }),
		);
	});

	it("keeps distinct quarantine sets distinct when ids contain delimiters", () => {
		expect(quarantineSignature({ count: 1, ids: ["a|b"] })).not.toBe(
			quarantineSignature({ count: 2, ids: ["a", "b"] }),
		);
		expect(quarantineSignature({ count: 1, ids: ['a","b'] })).not.toBe(
			quarantineSignature({ count: 2, ids: ["a", "b"] }),
		);
	});
});
