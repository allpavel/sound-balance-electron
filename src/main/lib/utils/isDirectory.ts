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
