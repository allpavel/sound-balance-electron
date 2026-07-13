import { ProcessManager } from "./processManager";

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
describe("processManager", () => {
	let pm: ProcessManager;
	let runProcessingSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		pm = new ProcessManager();
		runProcessingSpy = vi
			.spyOn(pm as any, "runProcessing")
			.mockResolvedValue(undefined);
	});

	it("should map options to ffmpeg args in the correct order", async () => {
		const options = {
			input: "input.flac",
			output: "output.mp3",
			globalSettings: ["-y", "-loglevel", "error"],
			trackSettings: ["-codec:a", "libmp3lame", "-b:a", "320k"],
		};
		await pm.run(options);
		expect(runProcessingSpy).toHaveBeenCalledTimes(1);
		expect(runProcessingSpy).toHaveBeenCalledWith([
			"-y",
			"-loglevel",
			"error",
			"-i",
			"input.flac",
			"-codec:a",
			"libmp3lame",
			"-b:a",
			"320k",
			"output.mp3",
		]);
	});
	it("should handle empty settings arrays", async () => {
		const options = {
			input: "input.flac",
			output: "output.mp3",
			globalSettings: [],
			trackSettings: [],
		};
		await pm.run(options);
		expect(runProcessingSpy).toHaveBeenCalledTimes(1);
		expect(runProcessingSpy).toHaveBeenCalledWith([
			"-i",
			options.input,
			options.output,
		]);
	});
	it("should correctly pass paths with spaces as single array elements", async () => {
		const options = {
			input: "input with space.flac",
			output: "output with space.mp3",
			globalSettings: ["-y"],
			trackSettings: ["-vn"],
		};
		await pm.run(options);
		expect(runProcessingSpy).toHaveBeenCalledWith([
			...options.globalSettings,
			"-i",
			options.input,
			...options.trackSettings,
			options.output,
		]);
	});
	it("should return the promise from runProcessing", async () => {
		const options = {
			input: "input.flac",
			output: "output.mp3",
			globalSettings: [],
			trackSettings: [],
		};
		const promise = pm.run(options);
		expect(promise).toBeInstanceOf(Promise);
		expect(promise).resolves.toBeUndefined();
	});
	it("should propagate errors from runProcessing", async () => {
		const options = {
			input: "input.flac",
			output: "output.mp3",
			globalSettings: [],
			trackSettings: [],
		};
		const error = new Error("FFmpeg exited with code 1");
		runProcessingSpy.mockRejectedValueOnce(error);
		await expect(pm.run(options)).rejects.toThrow("FFmpeg exited with code 1");
	});
});
