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

import { Alert, Button, Group, Modal, TextInput } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useCollections } from "@renderer/components/Collections/hooks/useCollections";
import { collectionDraftSchema } from "@shared/schemas/collections.schema";
import { Plus, TriangleAlert } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";
import type { CollectionType } from "@/types";
import { useDuplicateCollectionCheck } from "../../hooks/useDuplicateCollectionCheck";

export default function AddCollection() {
	const [opened, { open, close }] = useDisclosure(false);
	const { collections, addCollectionAsync, addCollectionState } =
		useCollections();
	const alertId = useId();
	const initialValues: Omit<CollectionType, "id"> = {
		title: "",
	};

	const form = useForm({
		initialValues,
		validate: schemaResolver(collectionDraftSchema),
	});

	const isDuplicate = useDuplicateCollectionCheck(
		form.values.title,
		collections,
	);

	return (
		<>
			<Modal opened={opened} onClose={close} title={"New collection"} centered>
				<form
					onSubmit={form.onSubmit(async (values) => {
						if (addCollectionState.isPending) {
							return;
						}

						try {
							await addCollectionAsync({ title: values.title });
							form.reset();
							close();
							toast.success("Collection was successfully added.");
						} catch (error) {
							toast.error(
								error instanceof Error
									? error.message
									: "Failed to add collection. Please try again.",
							);
						}
					})}
				>
					<TextInput
						label="Collection name"
						description="For example: “Rock”, “Podcasts 2026”."
						placeholder="Enter a name"
						required
						data-autofocus
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
						<Button type="button" variant="subtle" color="gray" onClick={close}>
							Cancel
						</Button>
						<Button
							type="submit"
							leftSection={<Plus size={16} aria-hidden="true" />}
							loading={addCollectionState.isPending}
							disabled={addCollectionState.isPending}
						>
							Create collection
						</Button>
					</Group>
				</form>
			</Modal>
			<Button
				variant="light"
				fullWidth
				justify="flex-start"
				leftSection={<Plus size={16} aria-hidden="true" />}
				aria-label="Add collection"
				onClick={open}
				mt="sm"
			>
				New collection
			</Button>
		</>
	);
}
