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
export const STATUS_VALUES = [
	"pending",
	"processing",
	"completed",
	"failed",
] as const;

export const SYSTEM_COLLECTION_ID = "all";

export const CORRUPTION_SETTINGS_TOAST =
	"Stored settings are corrupted and were reset to defaults.";
export const SAVE_ERROR_TOAST = "Unable to save settings. Please try again.";

export const MAX_BASE64_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_PICTURE_COUNT = 20;

export const MAX_REASON_LENGTH = 1000;
export const MAX_PATH_LENGTH = 4096;
export const NULL_BYTE_PATTERN = /\0/;

export const PATH_TRAVERSAL_PATTERN = /(^|[/\\])\.\.([/\\]|$)/;

export const MIN_CONCURRENCY = 1;
export const MAX_CONCURRENCY = 10;

export const MIN_YEAR = 1000;
export const MAX_YEAR = 9999;

/**
 * Pattern matching C0 control characters (U+0000–U+001F) and U+007F (DEL).
 *
 * Used to sanitize path segments before string interpolation, preventing
 * log injection and terminal escape-sequence attacks when hostile payloads
 * contain control characters in field names or array indices.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional pattern to strip malicious control characters and block injection attacks.
export const CONTROL_CHAR_PATTERN = /[\x00-\x1F\x7F]/g;
