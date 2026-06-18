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
	const {
		global: { outputDirectoryPath },
	} = useAppSelector((state) => state.settings);

	useEffect(() => {
		if (results.total > 0) {
			open();
		}
	}, [results, open]);

	const handleOpenOutputFolder = () => {
		if (outputDirectoryPath) {
			window.api.openOutputFolder(outputDirectoryPath);
		}
	};

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
					{results.total > 0 && (
						<Button onClick={handleOpenOutputFolder} mt={"md"}>
							Open Output Folder
						</Button>
					)}
				</Stack>
			</Modal>
			<Button onClick={open}>Results</Button>
		</>
	);
}
