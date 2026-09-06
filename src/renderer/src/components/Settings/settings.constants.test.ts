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
	audioFilterConfigSchema,
	FILTER_NAMES,
} from "@shared/schemas/settings.schema";
import { FILTER_OPTIONS } from "./settings.constants";

describe("settings.constants - FILTER_OPTIONS contract", () => {
	const entries = Object.entries(FILTER_OPTIONS);

	it("declares at least one filter configuration", () => {
		expect(entries.length).toBeGreaterThan(0);
	});

	it("only declares filters that are members of FILTER_NAMES", () => {
		const knownFilters = new Set<string>(FILTER_NAMES);
		for (const [key] of entries) {
			expect(
				knownFilters.has(key),
				`"${key}" must be a member of FILTER_NAMES`,
			).toBe(true);
		}
	});

	it("keeps the object key and the config name field in sync for every filter", () => {
		for (const [key, config] of entries) {
			expect(config.name, `Key "${key}" must match its config name`).toBe(key);
		}
	});

	it("satisfies audioFilterConfigSchema for every declared filter", () => {
		for (const [key, config] of entries) {
			const result = audioFilterConfigSchema.safeParse(config);
			const reason = result.success
				? ""
				: `: ${JSON.stringify(result.error.issues)}`;
			expect(
				result.success,
				`FILTER_OPTIONS["${key}"] must satisfy audioFilterConfigSchema${reason}`,
			).toBe(true);
		}
	});

	it("declares unique option labels within each filter", () => {
		for (const [key, config] of entries) {
			const labels = config.options.map((option) => option.label);
			expect(
				new Set(labels).size,
				`FILTER_OPTIONS["${key}"] contains duplicate option labels`,
			).toBe(labels.length);
		}
	});
});
