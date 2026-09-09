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

import { MAX_BASE64_IMAGE_SIZE, MAX_PICTURE_COUNT } from "@shared/constants";
import { type Picture, pictureSchema } from "@shared/schemas/track.schema";

export const isUint8Array = (value: unknown): value is Uint8Array =>
	value instanceof Uint8Array ||
	(typeof value === "object" &&
		value !== null &&
		Symbol.toStringTag in value &&
		value[Symbol.toStringTag] === "Uint8Array");

export const toBase64 = (data: Uint8Array): string =>
	Buffer.from(data).toString("base64");

export function sanitizePictures(
	pictures: Picture[] | undefined,
	maxCount: number = MAX_PICTURE_COUNT,
	maxBase64Size: number = MAX_BASE64_IMAGE_SIZE,
): Picture[] | undefined {
	if (!pictures || pictures.length === 0) {
		return undefined;
	}
	const upperBound = Math.min(pictures.length, maxCount);
	const result: Picture[] = [];

	for (let i = 0; i < upperBound; i++) {
		const pic = pictures[i];

		const data: string =
			typeof pic.data === "string"
				? pic.data
				: toBase64(pic.data as Uint8Array);

		if (data.length > maxBase64Size) {
			continue;
		}

		const parsed = pictureSchema.safeParse({
			format: pic.format,
			data,
			description: pic.description,
			name: pic.name,
		});

		if (parsed.success) {
			result.push(parsed.data);
		}
	}
	return result.length > 0 ? result : undefined;
}
