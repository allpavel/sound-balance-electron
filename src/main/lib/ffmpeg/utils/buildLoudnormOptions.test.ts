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
	type LoudnormTwoPassOptions,
	type Stats,
} from "./buildLoudnormOptions";

const options: LoudnormTwoPassOptions = {
	input: "input.mp3",
	output: "output.mp3",
	globalSettings: [],
	filterOptions: {},
	signal: {} as any,
};

const stats: Stats = {
	measured_I: -23.5,
	measured_LRA: 6.8,
	measured_TP: -1.2,
	measured_thresh: -30.0,
	measured_offset: 0.5,
};

describe("buildLoudnormFirstPassOptions", () => {
	it("returns basic loudnorm when no options", () => {
		expect(buildLoudnormFirstPassOptions(options)).toEqual([
			"-af",
			"loudnorm=print_format=json",
		]);
	});
	it("handles multiple filter options", () => {
		const valid = {
			...options,
			filterOptions: {
				I: -24,
				LRA: 7,
				offset: 0.5,
				mode: "downward",
			},
		};
		expect(buildLoudnormFirstPassOptions(valid)).toEqual([
			"-af",
			"loudnorm=I=-24:LRA=7:offset=0.5:mode=downward:print_format=json",
		]);
	});
	it("handles boolean options correctly", () => {
		const valid = {
			...options,
			filterOptions: {
				linear: true,
				dual_mono: false,
			},
		};
		expect(buildLoudnormFirstPassOptions(valid)).toEqual([
			"-af",
			"loudnorm=linear=1:dual_mono=0:print_format=json",
		]);
	});
});

describe("buildLoudnormSecondPassOptions", () => {
	it("builds second pass with measured stats", () => {
		const options = { I: -24, LRA: 7 };
		expect(buildLoudnormSecondPassOptions(options, stats)).toEqual([
			"-af",
			`loudnorm=measured_I=${stats.measured_I}:measured_LRA=${stats.measured_LRA}:measured_TP=${stats.measured_TP}:measured_tresh=${stats.measured_thresh}:linear=1:I=${options.I}:LRA=${options.LRA}`,
		]);
	});
});
