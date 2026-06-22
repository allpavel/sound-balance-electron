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
import { Select, Slider, Text } from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";

export default function BitrateOptions() {
	const form = useSettingsFormContext();
	const mode = form.getInputProps("audio.audioQuality").value;

	switch (mode) {
		case "vbr":
			return (
				<Slider
					defaultValue={4}
					min={0}
					max={9}
					step={1}
					marks={[
						{ value: 0, label: "0" },
						{ value: 3, label: "3" },
						{ value: 6, label: "6" },
						{ value: 9, label: "9" },
					]}
					{...form.getInputProps(`audio.audioQualityValue`)}
				/>
			);
		case "cbr":
			return (
				<Select
					label="CBR Encoding:"
					placeholder="Pick a value"
					data={[
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
					]}
					{...form.getInputProps(`audio.audioQualityValue`)}
				/>
			);
		case "auto":
			return null;
		default:
			return (
				<Text>Unsupported value. Please choose "cbr", "vbr" or "auto".</Text>
			);
	}
}
