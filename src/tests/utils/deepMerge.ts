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

import { isPlainObject } from "@shared/utils";

/** Recursively optional object shape. Arrays and primitives are replaced whole. */
export type DeepPartial<T> = T extends readonly unknown[]
	? T
	: T extends object
		? { [K in keyof T]?: DeepPartial<T[K]> }
		: T;

/**
 * Recursively merges plain-object overrides into a base record.
 *
 * Nested plain objects merge; every other value (primitive, array, `null`,
 * `undefined`) replaces the base value whole. Inputs are never mutated.
 *
 * @param base      - Source record. Not mutated.
 * @param overrides - Patch record; own enumerable keys only.
 * @returns A new record. Override-only branches are assigned by reference.
 */
export function deepMerge(
	base: Record<string, unknown>,
	overrides: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(overrides)) {
		// [CHANGED][T4] Object.entries yields `any` for a record. Widening to
		// `unknown` forces the type guards below to perform the narrowing —
		// no assertion, no implicit trust in the patch (Zero Trust).
		const overrideValue: unknown = value;
		const baseValue: unknown = merged[key];
		if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
			merged[key] = deepMerge(baseValue, overrideValue);
		} else {
			merged[key] = overrideValue;
		}
	}
	return merged;
}
