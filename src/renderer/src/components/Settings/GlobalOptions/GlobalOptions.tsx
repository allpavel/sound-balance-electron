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
import { CONCURRENCY_OPTIONS } from "@renderer/components/Settings/settings.constants";
import type { SettingsForm } from "@renderer/components/Settings/settings.types";
import { IconUpload } from "@tabler/icons-react";

export function GlobalOptions({
	form,
}: {
	form: UseFormReturnType<SettingsForm>;
}) {
	const getOutputDirectoryPath = useDirectoryPicker();

	const handleDirectoryPicker = async () => {
		const path = await getOutputDirectoryPath();
		if (path.filePaths.length > 0) {
			form.setFieldValue("global.outputDirectoryPath", path.filePaths[0] ?? "");
		}
	};

	return (
		<Box>
			<Title order={3}>Global options</Title>
			<Stack>
				<TextInput
					label={"Output directory:"}
					rightSection={<IconUpload onClick={handleDirectoryPicker} />}
					{...form.getInputProps("global.outputDirectoryPath")}
				/>
				<Stack>
					<NativeSelect
						label="Number of processing threads:"
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
						styles={{
							body: {
								justifyContent: "space-between",
							},
						}}
						{...form.getInputProps("global.overwrite", { type: "checkbox" })}
					/>
					<Divider />
					<Switch
						label={"Fail if output file exists:"}
						labelPosition="left"
						onLabel="yes"
						offLabel="no"
						size="md"
						styles={{
							body: {
								justifyContent: "space-between",
							},
						}}
						{...form.getInputProps("global.noOverwrite", { type: "checkbox" })}
					/>
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
