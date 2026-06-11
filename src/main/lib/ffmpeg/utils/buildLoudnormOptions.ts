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
type SecondOptions = {
	measured_I: number;
	measured_LRA: number;
	measured_TP: number;
	measured_tresh: number;
};
export const buildLoudnormFirstPassOptions = (
	options: Record<string, string | number | boolean>,
	stats_file: string,
) => {
	const optionsArray = Object.entries(options);
	if (optionsArray.length > 0) {
		const filterArgs = optionsArray.map(([k, v]) => `${k}=${v}`).join(":");
		return [
			"-af",
			`loudnorm=${filterArgs}:print_format=json:stats_file=${stats_file}`,
		];
	}
	return ["-af", `loudnorm=print_format=json:stats_file=${stats_file}`];
};

export const buildLoudnormSecondPassOptions = (
	options: Record<string, string | number | boolean>,
	stats: SecondOptions,
) => {
	const optionsArray = Object.entries(options);
	const filterArgs: string[] = [
		`measured_I=${stats.measured_I}`,
		`measured_LRA=${stats.measured_LRA}`,
		`measured_TP=${stats.measured_TP}`,
		`measured_tresh=${stats.measured_tresh}`,
		"linear=1",
	];
	if (optionsArray.length > 0) {
		for (const [k, v] of optionsArray) {
			filterArgs.push(`${k}=${v}`);
		}
	}
	return ["-af", `loudnorm=${filterArgs.join(":")}`];
};
