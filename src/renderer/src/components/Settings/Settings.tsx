import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";

export default function Settings() {
	const [opened, { open, close }] = useDisclosure(false);
	return (
		<>
			<Modal opened={opened} onClose={close} title="Settings"></Modal>
			<Button leftSection={<IconSettings size={14} />} onClick={open}>
				Settings
			</Button>
		</>
	);
}
