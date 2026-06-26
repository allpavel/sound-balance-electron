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
	Title,
	Tooltip,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useCollections } from "@renderer/hooks/useCollections";
import { setActiveCollection } from "@renderer/store/slices/collectionSlice";
import { IconEdit } from "@tabler/icons-react";
import z from "zod";

const collectionTitleSchema = z.object({
	title: z.string().min(1, "Title is required."),
});

export function CollectionTitle() {
	const collection = useAppSelector((state) => state.activeCollection);
	const [opened, { open, close }] = useDisclosure(false);
	const { updateCollection } = useCollections();
	const form = useForm({
		initialValues: { title: collection.title },
		validate: schemaResolver(collectionTitleSchema),
		transformValues: (values) => ({
			title: values.title.trim(),
		}),
	});
	const dispatch = useAppDispatch();

	const handleOpen = () => {
		form.setValues({
			title: collection.title,
		});
		open();
	};

	const handleClose = () => {
		form.reset();
		close();
	};

	const handleSubmit = form.onSubmit((values) => {
		if (values.title !== collection.title) {
			updateCollection({
				id: collection.id,
				changes: { title: values.title },
			});
			dispatch(setActiveCollection({ id: collection.id, title: values.title }));
		}
		form.reset();
		close();
	});

	return (
		<Flex mb={"sm"} align={"center"}>
			<Title order={1}>{collection.title}</Title>
			{collection.title !== "All" && (
				<>
					<Modal
						opened={opened}
						onClose={handleClose}
						title="Collection title"
						centered
					>
						<form onSubmit={handleSubmit}>
							<TextInput
								label={"New title:"}
								key={form.key("title")}
								{...form.getInputProps("title")}
							/>
							<Flex justify={"center"} mt={"md"}>
								<Button type="submit">Submit</Button>
							</Flex>
						</form>
					</Modal>

					<Tooltip label="Edit title">
						<ActionIcon
							variant="filled"
							aria-label="edit title"
							onClick={handleOpen}
							ms="sm"
						>
							<IconEdit />
						</ActionIcon>
					</Tooltip>
				</>
			)}
		</Flex>
	);
}
