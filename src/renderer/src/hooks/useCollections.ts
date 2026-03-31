import { collectionsRepository } from "@renderer/db/repositories/collectionsRepository";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import type { CollectionType } from "@/types";

export function useCollections() {
	const collections = useLiveQuery(
		() => collectionsRepository.getAllCollections(),
		[],
	);

	const addMutation = useMutation({
		mutationFn: (collection: Omit<CollectionType, "id">) =>
			collectionsRepository.addCollection(collection),
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			changes,
		}: {
			id: string;
			changes: Partial<CollectionType>;
		}) => collectionsRepository.updateCollection(id, changes),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => collectionsRepository.deleteCollection(id),
	});

	return {
		collections: collections ?? [],
		addCollection: addMutation.mutate,
		updateCollection: updateMutation.mutate,
		deleteCollection: deleteMutation.mutate,
	};
}
