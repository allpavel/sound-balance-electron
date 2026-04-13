import { Button, Loader, Modal, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { saveSettings } from "@renderer/store/slices/settingsSlice";
import { IconSettings } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { AudioOptions } from "./AudioOptions/AudioOptions";
import { GlobalOptions } from "./GlobalOptions/GlobalOptions";

export default function Settings() {
	const [opened, { open, close }] = useDisclosure(false);
	const settings = useAppSelector((state) => state.settings);
	const initialValues = useMemo(
		() => ({
			audio: { ...settings.audio },
			global: { ...settings.global },
		}),
		[settings],
	);

	const dispatch = useAppDispatch();

	const form = useForm({
		initialValues,
	});

	useEffect(() => {
		form.setValues(initialValues);
	}, [form.setValues, initialValues]);

	if (settings.loading) {
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
