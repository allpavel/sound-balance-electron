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
import { Combobox, TextInput, useCombobox } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { AudioFilterFactory } from "@renderer/components/Settings/AudioOptions/Filters/FilterOptions/FilterOptions";
import { FILTER_OPTIONS } from "@renderer/components/Settings/settings.constants";
import type {
	AUDIO_FILTER_NAMES,
	SettingsForm,
} from "@renderer/components/Settings/settings.types";
import { useMemo } from "react";

// temp line
const opts = Object.values(FILTER_OPTIONS);

export default function Filters({
	form,
}: {
	form: UseFormReturnType<SettingsForm>;
}) {
	const combobox = useCombobox({
		onDropdownOpen: () => combobox.selectActiveOption(),
		onDropdownClose: () => combobox.resetSelectedOption(),
	});

	const search = form.values.audio.audioFilter;
	const exactMatch = opts.some((item) => item.name === search);

	const options = useMemo(() => {
		const items = exactMatch
			? opts
			: opts.filter((item) =>
					item.name.toLowerCase().includes(search.toLowerCase()),
				);

		return items.map((item) => (
			<Combobox.Option
				value={item.name}
				key={item.name}
				active={item.name === search}
			>
				{item.name}
			</Combobox.Option>
		));
	}, [exactMatch, search]);

	const inputProps = form.getInputProps("audio.audioFilter");

	return (
		<Combobox
			store={combobox}
			withArrow
			onOptionSubmit={(val) => {
				form.setFieldValue("audio.audioFilter", val);
				form.setFieldValue("audio.filterOptions", {});
				combobox.closeDropdown();
			}}
		>
			<Combobox.Target>
				<TextInput
					label="Pick an audio filter or type anything:"
					value={search}
					{...inputProps}
					onChange={(e) => {
						combobox.openDropdown();
						combobox.updateSelectedOptionIndex();
						inputProps.onChange(e.currentTarget.value);
					}}
					onClick={() => combobox.openDropdown()}
					onFocus={() => combobox.openDropdown()}
					onBlur={() => combobox.closeDropdown()}
					rightSection={<Combobox.Chevron />}
					key={form.key("audio.audioFilter")}
				/>
			</Combobox.Target>
			<Combobox.Dropdown>
				<Combobox.Options mah={200} style={{ overflow: "auto" }}>
					{options}
				</Combobox.Options>
			</Combobox.Dropdown>
			{exactMatch && search && (
				<AudioFilterFactory form={form} filter={search as AUDIO_FILTER_NAMES} />
			)}
		</Combobox>
	);
}
