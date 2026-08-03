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
import { collectionsRepository } from "@renderer/db/repositories/collectionsRepository";
import { v7 as uuidV7 } from "uuid";
import { configureUuidMock, makeTrack, resetDatabase } from "./testFactories";

const SYSTEM_COLLECTION_ID = "all";
const TITLE_VALIDATION_ERROR = /title.*empty/;

describe("collectionsRepository", () => {
	beforeEach(async () => {
		configureUuidMock();
		await resetDatabase();
	});

	describe("getAllCollections", () => {
		it("returns the seeded 'all' collection after a reset", async () => {
			const collections = await collectionsRepository.getAllCollections();
			expect(collections).toHaveLength(1);
			expect(collections[0]).toEqual({
				id: SYSTEM_COLLECTION_ID,
				title: "All",
			});
		});

		it("returns every collection after several are added", async () => {
			await collectionsRepository.addCollection({ title: "Collection 1" });
			await collectionsRepository.addCollection({ title: "Collection 2" });
			const titles = (await collectionsRepository.getAllCollections())
				.map((collection) => collection.title)
				.sort();
			expect(titles).toEqual(["All", "Collection 1", "Collection 2"]);
		});

		it("returns remaining collections after a deletion", async () => {
			const id = await collectionsRepository.addCollection({
				title: "Mix",
			});
			await collectionsRepository.deleteCollection({ id });
			expect(await collectionsRepository.getAllCollections()).toEqual([
				{
					id: SYSTEM_COLLECTION_ID,
					title: "All",
				},
			]);
		});
	});

	describe("getCollectionById", () => {
		it("returns the collection when it exists", async () => {
			const id = await collectionsRepository.addCollection({
				title: "Podcasts",
			});
			expect(await collectionsRepository.getCollectionById(id)).toEqual({
				id,
				title: "Podcasts",
			});
		});

		it("returns undefined for a non-existent id", async () => {
			expect(
				await collectionsRepository.getCollectionById("does-not-exist"),
			).toBeUndefined();
		});

		it("returns undefined after the collection is deleted", async () => {
			const id = await collectionsRepository.addCollection({
				title: "Mix",
			});
			await collectionsRepository.deleteCollection({ id });
			expect(await collectionsRepository.getCollectionById(id)).toBeUndefined();
		});

		it("returns the updated collection after update", async () => {
			const id = await collectionsRepository.addCollection({
				title: "Old",
			});
			await collectionsRepository.updateCollection(id, { title: "New" });
			expect(await collectionsRepository.getCollectionById(id)).toEqual({
				id,
				title: "New",
			});
		});
	});

	describe("addCollection", () => {
		beforeEach(() => vi.clearAllMocks());

		it("generates a uuid v7 id, persists the collection, and returns the id", async () => {
			const id = await collectionsRepository.addCollection({
				title: "New Mix",
			});
			expect(uuidV7).toHaveBeenCalledTimes(1);
			expect(id).toBe("mock-uuid-1");
			expect(await db.collections.get(id)).toEqual({
				id: "mock-uuid-1",
				title: "New Mix",
			});
		});

		it("rejects an empty title and does not generate an id", async () => {
			await expect(
				collectionsRepository.addCollection({ title: "" }),
			).rejects.toThrow(TITLE_VALIDATION_ERROR);
			expect(uuidV7).not.toHaveBeenCalled();
			expect(await db.collections.count()).toBe(1);
		});

		it("rejects a whitespace-only title and does not generate an id", async () => {
			await expect(
				collectionsRepository.addCollection({ title: "   " }),
			).rejects.toThrow(TITLE_VALIDATION_ERROR);
			expect(uuidV7).not.toHaveBeenCalled();
			expect(await db.collections.count()).toBe(1);
		});

		it("trims surrounding whitespace before persisting", async () => {
			const id = await collectionsRepository.addCollection({
				title: "  Mix  ",
			});
			expect(await db.collections.get(id)).toEqual({
				id: "mock-uuid-1",
				title: "Mix",
			});
		});

		it("supports Unicode titles", async () => {
			const id = await collectionsRepository.addCollection({
				title: "Музыка 🎧",
			});
			expect(await db.collections.get(id)).toEqual({
				id: "mock-uuid-1",
				title: "Музыка 🎧",
			});
		});

		it("rejects primary-key collisions", async () => {
			vi.mocked(uuidV7).mockReturnValueOnce(SYSTEM_COLLECTION_ID as any);
			await expect(
				collectionsRepository.addCollection({ title: "Collision" }),
			).rejects.toThrow();
			expect(uuidV7).toHaveBeenCalledTimes(1);
			expect(await db.collections.count()).toBe(1);
		});

		it("allows duplicate titles because no uniqueness constraint is defined", async () => {
			await collectionsRepository.addCollection({ title: "Duplicate" });
			await collectionsRepository.addCollection({ title: "Duplicate" });
			const titles = (await collectionsRepository.getAllCollections())
				.map((collection) => collection.title)
				.sort();
			expect(titles).toEqual(["All", "Duplicate", "Duplicate"]);
		});
	});

	describe("updateCollection", () => {
		it("applies the change and returns 1 when the collection exists", async () => {
			const id = await collectionsRepository.addCollection({ title: "Old" });
			expect(
				await collectionsRepository.updateCollection(id, { title: "New" }),
			).toBe(1);
			expect((await db.collections.get(id))?.title).toBe("New");
		});

		it("returns 0 and changes nothing when the id does not exist", async () => {
			expect(
				await collectionsRepository.updateCollection("missing", { title: "X" }),
			).toBe(0);
			expect(await collectionsRepository.getAllCollections()).toHaveLength(1);
		});

		it("rejects an empty title update", async () => {
			const id = await collectionsRepository.addCollection({
				title: "Old",
			});
			await expect(
				collectionsRepository.updateCollection(id, { title: "" }),
			).rejects.toThrow(TITLE_VALIDATION_ERROR);
			expect((await db.collections.get(id))?.title).toBe("Old");
		});

		it("rejects a whitespace-only title update", async () => {
			const id = await collectionsRepository.addCollection({
				title: "Old",
			});
			await expect(
				collectionsRepository.updateCollection(id, { title: "   " }),
			).rejects.toThrow(TITLE_VALIDATION_ERROR);
			expect((await db.collections.get(id))?.title).toBe("Old");
		});

		it("trims surrounding whitespace before persisting", async () => {
			const id = await collectionsRepository.addCollection({
				title: "Old",
			});
			await collectionsRepository.updateCollection(id, {
				title: "  New  ",
			});
			expect((await db.collections.get(id))?.title).toBe("New");
		});
	});

	describe("deleteCollection", () => {
		it("rejects deleting the protected 'all' collection", async () => {
			await db.tracks.bulkAdd([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID],
				}),
			]);
			await expect(
				collectionsRepository.deleteCollection({
					id: SYSTEM_COLLECTION_ID,
				}),
			).rejects.toThrow("protected");
			await expect(
				collectionsRepository.deleteCollection({
					id: SYSTEM_COLLECTION_ID,
					deleteFromAllCollections: true,
				}),
			).rejects.toThrow("protected");
			expect(await db.collections.get(SYSTEM_COLLECTION_ID)).toEqual({
				id: SYSTEM_COLLECTION_ID,
				title: "All",
			});
			expect(await db.tracks.get("t1")).toBeDefined();
		});

		it("defaults deleteFromAllCollections to false when omitted", async () => {
			const collectionId = await collectionsRepository.addCollection({
				title: "Mix",
			});
			await db.tracks.bulkAdd([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID, collectionId],
				}),
			]);
			await collectionsRepository.deleteCollection({
				id: collectionId,
			});
			expect(await db.collections.get(collectionId)).toBeUndefined();
			const track = await db.tracks.get("t1");
			expect(track).toBeDefined();
			expect(track?.collectionIds).toEqual([SYSTEM_COLLECTION_ID]);
		});

		it("accepts explicit undefined deleteFromAllCollections and uses false", async () => {
			const collectionId = await collectionsRepository.addCollection({
				title: "Mix",
			});
			await db.tracks.bulkAdd([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID, collectionId],
				}),
			]);
			await collectionsRepository.deleteCollection({
				id: collectionId,
				deleteFromAllCollections: undefined,
			});
			expect(await db.collections.get(collectionId)).toBeUndefined();
			const track = await db.tracks.get("t1");
			expect(track).toBeDefined();
			expect(track?.collectionIds).toEqual([SYSTEM_COLLECTION_ID]);
		});

		describe("deleteFromAllCollections = false", () => {
			it("removes the collection and strips its id from tracks, keeping the tracks", async () => {
				const collectionId = await collectionsRepository.addCollection({
					title: "Mix",
				});
				await db.tracks.bulkAdd([
					makeTrack({ id: "t1", collectionIds: ["all", collectionId] }),
					makeTrack({ id: "t2", collectionIds: ["all", collectionId] }),
					makeTrack({ id: "t3", collectionIds: ["all"] }),
				]);
				await collectionsRepository.deleteCollection({
					id: collectionId,
				});
				expect(await db.collections.get(collectionId)).toBeUndefined();
				expect(await collectionsRepository.getAllCollections()).toEqual([
					{
						id: SYSTEM_COLLECTION_ID,
						title: "All",
					},
				]);
				expect((await db.tracks.get("t1"))?.collectionIds).toEqual(["all"]);
				expect((await db.tracks.get("t2"))?.collectionIds).toEqual(["all"]);
				expect((await db.tracks.get("t3"))?.collectionIds).toEqual(["all"]);
			});

			it("is a no-op when the collection does not exist", async () => {
				await expect(
					collectionsRepository.deleteCollection({
						id: "ghost",
						deleteFromAllCollections: false,
					}),
				).resolves.toBeUndefined();
				expect(await collectionsRepository.getAllCollections()).toHaveLength(1);
				expect(await db.tracks.count()).toBe(0);
			});
		});

		it("rolls back track modifications if collection deletion fails", async () => {
			const collectionId = await collectionsRepository.addCollection({
				title: "Mix",
			});
			await db.tracks.bulkAdd([
				makeTrack({
					id: "t1",
					collectionIds: [SYSTEM_COLLECTION_ID, collectionId],
				}),
			]);
			vi.spyOn(db.collections, "delete").mockRejectedValueOnce(
				new Error("forced failure"),
			);
			await expect(
				collectionsRepository.deleteCollection({
					id: collectionId,
				}),
			).rejects.toThrow("forced failure");
			const t1 = await db.tracks.get("t1");
			expect(t1).toBeDefined();
			expect(t1?.collectionIds).toEqual([SYSTEM_COLLECTION_ID, collectionId]);
			expect(await db.collections.get(collectionId)).toBeDefined();
		});

		describe("deleteFromAllCollections = true", () => {
			it("removes the collection and deletes every track referencing it", async () => {
				const collectionId = await collectionsRepository.addCollection({
					title: "Mix",
				});
				await db.tracks.bulkAdd([
					makeTrack({
						id: "t1",
						collectionIds: ["all", collectionId],
					}),
					makeTrack({
						id: "t2",
						collectionIds: ["all", collectionId, "other"],
					}),
					makeTrack({
						id: "t3",
						collectionIds: ["all"],
					}),
				]);
				await collectionsRepository.deleteCollection({
					id: collectionId,
					deleteFromAllCollections: true,
				});
				expect(await db.collections.get(collectionId)).toBeUndefined();
				expect(await db.tracks.get("t1")).toBeUndefined();
				expect(await db.tracks.get("t2")).toBeUndefined();
				expect((await db.tracks.get("t3"))?.collectionIds).toEqual(["all"]);
			});

			it("is a no-op when the collection does not exist, even if tracks reference it", async () => {
				await db.tracks.bulkAdd([
					makeTrack({
						id: "t1",
						collectionIds: [SYSTEM_COLLECTION_ID, "ghost"],
					}),
					makeTrack({
						id: "t2",
						collectionIds: ["ghost"],
					}),
				]);
				await expect(
					collectionsRepository.deleteCollection({
						id: "ghost",
						deleteFromAllCollections: true,
					}),
				).resolves.toBeUndefined();
				expect(await collectionsRepository.getAllCollections()).toHaveLength(1);
				expect(await db.tracks.count()).toBe(2);
			});

			it("succeeds when the collection has no tracks", async () => {
				const collectionId = await collectionsRepository.addCollection({
					title: "Empty",
				});
				await collectionsRepository.deleteCollection({
					id: collectionId,
					deleteFromAllCollections: true,
				});
				expect(await db.collections.get(collectionId)).toBeUndefined();
				expect(await db.tracks.count()).toBe(0);
			});

			it("rolls back track deletions if collection deletion fails", async () => {
				const collectionId = await collectionsRepository.addCollection({
					title: "Mix",
				});
				await db.tracks.bulkAdd([
					makeTrack({
						id: "t1",
						collectionIds: [SYSTEM_COLLECTION_ID, collectionId],
					}),
				]);
				vi.spyOn(db.collections, "delete").mockRejectedValueOnce(
					new Error("forced failure"),
				);
				await expect(
					collectionsRepository.deleteCollection({
						id: collectionId,
						deleteFromAllCollections: true,
					}),
				).rejects.toThrow("forced failure");
				expect(await db.tracks.get("t1")).toBeDefined();
				expect(await db.collections.get(collectionId)).toBeDefined();
			});
		});
	});
});
