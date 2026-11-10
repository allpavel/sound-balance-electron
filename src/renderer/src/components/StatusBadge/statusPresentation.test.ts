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

import { STATUS_VALUES } from "@shared/constants";
import {
	getStatusPresentation,
	isTrackStatus,
	UNKNOWN_STATUS_PRESENTATION,
} from "./statusPresentation";

describe("isTrackStatus (Zod-backed type guard)", () => {
	it.each([...STATUS_VALUES])("accepts canonical status %s", (status) => {
		expect(isTrackStatus(status)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["similar word", "complete"],
		["wrong case", "Completed"],
		["number", 1],
		["null", null],
		["undefined", undefined],
		["object", { status: "pending" }],
	])("rejects %s", (_desc, value) => {
		expect(isTrackStatus(value)).toBe(false);
	});
});

describe("getStatusPresentation", () => {
	it("provides a presentation for every canonical status", () => {
		for (const status of STATUS_VALUES) {
			const presentation = getStatusPresentation(status);
			expect(presentation.label.length).toBeGreaterThan(0);
			expect(presentation.announcement.length).toBeGreaterThan(
				presentation.label.length,
			);
			expect(typeof presentation.Icon).not.toBe("undefined");
			expect(presentation.tone.fg).toMatch(/^#[0-9a-fA-F]{6}$/);
			expect(presentation.tone.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it("gives each status a distinct visible label (no color-only distinction)", () => {
		const labels = STATUS_VALUES.map(
			(status) => getStatusPresentation(status).label,
		);
		expect(new Set(labels).size).toBe(labels.length);
	});

	it("gives each status a distinct icon component", () => {
		const icons = STATUS_VALUES.map(
			(status) => getStatusPresentation(status).Icon,
		);
		expect(new Set(icons).size).toBe(icons.length);
	});

	it("uses the plain-language labels from the design spec", () => {
		expect(getStatusPresentation("pending").label).toBe("Queued");
		expect(getStatusPresentation("processing").label).toBe("Processing");
		expect(getStatusPresentation("completed").label).toBe("Processed");
		expect(getStatusPresentation("failed").label).toBe("Failed");
	});

	it("falls back to the Unknown presentation for invalid values (defense in depth)", () => {
		expect(getStatusPresentation("exploded")).toBe(UNKNOWN_STATUS_PRESENTATION);
		expect(getStatusPresentation(undefined).label).toBe("Unknown");
	});
});
