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
import { parseFfmpegError } from "./parseFfmpegError";

const MAX_MESSAGE_LENGTH = 300;
const ELLIPSIS = "…";
const BOM = "\uFEFF";
const ESC = String.fromCharCode(0x1b);

describe("parseFfmpegError", () => {
	describe("input validation and no-message contract", () => {
		it("returns null for empty input", () => {
			expect(parseFfmpegError("")).toBeNull();
		});

		it("returns null for whitespace-only input", () => {
			expect(parseFfmpegError("\n\t\n   ")).toBeNull();
		});

		it("returns null for non-string input", () => {
			expect(parseFfmpegError(null)).toBeNull();
			expect(parseFfmpegError(undefined)).toBeNull();
			expect(parseFfmpegError(42)).toBeNull();
			expect(parseFfmpegError({})).toBeNull();
			expect(parseFfmpegError([])).toBeNull();
		});

		it("returns null when input contains only BOM", () => {
			expect(parseFfmpegError(BOM)).toBeNull();
			expect(parseFfmpegError(`${BOM}${BOM}`)).toBeNull();
		});

		it("returns null when input contains only ANSI escape sequences", () => {
			const stderr = `${ESC}[31m${ESC}[0m`;
			expect(parseFfmpegError(stderr)).toBeNull();
		});

		it("returns null when only FFmpeg banner lines exist", () => {
			const stderr = [
				"ffmpeg version 7.0.2-static https://johnvansickle.com/ffmpeg/",
				"  built with gcc 8 (Debian 8.3.0-6)",
				"  configuration: --enable-gpl --enable-version3 --enable-static",
				"  libavutil      59.  8.100 / 59.  8.100",
			].join("\n");
			expect(parseFfmpegError(stderr)).toBeNull();
		});

		it("returns null when input contains only empty bracketed lines", () => {
			const stderr = ["[info]", "[debug]"].join("\n");
			expect(parseFfmpegError(stderr)).toBeNull();
		});
	});

	describe("explicit Error line extraction", () => {
		it("filters out FFmpeg version banner and returns the Error line", () => {
			const stderr = [
				"ffmpeg version 7.0.2-static https://johnvansickle.com/ffmpeg/  Copyright (c) 2000-2024 the FFmpeg developers",
				"  built with gcc 8 (Debian 8.3.0-6)",
				"  configuration: --enable-gpl --enable-version3 --enable-static",
				"  libavutil      59.  8.100 / 59.  8.100",
				"  libavcodec     61.  3.100 / 61.  3.100",
				"Error opening input files: No such file or directory",
			].join("\n");
			expect(parseFfmpegError(stderr)).toBe(
				"Error opening input files: No such file or directory",
			);
		});

		it("returns the last explicit Error line when multiple exist", () => {
			const stderr = [
				"[in#0 @ 0x3b3f6a80] Error opening input: No such file or directory",
				"Error opening input file /home/user/file.mp3.",
				"Error opening input files: No such file or directory",
			].join("\n");
			expect(parseFfmpegError(stderr)).toBe(
				"Error opening input files: No such file or directory",
			);
		});

		it("returns the last Error line after stripping bracketed prefixes", () => {
			const stderr = ["Error: first", "[a] Error: second"].join("\n");
			expect(parseFfmpegError(stderr)).toBe("Error: second");
		});

		it("extracts error from bracketed FFmpeg prefix", () => {
			const stderr =
				"[in#0 @ 0x3b3f6a80] Error opening input: No such file or directory";
			expect(parseFfmpegError(stderr)).toBe(
				"Error opening input: No such file or directory",
			);
		});

		it("strips multiple leading bracketed prefixes before matching", () => {
			const stderr = "[stream] [decoder] Error: failed to decode";
			expect(parseFfmpegError(stderr)).toBe("Error: failed to decode");
		});

		it("treats a line as explicit Error after removing leading bracket prefix", () => {
			const stderr = "[decoder] Error in the middle";
			expect(parseFfmpegError(stderr)).toBe("Error in the middle");
		});

		it("matches an Error line with leading whitespace", () => {
			const stderr = "   Error: padded failure";
			expect(parseFfmpegError(stderr)).toBe("Error: padded failure");
		});

		it("is case-insensitive for the Error prefix", () => {
			expect(parseFfmpegError("error: something failed")).toBe(
				"error: something failed",
			);
			expect(parseFfmpegError("ERROR: something failed")).toBe(
				"ERROR: something failed",
			);
		});

		it("handles an Error line containing only Error", () => {
			expect(parseFfmpegError("Error")).toBe("Error");
		});

		it("does not treat plural Errors as an explicit Error prefix", () => {
			const stderr = "Errors occurred";
			expect(parseFfmpegError(stderr)).toBe("Errors occurred");
		});

		it("removes BOM before explicit Error line", () => {
			const stderr = `${BOM}Error: bom failure`;
			expect(parseFfmpegError(stderr)).toBe("Error: bom failure");
		});

		it("removes BOM from a later line before matching", () => {
			const stderr = ["info", `${BOM}Error: bom failure`].join("\n");
			expect(parseFfmpegError(stderr)).toBe("Error: bom failure");
		});

		it("strips ANSI escape sequences before matching", () => {
			const stderr = `${ESC}[31mError: red failure${ESC}[0m`;
			expect(parseFfmpegError(stderr)).toBe("Error: red failure");
		});

		it("strips ANSI escape sequences from a later line before matching", () => {
			const stderr = ["info", `${ESC}[31mError: red failure${ESC}[0m`].join(
				"\n",
			);
			expect(parseFfmpegError(stderr)).toBe("Error: red failure");
		});

		it("handles CRLF line endings", () => {
			const stderr = "ffmpeg version 7.0\r\nError: codec not found\r\n";
			expect(parseFfmpegError(stderr)).toBe("Error: codec not found");
		});

		it("handles legacy lone CR line endings", () => {
			const stderr = "ffmpeg version 7.0\rError: legacy carriage return";
			expect(parseFfmpegError(stderr)).toBe("Error: legacy carriage return");
		});

		it("handles unicode and special characters", () => {
			const stderr = "Error: ñ é ü 日本語";
			expect(parseFfmpegError(stderr)).toBe("Error: ñ é ü 日本語");
		});

		it("handles the full real-world FFmpeg output from the issue", () => {
			const stderr = [
				"ffmpeg version 7.0.2-static https://johnvansickle.com/ffmpeg/  Copyright (c) 2000-2024 the FFmpeg developers",
				"built with gcc 8 (Debian 8.3.0-6)",
				"configuration: --enable-gpl --enable-version3 --enable-static --disable-debug --disable-ffplay --disable-indev=sndio --disable-outdev=sndio --cc=gcc --enable-fontconfig --enable-frei0r --enable-gnutls --enable-gmp --enable-libgme --enable-gray --enable-libaom --enable-libfribidi --enable-libass --enable-libvmaf --enable-libfreetype --enable-libmp3lame --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-librubberband --enable-libsoxr --enable-libspeex --enable-libsrt --enable-libvorbis --enable-libopus --enable-libtheora --enable-libvidstab --enable-libvo-amrwbenc --enable-libvpx --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxml2 --enable-libdav1d --enable-libxvid --enable-libzvbi --enable-libzimg",
				"libavutil      59.  8.100 / 59.  8.100",
				"libavcodec     61.  3.100 / 61.  3.100",
				"libavformat    61.  1.100 / 61.  1.100",
				"libavdevice    61.  1.100 / 61.  1.100",
				"libavfilter    10.  1.100 / 10.  1.100",
				"libswscale      8.  1.100 /  8.  1.100",
				"libswresample   5.  1.100 /  5.  1.100",
				"libpostproc    58.  1.100 / 58.  1.100",
				"[in#0 @ 0x3b3f6a80] Error opening input: No such file or directory",
				"Error opening input file /home/allpavel/Downloads/tempMusic/New Folder/04. My Immortal.mp3.",
				"Error opening input files: No such file or directory",
			].join("\n");
			expect(parseFfmpegError(stderr)).toBe(
				"Error opening input files: No such file or directory",
			);
		});
	});

	describe("concise fallback behavior", () => {
		it("returns the last meaningful line when no Error line exists", () => {
			const stderr = "Some warning\nAnother warning";
			expect(parseFfmpegError(stderr)).toBe("Another warning");
		});

		it("returns the only meaningful line when banner is followed by a single error", () => {
			const stderr = [
				"ffmpeg version 7.0",
				"libavutil  59. 8.100 / 59. 8.100",
				"Unknown encoder 'foo'",
			].join("\n");
			expect(parseFfmpegError(stderr)).toBe("Unknown encoder 'foo'");
		});

		it("returns the last meaningful line when multiple non-error lines exist", () => {
			const stderr = ["stderr1", "stderr2", "stderr3"].join("\n");
			expect(parseFfmpegError(stderr)).toBe("stderr3");
		});

		it("ignores empty lines while selecting the last meaningful line", () => {
			const stderr = ["warning one", "", "warning two", ""].join("\n");
			expect(parseFfmpegError(stderr)).toBe("warning two");
		});

		it("keeps banner-like line when it contains diagnostic information", () => {
			const stderr = "ffmpeg version 7.0 Error: codec not found";
			expect(parseFfmpegError(stderr)).toBe(
				"ffmpeg version 7.0 Error: codec not found",
			);
		});

		it("keeps lib banner-like line when it contains failure text", () => {
			const stderr = "libavutil 59.8.100 failed to initialize";
			expect(parseFfmpegError(stderr)).toBe(
				"libavutil 59.8.100 failed to initialize",
			);
		});

		it("does not treat non-leading Error substring as an explicit Error line", () => {
			const stderr = "Some Error in the middle";
			expect(parseFfmpegError(stderr)).toBe("Some Error in the middle");
		});

		it("does not remove non-leading bracketed text", () => {
			const stderr = "status [decoder] warning";
			expect(parseFfmpegError(stderr)).toBe("status [decoder] warning");
		});

		it("returns null when only banner and empty lines remain", () => {
			const stderr = [
				"ffmpeg version 7.0",
				"",
				"  built with gcc 8",
				"  configuration: --enable-gpl",
				"  libavutil      59.  8.100 / 59.  8.100",
				"",
			].join("\n");
			expect(parseFfmpegError(stderr)).toBeNull();
		});
	});

	describe("truncation integration", () => {
		it("truncates very long explicit Error lines", () => {
			const longPayload = "x".repeat(400);
			const stderr = `Error: ${longPayload}`;
			const result = parseFfmpegError(stderr);
			expect(result).not.toBeNull();
			const message = result as string;
			expect(message).toHaveLength(MAX_MESSAGE_LENGTH);
			expect(message.startsWith("Error: x")).toBe(true);
			expect(message.endsWith(ELLIPSIS)).toBe(true);
		});

		it("truncates very long fallback lines", () => {
			const longPayload = "y".repeat(400);
			const stderr = `warning: ${longPayload}`;
			const result = parseFfmpegError(stderr);
			expect(result).not.toBeNull();
			const message = result as string;
			expect(message).toHaveLength(MAX_MESSAGE_LENGTH);
			expect(message.startsWith("warning: y")).toBe(true);
			expect(message.endsWith(ELLIPSIS)).toBe(true);
		});
	});
});
