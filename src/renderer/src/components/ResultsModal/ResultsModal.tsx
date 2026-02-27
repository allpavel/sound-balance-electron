import { Button, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useEffect } from "react";

export default function ResultModal() {
	const [opened, { open, close }] = useDisclosure();
	const results = useAppSelector((state) => state.results);

	useEffect(() => {
		if (results.total > 0) {
			open();
		}
	}, [results, open]);

	return (
		<>
			<Modal opened={opened} onClose={close} title="Results:" centered>
				<Text>Total processed: {results.total}.</Text>
				<Text>Successful: {results.successful}.</Text>
				<Text>Failed: {results.failed.length}.</Text>
			</Modal>
			<Button onClick={open}>Results</Button>
		</>
	);
}
