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
import { buildFilter } from "./buildFilter";

describe("buildFilter", () => {
	const filterName = "loudnorm";
	it("returns -af and filter name when no options", () => {
		const options = {};
		expect(buildFilter(filterName, options)).toEqual(["-af", filterName]);
	});
	it("returns filter with key=value options", () => {
		const options = { volume: 2 };
		expect(buildFilter(filterName, options)).toEqual([
			"-af",
			`${filterName}=volume=2`,
		]);
	});
	it("handles multiple options separated by colon", () => {
		const options = { I: -24, LRA: 7, TP: -2 };
		expect(buildFilter(filterName, options)).toEqual([
			"-af",
			`${filterName}=I=-24:LRA=7:TP=-2`,
		]);
	});
	it("handles boolean options correctly", () => {
		const options = { linear: true, dual_mono: false };
		expect(buildFilter(filterName, options)).toEqual([
			"-af",
			`${filterName}=linear=true:dual_mono=false`,
		]);
	});
});
