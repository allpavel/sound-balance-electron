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

import { Alert, Stack, Text } from "@mantine/core";
import { OptionFields } from "@renderer/components/Settings/OptionFields/OptionFields";
import { FILTER_OPTIONS } from "@renderer/components/Settings/settings.constants";
import { isAudioFilterName } from "@renderer/components/Settings/utils/settingsGuards";
import { palette } from "@renderer/theme/tokens";
import type {
	AUDIO_FILTER_NAMES,
	AudioFilterConfig,
} from "@shared/schemas/settings.schema";
import { TriangleAlert } from "lucide-react";
import type { JSX } from "react";

/**
 * Widened, indexable view of the filter configuration table.
 */
const FILTER_CONFIGS: Readonly<
	Partial<Record<AUDIO_FILTER_NAMES, AudioFilterConfig>>
> = FILTER_OPTIONS;

/**
 * Renders the parameter form for the selected FFmpeg audio filter.
 *
 * @param filter - A validated filter name.
 * @returns The filter's option form, or a fallback alert.
 */
export function AudioFilterFactory({
	filter,
}: {
	filter: AUDIO_FILTER_NAMES;
}): JSX.Element {
	const config: AudioFilterConfig | undefined = isAudioFilterName(filter)
		? FILTER_CONFIGS[filter]
		: undefined;

	if (!config) {
		return (
			<Alert
				color="warning"
				icon={<TriangleAlert size={16} aria-hidden="true" />}
				mt="sm"
				role="status"
			>
				No adjustable options are known for filter “{String(filter)}”.
			</Alert>
		);
	}

	return (
		<fieldset
			style={{
				border: `1px solid ${palette.borderDecorative}`,
				borderRadius: 10,
				padding: "12px 16px 16px",
				margin: 0,
				backgroundColor: palette.surfaceSunken,
			}}
		>
			<legend
				style={{
					fontWeight: 600,
					fontSize: "0.9375rem",
					padding: "0 6px",
					color: palette.inkPrimary,
				}}
			>
				{config.name} parameters
			</legend>
			<Text fz="sm" mb="md" style={{ color: palette.inkSecondary }}>
				{config.desc}
			</Text>
			<Stack>
				<OptionFields
					options={config.options}
					pathPrefix="audio.filterOptions"
				/>
			</Stack>
		</fieldset>
	);
}
