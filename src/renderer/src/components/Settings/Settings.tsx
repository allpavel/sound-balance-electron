import { Button, Loader, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { saveSettings } from "@renderer/store/slices/settingsSlice";
import { IconSettings } from "@tabler/icons-react";
import { AudioOptions } from "./AudioOptions/AudioOptions";
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
				<form
					onSubmit={form.onSubmit((values) => {
						const newValues = {
							audio: structuredClone(values.audio),
							global: structuredClone(values.global),
						};
						dispatch(saveSettings(newValues));
						close();
					})}
				>
					<Stack>
						<GlobalOptions form={form} />
						<AudioOptions form={form} />
						<Button type="submit">Submit</Button>
					</Stack>
				</form>
			</Modal>
			<Button leftSection={<IconSettings size={14} />} onClick={open}>
				Settings
			</Button>
		</>
	);
}
