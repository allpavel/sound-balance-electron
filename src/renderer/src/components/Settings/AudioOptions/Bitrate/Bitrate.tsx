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
import { Flex, SegmentedControl, Text } from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import BitrateOptions from "./BitrateOptions/BitrateOptions";

export default function Bitrate() {
	const form = useSettingsFormContext();
	return (
		<>
			<Flex align={"center"} gap={"sm"}>
				<Text>Choose an audio bitrate:</Text>
				<SegmentedControl
					data={["cbr", "vbr", "auto"]}
					defaultValue={"auto"}
					radius={"lg"}
					{...form.getInputProps("audio.audioQuality")}
				/>
			</Flex>
			<BitrateOptions />
		</>
	);
}
