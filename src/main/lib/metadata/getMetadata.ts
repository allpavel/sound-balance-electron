import type { IAudioMetadata } from "music-metadata";
import { processMetadata } from "./processMetadata";

export const getMetadata = async (
	filePaths: string[],
	parser: (filePath: string) => Promise<IAudioMetadata>,
) => {
	return await Promise.all(
		filePaths.map(async (path) => processMetadata(path, parser)),
	);
};
