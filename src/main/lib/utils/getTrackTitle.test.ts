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
import { describe, expect, it } from "vitest";
import { getTrackTitle } from "./getTrackTitle";

describe("getTrackTitle", () => {
	const artist = "The Beatles";
	const title = "Come Together";
	const defaultTitle = "default";
	it("returns 'artist - title' when both are provided", () => {
		expect(getTrackTitle(artist, title, defaultTitle)).toBe(
			`${artist} - ${title}`,
		);
	});
	it("returns only artist when title is missing", () => {
		expect(getTrackTitle(artist, undefined, defaultTitle)).toBe(artist);
	});
	it("returns only title when artist is missing", () => {
		expect(getTrackTitle(undefined, title, defaultTitle)).toBe(title);
	});
	it("returns default when title and artist are missing", () => {
		expect(getTrackTitle(undefined, undefined, defaultTitle)).toBe(
			defaultTitle,
		);
	});
	it("handles empty strings gracefully", () => {
		expect(getTrackTitle("", "", defaultTitle)).toBe(defaultTitle);
		expect(getTrackTitle(artist, "", defaultTitle)).toBe(artist);
		expect(getTrackTitle("", title, defaultTitle)).toBe(title);
	});
});
