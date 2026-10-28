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

/**
 * Splits an array into consecutive sub-arrays of at most `size` elements.
 *
 * Used to keep IndexedDB `anyOf()` key arrays within engine-safe bounds
 * while preserving transactional atomicity.
 *
 * @typeParam T - Element type; inferred from the input array.
 * @param source - The array to partition. Not mutated.
 * @param size   - Maximum chunk length. Must be ≥ 1.
 * @returns An array of chunks. Empty input yields an empty array.
 *
 * @example
 * chunkArray([1,2,3,4,5], 2) // → [[1,2],[3,4],[5]]
 */
export function chunkArray<T>(source: readonly T[], size: number): T[][] {
	if (!Number.isSafeInteger(size) || size < 1) {
		throw new RangeError(`chunkArray: size must be ≥ 1, received ${size}`);
	}
	const chunks: T[][] = [];
	for (let offset = 0; offset < source.length; offset += size) {
		chunks.push(source.slice(offset, offset + size));
	}
	return chunks;
}
