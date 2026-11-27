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
	Group,
	Modal,
	Stack,
	Text,
	Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useCollections } from "@renderer/components/Collections/hooks/useCollections";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { setActiveCollection } from "@renderer/store/slices/collectionSlice";
import { statusTokens } from "@renderer/theme/tokens";
import {
	SYSTEM_COLLECTION_ID,
	SYSTEM_COLLECTION_TITLE,
} from "@shared/constants";
import { Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

/**
 * Delete-collection control: title-bar icon button + confirmation dialog.
 *
 * @returns Delete trigger + confirmation dialog.
 */
export default function DeleteCollection() {
	const [opened, { open, close }] = useDisclosure(false);
	const { deleteCollectionAsync } = useCollections();
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
			deleteCollectionAsync({
				id: activeCollection.id,
				deleteFromAllCollections: values.check,
			});
			dispatch(
				setActiveCollection({
					id: SYSTEM_COLLECTION_ID,
					title: SYSTEM_COLLECTION_TITLE,
				}),
			);
			toast.success(`${activeCollection.title} was successfully removed.`);
			form.reset();
			close();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "There was an error deleting the collection. Please try again.",
			);
		}
	});

	return (
		<>
			<Modal.Root opened={opened} onClose={handleClose} centered>
				<Modal.Overlay />
				<Modal.Content>
					<Modal.Header pb="xs">
						<Modal.Title fw={600}>Delete collection</Modal.Title>
						<Modal.CloseButton aria-label="Close dialog" />
					</Modal.Header>
					<Modal.Body>
						<Stack align="center" gap="sm">
							<TriangleAlert
								size={44}
								color={statusTokens.failed.fg}
								aria-hidden="true"
							/>
							<Flex justify="center">
								<Text
									textWrap="balance"
									style={{ textAlign: "center", color: statusTokens.failed.fg }}
									fz="sm"
								>
									Are you sure you'd like to delete “{activeCollection.title}”?
									This cannot be undone.
								</Text>
							</Flex>
						</Stack>
						<form onSubmit={handleSubmit}>
							<Checkbox
								label="Also delete these tracks from every other collection"
								description="Leave unchecked to remove them from this collection only."
								my="md"
								key={form.key("check")}
								{...form.getInputProps("check", { type: "checkbox" })}
							/>
							<Group grow gap="sm" mt="md">
								<Button onClick={handleClose} variant="light" type="button">
									Cancel
								</Button>
								<Button type="submit" color="red">
									Delete collection
								</Button>
							</Group>
						</form>
					</Modal.Body>
				</Modal.Content>
			</Modal.Root>
			<Tooltip label="Delete collection">
				<ActionIcon
					variant="subtle"
					color="danger"
					aria-label="Delete collection"
					onClick={open}
				>
					<Trash2 size={16} aria-hidden="true" />
				</ActionIcon>
			</Tooltip>
		</>
	);
}
