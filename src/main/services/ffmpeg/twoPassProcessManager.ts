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
} from "@main/lib/ffmpeg/utils";
import { BaseProcess } from "./baseProcess";

export type LoudnormTwoPassOptions = {
	input: string;
	output: string;
	globalSettings: string[];
	trackSettings: string[];
	filterOptions: Record<string, string | number | boolean>;
	signal: AbortSignal;
};

type Stats = {
	measured_I: number;
	measured_LRA: number;
	measured_TP: number;
	measured_thresh: number;
	measured_offset: number;
};

export class TwoPassProcessManager extends BaseProcess {
	private extractStatsFromStderr(stderr: string): Stats {
		const match = stderr.match(/\{[\s\S]*\}/);
		if (!match) {
			throw new Error("Could not find loudnorm stats in stderr output");
		}
		try {
			const parsed = JSON.parse(match[0]);
			return {
				measured_I: parsed.input_i ?? parsed.measured_I,
				measured_LRA: parsed.input_lra ?? parsed.measured_LRA,
				measured_TP: parsed.input_tp ?? parsed.measured_TP,
				measured_thresh: parsed.input_thresh ?? parsed.measured_thresh,
				measured_offset: parsed.target_offset ?? parsed.measured_offset,
			};
		} catch (err) {
			throw new Error(`Failed to parse loudnorm stats: ${err}`);
		}
	}

	async run(options: LoudnormTwoPassOptions): Promise<void> {
		const {
			input,
			output,
			globalSettings,
			trackSettings,
			filterOptions,
			signal,
		} = options;

		if (signal.aborted) {
			throw new Error("Processing aborted before start");
		}

		// First pass: measure loudness
		const firstPassFilter = buildLoudnormFirstPassOptions(options);
		const firstPassArgs = [
			...globalSettings,
			"-i",
			input,
			...firstPassFilter,
			"-f",
			"null",
			"-",
		];
		// Run first pass
		await this.runProcessing(firstPassArgs);

		const stats = this.extractStatsFromStderr(this.stderrData);
		const measuredParams: Stats = {
			measured_I: stats.measured_I,
			measured_LRA: stats.measured_LRA,
			measured_TP: stats.measured_TP,
			measured_thresh: stats.measured_thresh,
			measured_offset: stats.measured_offset,
		};

		// Prepare second pass with measured values
		const secondPassFilter = buildLoudnormSecondPassOptions(
			filterOptions,
			measuredParams,
		);
		const secondPassArgs = [
			...globalSettings,
			"-i",
			input,
			...secondPassFilter,
			...trackSettings,
			output,
		];

		// run second pass
		await this.runProcessing(secondPassArgs);
	}
}
