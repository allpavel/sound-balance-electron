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

import { sanitizeControlChars } from "./sanitizeControlChars";

describe("sanitizeControlChars", () => {
	describe("C0 controls and DEL", () => {
		it.each([
			["NUL", "\u0000"],
			["ESC", "\u001B"],
			["CR", "\u000D"],
			["LF", "\u000A"],
			["DEL", "\u007F"],
		])("replaces %s with U+FFFD", (_label, char) => {
			expect(sanitizeControlChars(`a${char}b`)).toBe("a\uFFFDb");
		});
	});

	describe("C1 controls (extended scope)", () => {
		it.each([
			["NEL", "\u0085"],
			["CSI", "\u009B"],
		])("replaces %s with U+FFFD", (_label, char) => {
			expect(sanitizeControlChars(`a${char}b`)).toBe("a\uFFFDb");
		});
	});

	describe("bidi overrides and isolates (extended scope)", () => {
		it.each([
			["LRE", "\u202A"],
			["RLO", "\u202E"],
			["LRI", "\u2066"],
			["PDI", "\u2069"],
		])("replaces %s with U+FFFD", (_label, char) => {
			expect(sanitizeControlChars(`a${char}b`)).toBe("a\uFFFDb");
		});
	});

	describe("scope exclusions", () => {
		it.each([
			["LRM", "\u200E"],
			["RLM", "\u200F"],
			["ALM", "\u061C"],
		])("leaves legitimate direction mark %s untouched", (_label, char) => {
			expect(sanitizeControlChars(`a${char}b`)).toBe(`a${char}b`);
		});
	});

	describe("contract", () => {
		it("returns the empty string unchanged", () => {
			expect(sanitizeControlChars("")).toBe("");
		});

		it("returns a clean string unchanged", () => {
			expect(sanitizeControlChars("tracks.0.status")).toBe("tracks.0.status");
		});

		it("replaces every occurrence in a single string", () => {
			expect(sanitizeControlChars("\u0000a\u001Bb\u007F")).toBe(
				"\uFFFDa\uFFFDb\uFFFD",
			);
		});

		it("preserves length (one code unit in, one code unit out)", () => {
			const hostile = "fi\u001Beld\u009Bna\u202Eme";
			expect(sanitizeControlChars(hostile)).toHaveLength(hostile.length);
		});

		it("passes U+FFFD through unchanged", () => {
			expect(sanitizeControlChars("a\uFFFDb")).toBe("a\uFFFDb");
		});

		it("is idempotent on hostile input", () => {
			const hostile = "field\u202Ename\u009B[2J";
			const once = sanitizeControlChars(hostile);
			expect(sanitizeControlChars(once)).toBe(once);
		});
	});

	describe("statelessness across calls (lastIndex regression)", () => {
		it("sanitizes identical hostile input on repeated calls", () => {
			const hostile = "x\u0000y";
			expect(sanitizeControlChars(hostile)).toBe("x\uFFFDy");
			expect(sanitizeControlChars(hostile)).toBe("x\uFFFDy");
			expect(sanitizeControlChars(hostile)).toBe("x\uFFFDy");
		});

		it("dirty -> dirty -> clean sequence never skips sanitization", () => {
			expect(sanitizeControlChars("a\u001Bb")).toBe("a\uFFFDb");
			expect(sanitizeControlChars("c\u009Bd")).toBe("c\uFFFDd");
			expect(sanitizeControlChars("clean")).toBe("clean");
		});
	});
});
