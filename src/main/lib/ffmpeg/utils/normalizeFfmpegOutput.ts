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
const ESC_CONTROL = String.fromCharCode(0x1b);
const CSI_CONTROL = String.fromCharCode(0x9b);
const BOM_PATTERN = /^\uFEFF+/;
const LEADING_BRACKET_PREFIX_PATTERN = /^(?:\[[^\]]*\][^\S\r\n]*)+/;
const ANSI_ESCAPE_PATTERN = new RegExp(
	`${ESC_CONTROL}\\[[0-9;?]*[a-zA-Z]|${CSI_CONTROL}[0-9;?]*[a-zA-Z]`,
	"g",
);

export const normalizeFfmpegInput = (data: string): string =>
	data.replace(BOM_PATTERN, "").replace(ANSI_ESCAPE_PATTERN, "").trim();

export const normalizeFfmpegLine = (line: string): string =>
	normalizeFfmpegInput(line).replace(LEADING_BRACKET_PREFIX_PATTERN, "").trim();
