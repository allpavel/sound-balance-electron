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
import { collectionsRepository } from "@renderer/db/repositories/collectionsRepository";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import type { CollectionType } from "@/types";

export type AddCollectionPayload = Omit<CollectionType, "id">;

export type UpdateCollectionPayload = {
	id: string;
	changes: Omit<CollectionType, "id">;
};

export type DeleteCollectionPayload = {
	id: string;
	deleteFromAllCollections?: boolean;
};

export type CollectionMutationState = {
	isPending: boolean;
	isSuccess: boolean;
	isError: boolean;
	error: Error | null;
};

function createMutationState(mutation: {
	isPending: boolean;
	isSuccess: boolean;
	isError: boolean;
	error: unknown;
}): CollectionMutationState {
	return {
		isPending: mutation.isPending,
		isSuccess: mutation.isSuccess,
		isError: mutation.isError,
		error:
			mutation.error instanceof Error
				? mutation.error
				: mutation.error
					? new Error(String(mutation.error))
					: null,
	};
}

export function useCollections() {
	const collections = useLiveQuery(
		() => collectionsRepository.getAllCollections(),
		[],
	);

	const addMutation = useMutation({
		mutationFn: (collection: AddCollectionPayload) =>
			collectionsRepository.addCollection(collection),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, changes }: UpdateCollectionPayload) =>
			collectionsRepository.updateCollection(id, changes),
	});

	const deleteMutation = useMutation({
		mutationFn: ({ id, deleteFromAllCollections }: DeleteCollectionPayload) =>
			collectionsRepository.deleteCollection({ id, deleteFromAllCollections }),
	});

	return {
		collections: collections ?? [],
		isLoading: collections === undefined,
		addCollectionState: createMutationState(addMutation),
		updateCollectionState: createMutationState(updateMutation),
		deleteCollectionState: createMutationState(deleteMutation),

		addCollection: addMutation.mutate,
		updateCollection: updateMutation.mutate,
		deleteCollection: deleteMutation.mutate,
		addCollectionAsync: addMutation.mutateAsync,
		updateCollectionAsync: updateMutation.mutateAsync,
		deleteCollectionAsync: deleteMutation.mutateAsync,
	};
}
