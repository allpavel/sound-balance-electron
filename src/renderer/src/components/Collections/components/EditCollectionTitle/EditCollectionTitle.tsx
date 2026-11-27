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
	Alert,
	Button,
	Group,
	Modal,
	TextInput,
	Tooltip,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useCollections } from "@renderer/components/Collections/hooks/useCollections";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { setActiveCollection } from "@renderer/store/slices/collectionSlice";
import { collectionDraftSchema } from "@shared/schemas/collections.schema";
import { Pencil, TriangleAlert } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";
import { useDuplicateCollectionCheck } from "../../hooks/useDuplicateCollectionCheck";

/**
 * Rename-collection control: title-bar icon button + rename dialog.
 *
 * @returns Rename trigger + modal form.
 */
export default function EditCollectionTitle() {
	const { collections, updateCollectionAsync, updateCollectionState } =
		useCollections();
	const collection = useAppSelector((state) => state.activeCollection);
	const alertId = useId();

	const dispatch = useAppDispatch();
	const [opened, { open, close }] = useDisclosure(false);

	const form = useForm({
		initialValues: { title: collection.title },
		validate: schemaResolver(collectionDraftSchema),
	});

	const isDuplicate = useDuplicateCollectionCheck(
		form.values.title,
		collections,
		collection.id,
	);

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

	const handleSubmit = form.onSubmit(async (values) => {
		if (updateCollectionState.isPending) {
			return;
		}

		if (values.title !== collection.title) {
			try {
				await updateCollectionAsync({
					id: collection.id,
					changes: { title: values.title },
				});
				dispatch(
					setActiveCollection({ id: collection.id, title: values.title }),
				);
				toast.success("Collection title successfully changed.");
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Can't change collection title. Please try again.",
				);
			}
		}
		form.reset();
		close();
	});

	return (
		<>
			<Modal
				opened={opened}
				onClose={handleClose}
				title="Rename collection"
				centered
			>
				<form onSubmit={handleSubmit}>
					<TextInput
						label="New name"
						required
						data-autofocus
						placeholder="Enter a name"
						key={form.key("title")}
						aria-describedby={isDuplicate ? alertId : undefined}
						{...form.getInputProps("title")}
					/>
					{isDuplicate && (
						<Alert
							id={alertId}
							icon={<TriangleAlert size={16} aria-hidden="true" />}
							color="yellow"
							radius="sm"
							mt="sm"
							aria-live="polite"
						>
							A collection with this name already exists.
						</Alert>
					)}
					<Group justify="flex-end" mt="lg">
						<Button
							type="button"
							variant="subtle"
							color="gray"
							onClick={handleClose}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							loading={updateCollectionState.isPending}
							disabled={updateCollectionState.isPending}
						>
							Save name
						</Button>
					</Group>
				</form>
			</Modal>

			<Tooltip label="Rename collection">
				<ActionIcon
					variant="subtle"
					aria-label="Rename collection"
					onClick={handleOpen}
				>
					<Pencil size={16} aria-hidden="true" />
				</ActionIcon>
			</Tooltip>
		</>
	);
}
