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
import {
	normalizeFfmpegInput,
	normalizeFfmpegLine,
	truncateParsedFfmpegOutput,
} from "@main/lib/ffmpeg/utils";

const BANNER_PATTERNS = [
	/^ffmpeg version\b/i,
	/^\s*built with\b/i,
	/^\s*configuration:/i,
	/^\s*lib\w+\s+\d+\.\s*\d+\.\s*\d+/i,
] as const;
const LINE_ENDING_PATTERN = /\r\n|\r|\n/;
const ERROR_PREFIX_PATTERN = /^Error\b/i;
const DIAGNOSTIC_HINT_PATTERN =
	/\b(?:error|fail(?:ed|ure)?|cannot|denied|invalid|not found|no such file|unable to)\b/i;

export function parseFfmpegError(data: unknown): string | null {
	if (typeof data !== "string" || data.length === 0) {
		return null;
	}

	const normalizedInput = normalizeFfmpegInput(data);
	if (normalizedInput === "") return null;

	const lines = normalizedInput
		.split(LINE_ENDING_PATTERN)
		.map((line) => normalizeFfmpegLine(line));

	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i];
		if (line && ERROR_PREFIX_PATTERN.test(line)) {
			return truncateParsedFfmpegOutput(line);
		}
	}

	const meaningfulLines = lines.filter((line) => {
		if (!line) {
			return false;
		}
		if (DIAGNOSTIC_HINT_PATTERN.test(line)) {
			return true;
		}
		return !BANNER_PATTERNS.some((pattern) => pattern.test(line));
	});

	if (meaningfulLines.length === 0) {
		return null;
	}
	const conciseFallback = meaningfulLines.at(-1);
	return conciseFallback ? truncateParsedFfmpegOutput(conciseFallback) : null;
}
