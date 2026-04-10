import {
	Box,
	Divider,
	NativeSelect,
	Stack,
	Switch,
	TextInput,
	Title,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { useDirectoryPicker } from "@renderer/components/Settings/hooks/useDirectoryPicker";
import {
	CONCURRENCY_OPTIONS,
	FILTERS_OPTIONS,
} from "@renderer/components/Settings/settings.constants";
import type { SettingsForm } from "@renderer/components/Settings/settings.types";
import { IconUpload } from "@tabler/icons-react";

export function GlobalOptions({
	form,
}: {
	form: UseFormReturnType<SettingsForm>;
}) {
	const getOutputDirectoryPath = useDirectoryPicker();

	return (
		<Box>
			<Title order={3}>Global options</Title>
			<Stack>
				<TextInput
					label={"Output directory:"}
					rightSection={<IconUpload onClick={getOutputDirectoryPath} />}
					key={form.key("global.outputDirectoryPath")}
					{...form.getInputProps("global.outputDirectoryPath")}
				/>
				<Stack>
					<NativeSelect
						label="Number of processing threads:"
						key={form.key("global.concurrency")}
						{...form.getInputProps("global.concurrency")}
					>
						{CONCURRENCY_OPTIONS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.value}
							</option>
						))}
					</NativeSelect>
				</Stack>
				<Stack>
					<Switch
						label={"Overwrite output files without asking:"}
						labelPosition="left"
						onLabel="yes"
						offLabel="no"
						size="md"
						key={form.key("global.overwrite")}
						styles={{
							body: {
								justifyContent: "space-between",
							},
						}}
					/>
					<Divider />
					<Switch
						label={"Fail if output file exists:"}
						labelPosition="left"
						onLabel="yes"
						offLabel="no"
						size="md"
						key={form.key("global.noOverwrite")}
						styles={{
							body: {
								justifyContent: "space-between",
							},
						}}
					/>
				</Stack>
				<Stack>
					<Box>
						<NativeSelect
							label="Audio filter:"
							key={form.key("audio.audioFilter")}
							{...form.getInputProps("audio.audioFilter")}
						>
							{FILTERS_OPTIONS.map((item) => (
								<option key={item.name} value={item.name}>
									{item.name}
								</option>
							))}
						</NativeSelect>
					</Box>
				</Stack>
				<TextInput
					label={"Set stats update interval in seconds:"}
					key={form.key("global.statsPeriod")}
					{...form.getInputProps("global.statsPeriod")}
				/>
			</Stack>
		</Box>
	);
}
