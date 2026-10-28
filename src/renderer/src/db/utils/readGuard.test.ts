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

import { MAX_DISPLAY_MISSING } from "@renderer/db/constants";
import type { Metadata } from "@shared/schemas/track.schema";
import { makeTrack } from "@tests/factories";
import { guardTrack, guardTracks, isStructurallyValidTrack } from "./readGuard";

/** Mutates a raw row fixture to simulate one flavor of engine-level corruption. */
type RowCorruptor = (row: Record<string, unknown>) => void;

/** Builds a structurally corrupt row fixture. */
function corruptRow(
	mutate: RowCorruptor,
	id = "corrupt-1",
): Record<string, unknown> {
	const row: Record<string, unknown> = { ...makeTrack({ id }) };
	mutate(row);
	return row;
}

/**
 * Silences and captures the quarantine diagnostic for assertions.
 */
function spyOnWarn() {
	return vi.spyOn(console, "warn").mockImplementation(() => {});
}

type WarnSpy = ReturnType<typeof spyOnWarn>;

/** Reads the [message, payload] pair of the spy's most recent call. */
function lastWarnCall(warnSpy: WarnSpy): readonly [unknown, unknown] {
	const calls = warnSpy.mock.calls;
	const last = calls[calls.length - 1];
	return [last?.[0], last?.[1]];
}

// --- isStructurallyValidTrack ---

describe("isStructurallyValidTrack", () => {
	describe("accepts schema-shaped rows", () => {
		it("accepts the default factory track", () => {
			expect(isStructurallyValidTrack(makeTrack({ id: "t1" }))).toBe(true);
		});

		it("accepts a failed row carrying a string reason", () => {
			const row: Record<string, unknown> = {
				...makeTrack({ id: "t1" }),
				status: "failed",
				reason: "FFmpeg exited with code 1",
			};
			expect(isStructurallyValidTrack(row)).toBe(true);
		});

		it("accepts a row with a valid statusSeq", () => {
			const row: Record<string, unknown> = {
				...makeTrack({ id: "t1" }),
				statusSeq: 3,
			};
			expect(isStructurallyValidTrack(row)).toBe(true);
		});

		it("accepts every non-failed status value", () => {
			for (const status of ["pending", "processing", "completed"]) {
				const row: Record<string, unknown> = {
					...makeTrack({ id: `t-${status}` }),
					status,
				};
				expect(isStructurallyValidTrack(row)).toBe(true);
			}
		});

		it("narrows unknown to Metadata for property access (compile-time proof)", () => {
			const row: unknown = makeTrack({ id: "t1" });
			if (isStructurallyValidTrack(row)) {
				expect(row.id).toBe("t1");
				expect(row.selected === 0 || row.selected === 1).toBe(true);
			} else {
				throw new Error("expected the factory row to be valid");
			}
		});
	});

	describe("rejects non-object rows", () => {
		it.each([
			["null", null],
			["undefined", undefined],
			["string", "track"],
			["number", 42],
			["boolean", true],
			["array", []],
			["function", () => undefined],
		])("rejects %s", (_label, value) => {
			expect(isStructurallyValidTrack(value)).toBe(false);
		});
	});

	describe("rejects invalid identity fields", () => {
		it.each<[string, RowCorruptor]>([
			[
				"empty id",
				(r) => {
					r.id = "";
				},
			],
			[
				"whitespace-only id",
				(r) => {
					r.id = "  ";
				},
			],
			[
				"non-string id",
				(r) => {
					r.id = 42;
				},
			],
			[
				"missing id",
				(r) => {
					delete r.id;
				},
			],
			[
				"empty file",
				(r) => {
					r.file = "";
				},
			],
			[
				"missing file",
				(r) => {
					delete r.file;
				},
			],
			[
				"empty filePath",
				(r) => {
					r.filePath = "";
				},
			],
			[
				"missing filePath",
				(r) => {
					delete r.filePath;
				},
			],
		])("rejects a row with %s", (_label, mutate) => {
			expect(isStructurallyValidTrack(corruptRow(mutate))).toBe(false);
		});
	});

	describe("rejects invalid status / selected", () => {
		it.each<[string, RowCorruptor]>([
			[
				"unknown status",
				(r) => {
					r.status = "done";
				},
			],
			[
				"wrong-case status",
				(r) => {
					r.status = "PENDING";
				},
			],
			[
				"non-string status",
				(r) => {
					r.status = 1;
				},
			],
			[
				"missing status",
				(r) => {
					delete r.status;
				},
			],
			[
				"selected = 2",
				(r) => {
					r.selected = 2;
				},
			],
			[
				"selected = -1",
				(r) => {
					r.selected = -1;
				},
			],
			[
				"selected = true",
				(r) => {
					r.selected = true;
				},
			],
			[
				'selected = "1"',
				(r) => {
					r.selected = "1";
				},
			],
			[
				"selected = null",
				(r) => {
					r.selected = null;
				},
			],
			[
				"missing selected",
				(r) => {
					delete r.selected;
				},
			],
		])("rejects a row with %s", (_label, mutate) => {
			expect(isStructurallyValidTrack(corruptRow(mutate))).toBe(false);
		});
	});

	describe("collectionIds", () => {
		it.each<[string, RowCorruptor]>([
			[
				"a string",
				(r) => {
					r.collectionIds = "all";
				},
			],
			[
				"null",
				(r) => {
					r.collectionIds = null;
				},
			],
			[
				"missing",
				(r) => {
					delete r.collectionIds;
				},
			],
			[
				"a non-string member",
				(r) => {
					r.collectionIds = ["all", 42];
				},
			],
		])("rejects collectionIds that are %s", (_label, mutate) => {
			expect(isStructurallyValidTrack(corruptRow(mutate))).toBe(false);
		});

		it("accepts an empty array", () => {
			const valid = isStructurallyValidTrack(
				corruptRow((r) => {
					r.collectionIds = [];
				}),
			);
			expect(valid).toBe(true);
		});

		it("accepts an empty-string member (cheap-guard boundary)", () => {
			const valid = isStructurallyValidTrack(
				corruptRow((r) => {
					r.collectionIds = ["all", ""];
				}),
			);
			expect(valid).toBe(true);
		});
	});

	describe("common / format (U-01 crash scenario)", () => {
		it.each<[string, RowCorruptor]>([
			[
				"missing common",
				(r) => {
					delete r.common;
				},
			],
			[
				"common = null",
				(r) => {
					r.common = null;
				},
			],
			[
				"common = string",
				(r) => {
					r.common = "nope";
				},
			],
			[
				"common = array",
				(r) => {
					r.common = [];
				},
			],
			[
				"missing format",
				(r) => {
					delete r.format;
				},
			],
			[
				"format = null",
				(r) => {
					r.format = null;
				},
			],
			[
				"format = string",
				(r) => {
					r.format = "nope";
				},
			],
		])("rejects a row with %s", (_label, mutate) => {
			expect(isStructurallyValidTrack(corruptRow(mutate))).toBe(false);
		});
	});

	describe("statusSeq", () => {
		it.each<[string, unknown]>([
			["zero", 0],
			["negative", -1],
			["fractional", 1.5],
			["NaN", Number.NaN],
			["string", "3"],
			["null", null],
		])("rejects statusSeq = %s", (_label, value) => {
			const valid = isStructurallyValidTrack(
				corruptRow((r) => {
					r.statusSeq = value;
				}),
			);
			expect(valid).toBe(false);
		});

		it("accepts a missing statusSeq (optional field)", () => {
			const valid = isStructurallyValidTrack(
				corruptRow((r) => {
					delete r.statusSeq;
				}),
			);
			expect(valid).toBe(true);
		});
	});

	describe("failed-status reason invariant", () => {
		it("rejects a failed row without reason", () => {
			const valid = isStructurallyValidTrack(
				corruptRow((r) => {
					r.status = "failed";
				}),
			);
			expect(valid).toBe(false);
		});

		it("rejects a failed row with a non-string reason", () => {
			const valid = isStructurallyValidTrack(
				corruptRow((r) => {
					r.status = "failed";
					r.reason = 42;
				}),
			);
			expect(valid).toBe(false);
		});

		it("accepts a non-failed row without reason", () => {
			const valid = isStructurallyValidTrack(
				corruptRow((r) => {
					delete r.reason;
				}),
			);
			expect(valid).toBe(true);
		});
	});
});

// --- guardTracks ---

describe("guardTracks", () => {
	let warnSpy: WarnSpy;

	beforeEach(() => {
		warnSpy = spyOnWarn();
	});

	it("returns all valid rows unchanged, by reference and order, without warning", () => {
		const first = makeTrack({ id: "t1" });
		const second = makeTrack({ id: "t2" });
		const result = guardTracks([first, second]);
		expect(result.ok).toHaveLength(2);
		expect(result.ok[0]).toBe(first);
		expect(result.ok[1]).toBe(second);
		expect(result.quarantinedIds).toEqual([]);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("returns empty result for empty input without warning", () => {
		expect(guardTracks([])).toEqual({ ok: [], quarantinedIds: [] });
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("quarantines corrupt rows and keeps valid ones", () => {
		const valid = makeTrack({ id: "t1" });
		const corrupt = corruptRow((r) => {
			delete r.common;
		}, "bad-1");
		const result = guardTracks([corrupt, valid]);
		expect(result.ok).toEqual([valid]);
		expect(result.quarantinedIds).toEqual(["bad-1"]);
	});

	it("warns once per batch with the count and the sanitized ids", () => {
		guardTracks([
			corruptRow((r) => {
				r.selected = 2;
			}, "bad-1"),
			corruptRow((r) => {
				delete r.common;
			}, "bad-2"),
			makeTrack({ id: "ok-1" }),
		]);
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy).toHaveBeenCalledWith(
			"[tracksRepository.read] quarantined structurally invalid rows",
			{ count: 2, ids: ["bad-1", "bad-2"] },
		);
	});

	it("uses the caller-supplied scope in the warning tag", () => {
		guardTracks(
			[
				corruptRow((r) => {
					delete r.format;
				}, "bad-1"),
			],
			"tracksRepository.getAll",
		);
		const [message] = lastWarnCall(warnSpy);
		expect(message).toBe(
			"[tracksRepository.getAll] quarantined structurally invalid rows",
		);
	});

	it("caps the logged id list at MAX_DISPLAY_MISSING while returning the full quarantine list", () => {
		const total = MAX_DISPLAY_MISSING + 3;
		const rows = Array.from({ length: total }, (_, i) =>
			corruptRow((r) => {
				delete r.common;
			}, `bad-${i}`),
		);
		const result = guardTracks(rows);
		expect(result.quarantinedIds).toHaveLength(total);
		const [, payload] = lastWarnCall(warnSpy);
		expect(payload).toMatchObject({ count: total });
		if (typeof payload === "object" && payload !== null && "ids" in payload) {
			expect(payload.ids).toHaveLength(MAX_DISPLAY_MISSING);
		} else {
			throw new Error("expected the warn payload to carry an ids list");
		}
	});

	it("sanitizes control characters in quarantined ids (log-injection defense)", () => {
		const result = guardTracks([
			corruptRow((r) => {
				delete r.common;
			}, "bad\u001b[31mid\u0007"),
		]);
		expect(result.quarantinedIds).toEqual(["bad\uFFFD[31mid\uFFFD"]);
		expect(warnSpy).toHaveBeenCalledWith(
			"[tracksRepository.read] quarantined structurally invalid rows",
			{ count: 1, ids: ["bad\uFFFD[31mid\uFFFD"] },
		);
	});

	it("caps a single logged id at 64 characters (log-flooding defense)", () => {
		const longId = "x".repeat(200);
		const result = guardTracks([
			corruptRow((r) => {
				delete r.common;
			}, longId),
		]);
		expect(result.quarantinedIds[0]).toHaveLength(64);
	});

	it("describes rows with unreadable ids as '<no-id>'", () => {
		const result = guardTracks([
			corruptRow((r) => {
				delete r.id;
			}),
			corruptRow((r) => {
				r.id = "";
			}, "ignored"),
			corruptRow((r) => {
				r.id = 42;
			}, "ignored"),
			null,
			"not-a-row",
		]);
		expect(result.ok).toEqual([]);
		expect(result.quarantinedIds).toEqual([
			"<no-id>",
			"<no-id>",
			"42",
			"<no-id>",
			"<no-id>",
		]);
	});

	// Pins migrated from the removed `uniqueTracks` suite (last-wins dedupe).
	it("returns tracks unchanged when ids are unique", () => {
		const first = makeTrack({ id: "t1" });
		const second = makeTrack({ id: "t2" });
		expect(guardTracks([first, second]).ok).toEqual([first, second]);
	});

	it("keeps the last occurrence when duplicated ids are present, at the first-seen position", () => {
		const first = makeTrack({ id: "t1", filePath: "/music/first.mp3" });
		const second = makeTrack({ id: "t2", filePath: "/music/second.mp3" });
		const duplicate = makeTrack({ id: "t1", filePath: "/music/duplicate.mp3" });
		const result = guardTracks([first, second, duplicate]);
		expect(result.ok.map((track) => track.id)).toEqual(["t1", "t2"]);
		expect(result.ok[0]?.filePath).toBe("/music/duplicate.mp3");
		expect(result.ok[1]?.filePath).toBe("/music/second.mp3");
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("quarantines rows with empty or whitespace-only ids instead of dropping them silently", () => {
		const valid = makeTrack({ id: "t1" });
		const emptyId = corruptRow((r) => {
			r.id = "";
		});
		const blankId = corruptRow((r) => {
			r.id = "   ";
		});
		const result = guardTracks([emptyId, valid, blankId]);
		expect(result.ok).toEqual([valid]);
		expect(result.quarantinedIds).toEqual(["<no-id>", "<no-id>"]);
		expect(warnSpy).toHaveBeenCalledTimes(1);
	});
});

// --- guardTrack ---

describe("guardTrack", () => {
	let warnSpy: WarnSpy;

	beforeEach(() => {
		warnSpy = spyOnWarn();
	});

	it("returns undefined silently when the row is absent (normal miss)", () => {
		expect(guardTrack(undefined, "missing")).toBeUndefined();
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("returns a valid row by reference without warning", () => {
		const row = makeTrack({ id: "t1" });
		expect(guardTrack(row, "t1")).toBe(row);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("quarantines a corrupt row: undefined plus a warning naming the requested id", () => {
		const corrupt: unknown = corruptRow((r) => {
			delete r.common;
		}, "t1");
		expect(
			guardTrack(corrupt, "t1", "tracksRepository.getById"),
		).toBeUndefined();
		expect(warnSpy).toHaveBeenCalledWith(
			"[tracksRepository.getById] quarantined structurally invalid rows",
			{ count: 1, ids: ["t1"] },
		);
	});

	it("reports the requested id even when the stored row's own id is unreadable", () => {
		const corrupt: unknown = corruptRow((r) => {
			delete r.id;
		}, "ignored");
		expect(guardTrack(corrupt, "requested-id")).toBeUndefined();
		const [, payload] = lastWarnCall(warnSpy);
		expect(payload).toEqual({ count: 1, ids: ["requested-id"] });
	});

	it("sanitizes the requested id before logging it", () => {
		const corrupt: unknown = corruptRow((r) => {
			r.selected = 9;
		});
		expect(guardTrack(corrupt, "evil\u001bid")).toBeUndefined();
		const [, payload] = lastWarnCall(warnSpy);
		expect(payload).toEqual({ count: 1, ids: ["evil\uFFFDid"] });
	});
});

// Compile-time contract: the guard's output satisfies Metadata[] without assertions.
const typeContract: (rows: readonly unknown[]) => Metadata[] = (rows) =>
	guardTracks(rows).ok;
void typeContract;
