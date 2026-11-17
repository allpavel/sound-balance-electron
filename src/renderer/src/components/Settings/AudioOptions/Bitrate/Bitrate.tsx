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

import { SegmentedControl, Stack, Text } from "@mantine/core";
import BitrateOptions from "@renderer/components/Settings/AudioOptions/Bitrate/BitrateOptions/BitrateOptions";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import {
	DEFAULT_VBR_VALUE,
	isVbrValue,
} from "@renderer/components/Settings/utils/settingsGuards";
import { BITRATE_MODE_LABELS } from "@renderer/components/Settings/utils/settingsLabels";
import { palette } from "@renderer/theme/tokens";
import { type JSX, useEffect } from "react";

/**
 * Bitrate mode selector (Constant / Variable / Auto) plus the mode-specific
 * value control rendered by {@link BitrateOptions}.
 *
 * @returns The segmented mode control and its dependent options.
 */
export default function Bitrate(): JSX.Element {
	const form = useSettingsFormContext();
	const { audioQuality, audioQualityValue } = form.values.audio;

	useEffect(() => {
		if (audioQuality === "vbr" && !isVbrValue(audioQualityValue)) {
			form.setFieldValue("audio.audioQualityValue", DEFAULT_VBR_VALUE);
		}
	}, [audioQuality, audioQualityValue, form]);

	return (
		<Stack gap="xs">
			<Text fz="sm" fw={500} id="bitrate-mode-label">
				Bitrate mode
			</Text>
			<SegmentedControl
				data={[
					{ label: BITRATE_MODE_LABELS.auto, value: "auto" },
					{ label: BITRATE_MODE_LABELS.cbr, value: "cbr" },
					{ label: BITRATE_MODE_LABELS.vbr, value: "vbr" },
				]}
				defaultValue="auto"
				aria-labelledby="bitrate-mode-label"
				{...form.getInputProps("audio.audioQuality")}
			/>
			<Text fz="xs" style={{ color: palette.inkSecondary }}>
				Auto lets the encoder decide. Constant keeps a fixed data rate; Variable
				spends bits where they matter most.
			</Text>
			<BitrateOptions />
		</Stack>
	);
}
