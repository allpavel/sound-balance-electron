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
import { Box, NativeSelect, Stack, Title } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import OutputExtensions from "@renderer/components/Settings/AudioOptions//OutputExtensions/OutputExtensions";
import Filters from "@renderer/components/Settings/AudioOptions/Filters/Filters";
import type { SettingsForm } from "@renderer/components/Settings/settings.types";
import Codecs from "./Codecs/Codecs";

export function AudioOptions({
	form,
}: {
	form: UseFormReturnType<SettingsForm>;
}) {
	return (
		<Box>
			<Title order={3}>Audio options</Title>
			<Stack>
				<OutputExtensions form={form} />
				<Filters form={form} />
				<Codecs form={form} />
				<NativeSelect
					label="Audio quality:"
					{...form.getInputProps("audio.audioQuality")}
				>
					<optgroup label="VBR Encoding">
						<option value="0">0</option>
						<option value="1">1</option>
						<option value="2">2</option>
						<option value="3">3</option>
						<option value="4">4 (default value)</option>
						<option value="5">5</option>
						<option value="6">6</option>
						<option value="7">7</option>
						<option value="8">8</option>
						<option value="9">9</option>
					</optgroup>
					<hr />
					<optgroup label="CBR Encoding">
						<option value="320k">302 KB/s</option>
						<option value="256k">256 KB/s</option>
						<option value="224k">224 KB/s</option>
						<option value="192k">192 KB/s</option>
						<option value="160k">160 KB/s</option>
						<option value="128k">128 KB/s</option>
						<option value="112k">112 KB/s</option>
						<option value="96k">96 KB/s</option>
						<option value="80k">80 KB/s</option>
						<option value="64k">64 KB/s</option>
						<option value="48k">48 KB/s</option>
						<option value="40k">40 KB/s</option>
						<option value="32k">32 KB/s</option>
						<option value="24k">24 KB/s</option>
						<option value="16k">16 KB/s</option>
						<option value="8k">8 KB/s</option>
					</optgroup>
				</NativeSelect>
			</Stack>
		</Box>
	);
}
