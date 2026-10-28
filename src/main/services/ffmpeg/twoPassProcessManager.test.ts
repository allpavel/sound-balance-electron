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
import {
	buildLoudnormFirstPassOptions,
	buildLoudnormSecondPassOptions,
} from "@main/lib/ffmpeg/utils/buildLoudnormOptions";
import { BaseProcess } from "./baseProcess";
import { TwoPassProcessManager } from "./twoPassProcessManager";

vi.mock("@main/lib/ffmpeg/utils/buildLoudnormOptions", () => ({
	buildLoudnormFirstPassOptions: vi.fn(),
	buildLoudnormSecondPassOptions: vi.fn(),
}));

describe("TwoPassProcessManager", () => {
	let tpm: TwoPassProcessManager;
	let runProcessingSpy: ReturnType<typeof vi.fn>;

	const stderrData =
		'{"input_i": "-20.0", "input_lra": "5.0", "input_tp": "-2.0", "input_thresh": "-30.0", "target_offset": "-1.0"}';

	const baseOptions = {
		input: "input.flac",
		output: "output.mp3",
		globalSettings: ["-y", "-loglevel", "error"],
		trackSettings: ["-codec:a", "libmp3lame"],
		filterOptions: { linear: true, I: -16 },
		signal: new AbortController().signal,
	};

	const mockstderrData = (stderr: string) => {
		return runProcessingSpy.mockImplementationOnce(async () => {
			(tpm as unknown as { stderrData: string }).stderrData = stderr;
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		tpm = new TwoPassProcessManager();
		runProcessingSpy = vi
			.spyOn(
				tpm as unknown as { runProcessing: (args: string[]) => Promise<void> },
				"runProcessing",
			)
			.mockResolvedValue(undefined);

		vi.mocked(buildLoudnormFirstPassOptions).mockReturnValue([
			"-af",
			"loudnorm=print_format=json",
		]);
		vi.mocked(buildLoudnormSecondPassOptions).mockReturnValue([
			"-af",
			"loudnorm=measured...",
		]);
	});

	describe("run", () => {
		it("should build and execute first pass args in the correct order", async () => {
			mockstderrData(stderrData);
			await tpm.run(baseOptions);
			expect(buildLoudnormFirstPassOptions).toHaveBeenCalledWith(baseOptions);
			expect(runProcessingSpy).toHaveBeenNthCalledWith(1, [
				"-y",
				"-loglevel",
				"error",
				"-i",
				"input.flac",
				"-af",
				"loudnorm=print_format=json",
				"-f",
				"null",
				"-",
			]);
		});

		it("should build and execute second pass args in the correct order", async () => {
			mockstderrData(stderrData);
			await tpm.run(baseOptions);
			expect(runProcessingSpy).toHaveBeenNthCalledWith(2, [
				"-y",
				"-loglevel",
				"error",
				"-i",
				baseOptions.input,
				"-af",
				"loudnorm=measured...",
				"-codec:a",
				"libmp3lame",
				baseOptions.output,
			]);
		});

		it("should  pass extracted stats to buildLoudnormSecondPassOptions", async () => {
			mockstderrData(stderrData);
			await tpm.run(baseOptions);
			expect(buildLoudnormSecondPassOptions).toHaveBeenCalledWith(
				baseOptions.filterOptions,
				{
					measured_I: "-20.0",
					measured_LRA: "5.0",
					measured_TP: "-2.0",
					measured_thresh: "-30.0",
					measured_offset: "-1.0",
				},
			);
		});

		it("should handle empty global and track settings arrays", async () => {
			mockstderrData(stderrData);
			await tpm.run({ ...baseOptions, globalSettings: [], trackSettings: [] });
			expect(runProcessingSpy).toHaveBeenNthCalledWith(1, [
				"-i",
				baseOptions.input,
				"-af",
				"loudnorm=print_format=json",
				"-f",
				"null",
				"-",
			]);
			expect(runProcessingSpy).toHaveBeenNthCalledWith(2, [
				"-i",
				baseOptions.input,
				"-af",
				"loudnorm=measured...",
				baseOptions.output,
			]);
		});
	});

	describe("run - abort signal", () => {
		it("should throw immediately if signal is already aborted", async () => {
			const ac = new AbortController();
			ac.abort();
			const options = { ...baseOptions, signal: ac.signal };
			await expect(tpm.run(options)).rejects.toThrow(
				"Processing aborted before start",
			);
			expect(runProcessingSpy).not.toHaveBeenCalled();
			expect(buildLoudnormFirstPassOptions).not.toHaveBeenCalled();
		});
	});

	describe("run - stats extraction", () => {
		it("should extract stats from stderr output", async () => {
			const stderr = `
                loudnorm target: I=-16.0 LUFS
                Progress... frame=100
                ${stderrData}
                Conversion finished!
            `;
			mockstderrData(stderr);
			await tpm.run(baseOptions);
			expect(buildLoudnormSecondPassOptions).toHaveBeenCalledWith(
				expect.anything(),
				{
					measured_I: "-20.0",
					measured_LRA: "5.0",
					measured_TP: "-2.0",
					measured_thresh: "-30.0",
					measured_offset: "-1.0",
				},
			);
		});

		it("should fallback to measured_* keys if input_* keys are missing", async () => {
			const stderr = `{
					"measured_I": "-20.0",
					"measured_LRA": "5.0",
					"measured_TP": "-2.0",
					"measured_thresh": "-30.0",
					"measured_offset": "-1.0"
				}`;
			mockstderrData(stderr);
			await tpm.run(baseOptions);
			expect(buildLoudnormSecondPassOptions).toHaveBeenCalledWith(
				expect.anything(),
				{
					measured_I: "-20.0",
					measured_LRA: "5.0",
					measured_TP: "-2.0",
					measured_thresh: "-30.0",
					measured_offset: "-1.0",
				},
			);
		});

		it("should reject if JSON stats block is not found", async () => {
			mockstderrData("No stats");
			await expect(tpm.run(baseOptions)).rejects.toThrow(
				"Could not find loudnorm stats in stderr output",
			);
			expect(runProcessingSpy).toHaveBeenCalledTimes(1);
			expect(buildLoudnormSecondPassOptions).not.toHaveBeenCalled();
		});

		it("should reject if JSON stats block is malformed", async () => {
			mockstderrData('{ "input_i": "-20.0", invalid json }');
			await expect(tpm.run(baseOptions)).rejects.toThrow(
				/Failed to parse loudnorm stats/,
			);
			expect(runProcessingSpy).toHaveBeenCalledTimes(1);
			expect(buildLoudnormSecondPassOptions).not.toHaveBeenCalled();
		});
	});

	describe("run - error handling", () => {
		it("should throw if first pass fails", async () => {
			const errorMessage = "First pass failed";
			runProcessingSpy.mockRejectedValueOnce(new Error(errorMessage));
			await expect(tpm.run(baseOptions)).rejects.toThrow(errorMessage);
		});

		it("should throw if second pass fails", async () => {
			const errorMessage = "Second pass failed";
			mockstderrData('{"input_i": "-20.0"}');
			runProcessingSpy.mockRejectedValueOnce(new Error(errorMessage));
			await expect(tpm.run(baseOptions)).rejects.toThrow(errorMessage);
		});

		it("should throw if stats extraction fails", async () => {
			mockstderrData("No stats");
			await expect(tpm.run(baseOptions)).rejects.toThrow(
				"Could not find loudnorm stats in stderr output",
			);
		});
	});

	describe("kill", () => {
		it("should call super.kill (inherited from BaseProcess)", () => {
			const superKillSpy = vi
				.spyOn(BaseProcess.prototype, "kill")
				.mockImplementation(() => {});
			tpm.kill("SIGTERM");
			expect(superKillSpy).toHaveBeenCalledWith("SIGTERM");
		});
	});
});
