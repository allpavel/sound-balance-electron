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
import { artworksRepository } from "@renderer/db/repositories/artworksRepository";
import { resetDatabase } from "@renderer/utils/test-utils";
import { spyOnConsoleWarn } from "@tests/utils";

describe("artworksRepository", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	describe("getByIds", () => {
		it("returns empty result for empty input", async () => {
			const result = await artworksRepository.getByIds([]);
			expect(result.ok).toEqual([]);
			expect(result.quarantinedIds).toEqual([]);
		});

		it("returns valid artworks by id", async () => {
			const blob = new Blob(["test"], { type: "image/png" });
			await db.artworks.add({
				id: "art-1",
				blob,
				format: "image/png",
				description: "Front cover",
			});
			const result = await artworksRepository.getByIds(["art-1"]);
			expect(result.ok).toHaveLength(1);
			expect(result.ok[0]?.id).toBe("art-1");
			expect(result.ok[0]?.format).toBe("image/png");
			expect(result.quarantinedIds).toEqual([]);
		});

		it("returns empty ok list for non-existent ids", async () => {
			const result = await artworksRepository.getByIds(["ghost-1", "ghost-2"]);
			expect(result.ok).toEqual([]);
			expect(result.quarantinedIds).toEqual([]);
		});

		it("quarantines structurally corrupt artwork rows", async () => {
			// Seed a corrupt row directly via the raw table API.
			await db.table("artworks").add({
				id: "corrupt-art",
				blob: "not-a-blob", // violates the Blob instanceof check
				format: "image/png",
			});

			const warnSpy = spyOnConsoleWarn();
			const result = await artworksRepository.getByIds(["corrupt-art"]);
			expect(result.ok).toEqual([]);
			expect(result.quarantinedIds).toEqual(["corrupt-art"]);
			expect(warnSpy).toHaveBeenCalledTimes(1);
		});

		it("separates valid and corrupt rows in a mixed batch", async () => {
			const blob = new Blob(["test"], { type: "image/jpeg" });
			await db.artworks.add({ id: "valid-art", blob, format: "image/jpeg" });
			await db.table("artworks").add({
				id: "corrupt-art",
				blob: 42,
				format: "image/png",
			});
			const result = await artworksRepository.getByIds([
				"valid-art",
				"corrupt-art",
			]);
			expect(result.ok).toHaveLength(1);
			expect(result.ok[0]?.id).toBe("valid-art");
			expect(result.quarantinedIds).toEqual(["corrupt-art"]);
		});
	});
});
