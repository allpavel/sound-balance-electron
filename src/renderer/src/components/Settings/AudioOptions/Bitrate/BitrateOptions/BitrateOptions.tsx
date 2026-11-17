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

import { Alert, Select, Slider, Stack, Text } from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import {
	fromVbrValue,
	toVbrValue,
} from "@renderer/components/Settings/utils/settingsGuards";
import { palette } from "@renderer/theme/tokens";
import { TriangleAlert } from "lucide-react";
import type { JSX } from "react";

const CBR_OPTIONS = [
	"320k",
	"256k",
	"224k",
	"192k",
	"160k",
	"128k",
	"112k",
	"96k",
	"80k",
	"64k",
	"48k",
	"40k",
	"32k",
	"24k",
	"16k",
	"8k",
] as const;

/**
 * Mode-dependent bitrate value control.
 *
 * @returns The value control for the current mode, or explanatory feedback.
 */
export default function BitrateOptions(): JSX.Element | null {
	const form = useSettingsFormContext();
	const mode = form.getInputProps("audio.audioQuality").value;

	switch (mode) {
		case "vbr": {
			const position = fromVbrValue(form.values.audio.audioQualityValue);
			return (
				<Stack gap={4}>
					<Text fz="sm" fw={500} id="vbr-quality-label">
						Quality level
					</Text>
					<Text fz="xs" style={{ color: palette.inkSecondary }}>
						1 = highest quality (largest files), 9 = smallest files.
					</Text>
					<Slider
						min={1}
						max={9}
						step={1}
						value={position}
						aria-labelledby="vbr-quality-label"
						marks={[
							{ value: 1, label: "1 · Best" },
							{ value: 5, label: "5" },
							{ value: 9, label: "9 · Smallest" },
						]}
						mb="lg"
						onChange={(next) => {
							const vbr = toVbrValue(next);
							if (vbr !== null) {
								form.setFieldValue("audio.audioQualityValue", vbr);
							}
						}}
					/>
				</Stack>
			);
		}
		case "cbr":
			return (
				<Select
					label="Fixed bitrate"
					description="Higher values sound better and produce larger files. 320k is transparent for most listeners."
					placeholder="Pick a bitrate…"
					data={[...CBR_OPTIONS]}
					{...form.getInputProps("audio.audioQualityValue")}
				/>
			);
		case "auto":
			return (
				<Text fz="sm" style={{ color: palette.inkSecondary }}>
					The encoder will choose the bitrate automatically — no further
					settings needed.
				</Text>
			);
		default:
			return (
				<Alert
					color="warning"
					icon={<TriangleAlert size={16} aria-hidden="true" />}
					role="status"
				>
					Unsupported bitrate mode. Please choose Constant, Variable, or Auto.
				</Alert>
			);
	}
}
