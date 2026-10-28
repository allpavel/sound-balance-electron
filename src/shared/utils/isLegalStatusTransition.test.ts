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

import { STATUS_VALUES } from "@shared/constants";
import type { Status } from "@shared/schemas/track.schema";
import {
	isLegalStatusTransition,
	LEGAL_TRANSITION_EDGES,
	STATUS_TRANSITIONS,
} from "./isLegalStatusTransition";

const edgeKey = (from: Status, to: Status): string => `${from}->${to}`;

/**
 * Full 4×4 Cartesian product of every `from → to` status pair.
 * Consumed by `it.each` to exhaustively verify the predicate against
 * both legal and illegal transitions without manual enumeration.
 */
const matrixCases = STATUS_VALUES.flatMap((from) =>
	STATUS_VALUES.map((to) => ({
		from,
		to,
		legal: LEGAL_TRANSITION_EDGES.has(edgeKey(from, to)),
	})),
);

/**
 * Flattened edge list derived from `STATUS_TRANSITIONS`.
 * Each entry represents one declared adjacency so that target validity
 * can be asserted per-edge rather than per-row.
 */
const transitionTargetCases = STATUS_VALUES.flatMap((from) =>
	STATUS_TRANSITIONS[from].map((to) => ({ from, to })),
);

/**
 * All statuses except `"pending"`, used to verify that no transition
 * is allowed *into* the `"pending"` state from any other state.
 */
const nonPendingStatuses = STATUS_VALUES.filter(
	(status): status is Status => status !== "pending",
);

describe("STATUS_TRANSITIONS — structural invariants", () => {
	it.each(STATUS_VALUES)(
		"defines an adjacency list for '%s' (completeness)",
		(status) => {
			expect(STATUS_TRANSITIONS).toHaveProperty(status);
		},
	);

	it.each(transitionTargetCases)(
		"$from -> $to references a valid status",
		({ to }) => {
			expect(STATUS_VALUES).toContain(to);
		},
	);

	it.each(STATUS_VALUES)(
		"'%s' never allows a self-transition (duplicates must stay no-ops)",
		(status) => {
			expect(STATUS_TRANSITIONS[status]).not.toContain(status);
		},
	);

	it.each(nonPendingStatuses)(
		"'%s' never transitions back to pending (no implicit re-queue)",
		(status) => {
			expect(STATUS_TRANSITIONS[status]).not.toContain("pending");
		},
	);

	it("contains exactly the expected number of legal edges", () => {
		const totalEdges = STATUS_VALUES.reduce(
			(sum, status) => sum + STATUS_TRANSITIONS[status].length,
			0,
		);
		expect(totalEdges).toBe(LEGAL_TRANSITION_EDGES.size);
	});
});

describe("isLegalStatusTransition — exhaustive 4×4 matrix", () => {
	it.each(matrixCases)("$from -> $to", ({ from, to, legal }) => {
		expect(isLegalStatusTransition(from, to)).toBe(legal);
	});
});

describe("isLegalStatusTransition — regression pins", () => {
	it("allows pending -> completed (forward-skip for out-of-order delivery)", () => {
		expect(isLegalStatusTransition("pending", "completed")).toBe(true);
	});

	it("allows pending -> failed (forward-skip for out-of-order delivery)", () => {
		expect(isLegalStatusTransition("pending", "failed")).toBe(true);
	});

	it("allows completed -> processing (explicit re-run)", () => {
		expect(isLegalStatusTransition("completed", "processing")).toBe(true);
	});

	it("allows failed -> processing (explicit retry)", () => {
		expect(isLegalStatusTransition("failed", "processing")).toBe(true);
	});

	it("rejects completed -> failed (backward edge)", () => {
		expect(isLegalStatusTransition("completed", "failed")).toBe(false);
	});

	it("rejects failed -> completed (backward edge)", () => {
		expect(isLegalStatusTransition("failed", "completed")).toBe(false);
	});
});
