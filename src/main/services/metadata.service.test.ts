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

import { getMetadata } from "@main/lib/metadata";
import { parseMetadata } from "./metadata.service";

vi.mock("@main/lib/metadata", () => ({
	getMetadata: vi.fn(),
}));

describe("parseMetadata.metadata.service", () => {
	const filePaths = ["/file1.mp3", "/file2.mp3"];
	it("return metadata array on success", async () => {
		const mockMetadata = [
			{
				id: "1",
				file: "file1.mp3",
				common: {},
			},
			{ id: "2", file: "file2.mp3", common: {} },
		];
		vi.mocked(getMetadata).mockResolvedValue(mockMetadata as any);
		const result = await parseMetadata(filePaths);
		expect(result).toEqual(mockMetadata);
	});

	it("throws error when parsing fails", async () => {
		const err = new Error("Unexpected error.");
		vi.mocked(getMetadata).mockRejectedValue(err);
		await expect(parseMetadata(filePaths)).rejects.toThrow(
			"Metadata parsing failed: Unexpected error.",
		);
	});
});
