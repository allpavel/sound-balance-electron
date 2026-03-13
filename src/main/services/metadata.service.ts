import { getMetadata } from "@main/lib/metadata";
import { parseFile } from "music-metadata";
import type { Metadata } from "@/types";

export async function parseMetadata(filePaths: string[]): Promise<Metadata[]> {
	try {
		return await getMetadata(filePaths, parseFile);
	} catch (error) {
		throw new Error(
			`Metadata parsing failed: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
}
