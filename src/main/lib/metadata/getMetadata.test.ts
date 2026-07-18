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
import { getMetadata } from "@main/lib/metadata/getMetadata";
import { processMetadata } from "@main/lib/metadata/processMetadata";

vi.mock("@main/lib/metadata/processMetadata", () => ({
	processMetadata: vi.fn(),
}));

describe("getMetadata", () => {
	const mockParser = vi.fn() as any;
	const filePaths = [
		"/music/song1.mp3",
		"/music/song2.mp3",
		"/music/song3.mp3",
	];

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("returns an empty array when filePaths is empty", async () => {
		const result = await getMetadata([], mockParser);
		expect(result).toEqual([]);
		expect(processMetadata).not.toHaveBeenCalled();
	});

	it("processes a single file path", async () => {
		const filePath = "/music/song.mp3";
		const mockedResult = { id: "1", file: "song.mp3", filePath: "/song.mp3" };
		vi.mocked(processMetadata).mockResolvedValueOnce(mockedResult as any);
		const result = await getMetadata([filePath], mockParser);
		expect(result).toEqual([mockedResult]);
		expect(processMetadata).toHaveBeenCalledTimes(1);
		expect(processMetadata).toHaveBeenCalledWith(filePath, mockParser);
	});

	it("processes multiple file paths", async () => {
		const mockedResult = [
			{ id: "1", file: "song1.mp3", filePath: "/song1.mp3" },
			{ id: "2", file: "song2.mp3", filePath: "/song2.mp3" },
			{ id: "3", file: "song3.mp3", filePath: "/song3.mp3" },
		];
		for (const res of mockedResult) {
			vi.mocked(processMetadata).mockResolvedValueOnce(res as any);
		}
		const result = await getMetadata(filePaths, mockParser);
		expect(result).toEqual(mockedResult);
		expect(processMetadata).toHaveBeenCalledTimes(3);
		expect(processMetadata).toHaveBeenNthCalledWith(
			1,
			filePaths[0],
			mockParser,
		);
		expect(processMetadata).toHaveBeenNthCalledWith(
			2,
			filePaths[1],
			mockParser,
		);
		expect(processMetadata).toHaveBeenNthCalledWith(
			3,
			filePaths[2],
			mockParser,
		);
	});

	it("returns an array even when a single path is provided", async () => {
		const filePath = "/music/song.mp3";
		const mockedResult = { id: "1", file: "song.mp3", filePath: "/song.mp3" };
		vi.mocked(processMetadata).mockResolvedValueOnce(mockedResult as any);
		const result = await getMetadata([filePath], mockParser);
		expect(result).toHaveLength(1);
		expect(Array.isArray(result)).toBe(true);
	});

	it("forwards the same parcer reference to every processMetadat call", async () => {
		vi.mocked(processMetadata).mockResolvedValueOnce({} as any);
		await getMetadata(filePaths, mockParser);
		expect(processMetadata).toHaveBeenCalledTimes(3);
		for (const call of vi.mocked(processMetadata).mock.calls) {
			expect(call[1]).toBe(mockParser);
		}
	});

	it("works with different parser functions on different invocations", async () => {
		const parser1 = vi.fn();
		const parser2 = vi.fn();
		vi.mocked(processMetadata).mockResolvedValue({} as any);
		await getMetadata(["/a.mp3"], parser1);
		await getMetadata(["/b.mp3"], parser2);
		expect(processMetadata).toHaveBeenNthCalledWith(1, "/a.mp3", parser1);
		expect(processMetadata).toHaveBeenNthCalledWith(2, "/b.mp3", parser2);
	});

	it("does not invoke parser directly", async () => {
		vi.mocked(processMetadata).mockResolvedValue({} as any);
		await getMetadata(["/a.mp3"], mockParser);
		expect(mockParser).not.toHaveBeenCalled();
	});

	it("preserves input order", async () => {
		const resolvers: Array<(v: any) => void> = [];
		vi.mocked(processMetadata).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolvers.push(resolve);
				}),
		) as any;
		const promise = getMetadata(filePaths, mockParser);
		for (let i = resolvers.length - 1; i >= 0; i--) {
			resolvers[i]({ id: String(i + 1) });
		}
		const result = await promise;
		expect(result.map((i) => i.id)).toEqual(["1", "2", "3"]);
	});

	it("starts all processMetadata calls parallel, not sequential", async () => {
		let count = 0;
		const resolvers: Array<(v: any) => void> = [];
		vi.mocked(processMetadata).mockImplementation(() => {
			count++;
			return new Promise((resolve) => {
				resolvers.push(resolve);
			});
		}) as any;
		const promise = getMetadata(filePaths, mockParser);
		expect(count).toBe(3);
		expect(resolvers).toHaveLength(3);
		resolvers.forEach((i) => {
			i({});
		});
		await promise;
	});

	it("does not wait for an earlier file to finish before starting a later one", async () => {
		const callOrder: string[] = [];
		vi.mocked(processMetadata).mockImplementation(async (path) => {
			callOrder.push(`start:${path}`);
			await new Promise((i) => setImmediate(i));
			callOrder.push(`end:${path}`);
			return {} as any;
		});
		await getMetadata(filePaths, mockParser);
		const starts = callOrder.filter((i) => i.startsWith("start"));
		const ends = callOrder.filter((i) => i.startsWith("end"));
		expect(starts).toEqual([
			"start:/music/song1.mp3",
			"start:/music/song2.mp3",
			"start:/music/song3.mp3",
		]);
		expect(ends).toHaveLength(3);
	});
});
