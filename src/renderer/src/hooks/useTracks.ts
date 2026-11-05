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
import {
	type LiveQueryFailure,
	quarantineSignature,
	readFailureSignature,
	type TrackQuarantine,
	toTrackQuarantine,
} from "@renderer/db/utils/readDiagnostics";
import { describeThrownValue } from "@renderer/db/utils/trackRepositoryUtils";
import { SYSTEM_COLLECTION_ID } from "@shared/constants";
import type {
	AddManyOptions,
	Metadata,
	TrackChanges,
} from "@shared/schemas/track.schema";
import type { AddManyResult } from "@shared/types";
import { quarantineTracksToastMessage } from "@shared/utils";
import {
	type UseMutateAsyncFunction,
	type UseMutateFunction,
	useMutation,
} from "@tanstack/react-query";
import { useDedupedToast } from "./useDedupedToast";
import { useGuardedLiveQuery } from "./useGuardedLiveQuery";

export type AddTracksPayload = {
	tracks: Metadata[];
	options?: AddManyOptions;
};

export type UpdateTrackPayload = {
	id: string;
	changes: TrackChanges;
};

export type UpdateManyTracksPayload = UpdateTrackPayload[];

export type TrackMutationState = {
	isPending: boolean;
	isSuccess: boolean;
	isError: boolean;
	error: Error | null;
};

/**
 * Stable sonner identities of the managed read-failure channels (FE-132
 * WP-1). Exported so tests and shell code reference a single source.
 */
export const TRACK_READ_TOAST_IDS = {
	collectionRead: "tracks-read:collection",
	selectedRead: "tracks-read:selected",
	collectionQuarantine: "tracks-quarantine:collection",
	selectedQuarantine: "tracks-quarantine:selected",
} as const;

/** Scope tags correlating hook failures with the repository developer logs. */
const TRACKS_READ_SCOPE = "tracksRepository.getAll";
const SELECTED_READ_SCOPE = "tracksRepository.getSelectedTracks";

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
					? new Error(describeThrownValue(mutation.error))
					: null,
	};
}

/** Public contract of {@link useTracks}. */
export type UseTracksResult = {
	/** Active-collection tracks; guarded, deduplicated, never corrupt rows. */
	readonly tracks: Metadata[];
	/** Tracks flagged selected; guarded, deduplicated. */
	readonly selectedTracks: Metadata[];
	/** Typed failure of the collection read; `null` while healthy. */
	readonly tracksError: LiveQueryFailure | null;
	/** Typed failure of the selected-tracks read; `null` while healthy. */
	readonly selectedTracksError: LiveQueryFailure | null;
	/** Records skipped by the read guard in the collection read. */
	readonly quarantinedTracks: TrackQuarantine;
	/** Records skipped by the read guard in the selected-tracks read. */
	readonly quarantinedSelectedTracks: TrackQuarantine;
	readonly addTracksState: TrackMutationState;
	readonly updateTrackState: TrackMutationState;
	readonly updateManyTracksState: TrackMutationState;
	readonly removeTrackState: TrackMutationState;
	readonly removeManyTracksState: TrackMutationState;
	readonly isLoading: boolean;
	readonly isTracksLoading: boolean;
	readonly isSelectedTracksLoading: boolean;
	readonly addTracks: UseMutateFunction<AddManyResult, Error, AddTracksPayload>;
	readonly updateTrack: UseMutateFunction<number, Error, UpdateTrackPayload>;
	readonly updateManyTracks: UseMutateFunction<
		number,
		Error,
		UpdateManyTracksPayload
	>;
	readonly removeTrack: UseMutateFunction<void, Error, string>;
	readonly removeManyTracks: UseMutateFunction<void, Error, void>;
	readonly addTracksAsync: UseMutateAsyncFunction<
		AddManyResult,
		Error,
		AddTracksPayload
	>;
	readonly updateTrackAsync: UseMutateAsyncFunction<
		number,
		Error,
		UpdateTrackPayload
	>;
	readonly updateManyTracksAsync: UseMutateAsyncFunction<
		number,
		Error,
		UpdateManyTracksPayload
	>;
	readonly removeTrackAsync: UseMutateAsyncFunction<void, Error, string>;
	readonly removeManyTracksAsync: UseMutateAsyncFunction<void, Error, void>;
};

/**
 * Live track list for the active collection plus every track mutation the
 * table UI exposes. Queries re-run automatically when the underlying
 * IndexedDB tables change.
 *
 * @param activeCollection - Collection id to display; defaults to the
 *                           system collection (`SYSTEM_COLLECTION_ID`).
 *                           An invalid id is a managed failure state, not
 *                           a crash (the store gate in `collectionSlice`
 *                           keeps invalid ids out of Redux entirely).
 * @returns The {@link UseTracksResult} contract.
 */
export function useTracks(
	activeCollection = SYSTEM_COLLECTION_ID,
): UseTracksResult {
	const tracksQuery = useGuardedLiveQuery(
		() => tracksRepository.getAll(activeCollection),
		[activeCollection],
		TRACKS_READ_SCOPE,
	);

	const selectedQuery = useGuardedLiveQuery(
		() => tracksRepository.getSelectedTracks(),
		[],
		SELECTED_READ_SCOPE,
	);

	const addMutation = useMutation<AddManyResult, Error, AddTracksPayload>({
		mutationFn: ({ tracks, options }: AddTracksPayload) =>
			tracksRepository.addMany(tracks, options),
	});

	const updateMutation = useMutation<number, Error, UpdateTrackPayload>({
		mutationFn: ({ id, changes }: UpdateTrackPayload) =>
			tracksRepository.update(id, changes),
	});

	const updateManyMutation = useMutation<
		number,
		Error,
		UpdateManyTracksPayload
	>({
		mutationFn: (updates: UpdateManyTracksPayload) =>
			tracksRepository.updateMany(updates),
	});

	const removeMutation = useMutation<void, Error, string>({
		mutationFn: (id: string) => tracksRepository.remove(id),
	});

	const removeManyMutation = useMutation<void, Error, void>({
		mutationFn: () => tracksRepository.removeMany(),
	});

	const quarantinedTracks = toTrackQuarantine(tracksQuery.data?.quarantinedIds);

	const quarantinedSelectedTracks = toTrackQuarantine(
		selectedQuery.data?.quarantinedIds,
	);

	useDedupedToast(
		readFailureSignature(tracksQuery.failure),
		tracksQuery.failure?.message ?? null,
		"error",
		TRACK_READ_TOAST_IDS.collectionRead,
	);

	useDedupedToast(
		readFailureSignature(selectedQuery.failure),
		selectedQuery.failure?.message ?? null,
		"error",
		TRACK_READ_TOAST_IDS.selectedRead,
	);

	useDedupedToast(
		quarantineSignature(quarantinedTracks),
		quarantinedTracks.count > 0
			? quarantineTracksToastMessage(quarantinedTracks.count)
			: null,
		"warning",
		TRACK_READ_TOAST_IDS.collectionQuarantine,
	);

	useDedupedToast(
		quarantineSignature(quarantinedSelectedTracks),
		quarantinedSelectedTracks.count > 0
			? quarantineTracksToastMessage(quarantinedSelectedTracks.count)
			: null,
		"warning",
		TRACK_READ_TOAST_IDS.selectedQuarantine,
	);

	return {
		tracks: tracksQuery.data?.ok ?? [],
		selectedTracks: selectedQuery.data?.ok ?? [],
		tracksError: tracksQuery.failure,
		selectedTracksError: selectedQuery.failure,
		quarantinedTracks,
		quarantinedSelectedTracks,
		addTracksState: createMutationState(addMutation),
		updateTrackState: createMutationState(updateMutation),
		updateManyTracksState: createMutationState(updateManyMutation),
		removeTrackState: createMutationState(removeMutation),
		removeManyTracksState: createMutationState(removeManyMutation),
		isLoading: tracksQuery.isLoading || selectedQuery.isLoading,
		isTracksLoading: tracksQuery.isLoading,
		isSelectedTracksLoading: selectedQuery.isLoading,
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
