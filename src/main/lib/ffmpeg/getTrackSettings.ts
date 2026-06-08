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

import type { SettingsForm } from "@types";
import { buildFilter } from "./buildFilter";

export const getTrackSettings = (
	initialSettings: SettingsForm["audio"],
	settings: SettingsForm["audio"],
) => {
	const result: string[] = [];

	if (settings.audioCodec !== initialSettings.audioCodec) {
		result.push("-codec:a", settings.audioCodec);
	}
	if (settings.audioFilter) {
		const filter = buildFilter(settings.audioFilter, settings.filterOptions);
		if (filter) {
			result.push(...filter);
		}
	}
	if (settings.audioQuality !== "auto") {
		if (settings.audioQuality === "cbr") {
			result.push("-b:a", settings.audioQualityValue);
		} else {
			result.push("-q:a", settings.audioQualityValue);
		}
	}
	return result;
};
