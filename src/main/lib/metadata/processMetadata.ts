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
import { processAlbumCover } from "@main/lib/metadata/processAlbumCover";
import type { IAudioMetadata } from "music-metadata";
import { v4 as uuid } from "uuid";
import type { Metadata } from "@/types";

export const processMetadata = async (
	filePath: string,
	parser: (filePath: string) => Promise<IAudioMetadata>,
): Promise<Metadata> => {
	try {
		const data = await parser(filePath);
		const id = uuid();
		const fileName = filePath.split("/").at(-1);
		const status = "pending";
		const processedData = processAlbumCover(data);
		const selected = 0;
		const collectionIds = [];
		return {
			...processedData,
			file: fileName ?? "",
			filePath,
			id,
			status,
			selected,
			collectionIds,
		} satisfies Metadata;
	} catch (e) {
		throw new Error(
			`Metadata parsing failed for ${filePath}: ${e instanceof Error ? e.message : "Unknown error"}`,
		);
	}
};
