import {
	NumberInput,
	Select,
	Stack,
	Switch,
	TextInput,
	Title,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { FILTER_OPTIONS } from "@renderer/components/Settings/settings.constants";
import type {
	AUDIO_FILTER_NAMES,
	SettingsForm,
} from "@renderer/components/Settings/settings.types";
import type { JSX } from "react";

export function AudioFilterFactory({
	form,
	filter,
}: {
	form: UseFormReturnType<SettingsForm>;
	filter: AUDIO_FILTER_NAMES;
}): JSX.Element {
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
								{...form.getInputProps(`audio.filterOptions.${field.label}`)}
							/>
						);
					case "text":
						return (
							<TextInput
								key={field.label}
								label={field.label}
								description={field.desc}
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
								{...form.getInputProps(`audio.filterOptions.${field.label}`)}
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
