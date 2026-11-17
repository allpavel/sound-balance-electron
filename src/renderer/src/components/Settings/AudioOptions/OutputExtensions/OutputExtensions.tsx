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

import { NativeSelect } from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import { EXTENSIONS_LIST } from "@renderer/components/Settings/settings.constants";
import type { JSX } from "react";

/**
 * Output container/extension selector.
 *
 * @returns The extension `<select>` bound to the settings form.
 */
export default function OutputExtensions(): JSX.Element {
	const form = useSettingsFormContext();
	return (
		<NativeSelect
			label="Output file format"
			description="The container for processed files. “Keep original” preserves each track's own format."
			key={form.key("audio.outputExtension")}
			{...form.getInputProps("audio.outputExtension")}
		>
			<optgroup label="Keep original">
				<option value="copy">Keep original format (copy)</option>
			</optgroup>
			<optgroup label="Convert to">
				{EXTENSIONS_LIST.map((item) => (
					<option key={item} value={item}>
						{item}
					</option>
				))}
			</optgroup>
		</NativeSelect>
	);
}
