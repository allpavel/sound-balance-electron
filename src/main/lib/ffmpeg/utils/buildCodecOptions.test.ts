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
import { buildCodecOptions } from "./buildCodecOptions";

describe("buildCodecOptions", () => {
	it("returns empty array for empty options", () => {
		expect(buildCodecOptions({})).toEqual([]);
	});
	it("handles multiple options", () => {
		const options = {
			b: "128k",
			compression_level: 5,
			reservoir: true,
		};
		expect(buildCodecOptions(options)).toEqual([
			"-b:a",
			"128k",
			"-compression_level:a",
			"5",
			"-reservoir:a",
			"1",
		]);
	});
	it("handles boolean options correctly", () => {
		const options = {
			reservoir: true,
			dual_mono: false,
		};
		expect(buildCodecOptions(options)).toEqual([
			"-reservoir:a",
			"1",
			"-dual_mono:a",
			"0",
		]);
	});
});
