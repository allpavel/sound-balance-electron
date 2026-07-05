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
import fs from "node:fs/promises";
import { isDirectory } from "./isDirectory";

// biome-ignore-start lint/suspicious/noExplicitAny: no matter for tests
describe("isDirectory", () => {
	it("returns true for a valid directory", async () => {
		const statSpy = vi.spyOn(fs, "stat");
		statSpy.mockResolvedValue({ isDirectory: () => true } as any);
		const result = await isDirectory("/music");
		expect(result).toBe(true);
		expect(statSpy).toHaveBeenCalledWith("/music");
	});
	it("returns false for a file", async () => {
		const statSpy = vi.spyOn(fs, "stat");
		statSpy.mockResolvedValue({ isDirectory: () => false } as any);
		const result = await isDirectory("/music/song.mp3");
		expect(result).toBe(false);
		expect(statSpy).toHaveBeenCalledWith("/music/song.mp3");
	});
	it("throws an error if path is not a string", async () => {
		await expect(isDirectory(null as any)).rejects.toThrow(
			"Expected string for output directory path",
		);
	});
	it("throws an error when stat fails", async () => {
		const statSpy = vi.spyOn(fs, "stat");
		statSpy.mockRejectedValue(new Error("EACCES"));
		await expect(isDirectory("/music")).rejects.toThrow("EACCES");
	});
});
// biome-ignore-end lint/suspicious/noExplicitAny: no matter for tests
