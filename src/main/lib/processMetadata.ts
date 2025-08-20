import type { IAudioMetadata } from "music-metadata";
import { v4 as uuid } from "uuid";
import { processAlbumCover } from "./processAlbumCover";

export const processMetadata = async (
	filePath: string,
	parser: (filePath: string) => Promise<IAudioMetadata>,
) => {
	const data = await parser(filePath);
	const id = uuid();
	const processedData = processAlbumCover(data);
	return { ...processedData, id };
};
