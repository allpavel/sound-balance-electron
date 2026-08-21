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
import type { Metadata } from "@shared/schemas/track.schema";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";

export type AddTracksOptions = {
	targetCollectionId?: string;
};

export type AddTracksPayload = {
	tracks: Metadata[];
	options?: AddTracksOptions;
};

export type UpdateTrackPayload = {
	id: string;
	changes: Partial<Metadata>;
};

export type UpdateManyTracksPayload = UpdateTrackPayload[];

export type TrackMutationState = {
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
}): TrackMutationState {
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
		mutationFn: ({ tracks, options }: AddTracksPayload) =>
			tracksRepository.addMany(tracks, options),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, changes }: UpdateTrackPayload) =>
			tracksRepository.update(id, changes),
	});

	const updateManyMutation = useMutation({
		mutationFn: (updates: UpdateManyTracksPayload) =>
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
		addTracksState: createMutationState(addMutation),
		updateTrackState: createMutationState(updateMutation),
		updateManyTracksState: createMutationState(updateManyMutation),
		removeTrackState: createMutationState(removeMutation),
		removeManyTracksState: createMutationState(removeManyMutation),
		isLoading: tracks === undefined || selectedTracks === undefined,
		isTracksLoading: tracks === undefined,
		isSelectedTracksLoading: selectedTracks === undefined,

		addTracks: addMutation.mutate,
		updateTrack: updateMutation.mutate,
		updateManyTracks: updateManyMutation.mutate,
		removeTrack: removeMutation.mutate,
		removeManyTracks: removeManyMutation.mutate,
		addTracksAsync: addMutation.mutateAsync,
		updateTrackAsync: updateMutation.mutateAsync,
		updateManyTracksAsync: updateManyMutation.mutateAsync,
		removeTrackAsync: removeMutation.mutateAsync,
		removeManyTracksAsync: removeManyMutation.mutateAsync,
	};
}
