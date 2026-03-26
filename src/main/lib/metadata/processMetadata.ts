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
