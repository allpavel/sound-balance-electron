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

import { db } from "@renderer/db/db";
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import {
	resetDatabase,
	resetTestState,
	seedCollection,
} from "@renderer/utils/test-utils";
import {
	IMPORT_BATCH_SIZE,
	MAX_IMPORT_BATCH_SIZE,
	STATUS_VALUES,
	SYSTEM_COLLECTION_ID,
} from "@shared/constants";
import {
	ConflictError,
	ImportAbortedError,
	ReferentialIntegrityError,
	StorageCapacityError,
	TrackValidationError,
} from "@shared/errors";
import type { Metadata, Status } from "@shared/schemas/track.schema";
import type { AddManyProgress, AddManyResult } from "@shared/types";
import { configurePlatform, resetPlatform } from "@shared/utils";
import { LEGAL_TRANSITION_EDGES } from "@shared/utils/isLegalStatusTransition";
import { makeIngestionTrack, makeTrack } from "@tests/factories";

vi.mock("@shared/utils", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@shared/utils")>();
	return {
		...actual,
		normalizeFilePath: (filePath: string): string => filePath.toLowerCase(),
	};
});

/** Seeds a row in the given status. "failed" requires a reason (schema
 *  invariant), supplied once here for the whole suite.
 */
async function seedTrackWithStatus(id: string, status: Status): Promise<void> {
	const overrides = {
		status,
		...(status === "failed" ? { reason: "seed failure" } : {}),
	} as Partial<Metadata>;
	await db.tracks.add(makeTrack({ id, ...overrides }));
}

/**
 * Builds a shape-valid status-change payload for the target status.
 */
function statusChange(to: Status, seq?: number): Record<string, unknown> {
	const base = seq === undefined ? { status: to } : { status: to, seq };
	return to === "failed" ? { ...base, reason: "processing failed" } : base;
}

/**
 * Asserts all three lanes of an {@link AddManyResult} in a single call,
 * reducing boilerplate across the addMany test suite.
 *
 * @param result   – The actual result returned by `addMany`.
 * @param expected – Partial expectation; omitted lanes are not checked.
 */
function expectAddManyResult(
	result: AddManyResult,
	expected: Partial<AddManyResult>,
): void {
	if (expected.added !== undefined) {
		expect(result.added).toEqual(expected.added);
	}
	if (expected.merged !== undefined) {
		expect(result.merged).toEqual(expected.merged);
	}
	if (expected.skipped !== undefined) {
		expect(result.skipped).toEqual(expected.skipped);
	}
}

/**
 * Awaits an operation that must reject and returns the thrown value for
 * type-safe inspection.
 *
 * An unexpected resolution fails the test with an explicit diagnostic; any
 * rejection value is returned untouched (never filtered), so subsequent
 * instance assertions report the actual error in their failure output.
 *
 * @param operation - The promise expected to reject.
 * @returns The rejection value, exactly as thrown.
 */
async function captureRejection(operation: Promise<unknown>): Promise<unknown> {
	let rejected = false;
	let thrown: unknown;
	try {
		await operation;
	} catch (error: unknown) {
		rejected = true;
		thrown = error;
	}
	expect(rejected, "expected the operation to reject, but it resolved").toBe(
		true,
	);
	return thrown;
}

/**
 * Awaits an operation that must fail with `ImportAbortedError` and returns
 * the error, so callers can assert on `partial`, `progress`, and `cause`
 * with full type safety.
 *
 * @param operation - The promise expected to reject with `ImportAbortedError`.
 * @returns The thrown error, narrowed to `ImportAbortedError`.
 */
async function expectImportAborted(
	operation: Promise<unknown>,
): Promise<ImportAbortedError> {
	const thrown = await captureRejection(operation);
	expect(thrown).toBeInstanceOf(ImportAbortedError);
	if (!(thrown instanceof ImportAbortedError)) {
		throw thrown;
	}
	return thrown;
}

describe("tracksRepository", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	describe("getAll", () => {
		it("returns only tracks whose collectionIds include the given id", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", collectionIds: [SYSTEM_COLLECTION_ID, "x"] }),
				makeTrack({ id: "t2", collectionIds: ["x"] }),
				makeTrack({ id: "t3", collectionIds: [SYSTEM_COLLECTION_ID] }),
			]);
			expect(
				(await tracksRepository.getAll(SYSTEM_COLLECTION_ID))
					.map((t) => t.id)
					.sort(),
			).toEqual(["t1", "t3"]);
		});

		it("returns an empty array when no tracks match", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", collectionIds: [SYSTEM_COLLECTION_ID] }),
			]);
			expect(await tracksRepository.getAll("none")).toEqual([]);
		});

		it("returns an empty array when the table is empty", async () => {
			expect(await tracksRepository.getAll(SYSTEM_COLLECTION_ID)).toEqual([]);
		});
	});

	describe("getById", () => {
		it("returns the track when it exists", async () => {
			await db.tracks.add(makeTrack({ id: "t1" }));
			expect(await tracksRepository.getById("t1")).toMatchObject({ id: "t1" });
		});

		it("returns undefined when no track matches", async () => {
			expect(await tracksRepository.getById("missing")).toBeUndefined();
		});
	});

	describe("addMany", () => {
		it("adds new tracks to the 'all' collection and returns their ids", async () => {
			const result: AddManyResult = await tracksRepository.addMany(
				[
					makeTrack({ id: "a", collectionIds: [] }),
					makeTrack({ id: "b", collectionIds: [] }),
				],
				{ targetCollectionId: SYSTEM_COLLECTION_ID },
			);
			expectAddManyResult(result, {
				added: ["a", "b"],
				merged: [],
				skipped: [],
			});
			expect(
				(await db.tracks.toArray()).map((t) => t.collectionIds).sort(),
			).toEqual([[SYSTEM_COLLECTION_ID], [SYSTEM_COLLECTION_ID]]);
		});

		it("adds new tracks to a specific collection and auto-includes 'all'", async () => {
			await seedCollection("mix1");
			await tracksRepository.addMany(
				[makeTrack({ id: "a", collectionIds: [] })],
				{ targetCollectionId: "mix1" },
			);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("preserves pre-existing collectionIds and appends 'all' + target", async () => {
			await seedCollection("preexisting");
			await seedCollection("mix1");
			await tracksRepository.addMany(
				[makeTrack({ id: "a", collectionIds: ["preexisting"] })],
				{ targetCollectionId: "mix1" },
			);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				"preexisting",
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("appends targetCollectionId to an existing track that lacks it", async () => {
			await seedCollection("mix1");
			await db.tracks.add(
				makeTrack({
					id: "a",
					filePath: "/music/a.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			const result = await tracksRepository.addMany(
				[
					makeTrack({
						id: "a",
						filePath: "/music/a.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
				],
				{ targetCollectionId: "mix1" },
			);
			expectAddManyResult(result, {
				added: [],
				merged: ["a"],
				skipped: [],
			});
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("does not modify an existing track that already has the targetCollectionId", async () => {
			await seedCollection("mix1");
			await db.tracks.add(
				makeTrack({
					id: "a",
					filePath: "/music/a.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
			);
			const result = await tracksRepository.addMany(
				[
					makeTrack({
						id: "a",
						filePath: "/music/a.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
					}),
				],
				{ targetCollectionId: "mix1" },
			);
			expectAddManyResult(result, {
				added: [],
				merged: [],
				skipped: ["a"],
			});
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("handles a mixed batch: new, update, and no-op together", async () => {
			await seedCollection("mix1");
			await db.tracks.add(
				makeTrack({
					id: "exists",
					filePath: "/music/exists.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await db.tracks.add(
				makeTrack({
					id: "noop",
					filePath: "/music/noop.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
			);
			const result = await tracksRepository.addMany(
				[
					makeTrack({
						id: "new1",
						filePath: "/music/new1.mp3",
						collectionIds: [],
					}),
					makeTrack({
						id: "exists",
						filePath: "/music/exists.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
					makeTrack({
						id: "noop",
						filePath: "/music/noop.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
					}),
				],
				{ targetCollectionId: "mix1" },
			);
			expectAddManyResult(result, {
				added: ["new1"],
				merged: ["exists"],
				skipped: ["noop"],
			});
			expect((await db.tracks.get("new1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect((await db.tracks.get("exists"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect((await db.tracks.get("noop"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("matches existing tracks by filePath, not by id", async () => {
			await seedCollection("mix1");
			await db.tracks.add(
				makeTrack({
					id: "orig",
					filePath: "/music/same.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			const result = await tracksRepository.addMany(
				[
					makeTrack({
						id: "different-id",
						filePath: "/music/same.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
				],
				{ targetCollectionId: "mix1" },
			);
			expectAddManyResult(result, {
				added: [],
				merged: ["orig"],
				skipped: [],
			});
			const rows = await db.tracks.toArray();
			expect(rows).toHaveLength(1);
			expect(rows[0]?.id).toBe("orig");
			expect(rows[0]?.collectionIds).toEqual([SYSTEM_COLLECTION_ID, "mix1"]);
		});

		it("returns an empty result for an empty input and writes nothing", async () => {
			const result = await tracksRepository.addMany([], {
				targetCollectionId: SYSTEM_COLLECTION_ID,
			});
			expect(result).toEqual({
				added: [],
				merged: [],
				skipped: [],
			});
			expect(await db.tracks.count()).toBe(0);
		});

		it("folds exact duplicate filePaths within the same batch (first-wins)", async () => {
			const result = await tracksRepository.addMany(
				[
					makeTrack({ id: "a", filePath: "/music/same.mp3" }),
					makeTrack({ id: "b", filePath: "/music/same.mp3" }),
				],
				{ targetCollectionId: SYSTEM_COLLECTION_ID },
			);
			expect(result.added).toEqual(["a"]);
			expect(result.merged).toEqual([]);
			expect(result.skipped).toEqual(["b"]);
			expect(await db.tracks.count()).toBe(1);
		});

		it("rejects duplicate track ids within the same batch", async () => {
			await expect(
				tracksRepository.addMany([
					makeTrack({ id: "dup", filePath: "/music/a.mp3" }),
					makeTrack({ id: "dup", filePath: "/music/b.mp3" }),
				]),
			).rejects.toThrow(ConflictError);
			expect(await db.tracks.count()).toBe(0);
		});

		it("reports the correct index and field in the duplicate-id error", async () => {
			const err = await captureRejection(
				tracksRepository.addMany([
					makeIngestionTrack({ id: "x", filePath: "/music/1.mp3" }),
					makeIngestionTrack({ id: "y", filePath: "/music/2.mp3" }),
					makeIngestionTrack({ id: "x", filePath: "/music/3.mp3" }),
				]),
			);
			expect(err).toBeInstanceOf(ConflictError);
			if (err instanceof ConflictError) {
				expect(err.message).toContain("tracks[2].id");
				expect(err.message).toContain("duplicate id");
			}
		});

		it("handles >500 tracks via chunked anyOf without data loss", async () => {
			const TRACK_COUNT = 1_200;
			const bigBatch: Metadata[] = Array.from({ length: TRACK_COUNT }, (_, i) =>
				makeTrack({ id: `t-${i}`, filePath: `/music/t-${i}.mp3` }),
			);

			const result = await tracksRepository.addMany(bigBatch);
			expect(result.added).toHaveLength(TRACK_COUNT);
			expect(result.merged).toHaveLength(0);
			expect(result.skipped).toHaveLength(0);
			expect(await db.tracks.count()).toBe(TRACK_COUNT);
		});

		it("correctly merges when a large batch partially overlaps the DB", async () => {
			await seedCollection("merge-target");
			const existingTracks: Metadata[] = Array.from({ length: 100 }, (_, i) =>
				makeTrack({ id: `e-${i}`, filePath: `/music/e-${i}.mp3` }),
			);
			await db.tracks.bulkAdd(existingTracks);
			const batch: Metadata[] = Array.from({ length: 600 }, (_, i) =>
				i < 100
					? makeTrack({ id: `new-id-${i}`, filePath: `/music/e-${i}.mp3` })
					: makeTrack({ id: `n-${i}`, filePath: `/music/n-${i}.mp3` }),
			);
			const result = await tracksRepository.addMany(batch, {
				targetCollectionId: "merge-target",
			});
			expect(result.added).toHaveLength(500);
			expect(result.merged).toHaveLength(100);
			expect(result.skipped).toHaveLength(0);
		});

		it("rejects tracks referencing a non-existent targetCollectionId", async () => {
			await expect(
				tracksRepository.addMany([makeTrack({ id: "a", collectionIds: [] })], {
					targetCollectionId: "ghost-collection",
				}),
			).rejects.toThrow(ReferentialIntegrityError);

			expect(await db.tracks.count()).toBe(0);
		});

		it("rejects tracks whose collectionIds reference a non-existent collection", async () => {
			await expect(
				tracksRepository.addMany(
					[makeTrack({ id: "a", collectionIds: ["nonexistent"] })],
					{ targetCollectionId: SYSTEM_COLLECTION_ID },
				),
			).rejects.toThrow(ReferentialIntegrityError);

			expect(await db.tracks.count()).toBe(0);
		});

		it("reports the missing collection ids in the error", async () => {
			const err = await captureRejection(
				tracksRepository.addMany(
					[
						makeIngestionTrack({
							id: "a",
							collectionIds: ["ghost-a", "ghost-b"],
						}),
					],
					{ targetCollectionId: SYSTEM_COLLECTION_ID },
				),
			);
			expect(err).toBeInstanceOf(ReferentialIntegrityError);
			if (err instanceof ReferentialIntegrityError) {
				expect(err.message).toContain("ghost-a");
				expect(err.message).toContain("ghost-b");
			}
		});

		it("accepts SYSTEM_COLLECTION_ID without explicit seeding (always exists)", async () => {
			const result = await tracksRepository.addMany(
				[makeTrack({ id: "a", collectionIds: [] })],
				{ targetCollectionId: SYSTEM_COLLECTION_ID },
			);
			expect(result.added).toEqual(["a"]);
		});

		it("rejects a payload referencing a non-existent collection before any write", async () => {
			await seedCollection("valid-col");
			await expect(
				tracksRepository.addMany(
					[
						makeTrack({ id: "a", collectionIds: ["valid-col"] }),
						makeTrack({ id: "b", collectionIds: ["ghost"] }),
					],
					{ targetCollectionId: SYSTEM_COLLECTION_ID },
				),
			).rejects.toThrow(ReferentialIntegrityError);
			expect(await db.tracks.count()).toBe(0);
		});

		it("maps QuotaExceededError to ImportAbortedError wrapping StorageCapacityError", async () => {
			const quotaError = new DOMException(
				"Storage quota exceeded",
				"QuotaExceededError",
			);
			vi.spyOn(db.tracks, "bulkAdd").mockRejectedValueOnce(quotaError);
			const aborted = await expectImportAborted(
				tracksRepository.addMany([makeIngestionTrack({ id: "wrap-test" })]),
			);
			expect(aborted.cause).toBeInstanceOf(StorageCapacityError);
			expect(aborted.progress.total).toBe(1);
			expect(aborted.progress.processed).toBe(0);
		});

		it("in-batch filePath duplicate is folded (first-wins, skipped)", async () => {
			const result = await tracksRepository.addMany([
				makeTrack({ id: "a", filePath: "/music/dup.mp3" }),
				makeTrack({ id: "b", filePath: "/music/dup.mp3" }),
			]);
			expect(result.added).toEqual(["a"]);
			expect(result.merged).toEqual([]);
			expect(result.skipped).toEqual(["b"]);
			expect(await db.tracks.count()).toBe(1);
		});

		it("DB filePath collision is a merge (user re-add), not a rejection", async () => {
			await seedCollection("re-add-target");
			await db.tracks.add(
				makeTrack({
					id: "existing",
					filePath: "/music/song.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			const result = await tracksRepository.addMany(
				[
					makeTrack({
						id: "new-id",
						filePath: "/music/song.mp3",
						collectionIds: [],
					}),
				],
				{ targetCollectionId: "re-add-target" },
			);
			expect(result.added).toEqual([]);
			expect(result.merged).toEqual(["existing"]);
			expect(await db.tracks.count()).toBe(1);
		});
	});

	describe("addMany - batch processing and progress", () => {
		beforeEach(async () => {
			await resetDatabase();
		});

		it("respects custom batchSize option for chunking", async () => {
			const tracks: Metadata[] = Array.from({ length: 10 }, (_, i) =>
				makeTrack({ id: `t-${i}`, filePath: `/music/t-${i}.mp3` }),
			);
			const progressCalls: AddManyProgress[] = [];
			await tracksRepository.addMany(tracks, {
				batchSize: 4,
				onProgress: (p) => progressCalls.push(p),
			});
			expect(progressCalls).toHaveLength(3);
			expect(progressCalls[0]?.processed).toBe(4);
			expect(progressCalls[1]?.processed).toBe(8);
			expect(progressCalls[2]?.processed).toBe(10);
			expect(await db.tracks.count()).toBe(10);
		});

		it("does not invoke onProgress if the input array is empty", async () => {
			const onProgress = vi.fn();
			await tracksRepository.addMany([], { onProgress });
			expect(onProgress).not.toHaveBeenCalled();
		});

		it("preserves added+merged+skipped === processed at every emission (F-12.7)", async () => {
			await seedCollection("mix1");
			await db.tracks.bulkAdd([
				makeTrack({
					id: "skip-me",
					filePath: "/music/skip-me.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
				makeTrack({
					id: "merge-me",
					filePath: "/music/merge-me.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			const emissions: AddManyProgress[] = [];
			const payload = [
				makeTrack({
					id: "skip-me",
					filePath: "/music/skip-me.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
				makeTrack({
					id: "merge-me",
					filePath: "/music/merge-me.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
				makeTrack({
					id: "new1",
					filePath: "/music/new1.mp3",
					collectionIds: [],
				}),
				makeTrack({
					id: "dup2",
					filePath: "/music/new1.mp3",
					collectionIds: [],
				}),
			];
			await tracksRepository.addMany(payload, {
				batchSize: 1,
				targetCollectionId: "mix1",
				onProgress: (p) => emissions.push(p),
			});
			expect(emissions.length).toBe(3);
			for (const p of emissions) {
				expect(p.added + p.merged + p.skipped).toBe(p.processed);
			}
			const last = emissions[emissions.length - 1];
			expect(last?.processed).toBe(payload.length);
			expect(last?.added).toBe(1);
			expect(last?.merged).toBe(1);
			expect(last?.skipped).toBe(2);
		});

		it("emits a structured completion log with summary, duration, and batch count (F-08)", async () => {
			const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
			try {
				const tracks = [
					makeTrack({ id: "a", filePath: "/music/a.mp3", collectionIds: [] }),
					makeTrack({ id: "b", filePath: "/music/b.mp3", collectionIds: [] }),
				];
				await tracksRepository.addMany(tracks, {
					batchSize: 1,
					targetCollectionId: SYSTEM_COLLECTION_ID,
				});
				const call = infoSpy.mock.calls.find(
					(c) => typeof c[0] === "string" && c[0].includes("import complete"),
				);
				expect(call).toBeDefined();
				const payload = call?.[1];
				expect(payload?.summary).toEqual(
					expect.objectContaining({
						total: 2,
						added: 2,
						merged: 0,
						skipped: 0,
					}),
				);
				expect(payload?.batchCount).toBe(2);
				expect(payload?.total).toBe(2);
				expect(typeof payload?.durationMs).toBe("number");
			} finally {
				infoSpy.mockRestore();
			}
		});

		it("invokes onProgress callback with cumulative counts after each batch", async () => {
			const TRACK_COUNT = 1200;
			const bigBatch: Metadata[] = Array.from({ length: TRACK_COUNT }, (_, i) =>
				makeTrack({ id: `t-${i}`, filePath: `/music/t-${i}.mp3` }),
			);
			const progressCalls: AddManyProgress[] = [];
			const onProgress = (progress: AddManyProgress) => {
				progressCalls.push(progress);
			};
			await tracksRepository.addMany(bigBatch, { onProgress });
			const expectedBatchCount = Math.ceil(TRACK_COUNT / IMPORT_BATCH_SIZE);
			const firstBatchSize = Math.min(IMPORT_BATCH_SIZE, TRACK_COUNT);
			expect(progressCalls).toHaveLength(expectedBatchCount);
			expect(progressCalls[0]).toEqual({
				processed: firstBatchSize,
				total: TRACK_COUNT,
				added: firstBatchSize,
				merged: 0,
				skipped: 0,
			});
			expect(progressCalls[expectedBatchCount - 1]).toEqual({
				processed: TRACK_COUNT,
				total: TRACK_COUNT,
				added: TRACK_COUNT,
				merged: 0,
				skipped: 0,
			});
		});
	});

	describe("addMany — case-variant filePath dedupe", () => {
		beforeEach(async () => {
			configurePlatform("win32");
			await resetDatabase();
		});

		afterEach(() => resetPlatform());

		it("merges a case-variant re-import onto the existing row (single INV-8 row)", async () => {
			await tracksRepository.addMany(
				[
					makeTrack({
						id: "a",
						filePath: "C:/A.MP3",
						collectionIds: [],
					}),
				],
				{ targetCollectionId: SYSTEM_COLLECTION_ID },
			);
			const second: AddManyResult = await tracksRepository.addMany(
				[
					makeTrack({
						id: "b",
						filePath: "c:/a.mp3",
						collectionIds: [],
					}),
				],
				{ targetCollectionId: SYSTEM_COLLECTION_ID },
			);
			expect(second.added).toEqual([]);
			expect(second.merged.length + second.skipped.length).toBe(1);
			expect(await db.tracks.count()).toBe(1);
			const onlyRow = await db.tracks.toArray();
			expect(onlyRow[0]?.filePath).toBe("c:/a.mp3");
		});

		it("folds case-variant duplicates within one payload (first-wins, skipped)", async () => {
			const result: AddManyResult = await tracksRepository.addMany(
				[
					makeTrack({
						id: "a",
						filePath: "C:/Same.MP3",
						collectionIds: [],
					}),
					makeTrack({
						id: "b",
						filePath: "c:/same.mp3",
						collectionIds: [],
					}),
				],
				{ targetCollectionId: SYSTEM_COLLECTION_ID },
			);
			expect(result.added).toEqual(["a"]);
			expect(result.merged).toEqual([]);
			expect(result.skipped).toEqual(["b"]);
			expect(await db.tracks.count()).toBe(1);
		});

		it("still throws ConflictError on duplicate ids (hard integrity violation)", async () => {
			await expect(
				tracksRepository.addMany([
					makeTrack({ id: "dup", filePath: "C:/A.MP3" }),
					makeTrack({ id: "dup", filePath: "c:/a.mp3" }),
				]),
			).rejects.toThrow(ConflictError);
			expect(await db.tracks.count()).toBe(0);
		});

		it("preserves merge semantics across collections for a case-variant re-import", async () => {
			await seedCollection("mix1");
			await tracksRepository.addMany(
				[
					makeTrack({
						id: "a",
						filePath: "C:/A.MP3",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
				],
				{ targetCollectionId: SYSTEM_COLLECTION_ID },
			);

			const second: AddManyResult = await tracksRepository.addMany(
				[
					makeTrack({
						id: "b",
						filePath: "c:/a.mp3",
						collectionIds: [SYSTEM_COLLECTION_ID],
					}),
				],
				{ targetCollectionId: "mix1" },
			);

			expect(second.merged).toEqual(["a"]);
			expect(await db.tracks.count()).toBe(1);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual(
				expect.arrayContaining([SYSTEM_COLLECTION_ID, "mix1"]),
			);
		});
	});

	describe("addMany - options validation & observer isolation", () => {
		beforeEach(async () => {
			await resetDatabase();
		});

		it.each<[string, number]>([
			["0", 0],
			["negative (-5)", -5],
			["NaN", Number.NaN],
			["fractional (1.5)", 1.5],
			["Infinity", Number.POSITIVE_INFINITY],
		])(
			"rejects batchSize = %s with TrackValidationError and writes nothing",
			async (_label, value) => {
				await expect(
					tracksRepository.addMany([makeTrack()], { batchSize: value }),
				).rejects.toThrow(TrackValidationError);
				expect(await db.tracks.count()).toBe(0);
			},
		);

		it("rejects batchSize above MAX_IMPORT_BATCH_SIZE", async () => {
			await expect(
				tracksRepository.addMany([makeTrack()], {
					batchSize: MAX_IMPORT_BATCH_SIZE + 1,
				}),
			).rejects.toThrow(TrackValidationError);
			expect(await db.tracks.count()).toBe(0);
		});

		it.each([
			["string-typed batchSize", '{"batchSize":"500"}'],
			["non-function onProgress", '{"onProgress":"not-a-function"}'],
			["unknown options keys", '{"unexpected":true}'],
		])(
			"rejects %s — simulates untrusted IPC/JSON input",
			async (_label, jsonString) => {
				const opts = JSON.parse(jsonString);
				await expect(
					tracksRepository.addMany([makeTrack()], opts),
				).rejects.toThrow(TrackValidationError);
				expect(await db.tracks.count()).toBe(0);
			},
		);

		it.each([
			["string", '"not-an-object"'],
			["number", "42"],
			["null", "null"],
		])(
			"rejects a non-object options payload (%s)",
			async (_label, jsonString) => {
				const opts = JSON.parse(jsonString);
				await expect(
					tracksRepository.addMany([makeTrack()], opts),
				).rejects.toThrow(TrackValidationError);
				expect(await db.tracks.count()).toBe(0);
			},
		);

		it("isolates a throwing onProgress callback — import continues", async () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const throwing = vi.fn(() => {
				throw new Error("error");
			});
			const tracks = [makeTrack({ id: "a" }), makeTrack({ id: "b" })];
			// batchSize: 1 → 2 batches → 2 callback invocations, both throwing.
			const result = await tracksRepository.addMany(tracks, {
				onProgress: throwing,
				batchSize: 1,
			});
			expect(result.added).toEqual(["a", "b"]);
			expect(await db.tracks.count()).toBe(2);
			expect(throwing).toHaveBeenCalledTimes(2);
			expect(warnSpy).toHaveBeenCalledTimes(2);
			const warnArg = warnSpy.mock.calls[0]?.[1];
			expect(warnArg).not.toHaveProperty("message");
			warnSpy.mockRestore();
		});

		it("still accepts a valid custom batchSize and emits progress (regression)", async () => {
			const progressCalls: AddManyProgress[] = [];
			const tracks = Array.from({ length: 10 }, (_, i) =>
				makeTrack({ id: `t-${i}`, filePath: `/music/t-${i}.mp3` }),
			);
			await tracksRepository.addMany(tracks, {
				batchSize: 4,
				onProgress: (p) => progressCalls.push(p),
			});
			expect(progressCalls).toHaveLength(3);
			expect(await db.tracks.count()).toBe(10);
		});
	});

	describe("addMany - partial-failure contract & idempotent retry", () => {
		beforeEach(async () => {
			await resetTestState();
			await seedCollection("mix1");
		});

		it("batch 2 of 3 fails → batch 1 committed; ImportAbortedError carries partials; retry is idempotent", async () => {
			await db.tracks.add(
				makeTrack({
					id: "a",
					filePath: "/music/a.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			const tracks = [
				makeIngestionTrack({
					id: "a",
					filePath: "/music/a.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
				makeIngestionTrack({
					id: "b",
					filePath: "/music/b.mp3",
					collectionIds: [],
				}),
				makeIngestionTrack({
					id: "c",
					filePath: "/music/c.mp3",
					collectionIds: [],
				}),
			];
			vi.spyOn(db.tracks, "bulkAdd").mockRejectedValueOnce(
				new DOMException("Quota exceeded mid-import", "QuotaExceededError"),
			);
			const aborted = await expectImportAborted(
				tracksRepository.addMany(tracks, {
					batchSize: 1,
					targetCollectionId: "mix1",
				}),
			);
			expect(aborted.partial.merged).toEqual(["a"]);
			expect(aborted.progress.processed).toBe(1);
			expect(aborted.progress.total).toBe(3);
			expect(aborted.progress.merged).toBe(1);
			expect(aborted.cause).toBeInstanceOf(StorageCapacityError);
			expect(await db.tracks.count()).toBe(1);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			const retry = await tracksRepository.addMany(tracks, {
				batchSize: 1,
				targetCollectionId: "mix1",
			});
			expect(retry.added).toEqual(["b", "c"]);
			expect(retry.skipped).toEqual(["a"]);
			expect(await db.tracks.count()).toBe(3);
		});

		it("rolls back intra-batch writes when a later operation fails", async () => {
			await db.tracks.add(
				makeTrack({
					id: "exist",
					filePath: "/music/exist.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			const pictureBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
			const tracks = [
				makeIngestionTrack(
					{ id: "new-art", filePath: "/music/new.mp3", collectionIds: [] },
					[{ format: "image/jpeg", data: pictureBytes }],
				),
				// merge of the pre-seeded track → tracks.bulkUpdate (forced to reject)
				makeIngestionTrack({
					id: "exist-merge",
					filePath: "/music/exist.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			];
			vi.spyOn(db.tracks, "bulkUpdate").mockRejectedValueOnce(
				new DOMException("Constraint", "ConstraintError"),
			);
			const aborted = await expectImportAborted(
				tracksRepository.addMany(tracks, {
					batchSize: 2,
					targetCollectionId: "mix1",
				}),
			);
			expect(aborted.cause).toBeInstanceOf(ConflictError);
			expect(aborted.partial.added).toEqual([]);
			expect(aborted.partial.merged).toEqual([]);
			expect(aborted.partial.skipped).toEqual([]);
			expect(aborted.progress.processed).toBe(0);
			expect(await db.tracks.count()).toBe(1);
			expect(await db.artworks.count()).toBe(0);
		});

		it("surfaces commit-phase QuotaExceededError as ImportAbortedError", async () => {
			const quotaError = new DOMException(
				"Quota exceeded at commit",
				"QuotaExceededError",
			);
			vi.spyOn(db, "transaction").mockRejectedValueOnce(quotaError);
			const aborted = await expectImportAborted(
				tracksRepository.addMany(
					[
						makeIngestionTrack({
							id: "a",
							filePath: "/music/a.mp3",
							collectionIds: [],
						}),
					],
					{ batchSize: 1, targetCollectionId: SYSTEM_COLLECTION_ID },
				),
			);
			expect(aborted.cause).toBeInstanceOf(StorageCapacityError);
			expect(aborted.partial.added).toEqual([]);
			expect(aborted.progress.processed).toBe(0);
			expect(await db.tracks.count()).toBe(0);
		});

		it("commit-phase failure in a later batch reports only prior batches in partials", async () => {
			const quotaError = new DOMException(
				"Quota exceeded at commit",
				"QuotaExceededError",
			);
			const originalTransaction = db.transaction;
			const txSpy = vi.spyOn(db, "transaction");
			let transactionCalls = 0;
			// @ts-expect-error - Dexie returns PromiseExtended, but Vitest mocks use native Promises (same directive and rationale as the RI-atomicity suite's bulkUpdate mock).
			txSpy.mockImplementation(async (...args: unknown[]) => {
				transactionCalls += 1;
				if (transactionCalls === 1) {
					return await Reflect.apply(originalTransaction, db, args);
				}
				throw quotaError;
			});
			const aborted = await expectImportAborted(
				tracksRepository.addMany(
					[
						makeIngestionTrack({
							id: "a",
							filePath: "/music/a.mp3",
							collectionIds: [],
						}),
						makeIngestionTrack({
							id: "b",
							filePath: "/music/b.mp3",
							collectionIds: [],
						}),
					],
					{ batchSize: 1, targetCollectionId: SYSTEM_COLLECTION_ID },
				),
			);
			expect(aborted.cause).toBeInstanceOf(StorageCapacityError);
			expect(aborted.partial.added).toEqual(["a"]);
			expect(aborted.partial.merged).toEqual([]);
			expect(aborted.partial.skipped).toEqual([]);
			expect(aborted.progress).toEqual({
				processed: 1,
				total: 2,
				added: 1,
				merged: 0,
				skipped: 0,
			});
			expect(await db.tracks.count()).toBe(1);
			expect(await db.tracks.get("b")).toBeUndefined();
		});
	});

	describe("addMany - per-batch RI atomicity", () => {
		beforeEach(async () => {
			await resetDatabase();
			await seedCollection("mix1");
			await db.tracks.add(
				makeTrack({
					id: "a",
					filePath: "/music/a.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
		});

		it("a collection deleted between batch 1 and batch 2 is caught by the in-transaction RI check", async () => {
			const originalBulkUpdate = db.tracks.bulkUpdate;
			const updateSpy = vi.spyOn(db.tracks, "bulkUpdate");
			let deleted = false;
			// @ts-expect-error - Dexie returns PromiseExtended, but Vitest mocks use native Promises.
			updateSpy.mockImplementation(async (...args) => {
				const result = await Reflect.apply(originalBulkUpdate, db.tracks, args);
				if (!deleted) {
					deleted = true;
					await db.collections.delete("mix1");
				}
				return result;
			});
			const aborted = await expectImportAborted(
				tracksRepository.addMany(
					[
						makeIngestionTrack({
							id: "a",
							filePath: "/music/a.mp3",
							collectionIds: [SYSTEM_COLLECTION_ID],
						}),
						makeIngestionTrack({
							id: "b",
							filePath: "/music/b.mp3",
							collectionIds: [],
						}),
					],
					{ batchSize: 1, targetCollectionId: "mix1" },
				),
			);
			expect(aborted.partial.merged).toEqual(["a"]);
			expect(aborted.progress.processed).toBe(1);
			expect(aborted.progress.total).toBe(2);
			expect(aborted.cause).toBeInstanceOf(ReferentialIntegrityError);
			expect(await db.tracks.count()).toBe(1);
			expect((await db.tracks.get("a"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect(await db.collections.get("mix1")).toBeUndefined();
		});

		it("an AbortSignal cancelled between batches throws ImportAbortedError with partials", async () => {
			const controller = new AbortController();
			const tracks = [
				makeIngestionTrack({
					id: "a",
					filePath: "/music/a.mp3",
					collectionIds: [],
				}),
				makeIngestionTrack({
					id: "b",
					filePath: "/music/b.mp3",
					collectionIds: [],
				}),
				makeIngestionTrack({
					id: "c",
					filePath: "/music/c.mp3",
					collectionIds: [],
				}),
			];
			const progress = (p: AddManyProgress): void => {
				if (p.processed === 1) controller.abort();
			};
			const aborted = await expectImportAborted(
				tracksRepository.addMany(tracks, {
					batchSize: 1,
					signal: controller.signal,
					onProgress: progress,
				}),
			);
			expect(aborted.partial.skipped).toEqual(["a"]);
			expect(aborted.progress.processed).toBe(1);
			expect(aborted.progress.total).toBe(3);
			expect(aborted.cause).toBeInstanceOf(DOMException);
			if (aborted.cause instanceof DOMException) {
				expect(aborted.cause.name).toBe("AbortError");
			}
		});
	});

	describe("addMany - artwork extraction lane", async () => {
		let artworksBulkAddSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(async () => {
			await resetTestState();
			artworksBulkAddSpy = vi.spyOn(db.artworks, "bulkAdd");
		});

		afterEach(() => {
			artworksBulkAddSpy.mockRestore();
		});

		it("extracts artwork into the artworks table and replaces common.picture with UUID refs", async () => {
			const pictureData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
			const trackWithArt = {
				...makeTrack({
					id: "art-track",
					filePath: "/music/art.mp3",
					collectionIds: [],
				}),
				common: {
					picture: [
						{
							format: "image/png",
							data: pictureData,
							description: "Front cover",
							name: "cover.png",
						},
					],
				},
			};
			const result = await tracksRepository.addMany([trackWithArt], {
				targetCollectionId: SYSTEM_COLLECTION_ID,
			});
			expect(result.added).toEqual(["art-track"]);
			const storedTrack = await db.tracks.get("art-track");
			expect(storedTrack).toBeDefined();
			expect(storedTrack?.common?.picture).toBeDefined();
			expect(storedTrack?.common?.picture).toHaveLength(1);
			const pictureRef = storedTrack?.common?.picture?.[0];
			expect(typeof pictureRef).toBe("string");
			expect(pictureRef).not.toBe("");
			expect(artworksBulkAddSpy).toHaveBeenCalledTimes(1);
			const savedArtworks = artworksBulkAddSpy.mock.calls[0]?.[0];
			expect(savedArtworks).toHaveLength(1);
			const artwork = savedArtworks?.[0];
			expect(artwork).toBeDefined();
			expect(artwork?.id).toBe(pictureRef);
			expect(artwork?.format).toBe("image/png");
			expect(artwork?.description).toBe("Front cover");
			expect(artwork?.name).toBe("cover.png");
			expect(artwork?.blob).toBeInstanceOf(Blob);
		});

		it("extracts multiple artwork entries from a single track", async () => {
			const trackWithMultipleArt = {
				...makeTrack({
					id: "multi-art",
					filePath: "/music/multi.mp3",
					collectionIds: [],
				}),
				common: {
					picture: [
						{ format: "image/jpeg", data: new Uint8Array([1, 2, 3]) },
						{ format: "image/png", data: new Uint8Array([4, 5, 6]) },
					],
				},
			};
			await tracksRepository.addMany([trackWithMultipleArt]);
			const storedTrack = await db.tracks.get("multi-art");
			expect(storedTrack?.common?.picture).toHaveLength(2);
			expect(artworksBulkAddSpy).toHaveBeenCalledTimes(1);
			const savedArtworks = artworksBulkAddSpy.mock.calls[0]?.[0];
			expect(savedArtworks).toHaveLength(2);
			expect(savedArtworks?.[0]?.format).toBe("image/jpeg");
			expect(savedArtworks?.[1]?.format).toBe("image/png");
			expect(await db.artworks.count()).toBe(2);
		});

		it("merged tracks persist no artwork (orphan-artwork regression)", async () => {
			await db.tracks.add(
				makeTrack({
					id: "existing",
					filePath: "/music/song.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await seedCollection("mix1");
			const reimport = {
				...makeTrack({
					id: "new-id",
					filePath: "/music/song.mp3",
					collectionIds: [],
				}),
				common: {
					picture: [{ format: "image/jpeg", data: new Uint8Array([1, 2, 3]) }],
				},
			};
			const result = await tracksRepository.addMany([reimport], {
				targetCollectionId: "mix1",
			});
			expect(result.merged).toEqual(["existing"]);
			expect(result.added).toEqual([]);
			expect(artworksBulkAddSpy).not.toHaveBeenCalled();
			expect(await db.artworks.count()).toBe(0);
		});

		it("skipped tracks persist no artwork (orphan-artwork regression)", async () => {
			await seedCollection("mix1");
			await db.tracks.add(
				makeTrack({
					id: "existing",
					filePath: "/music/song.mp3",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
			);
			const reimport = {
				...makeTrack({
					id: "new-id",
					filePath: "/music/song.mp3",
					collectionIds: [],
				}),
				common: {
					picture: [{ format: "image/jpeg", data: new Uint8Array([7, 8, 9]) }],
				},
			};
			const result = await tracksRepository.addMany([reimport], {
				targetCollectionId: "mix1",
			});
			expect(result.skipped).toEqual(["existing"]);
			expect(result.added).toEqual([]);
			expect(result.merged).toEqual([]);
			expect(artworksBulkAddSpy).not.toHaveBeenCalled();
			expect(await db.artworks.count()).toBe(0);
		});
	});

	describe("update", () => {
		it("applies partial changes and returns 1 when the track exists", async () => {
			await db.tracks.add(makeTrack({ id: "t1", selected: 0 }));
			expect(await tracksRepository.update("t1", { selected: 1 })).toBe(1);
			expect((await db.tracks.get("t1"))?.selected).toBe(1);
		});

		it("returns 0 when the track does not exist", async () => {
			expect(await tracksRepository.update("missing", { selected: 1 })).toBe(0);
		});

		it("rejects updating filePath to an existing one with a ConstraintError", async () => {
			await db.tracks.add(makeTrack({ id: "t1", filePath: "/music/a.mp3" }));
			await db.tracks.add(makeTrack({ id: "t2", filePath: "/music/b.mp3" }));
			await expect(
				tracksRepository.update("t2", { filePath: "/music/a.mp3" }),
			).rejects.toThrow(
				expect.objectContaining({
					failures: expect.arrayContaining([
						expect.objectContaining({ name: "ConstraintError" }),
					]),
				}),
			);
		});

		it("normalizes collectionIds changes and removes duplicate system collection ids", async () => {
			await seedCollection("mix1");
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await tracksRepository.update("t1", {
				collectionIds: [SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID, "mix1"],
			});
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("adds the system collection id when collectionIds changes omit it", async () => {
			await seedCollection("mix1");
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await tracksRepository.update("t1", {
				collectionIds: ["mix1"],
			});
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				"mix1",
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("does not modify collectionIds when changes do not include collectionIds", async () => {
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
			);
			await tracksRepository.update("t1", {
				selected: 1,
			});
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
		});

		it("rejects invalid collectionIds values in update changes", async () => {
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await expect(
				tracksRepository.update("t1", {
					collectionIds: [SYSTEM_COLLECTION_ID, ""],
				}),
			).rejects.toThrow(TrackValidationError);
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("rejects an empty changes object (no-op mutation)", async () => {
			await db.tracks.add(makeTrack({ id: "t1", selected: 0 }));
			await expect(tracksRepository.update("t1", {} as any)).rejects.toThrow(
				TrackValidationError,
			);
			expect((await db.tracks.get("t1"))?.selected).toBe(0);
		});

		it("rejects non-object changes with a clear error", async () => {
			await db.tracks.add(makeTrack({ id: "t1" }));
			await expect(tracksRepository.update("t1", null as any)).rejects.toThrow(
				TrackValidationError,
			);
			await expect(
				tracksRepository.update("t1", "invalid" as any),
			).rejects.toThrow(TrackValidationError);
		});

		it("rejects an empty ID with TrackValidationError", async () => {
			await expect(
				tracksRepository.update("", { selected: 1 }),
			).rejects.toThrow(TrackValidationError);
		});

		it("rejects a whitespace-only ID with TrackValidationError", async () => {
			await expect(
				tracksRepository.update("   ", { selected: 1 }),
			).rejects.toThrow(TrackValidationError);
		});

		it("rejects non-object changes with TrackValidationError", async () => {
			await db.tracks.add(makeTrack({ id: "t1" }));
			await expect(tracksRepository.update("t1", null)).rejects.toThrow(
				TrackValidationError,
			);
			await expect(tracksRepository.update("t1", "invalid")).rejects.toThrow(
				TrackValidationError,
			);
		});
	});

	describe("updateMany", () => {
		it("returns the count of successfully updated tracks", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 0 }),
				makeTrack({ id: "t2", selected: 0 }),
			]);
			const total = await tracksRepository.updateMany([
				{ id: "t1", changes: { selected: 1 } },
				{ id: "t2", changes: { selected: 1 } },
				{ id: "missing", changes: { selected: 1 } },
			]);
			expect(total).toBe(2);
			expect((await db.tracks.get("t1"))?.selected).toBe(1);
			expect((await db.tracks.get("t2"))?.selected).toBe(1);
		});

		it("returns 0 for an empty update list", async () => {
			expect(await tracksRepository.updateMany([])).toBe(0);
		});

		it("rejects updating filePath to an existing one with a ConstraintError", async () => {
			await db.tracks.add(makeTrack({ id: "t1", filePath: "/music/a.mp3" }));
			await db.tracks.add(makeTrack({ id: "t2", filePath: "/music/b.mp3" }));
			await db.tracks.add(makeTrack({ id: "t3", filePath: "/music/c.mp3" }));
			await expect(
				tracksRepository.updateMany([
					{ id: "t2", changes: { filePath: "/music/a.mp3" } },
					{ id: "t3", changes: { filePath: "/music/a.mp3" } },
				]),
			).rejects.toThrow(
				expect.objectContaining({
					failures: expect.arrayContaining([
						expect.objectContaining({ name: "ConstraintError" }),
					]),
				}),
			);
		});

		it("normalizes collectionIds changes and removes duplicate system collection ids", async () => {
			await seedCollection("mix1");
			await seedCollection("mix2");
			await db.tracks.bulkAdd([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
				makeTrack({
					id: "t2",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			await tracksRepository.updateMany([
				{
					id: "t1",
					changes: {
						collectionIds: [SYSTEM_COLLECTION_ID, SYSTEM_COLLECTION_ID, "mix1"],
					},
				},
				{
					id: "t2",
					changes: {
						collectionIds: ["mix2", "mix2"],
					},
				},
			]);
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect((await db.tracks.get("t2"))?.collectionIds).toEqual([
				"mix2",
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("does not modify collectionIds when updateMany changes do not include collectionIds", async () => {
			await db.tracks.bulkAdd([
				makeTrack({
					id: "t1",
					selected: 0,
					collectionIds: [SYSTEM_COLLECTION_ID, "mix1"],
				}),
				makeTrack({
					id: "t2",
					selected: 0,
					collectionIds: [SYSTEM_COLLECTION_ID, "mix2"],
				}),
			]);
			await tracksRepository.updateMany([
				{
					id: "t1",
					changes: { selected: 1 },
				},
				{
					id: "t2",
					changes: { selected: 1 },
				},
			]);
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix1",
			]);
			expect((await db.tracks.get("t2"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
				"mix2",
			]);
		});

		it("rejects invalid collectionIds values in updateMany changes", async () => {
			await db.tracks.add(
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			);
			await expect(
				tracksRepository.updateMany([
					{
						id: "t1",
						changes: {
							collectionIds: [SYSTEM_COLLECTION_ID, ""],
						},
					},
				]),
			).rejects.toThrow(TrackValidationError);
			expect((await db.tracks.get("t1"))?.collectionIds).toEqual([
				SYSTEM_COLLECTION_ID,
			]);
		});

		it("rejects an empty changes object in updateMany", async () => {
			await db.tracks.add(makeTrack({ id: "t1", selected: 0 }));
			await expect(
				tracksRepository.updateMany([{ id: "t1", changes: {} as any }]),
			).rejects.toThrow(TrackValidationError);
			expect((await db.tracks.get("t1"))?.selected).toBe(0);
		});

		it("rejects a non-array updates argument with TrackValidationError", async () => {
			await expect(tracksRepository.updateMany("not-an-array")).rejects.toThrow(
				TrackValidationError,
			);
		});

		it("rejects a non-object update entry with TrackValidationError", async () => {
			await expect(
				tracksRepository.updateMany(["not-an-object" as any]),
			).rejects.toThrow(TrackValidationError);
		});

		it("rejects an empty ID in updateMany with TrackValidationError", async () => {
			await expect(
				tracksRepository.updateMany([{ id: "", changes: { selected: 1 } }]),
			).rejects.toThrow(TrackValidationError);
		});

		it("rejects duplicate IDs in updateMany with ConflictError", async () => {
			await expect(
				tracksRepository.updateMany([
					{ id: "t1", changes: { selected: 1 } },
					{ id: "t1", changes: { selected: 0 } },
				]),
			).rejects.toThrow(ConflictError);
		});

		it("pins precedence: an earlier duplicate id wins over a later malformed item (ConflictError)", async () => {
			await expect(
				tracksRepository.updateMany([
					{ id: "t1", changes: { selected: 1 } },
					{ id: "t1", changes: { selected: 0 } }, // duplicate at index 1
					"not-an-object", // malformed at index 2 — never reached
				]),
			).rejects.toThrow(ConflictError);
		});

		it("pins precedence: an earlier malformed item wins over a later duplicate id (TrackValidationError)", async () => {
			await expect(
				tracksRepository.updateMany([
					"not-an-object", // malformed at index 0 — wins
					{ id: "t1", changes: { selected: 1 } },
					{ id: "t1", changes: { selected: 0 } }, // duplicate at index 2 — never reached
				]),
			).rejects.toThrow(TrackValidationError);
		});

		it("pins intra-item precedence: a duplicate id wins over that same item's invalid changes (ConflictError)", async () => {
			await expect(
				tracksRepository.updateMany([
					{ id: "t1", changes: { selected: 1 } },
					{ id: "t1", changes: {} }, // duplicate AND invalid changes
				]),
			).rejects.toThrow(ConflictError);
		});
	});

	describe("remove", () => {
		it("deletes the track when it exists", async () => {
			await db.tracks.add(makeTrack({ id: "t1" }));
			await tracksRepository.remove("t1");
			expect(await db.tracks.get("t1")).toBeUndefined();
		});

		it("does not throw when the track does not exist", async () => {
			await expect(tracksRepository.remove("missing")).resolves.toBeUndefined();
		});
	});

	describe("getSelectedTracks", () => {
		it("returns only tracks with selected === 1", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 1 }),
				makeTrack({ id: "t2", selected: 0 }),
				makeTrack({ id: "t3", selected: 1 }),
			]);
			expect(
				(await tracksRepository.getSelectedTracks()).map((t) => t.id).sort(),
			).toEqual(["t1", "t3"]);
		});

		it("excludes tracks where selected is 0", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 0 }),
				makeTrack({ id: "t2", selected: 1 }),
				makeTrack({ id: "t3", selected: 0 }),
			]);
			expect(
				(await tracksRepository.getSelectedTracks()).map((t) => t.id).sort(),
			).toEqual(["t2"]);
		});

		it("excludes corrupted non-one selected values", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 1 }),
				makeTrack({ id: "t2", selected: 0 }),
				makeTrack({
					id: "t3",
					selected: 2 as unknown as Metadata["selected"],
				}),
				makeTrack({
					id: "t4",
					selected: null as unknown as Metadata["selected"],
				}),
				makeTrack({
					id: "t5",
					selected: undefined as unknown as Metadata["selected"],
				}),
			]);
			expect(
				(await tracksRepository.getSelectedTracks()).map((t) => t.id).sort(),
			).toEqual(["t1"]);
		});

		it("returns an empty array when none are selected", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 0 }),
				makeTrack({ id: "t2", selected: 0 }),
			]);
			expect(await tracksRepository.getSelectedTracks()).toEqual([]);
		});
	});

	describe("removeMany", () => {
		it("deletes all selected tracks and keeps the rest", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 1 }),
				makeTrack({ id: "t2", selected: 0 }),
				makeTrack({ id: "t3", selected: 1 }),
			]);
			await tracksRepository.removeMany();
			expect((await db.tracks.toArray()).map((t) => t.id).sort()).toEqual([
				"t2",
			]);
		});

		it("deletes nothing when no tracks are selected", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1", selected: 0 }),
				makeTrack({ id: "t2", selected: 0 }),
			]);
			await tracksRepository.removeMany();
			expect(await db.tracks.count()).toBe(2);
		});

		it("succeeds on an empty table", async () => {
			await expect(tracksRepository.removeMany()).resolves.toBeUndefined();
			expect(await db.tracks.count()).toBe(0);
		});
	});

	describe("status transition guard (update)", () => {
		const transitionMatrix = STATUS_VALUES.flatMap((from) =>
			STATUS_VALUES.map((to) => ({
				from,
				to,
				legal: LEGAL_TRANSITION_EDGES.has(`${from}->${to}`),
			})),
		);

		it.each(transitionMatrix)("$from -> $to", async ({ from, to, legal }) => {
			await seedTrackWithStatus("t1", from);
			const result = await tracksRepository.update("t1", statusChange(to));
			const persisted = await db.tracks.get("t1");
			if (legal) {
				expect(result).toBe(1);
				expect(persisted?.status).toBe(to);
			} else {
				expect(result).toBe(0);
				expect(persisted?.status).toBe(from);
			}
		});

		it("persists the failure reason on processing -> failed", async () => {
			await seedTrackWithStatus("t1", "processing");
			await tracksRepository.update("t1", {
				status: "failed",
				reason: "FFmpeg crashed",
			});
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("failed");
			expect((track as any)?.reason).toBe("FFmpeg crashed");
		});

		it("persists the reason on the forward-skip pending -> failed", async () => {
			await seedTrackWithStatus("t1", "pending");
			await tracksRepository.update("t1", {
				status: "failed",
				reason: "input unreadable",
			});
			expect((await db.tracks.get("t1"))?.status).toBe("failed");
		});

		it("treats duplicate terminal events idempotently (completed twice)", async () => {
			await seedTrackWithStatus("t1", "processing");
			expect(await tracksRepository.update("t1", { status: "completed" })).toBe(
				1,
			);
			expect(await tracksRepository.update("t1", { status: "completed" })).toBe(
				0,
			);
			expect((await db.tracks.get("t1"))?.status).toBe("completed");
		});

		it("treats duplicate failed events idempotently", async () => {
			await seedTrackWithStatus("t1", "processing");
			const change = { status: "failed", reason: "boom" };
			expect(await tracksRepository.update("t1", change)).toBe(1);
			expect(await tracksRepository.update("t1", change)).toBe(0);
		});

		it("returns 0 for a status change on a missing track without throwing", async () => {
			await expect(
				tracksRepository.update("missing", { status: "processing" }),
			).resolves.toBe(0);
		});

		it("does not apply the guard to non-status field changes", async () => {
			await seedTrackWithStatus("t1", "completed");
			expect(await tracksRepository.update("t1", { selected: 1 })).toBe(1);
			const track = await db.tracks.get("t1");
			expect(track?.selected).toBe(1);
			expect(track?.status).toBe("completed");
		});

		it("leaves the row byte-identical when a transition is rejected", async () => {
			await seedTrackWithStatus("t1", "completed");
			const before = await db.tracks.get("t1");
			await tracksRepository.update("t1", { status: "pending" });
			expect(await db.tracks.get("t1")).toEqual(before);
		});

		it("clears stale reason when transitioning from failed to processing", async () => {
			await seedTrackWithStatus("t1", "failed");
			await tracksRepository.update("t1", { status: "processing" });
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("processing");
			expect(
				(track as { reason?: string } | undefined)?.reason,
			).toBeUndefined();
		});

		it("persists statusSeq across multiple updates", async () => {
			await seedTrackWithStatus("t1", "pending");
			await tracksRepository.update("t1", statusChange("processing", 1));
			await tracksRepository.update("t1", statusChange("completed", 2));
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("completed");
			expect(track?.statusSeq).toBe(2);
		});
	});

	describe("sequence guard (out-of-order status events)", () => {
		it("applies a legal transition carrying a higher seq and advances statusSeq", async () => {
			await seedTrackWithStatus("t1", "pending");
			expect(
				await tracksRepository.update("t1", statusChange("processing", 1)),
			).toBe(1);
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("processing");
			expect(track?.statusSeq).toBe(1);
		});

		it("discards an event whose seq equals the stored high-water mark", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 2 }),
			);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 2)),
			).toBe(0);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
		});

		it("discards an event whose seq is below the stored high-water mark", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 3 }),
			);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 1)),
			).toBe(0);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
		});

		it("keeps the high-water mark monotonic across mixed stale/fresh events", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 3 }),
			);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 2)),
			).toBe(0);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 4)),
			).toBe(1);
			expect((await db.tracks.get("t1"))?.statusSeq).toBe(4);
		});

		it("leaves statusSeq untouched when the event carries no seq", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 2 }),
			);
			expect(await tracksRepository.update("t1", { status: "completed" })).toBe(
				1,
			);
			expect((await db.tracks.get("t1"))?.statusSeq).toBe(2);
		});

		it("discards a late lower-seq processing arriving after completed committed", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 1 }),
			);
			expect(
				await tracksRepository.update("t1", statusChange("completed", 2)),
			).toBe(1);
			expect(
				await tracksRepository.update("t1", statusChange("processing", 1)),
			).toBe(0);
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("completed");
			expect(track?.statusSeq).toBe(2);
		});

		it("resolves the concurrent completed/late-processing race deterministically", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 1 }),
			);
			const [completedResult, lateProcessingResult] = await Promise.all([
				tracksRepository.update("t1", statusChange("completed", 2)),
				tracksRepository.update("t1", statusChange("processing", 1)),
			]);
			expect(completedResult + lateProcessingResult).toBe(1);
			const track = await db.tracks.get("t1");
			expect(track?.status).toBe("completed");
			expect(track?.statusSeq).toBe(2);
		});

		it("cannot detect staleness without seq (documented degradation)", async () => {
			await db.tracks.add(makeTrack({ id: "t1", status: "processing" }));
			await tracksRepository.update("t1", { status: "completed" });
			await expect(
				tracksRepository.update("t1", { status: "processing" }),
			).resolves.toBe(1);
		});
	});

	describe("status transition guard (updateMany)", () => {
		it("applies only legal transitions and counts them", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1" }),
				makeTrack({ id: "t2", status: "completed" }),
				makeTrack({
					id: "t3",
					status: "failed",
					reason: "boom",
				} as Partial<Metadata>),
			]);
			const total = await tracksRepository.updateMany([
				{ id: "t1", changes: { status: "processing" } }, // legal
				{ id: "t2", changes: { status: "failed", reason: "r" } }, // backward
				{ id: "t3", changes: { status: "pending" } }, // backward
				{ id: "missing", changes: { status: "processing" } }, // no row
			]);
			expect(total).toBe(1);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
			expect((await db.tracks.get("t2"))?.status).toBe("completed");
			expect((await db.tracks.get("t3"))?.status).toBe("failed");
		});

		it("does not throw when every transition in the batch is illegal", async () => {
			await seedTrackWithStatus("t1", "completed");
			await expect(
				tracksRepository.updateMany([
					{ id: "t1", changes: { status: "pending" } },
				]),
			).resolves.toBe(0);
			expect((await db.tracks.get("t1"))?.status).toBe("completed");
		});

		it("honours seq across the batch", async () => {
			await db.tracks.add(
				makeTrack({ id: "t1", status: "processing", statusSeq: 5 }),
			);
			const total = await tracksRepository.updateMany([
				{ id: "t1", changes: statusChange("completed", 4) }, // stale
			]);
			expect(total).toBe(0);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
		});

		it("mixes status and field updates in one batch without cross-interference", async () => {
			await db.tracks.bulkAdd([
				makeTrack({ id: "t1" }),
				makeTrack({ id: "t2", selected: 0 }),
			]);
			const total = await tracksRepository.updateMany([
				{ id: "t1", changes: { status: "processing" } },
				{ id: "t2", changes: { selected: 1 } },
			]);
			expect(total).toBe(2);
			expect((await db.tracks.get("t1"))?.status).toBe("processing");
			expect((await db.tracks.get("t2"))?.selected).toBe(1);
		});
	});
});
