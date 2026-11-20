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

import { Combobox, Stack, Text, TextInput, useCombobox } from "@mantine/core";
import { AudioFilterFactory } from "@renderer/components/Settings/AudioOptions/Filters/FilterOptions/FilterOptions";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import { FILTER_OPTIONS } from "@renderer/components/Settings/settings.constants";
import {
	isAudioFilterName,
	normalizeFilterSelection,
} from "@renderer/components/Settings/utils/settingsGuards";
import { palette } from "@renderer/theme/tokens";
import type { JSX } from "react";
import { useMemo } from "react";

const opts = Object.values(FILTER_OPTIONS);

/**
 * Whether the option list is empty for the current query.
 *
 * @param search - Current input text.
 * @param exactMatch - Whether an exact catalog match exists.
 * @returns `true` when neither an exact nor a partial match exists.
 */
function itemsEmpty(search: string, exactMatch: boolean): boolean {
	if (exactMatch) return false;
	return !opts.some((item) =>
		item.name.toLowerCase().includes(search.toLowerCase()),
	);
}

/**
 * Audio-filter picker: searchable combobox over the FFmpeg filter catalog
 * plus the selected filter's parameter form.
 *
 * @returns The filter field and, when a valid filter is chosen, its options.
 */
export default function Filters(): JSX.Element {
	const form = useSettingsFormContext();

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
				<Stack gap={0}>
					<Text fz="sm" fw={item.name === search ? 600 : 500}>
						{item.name}
					</Text>
					<Text fz="xs" lineClamp={1} style={{ color: palette.inkSecondary }}>
						{item.desc}
					</Text>
				</Stack>
			</Combobox.Option>
		));
	}, [exactMatch, search]);

	const inputProps = form.getInputProps("audio.audioFilter");

	return (
		<Stack gap="xs">
			<Combobox
				store={combobox}
				withArrow
				onOptionSubmit={(val) => {
					form.setFieldValue(
						"audio.audioFilter",
						normalizeFilterSelection(val),
					);
					form.setFieldValue("audio.filterOptions", {});
					combobox.closeDropdown();
				}}
			>
				<Combobox.Target>
					<TextInput
						label="Audio filter"
						description="Optional. Adjusts the sound before encoding — for example, loudness normalization (loudnorm)."
						placeholder="Type to search filters, e.g. loudnorm…"
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
						rightSection={
							search ? (
								<Combobox.ClearButton
									aria-label="Clear filter selection"
									onClear={() => form.setFieldValue("audio.audioFilter", "")}
								/>
							) : (
								<Combobox.Chevron />
							)
						}
						key={form.key("audio.audioFilter")}
					/>
				</Combobox.Target>
				<Combobox.Dropdown>
					<Combobox.Options mah={260} style={{ overflow: "auto" }}>
						{options}
						{itemsEmpty(search, exactMatch) && (
							<Combobox.Empty>No filters match “{search}”</Combobox.Empty>
						)}
					</Combobox.Options>
				</Combobox.Dropdown>
			</Combobox>
			{/* [REDESIGN] CHANGED: assertion-free gate on rendering parameters. */}
			{exactMatch && isAudioFilterName(search) && (
				<AudioFilterFactory filter={search} />
			)}
		</Stack>
	);
}
