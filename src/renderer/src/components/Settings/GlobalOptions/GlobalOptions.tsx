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
	ActionIcon,
	Alert,
	Button,
	NativeSelect,
	Stack,
	Switch,
	TextInput,
} from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import { useDirectoryPicker } from "@renderer/components/Settings/hooks/useDirectoryPicker";
import { CONCURRENCY_OPTIONS } from "@renderer/components/Settings/settings.constants";
import { FolderOpen, TriangleAlert } from "lucide-react";
import type { JSX } from "react";

/**
 * Global (output & behavior) settings panel.
 *
 * @returns The global options form section.
 */
export function GlobalOptions(): JSX.Element {
	const form = useSettingsFormContext();
	const getOutputDirectoryPath = useDirectoryPicker();

	const handleDirectoryPicker = async () => {
		const path = await getOutputDirectoryPath();
		if (path.filePaths.length > 0) {
			form.setFieldValue("global.outputDirectoryPath", path.filePaths[0] ?? "");
		}
	};

	const hasOverwriteConflict =
		form.values.global.overwrite && form.values.global.noOverwrite;

	return (
		<Stack gap="lg">
			<TextInput
				label="Output folder"
				description="Processed files are saved here. Required before processing can start."
				placeholder="No folder chosen yet"
				rightSection={
					<ActionIcon
						variant="subtle"
						aria-label="Browse for the output folder"
						onClick={handleDirectoryPicker}
					>
						<FolderOpen size={16} aria-hidden="true" />
					</ActionIcon>
				}
				rightSectionWidth={44}
				{...form.getInputProps("global.outputDirectoryPath")}
			/>
			<Button
				variant="light"
				leftSection={<FolderOpen size={16} aria-hidden="true" />}
				onClick={handleDirectoryPicker}
				style={{ alignSelf: "flex-start" }}
			>
				Browse…
			</Button>
			<NativeSelect
				label="Parallel processing threads"
				description="How many files to process at once (1–10). Higher can be faster but uses more CPU."
				{...form.getInputProps("global.concurrency")}
			>
				{CONCURRENCY_OPTIONS.map((item) => (
					<option key={item.value} value={item.value}>
						{item.value}
					</option>
				))}
			</NativeSelect>
			{hasOverwriteConflict && (
				<Alert
					color="warning"
					icon={<TriangleAlert size={16} aria-hidden="true" />}
					role="status"
				>
					These two options conflict: files cannot be overwritten automatically
					and fail-on-exists at the same time. Turn one of them off.
				</Alert>
			)}
			<Stack gap="md">
				<Switch
					label="Overwrite existing files without asking"
					description="Replaces files in the output folder that have the same name."
					labelPosition="left"
					onLabel="On"
					offLabel="Off"
					styles={{ body: { justifyContent: "space-between" } }}
					{...form.getInputProps("global.overwrite", { type: "checkbox" })}
				/>
				<Switch
					label="Fail if the output file already exists"
					description="Skips processing with an error instead of touching existing files."
					labelPosition="left"
					onLabel="On"
					offLabel="Off"
					styles={{ body: { justifyContent: "space-between" } }}
					{...form.getInputProps("global.noOverwrite", { type: "checkbox" })}
				/>
				<Switch
					label="Open the output folder when processing finishes"
					labelPosition="left"
					onLabel="On"
					offLabel="Off"
					styles={{ body: { justifyContent: "space-between" } }}
					{...form.getInputProps("global.openOutputFolderOnComplete", {
						type: "checkbox",
					})}
				/>
			</Stack>
		</Stack>
	);
}
