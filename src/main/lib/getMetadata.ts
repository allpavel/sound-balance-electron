import type { IAudioMetadata } from "music-metadata";
import { v4 as uuid } from "uuid";

export const getMetadata = async (
	filePaths: string[],
	parser: (filePath: string) => Promise<IAudioMetadata>,
) => {
	const result = await Promise.all(
		filePaths.map(async (path) => {
			const data = await parser(path);
			const id = uuid();
			return { ...data, id };
		}),
	);
	return result;
};
