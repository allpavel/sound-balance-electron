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
import type { UseFormReturnType } from "@mantine/form";
import type { SettingsForm } from "@renderer/components/Settings/settings.types";
import { EXTENSIONS_LIST } from "../../settings.constants";

export default function OutputExtensions({
	form,
}: {
	form: UseFormReturnType<SettingsForm>;
}) {
	return (
		<NativeSelect
			label="Output file extension:"
			key={form.key("audio.outputExtension")}
			{...form.getInputProps("audio.outputExtension")}
		>
			<optgroup label="Default value">
				<option value="copy">Copy</option>
			</optgroup>
			{EXTENSIONS_LIST.map((item) => (
				<option key={item}>{item}</option>
			))}
			<hr />
		</NativeSelect>
	);
}
