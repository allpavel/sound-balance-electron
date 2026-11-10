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

import { humanizeLabel, withOverrides } from "./humanizeLabel";

describe("humanizeLabel", () => {
	it.each([
		["level_in", "Level in"],
		["albumartist", "Albumartist"],
		["attack", "Attack"],
		["makeup", "Makeup"],
		["measured_threshold", "Measured threshold"],
		["level-in", "Level in"],
		["levelIn", "Level in"],
		["  padded_key  ", "Padded key"],
	])("converts %s to %s", (input, expected) => {
		expect(humanizeLabel(input)).toBe(expected);
	});

	it("returns an empty string for identifiers without word characters", () => {
		expect(humanizeLabel("")).toBe("");
		expect(humanizeLabel("___")).toBe("");
	});
});

describe("withOverrides", () => {
	const resolve = withOverrides({
		I: "Target Volume (LUFS)",
		LRA: "Loudness Range",
		TP: "True Peak Limit",
	});

	it("prefers the explicit plain-language override", () => {
		expect(resolve("I")).toBe("Target Volume (LUFS)");
		expect(resolve("LRA")).toBe("Loudness Range");
		expect(resolve("TP")).toBe("True Peak Limit");
	});

	it("falls back to the generic algorithm for unmapped labels", () => {
		expect(resolve("level_in")).toBe("Level in");
	});

	it("ignores empty-string overrides instead of rendering blank labels", () => {
		const resolver = withOverrides({ attack: "" });
		expect(resolver("attack")).toBe("Attack");
	});
});
