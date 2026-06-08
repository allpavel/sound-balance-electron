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
import { Box, Stack, Title } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import OutputExtensions from "@renderer/components/Settings/AudioOptions//OutputExtensions/OutputExtensions";
import Filters from "@renderer/components/Settings/AudioOptions/Filters/Filters";
import type { SettingsForm } from "@types";
import Bitrate from "./Bitrate/Bitrate";
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
				<Bitrate form={form} />
			</Stack>
		</Box>
	);
}
