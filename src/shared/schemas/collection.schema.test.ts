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

import {
	MAX_PATH_LENGTH,
	SYSTEM_COLLECTION_ID,
	SYSTEM_COLLECTION_TITLE,
} from "@shared/constants";
import {
	expectFailure,
	expectSuccess,
	hasIssueWithPath,
	hasIssueWithPathAndCode,
} from "@tests/utils";
import { activeCollectionSchema } from "./collection.schema";

const VALID_PAYLOAD = { id: "custom", title: "Mix" };

describe("activeCollectionSchema", () => {
	describe("accepts valid payloads", () => {
		it("accepts the system collection payload", () => {
			const data = expectSuccess(
				activeCollectionSchema.safeParse({
					id: SYSTEM_COLLECTION_ID,
					title: SYSTEM_COLLECTION_TITLE,
				}),
			);
			expect(data).toEqual({
				id: SYSTEM_COLLECTION_ID,
				title: SYSTEM_COLLECTION_TITLE,
			});
		});

		it("accepts a custom collection payload", () => {
			expect(
				expectSuccess(activeCollectionSchema.safeParse(VALID_PAYLOAD)),
			).toEqual(VALID_PAYLOAD);
		});
	});

	describe("rejects invalid ids", () => {
		it.each([
			["empty", ""],
			["whitespace-only", "   "],
			["null-byte", "col\u0000x"],
			["oversized", "a".repeat(MAX_PATH_LENGTH + 1)],
		])("rejects a %s id at the id path", (_label, id) => {
			const issues = expectFailure(
				activeCollectionSchema.safeParse({ ...VALID_PAYLOAD, id }),
			);
			expect(hasIssueWithPath(issues, ["id"])).toBe(true);
		});

		it.each([
			["a number", 42],
			["null", null],
			["undefined", undefined],
		])("rejects %s id", (_label, id) => {
			const issues = expectFailure(
				activeCollectionSchema.safeParse({ ...VALID_PAYLOAD, id }),
			);
			expect(hasIssueWithPath(issues, ["id"])).toBe(true);
		});
	});

	describe("rejects invalid titles", () => {
		it.each([
			["empty", ""],
			["whitespace-only", "  "],
			["a number", 7],
			["null", null],
		])("rejects %s title at the title path", (_label, title) => {
			const issues = expectFailure(
				activeCollectionSchema.safeParse({ ...VALID_PAYLOAD, title }),
			);
			expect(hasIssueWithPath(issues, ["title"])).toBe(true);
		});
	});

	describe("rejects malformed payloads", () => {
		it.each([
			["null", null],
			["a number", 42],
			["a string", "custom"],
			["an array", []],
		])("rejects %s payload", (_label, payload) => {
			expectFailure(activeCollectionSchema.safeParse(payload));
		});
		it("rejects unexpected keys (strict object)", () => {
			const issues = expectFailure(
				activeCollectionSchema.safeParse({ ...VALID_PAYLOAD, extra: 1 }),
			);
			// Zod reports strict violations as a single root-level
			// `unrecognized_keys` issue naming the offending keys.
			expect(hasIssueWithPathAndCode(issues, [], "unrecognized_keys")).toBe(
				true,
			);
			expect(issues.some((i) => i.message?.includes("extra"))).toBe(true);
		});
		it("rejects a payload missing the title", () => {
			const issues = expectFailure(
				activeCollectionSchema.safeParse({ id: "custom" }),
			);
			expect(hasIssueWithPath(issues, ["title"])).toBe(true);
		});
	});
});
