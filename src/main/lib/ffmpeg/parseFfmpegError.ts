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
const BANNER_PATTERNS: readonly RegExp[] = [
	/^ffmpeg version\b/i,
	/^\s*built with\b/i,
	/^\s*configuration:/i,
	/^\s*lib\w+\s+\d+\.\s*\d+\.\s*\d+/i,
];

export function parseFfmpegError(data: string) {
	if (!data) return "";

	const lines = data.split(/\r?\n/);
	for (let i = lines.length - 1; i >= 0; i--) {
		const line = lines[i].trim();
		if (line && /^Error\b/i.test(line)) {
			return line;
		}
	}

	return lines
		.map((l) => l.trim())
		.filter(
			(line) =>
				line !== "" && !BANNER_PATTERNS.some((pattern) => pattern.test(line)),
		)
		.join("\n");
}
