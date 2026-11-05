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

// @vitest-environment jsdom
import { db } from "@renderer/db/db";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import type { GuardedTracks } from "@renderer/db/utils/readGuard";
import { resetTestState, seedCollection } from "@renderer/utils/test-utils";
import {
	SYSTEM_COLLECTION_ID,
	TRACK_READ_STORAGE_MESSAGE,
	TRACK_READ_UNKNOWN_MESSAGE,
	TRACK_READ_VALIDATION_MESSAGE,
} from "@shared/constants";
import {
	ConflictError,
	StorageUnavailableError,
	TrackValidationError,
} from "@shared/errors";
import type { Metadata } from "@shared/schemas/track.schema";
import type { AddManyResult } from "@shared/types";
import { quarantineTracksToastMessage } from "@shared/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { makeCorruptTrackRow, makeTrack } from "@tests/factories";
import { spyOnConsoleError, spyOnConsoleWarn } from "@tests/utils";
import type { PropsWithChildren } from "react";
import { toast } from "sonner";
import {
	type AddTracksPayload,
	TRACK_READ_TOAST_IDS,
	type UpdateManyTracksPayload,
	type UpdateTrackPayload,
	useTracks,
} from "./useTracks";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	});

	return function Wrapper({ children }: PropsWithChildren) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

function createDeferred<T>() {
	return Promise.withResolvers<T>();
}

async function seedTracks(tracks: Metadata[]): Promise<void> {
	await db.tracks.bulkAdd(tracks);
}

async function renderUseTracks(collection?: string) {
	const { result } = renderHook(({ collection }) => useTracks(collection), {
		wrapper: createWrapper(),
		initialProps: { collection },
	});
	await waitFor(() => expect(result.current.isLoading).toBe(false));
	return result;
}

describe("useTracks", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await resetTestState();
	});

	afterEach(() => {
		cleanup();
	});

	describe("initialization and live queries", () => {
		it("starts in a loading state with safe empty arrays", async () => {
			const { result } = renderHook(() => useTracks(), {
				wrapper: createWrapper(),
			});
			expect(result.current.tracks).toEqual([]);
			expect(result.current.selectedTracks).toEqual([]);
			expect(result.current.isLoading).toBe(true);
			expect(result.current.isTracksLoading).toBe(true);
			expect(result.current.isSelectedTracksLoading).toBe(true);
			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(result.current.tracks).toEqual([]);
			expect(result.current.selectedTracks).toEqual([]);
			expect(result.current.isTracksLoading).toBe(false);
			expect(result.current.isSelectedTracksLoading).toBe(false);
		});

		it("loads tracks for the default collection and selected tracks", async () => {
			const getAllSpy = vi.spyOn(tracksRepository, "getAll");
			const getSelectedSpy = vi.spyOn(tracksRepository, "getSelectedTracks");
			await seedTracks([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
				makeTrack({
					id: "t2",
					collectionIds: ["custom"],
				}),
				makeTrack({
					id: "t3",
					collectionIds: [SYSTEM_COLLECTION_ID],
					selected: 1,
				}),
			]);
			const { result } = renderHook(() => useTracks(), {
				wrapper: createWrapper(),
			});
			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(getAllSpy).toHaveBeenCalledWith(SYSTEM_COLLECTION_ID);
			expect(getSelectedSpy).toHaveBeenCalledWith();
			expect(result.current.tracks.map((track) => track.id).sort()).toEqual([
				"t1",
				"t3",
			]);
			expect(result.current.selectedTracks.map((track) => track.id)).toEqual([
				"t3",
			]);
		});

		it("loads tracks for a custom active collection", async () => {
			await seedTracks([
				makeTrack({
					id: "custom-track",
					collectionIds: ["custom"],
				}),
				makeTrack({
					id: "all-track",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			const result = await renderUseTracks("custom");
			expect(result.current.tracks.map((track) => track.id)).toEqual([
				"custom-track",
			]);
		});

		it("treats explicit undefined as the default collection", async () => {
			await seedTracks([
				makeTrack({
					id: "all-track",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			const result = await renderUseTracks(undefined);
			expect(result.current.tracks.map((track) => track.id)).toEqual([
				"all-track",
			]);
		});

		it("rejects an empty collection id at the repository boundary (fail-loud contract)", async () => {
			await seedTracks([
				makeTrack({
					id: "ignored-track",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			await expect(tracksRepository.getAll("")).rejects.toThrow(
				TrackValidationError,
			);
		});

		it("reports track loading and selected-track loading independently", async () => {
			const selectedDeferred = createDeferred<GuardedTracks>();
			const selectedSpy = vi
				.spyOn(tracksRepository, "getSelectedTracks")
				.mockReturnValue(selectedDeferred.promise);
			const { result } = renderHook(() => useTracks(), {
				wrapper: createWrapper(),
			});
			await waitFor(() => expect(result.current.isTracksLoading).toBe(false));
			expect(result.current.isSelectedTracksLoading).toBe(true);
			expect(result.current.isLoading).toBe(true);
			await act(async () => {
				selectedDeferred.resolve({ ok: [], quarantinedIds: [] });
			});
			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(result.current.isTracksLoading).toBe(false);
			expect(result.current.isSelectedTracksLoading).toBe(false);
			expect(selectedSpy).toHaveBeenCalledWith();
		});

		it("updates tracks live when a track is added to the active collection", async () => {
			const result = await renderUseTracks();
			expect(result.current.tracks).toEqual([]);
			await act(async () => {
				await db.tracks.add(
					makeTrack({
						id: "live-track",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
				);
			});
			await waitFor(() =>
				expect(result.current.tracks.map((track) => track.id)).toEqual([
					"live-track",
				]),
			);
		});

		it("updates selected tracks live when selection changes", async () => {
			await seedTracks([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
					selected: 0,
				}),
			]);
			const result = await renderUseTracks(undefined);
			expect(result.current.selectedTracks).toEqual([]);
			await act(async () => {
				await db.tracks.update("t1", { selected: 1 });
			});
			await waitFor(() =>
				expect(result.current.selectedTracks.map((track) => track.id)).toEqual([
					"t1",
				]),
			);
		});

		it("refetches tracks when activeCollection changes without restarting the selected-tracks query", async () => {
			await seedTracks([
				makeTrack({
					id: "all-track",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
				makeTrack({
					id: "custom-track",
					collectionIds: ["custom"],
				}),
			]);
			const getSelectedSpy = vi.spyOn(tracksRepository, "getSelectedTracks");
			const { result, rerender } = renderHook(
				({ collection }: { collection: string }) => useTracks(collection),
				{
					wrapper: createWrapper(),
					initialProps: { collection: SYSTEM_COLLECTION_ID },
				},
			);
			await waitFor(() =>
				expect(result.current.tracks.map((track) => track.id)).toEqual([
					"all-track",
				]),
			);
			const selectedCallsAfterInitialRender = getSelectedSpy.mock.calls.length;
			expect(selectedCallsAfterInitialRender).toBeGreaterThan(0);
			rerender({ collection: "custom" });
			await waitFor(() =>
				expect(result.current.tracks.map((track) => track.id)).toEqual([
					"custom-track",
				]),
			);
			expect(getSelectedSpy.mock.calls.length).toBe(
				selectedCallsAfterInitialRender,
			);
		});
	});

	describe("mutations integrated with live queries", () => {
		it("addTracksAsync persists tracks and updates visible tracks", async () => {
			await seedCollection("custom");
			const result = await renderUseTracks();
			const payload: AddTracksPayload = {
				tracks: [
					makeTrack({
						id: "added-track",
						filePath: "/music/added-track.mp3",
						collectionIds: [],
					}),
				],
				options: {
					targetCollectionId: "custom",
				},
			};
			await act(async () => {
				await result.current.addTracksAsync(payload);
			});
			await waitFor(() =>
				expect(result.current.tracks.map((track) => track.id)).toEqual([
					"added-track",
				]),
			);
			const storedTrack = await db.tracks.get("added-track");
			expect(storedTrack?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"custom",
			]);
			await waitFor(() =>
				expect(result.current.addTracksState.isSuccess).toBe(true),
			);
		});

		it("updateTrackAsync persists changes and updates selected tracks", async () => {
			await seedTracks([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
					selected: 0,
				}),
			]);
			const result = await renderUseTracks();
			expect(result.current.selectedTracks).toEqual([]);
			const payload: UpdateTrackPayload = {
				id: "t1",
				changes: {
					selected: 1,
				},
			};
			await act(async () => {
				await result.current.updateTrackAsync(payload);
			});
			await waitFor(() =>
				expect(result.current.selectedTracks.map((track) => track.id)).toEqual([
					"t1",
				]),
			);
			await waitFor(() =>
				expect(result.current.updateTrackState.isSuccess).toBe(true),
			);
		});

		it("updateManyTracksAsync persists multiple changes", async () => {
			await seedTracks([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
					selected: 0,
				}),
				makeTrack({
					id: "t2",
					collectionIds: [SYSTEM_COLLECTION_ID],
					selected: 0,
				}),
			]);
			const result = await renderUseTracks();
			expect(result.current.selectedTracks).toEqual([]);
			const payload: UpdateManyTracksPayload = [
				{
					id: "t1",
					changes: { selected: 1 },
				},
				{
					id: "t2",
					changes: { selected: 1 },
				},
			];
			await act(async () => {
				await result.current.updateManyTracksAsync(payload);
			});
			await waitFor(() =>
				expect(
					result.current.selectedTracks.map((track) => track.id).sort(),
				).toEqual(["t1", "t2"]),
			);
			await waitFor(() =>
				expect(result.current.updateManyTracksState.isSuccess).toBe(true),
			);
		});

		it("removeTrackAsync removes a track from the active collection", async () => {
			await seedTracks([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			const { result } = renderHook(() => useTracks(), {
				wrapper: createWrapper(),
			});
			await waitFor(() =>
				expect(result.current.tracks.map((track) => track.id)).toEqual(["t1"]),
			);
			await act(async () => {
				await result.current.removeTrackAsync("t1");
			});
			await waitFor(() => expect(result.current.tracks).toEqual([]));
			await waitFor(() =>
				expect(result.current.removeTrackState.isSuccess).toBe(true),
			);
		});

		it("removeManyTracksAsync removes only selected tracks", async () => {
			await seedTracks([
				makeTrack({
					id: "selected-track",
					collectionIds: [SYSTEM_COLLECTION_ID],
					selected: 1,
				}),
				makeTrack({
					id: "unselected-track",
					collectionIds: [SYSTEM_COLLECTION_ID],
					selected: 0,
				}),
			]);
			const { result } = renderHook(() => useTracks(), {
				wrapper: createWrapper(),
			});
			await waitFor(() =>
				expect(result.current.tracks.map((track) => track.id).sort()).toEqual([
					"selected-track",
					"unselected-track",
				]),
			);
			await act(async () => {
				await result.current.removeManyTracksAsync();
			});
			await waitFor(() =>
				expect(result.current.tracks.map((track) => track.id)).toEqual([
					"unselected-track",
				]),
			);
			await waitFor(() =>
				expect(result.current.removeManyTracksState.isSuccess).toBe(true),
			);
		});

		it("keeps backward-compatible fire-and-forget mutation wrappers", async () => {
			const { result } = renderHook(() => useTracks(), {
				wrapper: createWrapper(),
			});
			await waitFor(() => expect(result.current.isLoading).toBe(false));
			const payload: AddTracksPayload = {
				tracks: [
					makeTrack({
						id: "fire-and-forget-track",
						filePath: "/music/fire-and-forget-track.mp3",
						collectionIds: [],
					}),
				],
				options: {
					targetCollectionId: SYSTEM_COLLECTION_ID,
				},
			};
			act(() => {
				result.current.addTracks(payload);
			});
			await waitFor(() =>
				expect(result.current.tracks.map((track) => track.id)).toEqual([
					"fire-and-forget-track",
				]),
			);
			await act(async () => {
				await result.current.updateTrackAsync({
					id: "fire-and-forget-track",
					changes: { selected: 1 },
				});
			});
			await waitFor(() =>
				expect(result.current.selectedTracks.map((track) => track.id)).toEqual([
					"fire-and-forget-track",
				]),
			);
			act(() => {
				result.current.removeManyTracks();
			});
			await waitFor(() => expect(result.current.tracks).toEqual([]));
		});
	});

	describe("mutation lifecycle states", () => {
		it("exposes idle mutation states initially", async () => {
			const result = await renderUseTracks();
			const idleState = {
				isPending: false,
				isSuccess: false,
				isError: false,
				error: null,
			};
			expect(result.current.addTracksState).toEqual(idleState);
			expect(result.current.updateTrackState).toEqual(idleState);
			expect(result.current.updateManyTracksState).toEqual(idleState);
			expect(result.current.removeTrackState).toEqual(idleState);
			expect(result.current.removeManyTracksState).toEqual(idleState);
		});

		it("exposes pending, success, and error states for addTracks", async () => {
			const result = await renderUseTracks();
			const payload: AddTracksPayload = {
				tracks: [
					makeTrack({
						id: "lifecycle-track",
						filePath: "/music/lifecycle-track.mp3",
					}),
				],
				options: {
					targetCollectionId: SYSTEM_COLLECTION_ID,
				},
			};
			const successDeferred = createDeferred<AddManyResult>();
			const addSpy = vi
				.spyOn(tracksRepository, "addMany")
				.mockReturnValueOnce(successDeferred.promise);
			let pendingPromise!: Promise<AddManyResult>;
			act(() => {
				pendingPromise = result.current.addTracksAsync(payload);
			});
			await waitFor(() =>
				expect(result.current.addTracksState.isPending).toBe(true),
			);
			expect(result.current.addTracksState.isError).toBe(false);
			expect(result.current.addTracksState.error).toBeNull();
			await act(async () => {
				successDeferred.resolve({
					added: ["lifecycle-track"],
					merged: [],
					skipped: [],
				});
				await pendingPromise;
			});
			await waitFor(() =>
				expect(result.current.addTracksState.isPending).toBe(false),
			);
			expect(result.current.addTracksState.isSuccess).toBe(true);
			expect(result.current.addTracksState.isError).toBe(false);
			expect(result.current.addTracksState.error).toBeNull();
			const error = new Error("add failed");
			addSpy.mockRejectedValueOnce(error);
			await act(async () => {
				await expect(result.current.addTracksAsync(payload)).rejects.toThrow(
					"add failed",
				);
			});
			await waitFor(() =>
				expect(result.current.addTracksState.isError).toBe(true),
			);
			expect(result.current.addTracksState.isPending).toBe(false);
			expect(result.current.addTracksState.error).toBe(error);
		});

		it("exposes pending, success, and error states for updateTrack", async () => {
			const result = await renderUseTracks();
			const payload: UpdateTrackPayload = {
				id: "t1",
				changes: { selected: 1 },
			};
			const successDeferred = createDeferred<number>();
			const updateSpy = vi
				.spyOn(tracksRepository, "update")
				.mockReturnValueOnce(successDeferred.promise);
			let pendingPromise!: Promise<number>;
			act(() => {
				pendingPromise = result.current.updateTrackAsync(payload);
			});
			await waitFor(() =>
				expect(result.current.updateTrackState.isPending).toBe(true),
			);
			await act(async () => {
				successDeferred.resolve(1);
				await pendingPromise;
			});
			await waitFor(() =>
				expect(result.current.updateTrackState.isPending).toBe(false),
			);
			expect(result.current.updateTrackState.isSuccess).toBe(true);
			expect(result.current.updateTrackState.isError).toBe(false);
			expect(result.current.updateTrackState.error).toBeNull();
			const error = new Error("update failed");
			updateSpy.mockRejectedValueOnce(error);
			await act(async () => {
				await expect(result.current.updateTrackAsync(payload)).rejects.toThrow(
					"update failed",
				);
			});
			await waitFor(() =>
				expect(result.current.updateTrackState.isError).toBe(true),
			);
			expect(result.current.updateTrackState.error).toBe(error);
		});

		it("exposes pending, success, and error states for updateManyTracks", async () => {
			const result = await renderUseTracks();
			const payload: UpdateManyTracksPayload = [
				{
					id: "t1",
					changes: { selected: 1 },
				},
			];
			const successDeferred = createDeferred<number>();
			const updateManySpy = vi
				.spyOn(tracksRepository, "updateMany")
				.mockReturnValueOnce(successDeferred.promise);
			let pendingPromise!: Promise<number>;
			act(() => {
				pendingPromise = result.current.updateManyTracksAsync(payload);
			});
			await waitFor(() =>
				expect(result.current.updateManyTracksState.isPending).toBe(true),
			);
			await act(async () => {
				successDeferred.resolve(1);
				await pendingPromise;
			});
			await waitFor(() =>
				expect(result.current.updateManyTracksState.isPending).toBe(false),
			);
			expect(result.current.updateManyTracksState.isSuccess).toBe(true);
			expect(result.current.updateManyTracksState.isError).toBe(false);
			expect(result.current.updateManyTracksState.error).toBeNull();
			const error = new Error("update many failed");
			updateManySpy.mockRejectedValueOnce(error);
			await act(async () => {
				await expect(
					result.current.updateManyTracksAsync(payload),
				).rejects.toThrow("update many failed");
			});
			await waitFor(() =>
				expect(result.current.updateManyTracksState.isError).toBe(true),
			);
			expect(result.current.updateManyTracksState.error).toBe(error);
		});

		it("exposes pending, success, and error states for removeTrack", async () => {
			const result = await renderUseTracks();
			const successDeferred = createDeferred<void>();
			const removeSpy = vi
				.spyOn(tracksRepository, "remove")
				.mockReturnValueOnce(successDeferred.promise);
			let pendingPromise!: Promise<void>;
			act(() => {
				pendingPromise = result.current.removeTrackAsync("t1");
			});
			await waitFor(() =>
				expect(result.current.removeTrackState.isPending).toBe(true),
			);
			await act(async () => {
				successDeferred.resolve(undefined);
				await pendingPromise;
			});
			await waitFor(() =>
				expect(result.current.removeTrackState.isPending).toBe(false),
			);
			expect(result.current.removeTrackState.isSuccess).toBe(true);
			expect(result.current.removeTrackState.isError).toBe(false);
			expect(result.current.removeTrackState.error).toBeNull();
			const error = new Error("remove failed");
			removeSpy.mockRejectedValueOnce(error);
			await act(async () => {
				await expect(result.current.removeTrackAsync("t1")).rejects.toThrow(
					"remove failed",
				);
			});
			await waitFor(() =>
				expect(result.current.removeTrackState.isError).toBe(true),
			);
			expect(result.current.removeTrackState.error).toBe(error);
		});

		it("exposes pending, success, and error states for removeManyTracks", async () => {
			const result = await renderUseTracks();
			const successDeferred = createDeferred<void>();
			const removeManySpy = vi
				.spyOn(tracksRepository, "removeMany")
				.mockReturnValueOnce(successDeferred.promise);
			let pendingPromise!: Promise<void>;
			act(() => {
				pendingPromise = result.current.removeManyTracksAsync();
			});
			await waitFor(() =>
				expect(result.current.removeManyTracksState.isPending).toBe(true),
			);
			await act(async () => {
				successDeferred.resolve(undefined);
				await pendingPromise;
			});
			await waitFor(() =>
				expect(result.current.removeManyTracksState.isPending).toBe(false),
			);
			expect(result.current.removeManyTracksState.isSuccess).toBe(true);
			expect(result.current.removeManyTracksState.isError).toBe(false);
			expect(result.current.removeManyTracksState.error).toBeNull();
			const error = new Error("remove many failed");
			removeManySpy.mockRejectedValueOnce(error);
			await act(async () => {
				await expect(result.current.removeManyTracksAsync()).rejects.toThrow(
					"remove many failed",
				);
			});
			await waitFor(() =>
				expect(result.current.removeManyTracksState.isError).toBe(true),
			);
			expect(result.current.removeManyTracksState.error).toBe(error);
		});

		it("forwards onProgress and batchSize to tracksRepository.addMany (F-12.8)", async () => {
			const result = await renderUseTracks();
			const onProgress = vi.fn();
			const payload: AddTracksPayload = {
				tracks: [
					makeTrack({ id: "fwd-track", filePath: "/music/fwd-track.mp3" }),
				],
				options: {
					onProgress,
					batchSize: 2,
					targetCollectionId: SYSTEM_COLLECTION_ID,
				},
			};
			const addSpy = vi
				.spyOn(tracksRepository, "addMany")
				.mockResolvedValue({ added: [], merged: [], skipped: [] });
			await act(async () => {
				await result.current.addTracksAsync(payload);
			});
			expect(addSpy).toHaveBeenCalledTimes(1);
			expect(addSpy).toHaveBeenCalledWith(
				payload.tracks,
				expect.objectContaining({ onProgress, batchSize: 2 }),
			);
		});
	});

	describe("error propagation", () => {
		it("propagates repository validation errors from addTracksAsync", async () => {
			const result = await renderUseTracks();
			const payload: AddTracksPayload = {
				tracks: [
					makeTrack({
						id: "duplicate-id",
						filePath: "/music/a.mp3",
					}),
					makeTrack({
						id: "duplicate-id",
						filePath: "/music/b.mp3",
					}),
				],
				options: {
					targetCollectionId: SYSTEM_COLLECTION_ID,
				},
			};
			await act(async () => {
				await expect(result.current.addTracksAsync(payload)).rejects.toThrow(
					ConflictError,
				);
			});
			await waitFor(() =>
				expect(result.current.addTracksState.isError).toBe(true),
			);
			expect(result.current.addTracksState.isPending).toBe(false);
			expect(result.current.addTracksState.error).toBeInstanceOf(ConflictError);
		});

		it("propagates repository validation errors from updateTrackAsync", async () => {
			const result = await renderUseTracks();
			const payload: UpdateTrackPayload = {
				id: "",
				changes: { selected: 1 },
			};
			await act(async () => {
				await expect(result.current.updateTrackAsync(payload)).rejects.toThrow(
					TrackValidationError,
				);
			});
			await waitFor(() =>
				expect(result.current.updateTrackState.isError).toBe(true),
			);
			expect(result.current.updateTrackState.isPending).toBe(false);
			expect(result.current.updateTrackState.error).toBeInstanceOf(
				TrackValidationError,
			);
		});
	});

	describe("managed read-failure surface", () => {
		it("exposes a typed validation failure through the hook instead of crashing render", async () => {
			spyOnConsoleError();
			await seedTracks([
				makeTrack({
					id: "sel-1",
					selected: 1,
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			const result = await renderUseTracks("");
			expect(result.current.tracks).toEqual([]);
			expect(result.current.tracksError).toMatchObject({
				kind: "validation",
				scope: "tracksRepository.getAll",
				detail: "id",
			});
			expect(result.current.tracksError?.message).toBe(
				TRACK_READ_VALIDATION_MESSAGE,
			);
			expect(result.current.selectedTracksError).toBeNull();
			expect(result.current.selectedTracks.map((t) => t.id)).toEqual(["sel-1"]);
			expect(result.current.isLoading).toBe(false);
			expect(toast.error).toHaveBeenCalledWith(TRACK_READ_VALIDATION_MESSAGE, {
				id: TRACK_READ_TOAST_IDS.collectionRead,
			});
		});

		it("classifies a domain storage failure as the storage kind", async () => {
			spyOnConsoleError();
			vi.spyOn(tracksRepository, "getAll").mockRejectedValue(
				new StorageUnavailableError("Database operation failed: closed"),
			);
			const result = await renderUseTracks();
			expect(result.current.tracksError?.kind).toBe("storage");
			expect(result.current.tracksError?.message).toBe(
				TRACK_READ_STORAGE_MESSAGE,
			);
			expect(result.current.tracks).toEqual([]);
			expect(toast.error).toHaveBeenCalledWith(TRACK_READ_STORAGE_MESSAGE, {
				id: TRACK_READ_TOAST_IDS.collectionRead,
			});
		});

		it("routes an engine DB-open failure into the same managed surface", async () => {
			spyOnConsoleError();
			const engineError = new Error("Failed to open database");
			engineError.name = "OpenFailedError";
			vi.spyOn(tracksRepository, "getAll").mockRejectedValue(engineError);
			const result = await renderUseTracks();
			expect(result.current.tracksError).toMatchObject({
				kind: "storage",
				detail: "OpenFailedError",
			});
			expect(toast.error).toHaveBeenCalledWith(TRACK_READ_STORAGE_MESSAGE, {
				id: TRACK_READ_TOAST_IDS.collectionRead,
			});
		});

		it("never leaks raw error text through an unknown failure", async () => {
			spyOnConsoleError();
			vi.spyOn(tracksRepository, "getAll").mockRejectedValue(
				new Error("C:/secret/library blew up"),
			);
			const result = await renderUseTracks();
			expect(result.current.tracksError?.kind).toBe("unknown");
			expect(result.current.tracksError?.message).toBe(
				TRACK_READ_UNKNOWN_MESSAGE,
			);
			expect(result.current.tracksError?.message).not.toContain("secret");
			expect(result.current.tracksError?.detail).toBe("Error");
		});

		it("reports a selected-tracks read failure on its own channel", async () => {
			spyOnConsoleError();
			vi.spyOn(tracksRepository, "getSelectedTracks").mockRejectedValue(
				new StorageUnavailableError("Database operation failed: closed"),
			);
			const result = await renderUseTracks();
			expect(result.current.selectedTracksError?.kind).toBe("storage");
			expect(result.current.tracksError).toBeNull();
			expect(result.current.isSelectedTracksLoading).toBe(false);
			expect(toast.error).toHaveBeenCalledWith(TRACK_READ_STORAGE_MESSAGE, {
				id: TRACK_READ_TOAST_IDS.selectedRead,
			});
		});

		it("recovers to a healthy state when the active collection changes after a failure", async () => {
			spyOnConsoleError();
			await seedTracks([
				makeTrack({ id: "custom-track", collectionIds: ["custom"] }),
			]);
			vi.spyOn(tracksRepository, "getAll").mockRejectedValueOnce(
				new StorageUnavailableError("Database operation failed: closed"),
			);
			const { result, rerender } = renderHook(
				({ collection }: { collection: string }) => useTracks(collection),
				{
					wrapper: createWrapper(),
					initialProps: { collection: SYSTEM_COLLECTION_ID },
				},
			);
			await waitFor(() =>
				expect(result.current.tracksError?.kind).toBe("storage"),
			);
			expect(toast.error).toHaveBeenCalledTimes(1);
			rerender({ collection: "custom" });
			await waitFor(() => expect(result.current.tracksError).toBeNull());
			expect(result.current.tracks.map((t) => t.id)).toEqual(["custom-track"]);
		});

		it("maps a non-Error mutation rejection into a safe Error without hostile toString (W1-3)", async () => {
			spyOnConsoleError();
			const hostile = {
				toString(): never {
					throw new Error("toString trap");
				},
			};
			vi.spyOn(tracksRepository, "remove").mockRejectedValue(hostile);
			const result = await renderUseTracks();
			await act(async () => {
				result.current.removeTrack("t1");
			});
			await waitFor(() =>
				expect(result.current.removeTrackState.isError).toBe(true),
			);
			expect(result.current.removeTrackState.error).toBeInstanceOf(Error);
			expect(result.current.removeTrackState.error?.message).toBe("unknown");
		});
	});

	describe("quarantine visibility", () => {
		it("surfaces quarantined rows through state and a single deduped toast", async () => {
			const warnSpy = spyOnConsoleWarn();
			await seedTracks([
				makeTrack({ id: "ok", collectionIds: [SYSTEM_COLLECTION_ID] }),
			]);
			await db.table("tracks").add(makeCorruptTrackRow("corrupt-1"));
			const result = await renderUseTracks();
			await waitFor(() =>
				expect(result.current.quarantinedTracks.count).toBe(1),
			);
			expect(result.current.quarantinedTracks.ids).toEqual(["corrupt-1"]);
			expect(result.current.tracks.map((t) => t.id)).toEqual(["ok"]);
			expect(toast.warning).toHaveBeenCalledTimes(1);
			expect(toast.warning).toHaveBeenCalledWith(
				quarantineTracksToastMessage(1),
				{ id: TRACK_READ_TOAST_IDS.collectionQuarantine },
			);
			expect(warnSpy).toHaveBeenCalled();
			await act(async () => {
				await db.tracks.add(
					makeTrack({ id: "ok-2", collectionIds: [SYSTEM_COLLECTION_ID] }),
				);
			});
			await waitFor(() => expect(result.current.tracks).toHaveLength(2));
			expect(result.current.quarantinedTracks.count).toBe(1);
			expect(toast.warning).toHaveBeenCalledTimes(1);
			await act(async () => {
				await db.table("tracks").delete("corrupt-1");
			});
			await waitFor(() =>
				expect(result.current.quarantinedTracks.count).toBe(0),
			);
			await act(async () => {
				await db.table("tracks").add(makeCorruptTrackRow("corrupt-2"));
			});
			await waitFor(() =>
				expect(result.current.quarantinedTracks.count).toBe(1),
			);
			expect(result.current.quarantinedTracks.ids).toEqual(["corrupt-2"]);
			expect(toast.warning).toHaveBeenCalledTimes(2);
			expect(toast.warning).toHaveBeenLastCalledWith(
				quarantineTracksToastMessage(1),
				{ id: TRACK_READ_TOAST_IDS.collectionQuarantine },
			);
		});

		it("reports selected-track quarantine under its own toast identity", async () => {
			spyOnConsoleWarn();
			await db
				.table("tracks")
				.add(makeCorruptTrackRow("corrupt-sel", { selected: 1 }));
			const result = await renderUseTracks();
			await waitFor(() =>
				expect(result.current.quarantinedSelectedTracks.count).toBe(1),
			);
			expect(result.current.quarantinedSelectedTracks.ids).toEqual([
				"corrupt-sel",
			]);
			expect(result.current.quarantinedTracks.count).toBe(1);
			expect(toast.warning).toHaveBeenCalledWith(
				quarantineTracksToastMessage(1),
				{ id: TRACK_READ_TOAST_IDS.selectedQuarantine },
			);
			expect(toast.warning).toHaveBeenCalledWith(
				quarantineTracksToastMessage(1),
				{ id: TRACK_READ_TOAST_IDS.collectionQuarantine },
			);
			expect(toast.warning).toHaveBeenCalledTimes(2);
		});

		it("reports a clean read with zero quarantine state and no warning toast", async () => {
			spyOnConsoleWarn();
			await seedTracks([
				makeTrack({ id: "ok", collectionIds: [SYSTEM_COLLECTION_ID] }),
			]);
			const result = await renderUseTracks();
			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(result.current.quarantinedTracks).toEqual({ count: 0, ids: [] });
			expect(result.current.quarantinedSelectedTracks).toEqual({
				count: 0,
				ids: [],
			});
			expect(toast.warning).not.toHaveBeenCalled();
		});
	});
});
