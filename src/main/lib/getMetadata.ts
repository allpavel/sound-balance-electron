import { parseFile } from "music-metadata";

export const getMetadata = async (filePaths: string[]) => {
	return await Promise.all(filePaths.map((path) => parseFile(path)));
};
