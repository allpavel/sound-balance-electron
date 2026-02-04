import { Flex, Modal, type ModalRootProps, Text } from "@mantine/core";
import { IconAlertHexagon } from "@tabler/icons-react";

type ErrorModal = {
	message: string;
	title?: string;
};

export default function ErrorModal({
	title = "Attention!",
	message,
	opened,
	onClose,
	...props
}: ErrorModal & ModalRootProps) {
	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={
				<Flex gap={"xs"}>
					<IconAlertHexagon color="red" />
					<Text>{title}</Text>
				</Flex>
			}
			{...props}
		>
			<Text>{message}</Text>
		</Modal>
	);
}
