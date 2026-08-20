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
import { truncateParsedFfmpegOutput } from "./truncateParsedFfmpegOutput";

const MAX_MESSAGE_LENGTH = 300;
const ELLIPSIS = "…";

describe("truncateParsedFfmpegOutput", () => {
	it("returns empty string unchanged", () => {
		expect(truncateParsedFfmpegOutput("")).toBe("");
	});

	it("returns short messages unchanged", () => {
		const message = "Error: codec not found";
		expect(truncateParsedFfmpegOutput(message)).toBe(message);
	});

	it("returns unicode messages unchanged when under the limit", () => {
		const message = "Error: ñ é ü 日本語";
		expect(truncateParsedFfmpegOutput(message)).toBe(message);
	});

	it("returns message unchanged when length is exactly at the limit", () => {
		const message = "x".repeat(MAX_MESSAGE_LENGTH);
		expect(truncateParsedFfmpegOutput(message)).toBe(message);
	});

	it("truncates message when length exceeds the limit", () => {
		const message = "x".repeat(MAX_MESSAGE_LENGTH + 1);
		const result = truncateParsedFfmpegOutput(message);
		expect(result).toHaveLength(MAX_MESSAGE_LENGTH);
		expect(result.endsWith(ELLIPSIS)).toBe(true);
	});

	it("preserves the beginning of truncated message", () => {
		const message = `Error: ${"x".repeat(MAX_MESSAGE_LENGTH + 100)}`;
		const result = truncateParsedFfmpegOutput(message);
		expect(result.startsWith("Error: x")).toBe(true);
	});

	it("produces exact expected truncated string", () => {
		const message = "x".repeat(MAX_MESSAGE_LENGTH + 10);
		const result = truncateParsedFfmpegOutput(message);
		expect(result).toBe(
			`${"x".repeat(MAX_MESSAGE_LENGTH - ELLIPSIS.length)}${ELLIPSIS}`,
		);
	});

	it("always returns maximum length for over-limit input", () => {
		const message = "y".repeat(10_000);
		const result = truncateParsedFfmpegOutput(message);
		expect(result).toHaveLength(MAX_MESSAGE_LENGTH);
	});
});
