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
import type { IAudioMetadata, ITag } from "music-metadata";

const ID3_KEYS = ["ID3v2.3", "ID3v2.4"] as const;

type Id3Key = (typeof ID3_KEYS)[number];

type ApicValue = {
	data: unknown;
};

const isApicValue = (value: unknown): value is ApicValue =>
	typeof value === "object" && value !== null && Object.hasOwn(value, "data");

const isUint8Array = (value: unknown): value is Uint8Array =>
	value instanceof Uint8Array ||
	(typeof value === "object" &&
		value !== null &&
		Symbol.toStringTag in value &&
		value[Symbol.toStringTag] === "Uint8Array");

const toBase64 = (data: Uint8Array): string =>
	Buffer.from(data).toString("base64");

const getTagArray = (
	metadata: IAudioMetadata,
	key: Id3Key,
): ITag[] | undefined => {
	const tags = metadata.native?.[key];
	if (!Array.isArray(tags)) return undefined;
	return tags;
};

const hasApicFrame = (metadata: IAudioMetadata): boolean =>
	ID3_KEYS.some((key) => {
		const tags = getTagArray(metadata, key);
		if (!tags) {
			return false;
		}

		return tags.some((tag) => tag.id === "APIC" && isApicValue(tag.value));
	});

export const processAlbumCover = (data: IAudioMetadata) => {
	if (!hasApicFrame(data)) return data;

	const metadata = structuredClone(data);
	for (const key of ID3_KEYS) {
		const tags = getTagArray(metadata, key);
		if (!tags) {
			continue;
		}
		for (const tag of tags) {
			if (tag.id !== "APIC") {
				continue;
			}
			const value = tag.value;
			if (isApicValue(value) && isUint8Array(value.data)) {
				value.data = toBase64(value.data);
			}
		}
	}

	return metadata;
};
