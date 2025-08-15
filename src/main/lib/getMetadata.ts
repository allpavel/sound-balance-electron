import type { IAudioMetadata } from "music-metadata";

export const getMetadata = async (
	filePaths: string[],
	parser: (filePath: string) => Promise<IAudioMetadata>,
) => {
	return await Promise.all(filePaths.map((path) => parser(path)));
};
