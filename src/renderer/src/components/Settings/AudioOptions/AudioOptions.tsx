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

import { Stack, Text, Title } from "@mantine/core";
import OutputExtensions from "@renderer/components/Settings/AudioOptions//OutputExtensions/OutputExtensions";
import { palette } from "@renderer/theme/tokens";
import type { JSX } from "react";
import Bitrate from "./Bitrate/Bitrate";
import Codecs from "./Codecs/Codecs";

/**
 * Audio quality panel: codec, bitrate mode, and output format.
 *
 * @returns The audio-quality settings section.
 */
export function AudioOptions(): JSX.Element {
	return (
		<Stack gap="lg">
			<div>
				{/* [REDESIGN] Heading order fixed: modal title is h2, sections are h3. */}
				<Title order={3}>Audio quality</Title>
				<Text fz="sm" style={{ color: palette.inkSecondary }}>
					Choose how processed files are encoded.
				</Text>
			</div>
			<Codecs />
			<Bitrate />
			<OutputExtensions />
		</Stack>
	);
}
