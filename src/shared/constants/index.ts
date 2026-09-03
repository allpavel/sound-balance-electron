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
