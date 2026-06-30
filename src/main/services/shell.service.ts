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

import { existsSync, statSync } from "node:fs";
import type { OpenPathResult } from "@types";
import { shell } from "electron";
import type { IpcMainInvokeEvent } from "electron/main";

const isSystemError = (err: unknown): err is Error & { code: string } => {
	return err instanceof Error && "code" in err && typeof err.code === "string";
};

export async function openOutputFolder(
	_: IpcMainInvokeEvent,
	folderPath: string,
): Promise<OpenPathResult> {
	let error = "";
	try {
		if (!existsSync(folderPath)) {
			try {
				statSync(folderPath);
			} catch (err) {
				if (isSystemError(err)) {
					if (err.code === "EACCES" || err.code === "EPERM") {
						return {
							success: false,
							reason: "Permission denied. You cannot access output folder.",
						};
					}
				}
			}
			return { success: false, reason: "Folder doesn't exist." };
		}
		error = await shell.openPath(folderPath);
		if (error) {
			return { success: false, reason: error };
		}
		return { success: true, reason: "" };
	} catch (err) {
		return {
			success: false,
			reason: err instanceof Error ? err.message : "Unexpected error",
		};
	}
}
