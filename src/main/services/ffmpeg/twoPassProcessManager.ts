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
import os from "node:os";
import path from "node:path";
import {
	buildLoudnormFirstPassOptions,
	buildLoudnormSecondPassOptions,
} from "@main/lib/ffmpeg/utils/buildLoudnormOptions";
import { BaseProcess } from "./baseProcess";

export type LoudnormTwoPassOptions = {
	input: string;
	output: string;
	globalSettings: string[];
	filterOptions: Record<string, string | number | boolean>;
	signal: AbortSignal;
};

type LoudnormStats = {
	input_i: number;
	input_lra: number;
	input_tp: number;
	input_thresh: number;
	output_i: number;
	output_lra: number;
	output_tp: number;
	output_thresh: number;
	target_offset: number;
	measured_I: number;
	measured_LRA: number;
	measured_TP: number;
	measured_thresh: number;
	measured_offset: number;
};

type Stats = {
	measured_I: number;
	measured_LRA: number;
	measured_TP: number;
	measured_thresh: number;
	measured_offset: number;
};

export class TwoPassProcessManager extends BaseProcess {
	private tempDir: string | null = null;

	async run(options: LoudnormTwoPassOptions): Promise<void> {
		const { input, output, globalSettings, filterOptions, signal } = options;

		if (signal.aborted) {
			throw new Error("Processing aborted before start");
		}

		this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "loudnorm-"));
		const statsFile = path.join(this.tempDir, "stats.json");

		const analysisFilter = buildLoudnormFirstPassOptions(options, statsFile);

		const firstPassArgs = [
			...globalSettings,
			"-i",
			input,
			...analysisFilter,
			"-f",
			"null",
			"-",
		];

		// run first pass
		await this.runProcessing(firstPassArgs);

		// read and parse statistics
		let stats: LoudnormStats;
		try {
			const statsRaw = await fs.readFile(statsFile, "utf-8");
			stats = JSON.parse(statsRaw) as LoudnormStats;
		} catch (err) {
			throw new Error(
				`Failed to read or parse loudnorm stats file: ${err instanceof Error ? err.message : String(err)}`,
			);
		}

		// prepare second pass with measured values
		const measuredParams: Stats = {
			measured_I: stats.measured_I,
			measured_LRA: stats.measured_LRA,
			measured_TP: stats.measured_TP,
			measured_thresh: stats.measured_thresh,
			measured_offset: stats.measured_offset,
		};

		const secondPassFilter = buildLoudnormSecondPassOptions(
			filterOptions,
			measuredParams,
		);
		const secondPassArgs = [
			...globalSettings,
			"-i",
			input,
			...secondPassFilter,
			output,
		];

		// run second pass
		await this.runProcessing(secondPassArgs);

		// cleanup temporary files
		await this.cleanup();
	}

	async kill(signal: NodeJS.Signals = "SIGINT"): Promise<void> {
		super.kill(signal);
		await this.cleanup();
	}

	private async cleanup(): Promise<void> {
		if (this.tempDir) {
			try {
				await fs.rm(this.tempDir, { recursive: true, force: true });
			} catch {
			} finally {
				this.tempDir = null;
			}
		}
	}
}
