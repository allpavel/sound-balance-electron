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

import { ANYOF_CHUNK_SIZE } from "@shared/constants";
import { chunkedAnyOf, chunkedAnyOfKeys } from "./dbUtils";

type TestRow = { id: string; name: string; filePath: string };

/**
 * Creates a minimal Dexie EntityTable stub for unit-testing chunked helpers.
 * Strategy: structural stub with `where → anyOf → each/primaryKeys` chain.
 * Type-safe via explicit return type annotation (contract for test doubles).
 */
function createTableStub(rows: TestRow[]): {
	where: (index: string) => {
		anyOf: (keys: readonly unknown[]) => {
			each: (visit: (row: TestRow) => void) => Promise<void>;
			primaryKeys: () => Promise<string[]>;
		};
	};
} {
	return {
		where: (_index: string) => ({
			anyOf: (keys: readonly unknown[]) => ({
				each: async (visit: (row: TestRow) => void): Promise<void> => {
					const keySet = new Set(keys);
					for (const row of rows) {
						if (keySet.has(row.id)) {
							visit(row);
						}
					}
				},
				primaryKeys: async (): Promise<string[]> => {
					const keySet = new Set(keys);
					return rows.filter((r) => keySet.has(r.id)).map((r) => r.id);
				},
			}),
		}),
	};
}

describe("chunkedAnyOf", () => {
	it("invokes visitor exactly once per matching row", async () => {
		const rows: TestRow[] = [
			{ id: "a", name: "Alpha", filePath: "/a.mp3" },
			{ id: "b", name: "Beta", filePath: "/b.mp3" },
			{ id: "c", name: "Gamma", filePath: "/c.mp3" },
		];
		const table = createTableStub(rows);
		const visited: string[] = [];
		await chunkedAnyOf(
			table as any, // Structural stub satisfies EntityTable contract at runtime
			"id",
			["a", "c"],
			(row: TestRow) => visited.push(row.id),
		);
		expect(visited).toEqual(["a", "c"]);
	});

	it("returns immediately without querying for empty keys", async () => {
		const whereSpy = vi.fn();
		const table = { where: whereSpy };
		await chunkedAnyOf(table as any, "id", [], () => {});
		expect(whereSpy).not.toHaveBeenCalled();
	});

	it("chunks keys exceeding ANYOF_CHUNK_SIZE into multiple queries", async () => {
		const count = ANYOF_CHUNK_SIZE + 5;
		const rows: TestRow[] = Array.from({ length: count }, (_, i) => ({
			id: `row-${i}`,
			name: `Row ${i}`,
			filePath: `/music/row-${i}.mp3`,
		}));
		const table = createTableStub(rows);
		const visited: string[] = [];
		await chunkedAnyOf(
			table as any,
			"id",
			rows.map((r) => r.id),
			(row: TestRow) => visited.push(row.id),
		);
		expect(visited).toHaveLength(count);
	});

	it("handles N keys exactly at the chunk boundary (N = ANYOF_CHUNK_SIZE)", async () => {
		const rows: TestRow[] = Array.from(
			{ length: ANYOF_CHUNK_SIZE },
			(_, i) => ({
				id: `row-${i}`,
				name: `Row ${i}`,
				filePath: `/music/row-${i}.mp3`,
			}),
		);
		const table = createTableStub(rows);
		const visited: string[] = [];
		await chunkedAnyOf(
			table as any,
			"id",
			rows.map((r) => r.id),
			(row: TestRow) => visited.push(row.id),
		);
		expect(visited).toHaveLength(ANYOF_CHUNK_SIZE);
	});

	it("handles N+1 keys at the chunk boundary (N+1 = ANYOF_CHUNK_SIZE + 1)", async () => {
		const count = ANYOF_CHUNK_SIZE + 1;
		const rows: TestRow[] = Array.from({ length: count }, (_, i) => ({
			id: `row-${i}`,
			name: `Row ${i}`,
			filePath: `/music/row-${i}.mp3`,
		}));
		const table = createTableStub(rows);
		const visited: string[] = [];
		await chunkedAnyOf(
			table as any,
			"id",
			rows.map((r) => r.id),
			(row: TestRow) => visited.push(row.id),
		);
		// Two chunks: one full + one with a single element
		expect(visited).toHaveLength(count);
	});
});

describe("chunkedAnyOfKeys", () => {
	it("returns primary keys for matching rows only", async () => {
		const rows: TestRow[] = [
			{ id: "x", name: "X", filePath: "/x.mp3" },
			{ id: "y", name: "Y", filePath: "/y.mp3" },
			{ id: "z", name: "Z", filePath: "/z.mp3" },
		];
		const table = createTableStub(rows);
		const result = await chunkedAnyOfKeys(table as any, "id", ["x", "z"]);
		expect(result).toEqual(["x", "z"]);
	});

	it("returns empty array for empty keys without querying", async () => {
		const whereSpy = vi.fn();
		const table = { where: whereSpy };
		const result = await chunkedAnyOfKeys(table as any, "id", []);
		expect(result).toEqual([]);
		expect(whereSpy).not.toHaveBeenCalled();
	});

	it("returns empty array when no keys match", async () => {
		const rows: TestRow[] = [{ id: "a", name: "Alpha", filePath: "/a.mp3" }];
		const table = createTableStub(rows);
		const result = await chunkedAnyOfKeys(table as any, "id", [
			"ghost-1",
			"ghost-2",
		]);
		expect(result).toEqual([]);
	});

	it("chunks keys exceeding ANYOF_CHUNK_SIZE", async () => {
		const count = ANYOF_CHUNK_SIZE + 10;
		const rows: TestRow[] = Array.from({ length: count }, (_, i) => ({
			id: `k-${i}`,
			name: `Key ${i}`,
			filePath: `/music/k-${i}.mp3`,
		}));
		const table = createTableStub(rows);
		const result = await chunkedAnyOfKeys(
			table as any,
			"id",
			rows.map((r) => r.id),
		);
		expect(result).toHaveLength(count);
	});
});
