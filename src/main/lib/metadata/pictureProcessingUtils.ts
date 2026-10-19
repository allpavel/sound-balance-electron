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

import { MAX_BLOB_IMAGE_SIZE, MAX_PICTURE_COUNT } from "@shared/constants";
import { type Picture, pictureSchema } from "@shared/schemas/track.schema";

/**
 * Type guard to safely check if an unknown value is a record (object)
 * that might contain raw picture data from a metadata parser.
 */
function isRecordWithStringData(
	value: unknown,
): value is { data: string; [key: string]: unknown } {
	return (
		typeof value === "object" &&
		value !== null &&
		"data" in value &&
		typeof value.data === "string"
	);
}

/**
 * Type guard to safely check if an unknown value is a record
 * that contains binary picture data (Uint8Array or Blob).
 */
function isRecordWithBinaryData(
	value: unknown,
): value is { data: Uint8Array | Blob; [key: string]: unknown } {
	return (
		typeof value === "object" &&
		value !== null &&
		"data" in value &&
		(value.data instanceof Uint8Array || value.data instanceof Blob)
	);
}

/**
 * Sanitizes untrusted picture data from metadata parsers.
 * Converts legacy base64 strings to Uint8Array to comply with the ingestion schema,
 * enforces size limits, and validates the final structure via Zod.
 *
 * @param pictures - Untrusted array of picture objects from `music-metadata`.
 * @param maxCount - Maximum number of pictures to keep.
 * @param maxSize - Maximum allowed byte size per picture.
 * @returns An array of validated `Picture` objects, or `undefined` if none are valid.
 */
export function sanitizePictures(
	pictures: unknown[] | undefined,
	maxCount: number = MAX_PICTURE_COUNT,
	maxSize: number = MAX_BLOB_IMAGE_SIZE,
): Picture[] | undefined {
	if (!Array.isArray(pictures) || pictures.length === 0) {
		return undefined;
	}
	const upperBound = Math.min(pictures.length, maxCount);
	const result: Picture[] = [];

	for (let i = 0; i < upperBound; i++) {
		const rawPic = pictures[i];
		let data: Uint8Array | Blob | undefined;

		if (isRecordWithStringData(rawPic)) {
			data = new Uint8Array(Buffer.from(rawPic.data, "base64"));
		} else if (isRecordWithBinaryData(rawPic)) {
			data = rawPic.data;
		} else {
			continue;
		}

		const size = data instanceof Blob ? data.size : data.byteLength;
		if (size > maxSize) {
			continue;
		}

		const parsed = pictureSchema.safeParse({
			format: (rawPic as Record<string, unknown>)?.format,
			data,
			description: (rawPic as Record<string, unknown>)?.description,
			name: (rawPic as Record<string, unknown>)?.name,
		});

		if (parsed.success) {
			result.push(parsed.data);
		}
	}
	return result.length > 0 ? result : undefined;
}
