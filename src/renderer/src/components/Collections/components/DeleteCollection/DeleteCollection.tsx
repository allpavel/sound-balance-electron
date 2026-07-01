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
	Checkbox,
	Flex,
	Modal,
	Stack,
	Text,
	Title,
	Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useCollections } from "@renderer/components/Collections/hooks/useCollections";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { setActiveCollection } from "@renderer/store/slices/collectionSlice";
import { Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

export default function DeleteCollection() {
	const [opened, { open, close }] = useDisclosure(false);
	const { deleteCollection } = useCollections();
	const activeCollection = useAppSelector((state) => state.activeCollection);
	const dispatch = useAppDispatch();

	const form = useForm({
		initialValues: { check: false },
	});

	const handleClose = () => {
		form.reset();
		close();
	};

	const handleSubmit = form.onSubmit((values) => {
		try {
			deleteCollection({
				id: activeCollection.id,
				deleteFromAllCollections: values.check,
			});
			dispatch(setActiveCollection({ id: "all", title: "All" }));
			toast.success(`${activeCollection.title} was successfully removed.`);
			form.reset();
			close();
		} catch {
			toast.error(
				"There was an error deleting the collection. Please try again.",
			);
		}
	});

	return (
		<>
			<Modal.Root opened={opened} onClose={handleClose} centered>
				<Modal.Overlay />
				<Modal.Content>
					<Modal.Header pb={"xs"}>
						<Modal.CloseButton />
					</Modal.Header>
					<Modal.Body>
						<Stack align="center">
							<TriangleAlert size={48} color="red" />
							<Title order={2}>Delete collection</Title>
							<Flex justify={"center"}>
								<Text
									textWrap="balance"
									ps={"lg"}
									style={{ textAlign: "center" }}
									c="dimmed"
								>
									Are you sure you'd like to delete this collection? This cannot
									be undone.
								</Text>
							</Flex>
						</Stack>
						<form onSubmit={handleSubmit}>
							<Checkbox
								label="Also delete tracks from other collections"
								my={"sm"}
								key={form.key("check")}
								{...form.getInputProps("check", { type: "checkbox" })}
							/>
							<Flex gap={"sm"} mt={"md"}>
								<Button onClick={handleClose} variant="outline" fullWidth>
									Cancel
								</Button>
								<Button type="submit" color="red" fullWidth>
									Delete
								</Button>
							</Flex>
						</form>
					</Modal.Body>
				</Modal.Content>
			</Modal.Root>
			<Tooltip label="Delete collection">
				<ActionIcon
					variant="filled"
					aria-label="Delete collection"
					onClick={open}
					ms="sm"
				>
					<Trash2 />
				</ActionIcon>
			</Tooltip>
		</>
	);
}
