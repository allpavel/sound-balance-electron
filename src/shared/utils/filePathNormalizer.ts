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

import type { PLATFORM } from "@shared/constants";
import { getPlatform } from "./platformContext";

/**
 * Normalizes a filePath according to the platform's case-sensitivity rules.
 *
 * On case-insensitive filesystems (Windows, macOS), the entire path is
 * lowercased. On case-sensitive filesystems (Linux), the path is returned
 * unchanged. The function is **idempotent** and **pure** — it has no side
 * effects and produces the same output for the same input.
 *
 * @param filePath - The raw file path to normalize. Must be a string;
 *                   empty strings are returned as-is (defensive guard).
 * @param platform - The target platform's case-sensitivity policy.
 *
 * @returns The normalized filePath.
 *
 * @example
 * ```ts
 * normalizeFilePath("C:/Music/Track.MP3", "win32")  // → "c:/music/track.mp3"
 * normalizeFilePath("/Music/Track.MP3", "darwin")   // → "/music/track.mp3"
 * normalizeFilePath("/Music/Track.MP3", "linux")    // → "/Music/Track.MP3"
 * normalizeFilePath("c:/music/track.mp3", "win32")  // → "c:/music/track.mp3" (idempotent)
 * ```
 */
export function normalizeFilePath(
	filePath: string,
	platform: PLATFORM = getPlatform(),
): string {
	if (filePath.length === 0) return filePath;
	const nfc = filePath.normalize("NFC");
	const isCaseInsensitive = platform === "win32" || platform === "darwin";
	return isCaseInsensitive ? nfc.toLowerCase() : nfc;
}
