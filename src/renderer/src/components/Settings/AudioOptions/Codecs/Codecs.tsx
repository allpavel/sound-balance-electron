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

import { Select, Stack } from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import { ENCODER_GROUPS } from "@renderer/components/Settings/settings.constants";
import { codecDisplayName } from "@renderer/components/Settings/utils/settingsLabels";
import { CodecOptions } from "./CodecOptions/CodecOptions";

/**
 * Grouped codec options for the Select.
 */
const CODEC_SELECT_DATA = [
	{
		group: "No re-encoding",
		items: [{ value: "copy", label: codecDisplayName("copy") }],
	},
	...ENCODER_GROUPS.map((item) => ({
		group: item.category,
		items: item.encoders.map((encoder) => ({
			value: encoder,
			label: codecDisplayName(encoder),
		})),
	})),
];

/**
 * Audio codec selector + the selected encoder's parameter form.
 *
 * @returns Codec `<Select>` with grouped, labeled options.
 */
export default function Codecs() {
	const form = useSettingsFormContext();
	const activeCodec = form.values.audio.audioCodec;

	return (
		<Stack gap="xs">
			<Select
				label="Audio codec"
				description="How output audio is encoded. “Copy” keeps the original stream untouched and is the fastest option."
				placeholder="Choose a codec…"
				data={CODEC_SELECT_DATA}
				searchable
				clearable
				{...form.getInputProps("audio.audioCodec")}
				onOptionSubmit={(value) => {
					form.setFieldValue("audio.audioCodec", value);
					form.setFieldValue("audio.codecOptions", {});
				}}
			/>
			{activeCodec && <CodecOptions codec={activeCodec} />}
		</Stack>
	);
}
