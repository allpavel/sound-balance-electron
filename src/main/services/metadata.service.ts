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
