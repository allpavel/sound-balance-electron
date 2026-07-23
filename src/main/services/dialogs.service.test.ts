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
import { dialog } from "electron";
import { getOutputDirectoryPath, showDialog } from "./dialogs.service";

describe("showDialog.dialogs.service", () => {
	it("returns file paths when dialog succeeds", async () => {
		const dialogSpy = vi.spyOn(dialog, "showOpenDialog");
		const mockPaths = ["/music/song1.mp3", "/music/song2.mp3"];
		dialogSpy.mockResolvedValue({ canceled: false, filePaths: mockPaths });
		const result = await showDialog();
		expect(result).toEqual(mockPaths);
		expect(dialog.showOpenDialog).toHaveBeenCalledWith({
			properties: ["multiSelections"],
			title: "Select files",
		});
	});

	it("returns empty array when dialog canceled", async () => {
		const dialogSpy = vi.spyOn(dialog, "showOpenDialog");
		const mockPaths = [];
		dialogSpy.mockResolvedValue({ canceled: true, filePaths: [] });
		const result = await showDialog();
		expect(result).toEqual(mockPaths);
	});

	it("propagates error from dialog", async () => {
		const dialogSpy = vi.spyOn(dialog, "showOpenDialog");
		const error = new Error("Dialog unexpected error");
		dialogSpy.mockRejectedValue(error);
		expect(showDialog()).rejects.toThrow(error);
	});
});

describe("getOutputDirectoryPath.dialogs.service", () => {
	it("returns directory path when dialog succeeds", async () => {
		const dialogSpy = vi.spyOn(dialog, "showOpenDialog");
		const mockResult = { canceled: false, filePaths: ["/music"] };
		dialogSpy.mockResolvedValue(mockResult);
		const result = await getOutputDirectoryPath();
		expect(result).toEqual(mockResult);
		expect(dialog.showOpenDialog).toHaveBeenCalledWith({
			title: "Select directory",
			properties: ["openDirectory"],
		});
	});

	it("propagates error from dialog", async () => {
		const dialogSpy = vi.spyOn(dialog, "showOpenDialog");
		const error = new Error("Dialog unexpected error");
		dialogSpy.mockRejectedValue(error);
		expect(getOutputDirectoryPath()).rejects.toThrow(error);
	});
});
