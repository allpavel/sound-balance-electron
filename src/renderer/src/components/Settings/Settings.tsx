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
import { Button, Flex, Loader, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { saveSettings } from "@renderer/store/slices/settingsSlice";
import { Settings as IconSettings } from "lucide-react";
import { toast } from "sonner";
import { AudioOptions } from "./AudioOptions/AudioOptions";
import { SettingsFormProvider } from "./context/SettingsFormContext";
import { GlobalOptions } from "./GlobalOptions/GlobalOptions";
import useSettingsForm from "./hooks/useSettingsForm";

export default function Settings() {
	const [opened, { open, close }] = useDisclosure(false);

	const dispatch = useAppDispatch();

	const { form, isLoading } = useSettingsForm();

	if (isLoading) {
		return <Loader color="blue" type="bars" />;
	}

	return (
		<>
			<Modal opened={opened} onClose={close} title="Settings">
				<SettingsFormProvider form={form}>
					<form
						onSubmit={form.onSubmit((values) => {
							const newValues = {
								audio: structuredClone(values.audio),
								global: structuredClone(values.global),
							};
							try {
								dispatch(saveSettings(newValues));
								toast.success("Settings updated successfully.");
							} catch {
								toast.error("Unable to save settings. Please try again.");
							}
							close();
						})}
					>
						<Stack>
							<GlobalOptions />
							<AudioOptions />
							<Flex align={"center"} justify={"space-between"} mt={"sm"}>
								<Button onClick={() => form.reset()}>Reset</Button>
								<Button type="submit" bg="green" px={"xl"}>
									Submit
								</Button>
							</Flex>
						</Stack>
					</form>
				</SettingsFormProvider>
			</Modal>
			<Button leftSection={<IconSettings size={14} />} onClick={open}>
				Settings
			</Button>
		</>
	);
}
