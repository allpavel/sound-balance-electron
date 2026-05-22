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
import type { IAudioMetadata } from "music-metadata";
import type { NativeValue } from "@/types";

export const processAlbumCover = (data: IAudioMetadata) => {
	const id3Tags = data.native?.["ID3v2.3"] || data.native?.["ID3v2.4"] || null;
	if (!id3Tags) return data;

	const apicFrame = id3Tags.find((item) => item.id === "APIC");
	if (!apicFrame?.value) return data;

	const metadata = structuredClone(data);
	const nativeData =
		metadata.native?.["ID3v2.3"] || metadata.native?.["ID3v2.4"];

	const apicValue = nativeData.find((item) => item.id === "APIC")
		?.value as NativeValue;
	if (apicValue.data instanceof Uint8Array) {
		const base64 = Buffer.from(apicValue.data).toString("base64");
		apicValue.data = base64;
	}

	return metadata;
};
