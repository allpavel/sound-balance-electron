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
import type { OptionMapperKeys } from "@/types";

const MAPPING: Record<OptionMapperKeys, string> = {
	overwrite: "-y",
	noOverwrite: "-n",
	statsPeriod: "-stats_period",
	recastMedia: "-recast_media",

	audioCodec: "-codec:a",
	audioQuality: "-q:a",
	audioFilter: "-filter:a",
} as const;

export const optionsMapper = (option: OptionMapperKeys): string => {
	if (MAPPING[option]) {
		return MAPPING[option];
	}
	throw new Error(
		`Unexpected setting: ${option}. Valid options are: ${Object.keys(MAPPING).join(", ")}`,
	);
};
