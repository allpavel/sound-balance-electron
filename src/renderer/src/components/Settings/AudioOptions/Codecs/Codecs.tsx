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
import { CodecOptions } from "./CodecOptions/CodecOptions";

const data = ENCODER_GROUPS.map((item) => ({
	group: item.category,
	items: [...item.encoders],
}));

export default function Codecs() {
	const form = useSettingsFormContext();
	const activeCodec = form.values.audio.audioCodec;

	return (
		<Stack>
			<Select
				label="Audio codec:"
				data={data}
				{...form.getInputProps("audio.audioCodec")}
				onOptionSubmit={(value) => {
					form.setFieldValue("audio.audioCodec", value);
					form.setFieldValue("audio.codecOptions", {});
				}}
				clearable
			/>
			{activeCodec && <CodecOptions codec={activeCodec} />}
		</Stack>
	);
}
