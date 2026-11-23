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
	Button,
	Flex,
	Group,
	Loader,
	Modal,
	Stack,
	Tabs,
	Text,
	VisuallyHidden,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { saveSettings } from "@renderer/store/slices/settingsSlice";
import { palette } from "@renderer/theme/tokens";
import { SAVE_ERROR_TOAST } from "@shared/constants";
import { Settings as IconSettings, RotateCcw } from "lucide-react";
import { type JSX, useState } from "react";
import { toast } from "sonner";
import { AudioOptions } from "./AudioOptions/AudioOptions";
import Filters from "./AudioOptions/Filters/Filters";
import { SettingsFormProvider } from "./context/SettingsFormContext";
import { GlobalOptions } from "./GlobalOptions/GlobalOptions";
import useSettingsForm from "./hooks/useSettingsForm";

/**
 * Settings dialog: app-wide output, encoding, and filter configuration.
 *
 * @returns Settings trigger button + modal form.
 */
export default function Settings(): JSX.Element {
	const [opened, { open, close }] = useDisclosure(false);
	const [activeTab, setActiveTab] = useState<string | null>("output");
	const dispatch = useAppDispatch();
	const { form, isLoading } = useSettingsForm();

	if (isLoading) {
		return (
			<Button
				leftSection={<Loader size={14} aria-hidden="true" />}
				disabled
				aria-busy="true"
			>
				Settings
				<VisuallyHidden>Loading settings…</VisuallyHidden>
			</Button>
		);
	}

	return (
		<>
			<Modal opened={opened} onClose={close} title="Settings" size="lg">
				<SettingsFormProvider form={form}>
					<form
						onSubmit={form.onSubmit(async (values) => {
							const newValues = {
								version: values.version,
								audio: structuredClone(values.audio),
								global: structuredClone(values.global),
							};
							try {
								await dispatch(saveSettings(newValues)).unwrap();
								toast.success("Settings updated successfully.");
								close();
							} catch {
								toast.error(SAVE_ERROR_TOAST);
							}
						})}
					>
						<Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
							<Tabs.List aria-label="Settings sections">
								<Tabs.Tab value="output">Output &amp; Files</Tabs.Tab>
								<Tabs.Tab value="quality">Audio Quality</Tabs.Tab>
								<Tabs.Tab value="filter">Audio Filter</Tabs.Tab>
							</Tabs.List>

							<Tabs.Panel value="output" pt="lg">
								<GlobalOptions />
							</Tabs.Panel>
							<Tabs.Panel value="quality" pt="lg">
								<AudioOptions />
							</Tabs.Panel>
							<Tabs.Panel value="filter" pt="lg">
								<Stack gap="xs">
									<div>
										<Text component="h3" fw={600} fz="h3">
											Audio filter
										</Text>
										<Text fz="sm" style={{ color: palette.inkSecondary }}>
											Optionally transform the audio (for example, normalize
											loudness) before encoding.
										</Text>
									</div>
									<Filters />
								</Stack>
							</Tabs.Panel>
						</Tabs>

						<Flex align="center" justify="space-between" mt="xl">
							<Button
								type="button"
								variant="subtle"
								color="gray"
								leftSection={<RotateCcw size={14} aria-hidden="true" />}
								onClick={() => form.reset()}
							>
								Restore saved values
							</Button>
							<Group gap="sm">
								<Button type="button" variant="light" onClick={close}>
									Cancel
								</Button>
								<Button type="submit" loading={form.submitting}>
									Save changes
								</Button>
							</Group>
						</Flex>
					</form>
				</SettingsFormProvider>
			</Modal>
			<Button
				leftSection={<IconSettings size={16} aria-hidden="true" />}
				onClick={open}
			>
				Settings
			</Button>
		</>
	);
}
