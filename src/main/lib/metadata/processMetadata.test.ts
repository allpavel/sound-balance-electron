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

import { v7 as uuid } from "uuid";
import { processAlbumCover } from "./processAlbumCover";
import { processMetadata } from "./processMetadata";

vi.mock("@main/lib/metadata/processAlbumCover", () => ({
	processAlbumCover: vi.fn(),
}));

describe("processMetadata", () => {
	const mockParser = vi.fn();
	const mockFilePath = "/music/track1.mp3";
	const mockParsedData = {
		format: { codec: "MP3", duration: 120 },
		common: { artist: "Artist", title: "Title" },
	};

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(uuid).mockReturnValue("uuid1234" as any);
		vi.mocked(processAlbumCover).mockImplementation((data) => data);
		mockParser.mockResolvedValue(mockParsedData);
	});

	describe("successful metadata processing", () => {
		it("should call the parser with the correct file path", async () => {
			await processMetadata(mockFilePath, mockParser);
			expect(mockParser).toHaveBeenCalledTimes(1);
			expect(mockParser).toHaveBeenCalledWith(mockFilePath);
		});

		it("should call processAlbumCover with the parsed data", async () => {
			await processMetadata(mockFilePath, mockParser);
			expect(processAlbumCover).toHaveBeenCalledTimes(1);
			expect(processAlbumCover).toHaveBeenCalledWith(mockParsedData);
		});

		it("should generate id using uuid", async () => {
			await processMetadata(mockFilePath, mockParser);
			expect(uuid).toHaveBeenCalledTimes(1);
		});

		it("should return a correctly structured Metadata object on success", async () => {
			const result = await processMetadata(mockFilePath, mockParser);
			expect(result).toEqual({
				...mockParsedData,
				file: "track1.mp3",
				filePath: mockFilePath,
				id: "uuid1234",
				status: "pending",
				selected: 0,
				collectionIds: [],
			});
		});

		it("should overwrite file, filePath, id, status, selected and collectionIds even if processAlbumCover returns them", async () => {
			vi.mocked(processAlbumCover).mockReturnValueOnce({
				...mockParsedData,
				file: "mock-track1.mp3",
				filePath: "mockFilePath",
				id: "mock-uuid1234",
				status: "completed",
				selected: 100,
				collectionIds: ["mockId"],
			} as any);
			const result = await processMetadata(mockFilePath, mockParser);
			expect(result).toEqual({
				...mockParsedData,
				file: "track1.mp3",
				filePath: mockFilePath,
				id: "uuid1234",
				status: "pending",
				selected: 0,
				collectionIds: [],
			});
		});

		it("should preserve extra properties returned by processAlbumCover", async () => {
			vi.mocked(processAlbumCover).mockReturnValueOnce({
				...mockParsedData,
				customProperty: "mock-value",
			} as any);
			const result = await processMetadata(mockFilePath, mockParser);
			expect(result).toHaveProperty("customProperty", "mock-value");
		});
	});

	describe("file path parsing", () => {
		it("should extract file name from a standart unix path", async () => {
			const result = await processMetadata(
				"/root/music/track1.mp3",
				mockParser,
			);
			expect(result.file).toBe("track1.mp3");
		});

		it("should extract file name from a standart windows path", async () => {
			const result = await processMetadata(
				"C:\\Users\\Music\\track1.mp3",
				mockParser,
			);
			expect(result.file).toBe("track1.mp3");
		});

		it("handles paths with multiple forward slashes", async () => {
			const result = await processMetadata(
				"//root//music//track1.mp3",
				mockParser,
			);
			expect(result.file).toBe("track1.mp3");
		});

		it("handles paths with multiple backward slashes", async () => {
			const result = await processMetadata(
				"C:\\\\Users\\\\Music\\\\track1.mp3",
				mockParser,
			);
			expect(result.file).toBe("track1.mp3");
		});

		it("handles paths with mixed slashes", async () => {
			const result = await processMetadata(
				"//root\\music//track1.mp3",
				mockParser,
			);
			expect(result.file).toBe("track1.mp3");
		});

		it("handles filename only", async () => {
			const result = await processMetadata("track1.mp3", mockParser);
			expect(result.file).toBe("track1.mp3");
		});

		it("handles paths with spaces and unicode characters", async () => {
			const result = await processMetadata(
				"/music/My Album/01 - Söng (Remïx).mp3",
				mockParser,
			);
			expect(result.file).toBe("01 - Söng (Remïx).mp3");
		});

		it("should return an empty string for an empty file path", async () => {
			const result = await processMetadata("", mockParser);
			expect(result.file).toBe("");
		});

		it("should return an empty string if file path ends with slash (unix)", async () => {
			const result = await processMetadata("/music/folder/", mockParser);
			expect(result.file).toBe("");
		});

		it("should return an empty string if file path ends with multiple slash (unix)", async () => {
			const result = await processMetadata("//music//folder//", mockParser);
			expect(result.file).toBe("");
		});

		it("should return an empty string if file path ends with multiple slash (windows)", async () => {
			const result = await processMetadata("C:\\music\\folder\\", mockParser);
			expect(result.file).toBe("");
		});
	});

	describe("error handling", () => {
		it("should throw an error if parser rejects", async () => {
			const error = new Error("Unsupported format");
			mockParser.mockRejectedValueOnce(error);
			await expect(processMetadata(mockFilePath, mockParser)).rejects.toThrow(
				`Metadata parsing failed for ${mockFilePath}: ${error}`,
			);
		});

		it("should handles unknown error if parser rejects with non-Error value", async () => {
			mockParser.mockRejectedValueOnce("String error");
			await expect(processMetadata(mockFilePath, mockParser)).rejects.toThrow(
				`Metadata parsing failed for ${mockFilePath}: Unknown error`,
			);
		});

		it("should handles unknown error if parser rejects with null", async () => {
			mockParser.mockRejectedValueOnce(null);
			await expect(processMetadata(mockFilePath, mockParser)).rejects.toThrow(
				`Metadata parsing failed for ${mockFilePath}: Unknown error`,
			);
		});

		it("should throw an error if processAlbumCover throws", async () => {
			const error = new Error("Cover processing failed");
			vi.mocked(processAlbumCover).mockImplementationOnce(() => {
				throw error;
			});
			await expect(processMetadata(mockFilePath, mockParser)).rejects.toThrow(
				`Metadata parsing failed for ${mockFilePath}: ${error}`,
			);
		});

		it("should throw an error if uuid throws", async () => {
			const error = new Error("uuid genaration failed");
			vi.mocked(processAlbumCover).mockImplementationOnce(() => {
				throw error;
			});
			await expect(processMetadata(mockFilePath, mockParser)).rejects.toThrow(
				`Metadata parsing failed for ${mockFilePath}: ${error}`,
			);
		});

		it("should include the problematic path in error message", async () => {
			const error = new Error("Read error");
			const badPath = "/wrong.mp3";
			mockParser.mockRejectedValueOnce(error);
			await expect(processMetadata(badPath, mockParser)).rejects.toThrow(
				`Metadata parsing failed for ${badPath}: ${error}`,
			);
		});
	});
});
