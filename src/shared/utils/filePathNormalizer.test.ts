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

import type { PLATFORM } from "@shared/constants";
import { normalizeFilePath } from "./filePathNormalizer";

describe("filePathNormalizer", () => {
	describe("normalizeFilePath — case-insensitive platforms", () => {
		it.each<PLATFORM>(["win32", "darwin"])(
			"lowercases an ASCII path on %s",
			(platform) => {
				expect(normalizeFilePath("C:/Music/Track.MP3", platform)).toBe(
					"c:/music/track.mp3",
				);
			},
		);

		it.each<PLATFORM>(["win32", "darwin"])(
			"lowercases a Unicode path on %s",
			(platform) => {
				expect(normalizeFilePath("/Music/Élément.MP3", platform)).toBe(
					"/music/élément.mp3",
				);
			},
		);

		it.each<PLATFORM>(["win32", "darwin"])(
			"lowercases a Windows UNC path on %s",
			(platform) => {
				expect(normalizeFilePath("\\\\SERVER\\Share\\File.MP3", platform)).toBe(
					"\\\\server\\share\\file.mp3",
				);
			},
		);

		it.each<PLATFORM>(["win32", "darwin"])(
			"is idempotent on %s (already-normalized path is unchanged)",
			(platform) => {
				const normalized = "c:/music/track.mp3";
				expect(normalizeFilePath(normalized, platform)).toBe(normalized);
			},
		);

		it("returns empty string unchanged", () => {
			expect(normalizeFilePath("", "win32")).toBe("");
		});
	});

	describe("normalizeFilePath — case-sensitive platform (linux)", () => {
		it("preserves case on Linux", () => {
			expect(normalizeFilePath("/Music/Track.MP3", "linux")).toBe(
				"/Music/Track.MP3",
			);
		});

		it("preserves Unicode case on Linux", () => {
			expect(normalizeFilePath("/Music/Élément.MP3", "linux")).toBe(
				"/Music/Élément.MP3",
			);
		});

		it("is idempotent on Linux (no transformation)", () => {
			const path = "/Music/Track.MP3";
			expect(normalizeFilePath(path, "linux")).toBe(path);
		});
	});

	describe("cross-platform consistency", () => {
		it("produces the same key for 'C:/A.MP3' and 'c:/a.mp3' on Windows", () => {
			expect(normalizeFilePath("C:/A.MP3", "win32")).toBe(
				normalizeFilePath("c:/a.mp3", "win32"),
			);
		});

		it("produces the same key for '/Music/Track.MP3' and '/music/track.mp3' on macOS", () => {
			expect(normalizeFilePath("/Music/Track.MP3", "darwin")).toBe(
				normalizeFilePath("/music/track.mp3", "darwin"),
			);
		});

		it("produces DIFFERENT keys for paths differing only by case on Linux", () => {
			expect(normalizeFilePath("/Music/Track.MP3", "linux")).not.toBe(
				normalizeFilePath("/music/track.mp3", "linux"),
			);
		});
	});

	describe("normalizeFilePath — Unicode NFC folding", () => {
		it.each<PLATFORM>(["win32", "darwin", "linux"])(
			"composes NFD input to NFC before folding on %s",
			(platform) => {
				// "É" as E + combining acute (NFD) → precomposed "É" (NFC).
				const nfdInput = "/Music/E\u0301le\u0301ment.MP3";
				const result = normalizeFilePath(nfdInput, platform);
				const expectedNfc = "/Music/\u00c9l\u00e9ment.MP3";
				const isCaseInsensitive = platform === "win32" || platform === "darwin";
				expect(result).toBe(
					isCaseInsensitive ? expectedNfc.toLowerCase() : expectedNfc,
				);
			},
		);

		it("NFC folding is idempotent (already-NFC input is unchanged)", () => {
			const nfc = "/Music/\u00c9l\u00e9ment.MP3";
			expect(normalizeFilePath(nfc, "darwin")).toBe(
				"/music/\u00e9l\u00e9ment.mp3",
			);
		});
	});
});
