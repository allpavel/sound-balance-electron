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

describe("parseFfmpegError", () => {
	it("returns empty string for empty input", () => {
		expect(parseFfmpegError("")).toBe("");
	});

	it("returns empty string for whitespace-only input", () => {
		expect(parseFfmpegError("   \n  \t  \n")).toBe("");
	});

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

	it("returns the last 'Error' line when multiple exist", () => {
		const stderr = [
			"[in#0 @ 0x3b3f6a80] Error opening input: No such file or directory",
			"Error opening input file /home/user/file.mp3.",
			"Error opening input files: No such file or directory",
		].join("\n");
		expect(parseFfmpegError(stderr)).toBe(
			"Error opening input files: No such file or directory",
		);
	});

	it("falls back to all meaningful lines when no 'Error' line exists", () => {
		const stderr = "Some warning\nAnother warning";
		expect(parseFfmpegError(stderr)).toBe("Some warning\nAnother warning");
	});

	it("handles CRLF line endings", () => {
		const stderr = "ffmpeg version 7.0\r\nError: codec not found\r\n";
		expect(parseFfmpegError(stderr)).toBe("Error: codec not found");
	});

	it("handles the full real-world FFmpeg output from the issue", () => {
		const stderr = `ffmpeg version 7.0.2-static https://johnvansickle.com/ffmpeg/  Copyright (c) 2000-2024 the FFmpeg developers
  built with gcc 8 (Debian 8.3.0-6)
  configuration: --enable-gpl --enable-version3 --enable-static --disable-debug --disable-ffplay --disable-indev=sndio --disable-outdev=sndio --cc=gcc --enable-fontconfig --enable-frei0r --enable-gnutls --enable-gmp --enable-libgme --enable-gray --enable-libaom --enable-libfribidi --enable-libass --enable-libvmaf --enable-libfreetype --enable-libmp3lame --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-librubberband --enable-libsoxr --enable-libspeex --enable-libsrt --enable-libvorbis --enable-libopus --enable-libtheora --enable-libvidstab --enable-libvo-amrwbenc --enable-libvpx --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxml2 --enable-libdav1d --enable-libxvid --enable-libzvbi --enable-libzimg
  libavutil      59.  8.100 / 59.  8.100
  libavcodec     61.  3.100 / 61.  3.100
  libavformat    61.  1.100 / 61.  1.100
  libavdevice    61.  1.100 / 61.  1.100
  libavfilter    10.  1.100 / 10.  1.100
  libswscale      8.  1.100 /  8.  1.100
  libswresample   5.  1.100 /  5.  1.100
  libpostproc    58.  1.100 / 58.  1.100
[in#0 @ 0x3b3f6a80] Error opening input: No such file or directory
Error opening input file /home/allpavel/Downloads/tempMusic/New Folder/04. My Immortal.mp3.
Error opening input files: No such file or directory`;
		expect(parseFfmpegError(stderr)).toBe(
			"Error opening input files: No such file or directory",
		);
	});

	it("handles unicode and special characters", () => {
		const stderr = "Error: ñ é ü 日本語";
		expect(parseFfmpegError(stderr)).toBe("Error: ñ é ü 日本語");
	});

	it("ignores 'Error' substrings that are not at the start of a line", () => {
		const stderr = "Some Error in the middle\nAnother line";
		expect(parseFfmpegError(stderr)).toBe(
			"Some Error in the middle\nAnother line",
		);
	});

	it("is case-insensitive for the 'Error' prefix", () => {
		const stderr = "error: something failed";
		expect(parseFfmpegError(stderr)).toBe("error: something failed");
	});

	it("does not match lines that merely start with 'lib' but aren't banner lines", () => {
		const stderr = "libavcodec not found";
		expect(parseFfmpegError(stderr)).toBe("libavcodec not found");
	});

	it("returns the only meaningful line when banner is followed by a single error", () => {
		const stderr =
			"ffmpeg version 7.0\n  libavutil  59. 8.100 / 59. 8.100\nUnknown encoder 'foo'";
		expect(parseFfmpegError(stderr)).toBe("Unknown encoder 'foo'");
	});

	it("preserves multi-line fallback without trailing newlines", () => {
		const stderr = "stderr1\nstderr2\nstderr3\n";
		expect(parseFfmpegError(stderr)).toBe("stderr1\nstderr2\nstderr3");
	});
});
