import { Combobox, TextInput, useCombobox } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { FILTERS_OPTIONS } from "@renderer/components/Settings/settings.constants";
import type { SettingsForm } from "@renderer/components/Settings/settings.types";
import { useMemo } from "react";

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
	const exactMatch = FILTERS_OPTIONS.some((item) => item.name === search);

	const options = useMemo(() => {
		const items = exactMatch
			? FILTERS_OPTIONS
			: FILTERS_OPTIONS.filter((item) =>
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
		</Combobox>
	);
}
