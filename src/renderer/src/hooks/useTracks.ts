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
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import type { Metadata } from "@/types";

export function useTracks(activeCollection = "all") {
	const tracks = useLiveQuery(
		() => tracksRepository.getAll(activeCollection),
		[activeCollection],
	);
	const selectedTracks = useLiveQuery(
		() => tracksRepository.getSelectedTracks(),
		[],
	);

	const addMutation = useMutation({
		mutationFn: ({
			tracks,
			options,
		}: {
			tracks: Metadata[];
			options: { allKeys?: boolean; targetCollectionId: string };
		}) => tracksRepository.addMany(tracks, options),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, changes }: { id: string; changes: Partial<Metadata> }) =>
			tracksRepository.update(id, changes),
	});

	const updateManyMutation = useMutation({
		mutationFn: (updates: { id: string; changes: Partial<Metadata> }[]) =>
			tracksRepository.updateMany(updates),
	});

	const removeMutation = useMutation({
		mutationFn: (id: string) => tracksRepository.remove(id),
	});

	const removeManyMutation = useMutation({
		mutationFn: () => tracksRepository.removeMany(),
	});

	return {
		tracks: tracks ?? [],
		selectedTracks: selectedTracks ?? [],
		isLoading: tracks === undefined,

		addTracks: addMutation.mutate,
		updateTrack: updateMutation.mutate,
		updateManyTracks: updateManyMutation.mutate,
		removeTrack: removeMutation.mutate,
		removeManyTracks: removeManyMutation.mutate,
	};
}
