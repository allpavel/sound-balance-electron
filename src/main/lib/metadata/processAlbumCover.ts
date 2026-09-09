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
import type { IAudioMetadata, IPicture, ITag } from "music-metadata";
import { isUint8Array, toBase64 } from "./pictureProcessingUtils";

const ID3_KEYS = ["ID3v2.3", "ID3v2.4"] as const;
type Id3Key = (typeof ID3_KEYS)[number];
type ApicValue = {
	data: unknown;
};
type ProcessedPicture = Omit<IPicture, "data"> & { data: string };
type ProcessedCommon = Omit<IAudioMetadata["common"], "picture"> & {
	picture?: ProcessedPicture[];
};
export type ProcessedMetadata = Omit<IAudioMetadata, "common"> & {
	common: ProcessedCommon;
};

const isApicValue = (value: unknown): value is ApicValue =>
	typeof value === "object" && value !== null && Object.hasOwn(value, "data");

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

export const processAlbumCover = (data: IAudioMetadata): ProcessedMetadata => {
	if (!hasApicFrame(data)) return data as ProcessedMetadata;

	const metadata = structuredClone(data);
	for (const key of ID3_KEYS) {
		const originalTags = getTagArray(data, key);
		const clonedTags = getTagArray(metadata, key);
		if (!originalTags || !clonedTags) continue;
		for (let i = 0; i < clonedTags.length; i++) {
			if (clonedTags[i].id !== "APIC") continue;

			const originalValue = originalTags[i].value;
			if (isApicValue(originalValue) && isUint8Array(originalValue.data)) {
				(clonedTags[i].value as ApicValue).data = toBase64(
					originalValue.data as Uint8Array,
				);
			}
		}
	}

	return metadata as ProcessedMetadata;
};
