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
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends Record<string, unknown>>(
	base: T,
	overrides: Record<string, unknown>,
): T {
	const result = { ...base };
	for (const key of Object.keys(overrides)) {
		const baseValue = (base as Record<string, unknown>)[key];
		const overrideValue = overrides[key];
		if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
			(result as Record<string, unknown>)[key] = deepMerge(
				baseValue,
				overrideValue,
			);
		} else {
			(result as Record<string, unknown>)[key] = overrideValue;
		}
	}
	return result;
}
