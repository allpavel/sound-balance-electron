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

import { MAX_DISPLAY_MISSING } from "@shared/constants";
import { quarantineMessage } from "@shared/utils";
import { expectedQuarantineWarning } from "./quarantinePayload";

describe("expectedQuarantineWarning", () => {
	describe("payload shape", () => {
		it("builds the [message, payload] tuple with count = ids.length", () => {
			const [message, payload] = expectedQuarantineWarning(
				"tracksRepository.getAll",
				["corrupt-1"],
			);
			expect(message).toBe(quarantineMessage("tracksRepository.getAll"));
			expect(payload).toEqual({ count: 1, ids: ["corrupt-1"] });
		});

		it("caps the logged ids at MAX_DISPLAY_MISSING while keeping count complete", () => {
			const total = MAX_DISPLAY_MISSING + 3;
			const ids = Array.from({ length: total }, (_, i) => `bad-${i}`);
			const [, payload] = expectedQuarantineWarning("scope", ids);
			expect(payload.count).toBe(total);
			expect(payload.ids).toHaveLength(MAX_DISPLAY_MISSING);
			expect(payload.ids).toEqual(ids.slice(0, MAX_DISPLAY_MISSING));
		});

		it("returns an empty ids array and zero count for no quarantined ids", () => {
			const [, payload] = expectedQuarantineWarning("scope", []);
			expect(payload).toEqual({ count: 0, ids: [] });
		});

		it("preserves the exact order of the input ids (no reordering)", () => {
			const ids = ["z", "a", "m"];
			const [, payload] = expectedQuarantineWarning("scope", ids);
			expect(payload.ids).toEqual(["z", "a", "m"]);
		});

		it("produces a readonly tuple (callers cannot mutate the shape)", () => {
			const result = expectedQuarantineWarning("scope", ["a"]);
			expect(Object.isFrozen(result)).toBe(true);
		});
	});

	describe("message derivation", () => {
		it("delegates to quarantineMessage so scope changes are one edit", () => {
			const [message] = expectedQuarantineWarning("customScope", []);
			expect(message).toBe(
				`[customScope] quarantined structurally invalid rows`,
			);
		});

		it("sanitizes control characters in the scope (delegated to quarantineMessage)", () => {
			const [message] = expectedQuarantineWarning(
				"tracksRepository.getAll\u001b[31m",
				[],
			);
			expect(message).not.toContain("\u001b");
			expect(message).toContain("\uFFFD");
		});
	});
});
