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
	Button,
	Flex,
	Modal,
	TextInput,
	Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useCollections } from "@renderer/hooks/useCollections";
import { IconPlusFilled } from "@tabler/icons-react";
import type { CollectionType } from "@/types";

export default function AddCollection() {
	const [opened, { open, close }] = useDisclosure(false);
	const { addCollection } = useCollections();

	const initialValues: Omit<CollectionType, "id"> = {
		title: "",
	};

	const form = useForm({
		initialValues,
	});

	return (
		<>
			<Modal
				opened={opened}
				onClose={close}
				title={"Add new collection"}
				centered
			>
				<form
					onSubmit={form.onSubmit((values) => {
						addCollection({ title: values.title });
						form.reset();
						close();
					})}
				>
					<TextInput
						label={"Title:"}
						required
						key={form.key("title")}
						{...form.getInputProps("title")}
					/>
					<Flex justify={"center"} mt={"md"}>
						<Button type="submit">Submit</Button>
					</Flex>
				</form>
			</Modal>
			<Tooltip label="Add collection">
				<ActionIcon
					variant="filled"
					aria-label="Add collection"
					onClick={open}
					my="sm"
				>
					<IconPlusFilled />
				</ActionIcon>
			</Tooltip>
		</>
	);
}
