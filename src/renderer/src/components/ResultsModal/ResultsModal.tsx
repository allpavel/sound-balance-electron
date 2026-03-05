import {
	Accordion,
	Button,
	List,
	ListItem,
	Modal,
	Stack,
	Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { Fragment, useEffect } from "react";

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
				<Stack>
					<Text>Total processed: {results.total}.</Text>
					<Text>Successful: {results.successful}.</Text>
					<Text>Failed: {results.failed.length}.</Text>
				</Stack>
				<Stack>
					{results.failed.length > 0 && (
						<Accordion chevronIconSize={23} transitionDuration={500}>
							<Accordion.Item value={"List of failed files:"}>
								<Accordion.Control>List of failed files:</Accordion.Control>
								<Accordion.Panel>
									<List type="ordered">
										{results.failed.map((item) => (
											<Fragment key={item.id}>
												<ListItem>{item.title}</ListItem>
											</Fragment>
										))}
									</List>
								</Accordion.Panel>
							</Accordion.Item>
						</Accordion>
					)}
				</Stack>
			</Modal>
			<Button onClick={open}>Results</Button>
		</>
	);
}
