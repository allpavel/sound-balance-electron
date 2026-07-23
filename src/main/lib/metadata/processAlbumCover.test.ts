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
import type { ITag } from "music-metadata";
import { processAlbumCover } from "./processAlbumCover";

describe("processAlbumCover", () => {
	const ID3v2_3 = "ID3v2.3";
	const ID3v2_4 = "ID3v2.4";
	const createMockData = (native?: Record<string, ITag[]>) => {
		return {
			format: { codec: "MP3" },
			common: { artist: "artist", title: "title" },
			native: native,
		} as any;
	};

	const createBinaryApicFrame = (binaryData: any) => ({
		id: "APIC",
		value: {
			format: "image/jpeg",
			type: { id: 3, name: "front cover" },
			description: "Cover",
			data: binaryData,
		},
	});

	describe("early returns", () => {
		it("should return the original data reference if native is undefined", () => {
			const data = createMockData(undefined);
			const result = processAlbumCover(data);
			expect(result).toBe(data);
		});

		it("should return the original data reference if native is empty object", () => {
			const data = createMockData({});
			const result = processAlbumCover(data);
			expect(result).toBe(data);
		});

		it("should return the original data reference if native contains only non-ID3 tags", () => {
			const data = createMockData({
				VORBIS: [{ id: "METADATA_BLOCK_PICTURE", value: "some_data" }],
			});
			const result = processAlbumCover(data);
			expect(result).toBe(data);
		});

		it("should return the original data reference if ID3v2.3 exists but has no APIC frame", () => {
			const data = createMockData({
				[ID3v2_3]: [{ id: "TIT2", value: "Title" }],
			});
			const result = processAlbumCover(data);
			expect(result).toBe(data);
		});

		it("should return the original data reference if ID3v2.4 exists but has no APIC frame", () => {
			const data = createMockData({
				[ID3v2_4]: [{ id: "TIT2", value: "Title" }],
			});
			const result = processAlbumCover(data);
			expect(result).toBe(data);
		});

		it("should return the original data reference if APIC frame exists but value is null", () => {
			const data = createMockData({
				[ID3v2_3]: [{ id: "APIC", value: null }],
			});
			const result = processAlbumCover(data);
			expect(result).toBe(data);
		});

		it("should return the original data reference if APIC frame exists but value is a string", () => {
			const data = createMockData({
				[ID3v2_3]: [{ id: "APIC", value: "raw_string_data" }],
			});
			const result = processAlbumCover(data);
			expect(result).toBe(data);
		});

		it("should return the original data reference if APIC frame exists but value lacks data property", () => {
			const data = createMockData({
				[ID3v2_3]: [{ id: "APIC", value: { format: "image/jpeg" } }],
			});
			const result = processAlbumCover(data);
			expect(result).toBe(data);
		});
	});

	describe("successful binary processing", () => {
		const binaryData = new Uint8Array([0x01, 0x02, 0xff, 0xfe]);
		const mockBase64 = Buffer.from(binaryData).toString("base64");

		it("should convert Uint8Array data to base64 for ID3v2.3", () => {
			const data = createMockData({
				[ID3v2_3]: [createBinaryApicFrame(binaryData)],
			});
			const result = processAlbumCover(data);
			expect(result).not.toBe(data);
			const apic = (result.native[ID3v2_3] as ITag[]).find(
				(item) => item.id === "APIC",
			) as any;
			expect(apic?.value.data).toBe(mockBase64);
		});

		it("should convert Uint8Array data to base64 for ID3v2.4", () => {
			const data = createMockData({
				[ID3v2_4]: [createBinaryApicFrame(binaryData)],
			});
			const result = processAlbumCover(data);
			expect(result).not.toBe(data);
			const apic = (result.native[ID3v2_4] as ITag[]).find(
				(item) => item.id === "APIC",
			) as any;
			expect(apic?.value.data).toBe(mockBase64);
		});

		it("should convert Uint8Array data to base64 in both ID3v2.3 and ID3v2.4", () => {
			const binaryData1 = new Uint8Array([0x01]);
			const binaryData2 = new Uint8Array([0x02]);
			const expectedBase64_1 = Buffer.from(binaryData1).toString("base64");
			const expectedBase64_2 = Buffer.from(binaryData2).toString("base64");
			const data = createMockData({
				[ID3v2_3]: [createBinaryApicFrame(binaryData1)],
				[ID3v2_4]: [createBinaryApicFrame(binaryData2)],
			});
			const result = processAlbumCover(data);
			const apic1 = (result.native[ID3v2_3] as ITag[]).find(
				(item) => item.id === "APIC",
			) as any;
			expect(apic1?.value.data).toBe(expectedBase64_1);
			const apic2 = (result.native[ID3v2_4] as ITag[]).find(
				(item) => item.id === "APIC",
			) as any;
			expect(apic2?.value.data).toBe(expectedBase64_2);
		});

		it("should handle cross-realm Uint8Arrays", () => {
			const mockUint8Array = {
				0: 0x01,
				1: 0x02,
				length: 2,
				[Symbol.toStringTag]: "Uint8Array",
			};
			const mockBase64 = Buffer.from(mockUint8Array).toString("base64");
			const data = createMockData({
				[ID3v2_3]: [createBinaryApicFrame(mockUint8Array)],
			});
			const result = processAlbumCover(data);
			expect(result).not.toBe(data);
			const apic = (result.native[ID3v2_3] as ITag[]).find(
				(item) => item.id === "APIC",
			) as any;
			expect(apic?.value.data).toBe(mockBase64);
		});

		it("should process Node.js Buffers (which are Uint8Array subclasses)", () => {
			const bufferData = Buffer.from([0x03, 0x04, 0x05]);
			const mockBase64 = bufferData.toString("base64");
			const data = createMockData({
				[ID3v2_3]: [createBinaryApicFrame(bufferData)],
			});
			const result = processAlbumCover(data);
			const resultApic = (result.native?.[ID3v2_3] as ITag[]).find(
				(f) => f.id === "APIC",
			) as any;
			expect(resultApic?.value.data).toBe(mockBase64);
		});
	});

	describe("non-binary or already processed data", () => {
		it("should return a clone but not alter data if it already a string", () => {
			const mockBase64 = "AQID";
			const data = createMockData({
				[ID3v2_3]: [createBinaryApicFrame(mockBase64)],
			});
			const result = processAlbumCover(data);
			expect(result).not.toBe(data);
			const resultApic = (result.native?.[ID3v2_3] as ITag[]).find(
				(f) => f.id === "APIC",
			) as any;
			expect(resultApic?.value.data).toBe(mockBase64);
		});

		it("should return a clone but not alter data if it is an object", () => {
			const mockData = { custom: "property" };
			const data = createMockData({
				[ID3v2_3]: [createBinaryApicFrame(mockData)],
			});
			const result = processAlbumCover(data);
			expect(result).not.toBe(data);
			const resultApic = (result.native?.[ID3v2_3] as ITag[]).find(
				(f) => f.id === "APIC",
			) as any;
			expect(resultApic?.value.data).toStrictEqual(mockData);
		});
	});

	describe("immutability and cloning", () => {
		it("should not mutate the original data object", () => {
			const mockData = new Uint8Array([0x01, 0x02]);
			const data = createMockData({
				[ID3v2_3]: [createBinaryApicFrame(mockData)],
			});
			processAlbumCover(data);
			const originalApic = (data.native?.[ID3v2_3] as ITag[]).find(
				(f) => f.id === "APIC",
			) as any;
			expect(originalApic?.value.data).toBe(mockData);
			expect(originalApic?.value.data instanceof Uint8Array).toBe(true);
		});

		it("should deeply clone other properties in the metadata object", () => {
			const mockData = new Uint8Array([0x01, 0x02]);
			const data = createMockData({
				[ID3v2_3]: [
					{ id: "TIT2", value: "Original title" },
					createBinaryApicFrame(mockData),
				],
			});
			const result = processAlbumCover(data);
			expect(result).not.toBe(data);
			const resultTit2 = (result.native?.[ID3v2_3] as ITag[]).find(
				(f) => f.id === "TIT2",
			) as any;
			if (resultTit2) resultTit2.value = "Modified title";
			const originalTit2 = (data.native?.[ID3v2_3] as ITag[]).find(
				(f) => f.id === "TIT2",
			) as any;
			expect(originalTit2?.value).toBe("Original title");
		});
	});
});
