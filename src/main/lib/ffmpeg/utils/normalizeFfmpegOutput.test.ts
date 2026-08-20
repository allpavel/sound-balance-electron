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
	normalizeFfmpegInput,
	normalizeFfmpegLine,
} from "./normalizeFfmpegOutput";

const BOM = "\uFEFF";
const ESC = String.fromCharCode(0x1b);
const CSI = String.fromCharCode(0x9b);

describe("normalizeFfmpegInput", () => {
	it("removes a leading BOM", () => {
		expect(normalizeFfmpegInput(`${BOM}Error: failure`)).toBe("Error: failure");
	});

	it("removes multiple leading BOM characters", () => {
		expect(normalizeFfmpegInput(`${BOM}${BOM}Error: failure`)).toBe(
			"Error: failure",
		);
	});

	it("does not remove BOM characters outside the start of the string", () => {
		expect(normalizeFfmpegInput(`foo${BOM}bar`)).toBe(`foo${BOM}bar`);
	});

	it("removes ANSI ESC escape sequences globally", () => {
		const input = `${ESC}[31mError: red failure${ESC}[0m`;
		expect(normalizeFfmpegInput(input)).toBe("Error: red failure");
	});

	it("removes CSI escape sequences", () => {
		const input = `${CSI}31mError: failure`;
		expect(normalizeFfmpegInput(input)).toBe("Error: failure");
	});

	it("trims leading and trailing whitespace", () => {
		expect(normalizeFfmpegInput("   Error: failure   ")).toBe("Error: failure");
	});

	it("returns empty string for whitespace-only input", () => {
		expect(normalizeFfmpegInput("\n\t   ")).toBe("");
	});

	it("does not remove leading bracket prefixes", () => {
		expect(normalizeFfmpegInput("[decoder] Error: failure")).toBe(
			"[decoder] Error: failure",
		);
	});
});

describe("normalizeFfmpegLine", () => {
	it("applies input normalization before bracket prefix removal", () => {
		const input = `${ESC}[31m[decoder] Error: failure${ESC}[0m`;
		expect(normalizeFfmpegLine(input)).toBe("Error: failure");
	});

	it("removes a single leading bracket prefix", () => {
		expect(normalizeFfmpegLine("[in#0 @ 0x1] Error: failure")).toBe(
			"Error: failure",
		);
	});

	it("removes multiple leading bracket prefixes", () => {
		expect(normalizeFfmpegLine("[stream] [decoder] Error: failure")).toBe(
			"Error: failure",
		);
	});

	it("removes bracket prefixes separated by spaces", () => {
		expect(normalizeFfmpegLine("[a]   [b]   text")).toBe("text");
	});

	it("removes bracket prefixes followed by tabs", () => {
		expect(normalizeFfmpegLine("[a]\ttext")).toBe("text");
	});

	it("removes leading bracket prefix when line has leading whitespace", () => {
		expect(normalizeFfmpegLine("   [a] text")).toBe("text");
	});

	it("does not remove non-leading bracketed text", () => {
		expect(normalizeFfmpegLine("status [decoder] warning")).toBe(
			"status [decoder] warning",
		);
	});

	it("does not remove unclosed leading bracket text", () => {
		expect(normalizeFfmpegLine("[unclosed text")).toBe("[unclosed text");
	});

	it("returns empty string for bracket-only line", () => {
		expect(normalizeFfmpegLine("[info]")).toBe("");
	});

	it("returns empty string for whitespace-only line", () => {
		expect(normalizeFfmpegLine("   \t ")).toBe("");
	});
});
