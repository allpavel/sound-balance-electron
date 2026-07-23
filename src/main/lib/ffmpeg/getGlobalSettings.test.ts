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
import { getGlobalSettings } from "./getGlobalSettings";

describe("getGlobalSettings", () => {
	it("returns [-y] when overwrite is true", () => {
		const settings = { overwrite: true, noOverwrite: false };
		expect(getGlobalSettings(settings as any));
	});
	it("returns [-n] when noOverwrite is true", () => {
		const settings = { overwrite: false, noOverwrite: true };
		expect(getGlobalSettings(settings as any));
	});
	it("returns [] when both are false", () => {
		const settings = { overwrite: false, noOverwrite: false };
		expect(getGlobalSettings(settings as any));
	});
	it("returns [-y, -n] when both are true", () => {
		const settings = { overwrite: true, noOverwrite: true };
		expect(getGlobalSettings(settings as any));
	});
});
