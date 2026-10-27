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
import { describe, expect, it } from "vitest";

import {
	ENGINE_ERROR_MAP,
	type EngineErrorScope,
	type EngineMappedError,
} from "./engineErrors";

const MAPPED_NAMES = Object.keys(ENGINE_ERROR_MAP);

const SANCTIONED_CLASSES = [
	ConflictError,
	StorageCapacityError,
	StorageUnavailableError,
] as const;

function invoke(
	name: string,
	scope: EngineErrorScope,
	rawMessage = "boom",
): EngineMappedError {
	const factory = ENGINE_ERROR_MAP[name];
	if (!factory)
		throw new Error(`test bug: "${name}" vanished from ENGINE_ERROR_MAP`);
	return factory({ name, message: rawMessage }, scope);
}

const UNAVAILABLE_NAMES = MAPPED_NAMES.filter(
	(name) => invoke(name, "single") instanceof StorageUnavailableError,
);

describe("ENGINE_ERROR_MAP — factory contract (derived per name)", () => {
	it("contains at least one entry", () => {
		expect(MAPPED_NAMES.length).toBeGreaterThan(0);
	});

	it.each(MAPPED_NAMES)(
		"%s → returns a sanctioned domain error with non-empty, scope-aware copy",
		(name) => {
			const single = invoke(name, "single");
			const batch = invoke(name, "batch");
			for (const error of [single, batch]) {
				expect(SANCTIONED_CLASSES.some((cls) => error instanceof cls)).toBe(
					true,
				);
				expect(typeof error.message).toBe("string");
				expect(error.message.length).toBeGreaterThan(0);
			}
			expect(batch.message).not.toBe(single.message);
		},
	);
});

describe("ENGINE_ERROR_MAP — unavailable fallback template (partition by produced class)", () => {
	it("discovered at least one unavailable-style entry", () => {
		expect(UNAVAILABLE_NAMES.length).toBeGreaterThan(0);
	});

	it.each(UNAVAILABLE_NAMES)(
		'%s → appends the raw cause after a ": " separator in both scopes',
		(name) => {
			const single = invoke(name, "single", "disk on fire");
			const batch = invoke(name, "batch", "disk on fire");

			expect(single).toBeInstanceOf(StorageUnavailableError);
			expect(single.message.endsWith(": disk on fire")).toBe(true);
			expect(batch.message.endsWith(": disk on fire")).toBe(true);
		},
	);

	it("falls back to the raw error name when the raw message is empty", () => {
		for (const name of UNAVAILABLE_NAMES) {
			const error = invoke(name, "single", "");
			expect(error.message.endsWith(`: ${name}`)).toBe(true);
		}
	});
});
