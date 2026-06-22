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
import {
	NumberInput,
	Select,
	Stack,
	Switch,
	TextInput,
	Title,
} from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import { FILTER_OPTIONS } from "@renderer/components/Settings/settings.constants";
import type { AUDIO_FILTER_NAMES } from "@types";
import type { JSX } from "react";

export function AudioFilterFactory({
	filter,
}: {
	filter: AUDIO_FILTER_NAMES;
}): JSX.Element {
	const form = useSettingsFormContext();
	const config = FILTER_OPTIONS[filter as keyof typeof FILTER_OPTIONS];

	if (!config) return <div>Unknown filter</div>;

	return (
		<Stack gap="xs">
			<Title order={4} size="md">
				{config.name} options:
			</Title>

			{config.options.map((field) => {
				switch (field.type) {
					case "number":
						return (
							<NumberInput
								key={field.label}
								label={field.label}
								description={field.desc}
								min={field.min}
								max={field.max}
								defaultValue={field.defaultValue}
								{...form.getInputProps(`audio.filterOptions.${field.label}`)}
							/>
						);
					case "select":
						return (
							<Select
								key={field.label}
								label={field.label}
								description={field.desc}
								data={field.options}
								defaultValue={field.defaultValue}
								{...form.getInputProps(`audio.filterOptions.${field.label}`)}
							/>
						);
					case "text":
						return (
							<TextInput
								key={field.label}
								label={field.label}
								description={field.desc}
								defaultValue={field.defaultValue}
								{...form.getInputProps(`audio.filterOptions.${field.label}`)}
							/>
						);
					case "switch":
						return (
							<Switch
								label={field.label}
								key={field.label}
								labelPosition="left"
								onLabel="enable"
								offLabel="disable"
								size="md"
								defaultChecked={field.defaultValue}
								{...form.getInputProps(`audio.filterOptions.${field.label}`, {
									type: "checkbox",
								})}
								styles={{
									body: {
										justifyContent: "space-between",
									},
								}}
							/>
						);
					default:
						return null;
				}
			})}
		</Stack>
	);
}
