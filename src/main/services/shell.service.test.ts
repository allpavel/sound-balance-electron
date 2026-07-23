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
import { shell } from "electron";
import { openOutputFolder } from "./shell.service";

describe("openOutputFolder.shell.service", () => {
	it("returns success: true when folder exists and opens", async () => {
		const shellSpy = vi.spyOn(shell, "openPath");
		const statSpy = vi.spyOn(fs, "stat");
		const event = {} as any;
		const folderPath = "/output";
		const mockResult = { success: true, reason: "" };
		statSpy.mockResolvedValue({} as any);
		shellSpy.mockResolvedValue("");
		const result = await openOutputFolder(event, folderPath);
		expect(result).toEqual(mockResult);
		expect(shell.openPath).toHaveBeenCalledWith(folderPath);
	});

	it("returns success: false when folder does not exist", async () => {
		const shellSpy = vi.spyOn(shell, "openPath");
		const statSpy = vi.spyOn(fs, "stat");
		const event = {} as any;
		const folderPath = "/output";
		const mockResult = { success: false, reason: "Folder doesn't exist." };
		const err = new Error("Folder does not exist.") as NodeJS.ErrnoException;
		err.code = "ENOENT";
		statSpy.mockRejectedValue(err);
		shellSpy.mockResolvedValue("");
		const result = await openOutputFolder(event, folderPath);
		expect(result).toEqual(mockResult);
	});

	it("returns permission error when stat throw EACCES", async () => {
		const shellSpy = vi.spyOn(shell, "openPath");
		const statSpy = vi.spyOn(fs, "stat");
		const event = {} as any;
		const folderPath = "/output";
		const mockResult = {
			success: false,
			reason: "Permission denied. You cannot access output folder.",
		};
		const err = new Error(
			"Permission denied. You cannot access output folder.",
		) as NodeJS.ErrnoException;
		err.code = "EACCES";
		statSpy.mockRejectedValue(err);
		shellSpy.mockResolvedValue("");
		const result = await openOutputFolder(event, folderPath);
		expect(result).toEqual(mockResult);
	});

	it("returns error when shell.openPath returns error string", async () => {
		const shellSpy = vi.spyOn(shell, "openPath");
		const statSpy = vi.spyOn(fs, "stat");
		const event = {} as any;
		const folderPath = "/output";
		const mockResult = {
			success: false,
			reason: "Failed to open the output folder.",
		};
		statSpy.mockResolvedValue({} as any);
		shellSpy.mockResolvedValue("Failed to open the output folder.");
		const result = await openOutputFolder(event, folderPath);
		expect(result).toEqual(mockResult);
	});

	it("handles unexpected errors", async () => {
		const shellSpy = vi.spyOn(shell, "openPath");
		const statSpy = vi.spyOn(fs, "stat");
		const event = {} as any;
		const folderPath = "/output";
		const mockResult = {
			success: false,
			reason: "Unexpected error.",
		};
		statSpy.mockRejectedValue(new Error("Unexpected error."));
		shellSpy.mockResolvedValue("");
		const result = await openOutputFolder(event, folderPath);
		expect(result).toEqual(mockResult);
	});
});
