import fs from "node:fs/promises";
import path from "node:path";

export async function isDirectory(dirPath: string): Promise<boolean> {
	if (typeof dirPath !== "string") {
		throw new Error(
			`Expected string for output directory path, but got: ${typeof dirPath}`,
		);
	}

	const normalizePath = path.resolve(dirPath);

	try {
		const stats = await fs.stat(normalizePath);
		return stats.isDirectory();
	} catch (error) {
		throw new Error(
			error instanceof Error ? error.message : "Unexpected error",
		);
	}
}
