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
	Box,
	Divider,
	NativeSelect,
	Stack,
	Switch,
	TextInput,
	Title,
} from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import { useDirectoryPicker } from "@renderer/components/Settings/hooks/useDirectoryPicker";
import { CONCURRENCY_OPTIONS } from "@renderer/components/Settings/settings.constants";
import { IconUpload } from "@tabler/icons-react";

export function GlobalOptions() {
	const form = useSettingsFormContext();
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
					<Divider />
					<Switch
						label={"Open output folder after processing completes:"}
						labelPosition="left"
						onLabel="yes"
						offLabel="no"
						size="md"
						styles={{
							body: {
								justifyContent: "space-between",
							},
						}}
						{...form.getInputProps("global.openOutputFolderOnComplete", {
							type: "checkbox",
						})}
					/>
				</Stack>
			</Stack>
		</Box>
	);
}
