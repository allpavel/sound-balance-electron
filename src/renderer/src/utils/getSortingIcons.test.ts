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

// @vitest-environment jsdom
import { ActionIcon } from "@mantine/core";
import {
	getSortingIcon,
	type SortableColumn,
} from "@renderer/utils/getSortingIcons";
import type { SortDirection } from "@tanstack/react-table";
import { ArrowDown, ArrowDownUp, ArrowUp, type LucideIcon } from "lucide-react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

type SortStateTestCase = {
	sortDir: false | SortDirection;
	icon: LucideIcon;
	ariaLabel: string;
	stateLabel: string;
};

const sortStateCases: SortStateTestCase[] = [
	{
		sortDir: "asc",
		icon: ArrowUp,
		ariaLabel: "Sort Artist in ascending order",
		stateLabel: "ascending",
	},
	{
		sortDir: "desc",
		icon: ArrowDown,
		ariaLabel: "Sort Artist in descending order",
		stateLabel: "descending",
	},
	{
		sortDir: false,
		icon: ArrowDownUp,
		ariaLabel: "Default Artist Sorting",
		stateLabel: "unsorted",
	},
];

type HeaderFallbackCase = {
	header: unknown;
	scenario: string;
};

const headerFallbackCases: HeaderFallbackCase[] = [
	{ header: () => "Custom header", scenario: "render-function header" },
	{ header: undefined, scenario: "undefined header" },
	{ header: "", scenario: "empty header" },
	{ header: "   ", scenario: "whitespace-only header" },
];

type ColumnStubOverrides = Partial<{
	canSort: boolean;
	sortDir: false | SortDirection;
	header: unknown;
}>;

function createColumnStub(overrides: ColumnStubOverrides = {}): SortableColumn {
	const canSort = overrides.canSort ?? true;
	const sortDir = overrides.sortDir ?? false;
	const header = "header" in overrides ? overrides.header : "Title";
	return {
		getCanSort: () => canSort,
		getIsSorted: () => sortDir,
		columnDef: { header },
	};
}

describe("getSortingIcon", () => {
	it("returns null when sorting is disabled", () => {
		const column = createColumnStub({ canSort: false, sortDir: "asc" });

		expect(getSortingIcon(column as any)).toBeNull();
	});

	it.each(sortStateCases)(
		"returns an ActionIcon for the $stateLabel state with the matching icon and exact props",
		({ sortDir, icon, ariaLabel }) => {
			const result = getSortingIcon(
				createColumnStub({ sortDir, header: "Artist" }) as any,
			);
			expect(result).not.toBeNull();
			expect(result?.type).toBe(ActionIcon);
			const { children, ...actionIconProps } = (result as ReactElement)
				.props as any;
			expect(actionIconProps).toEqual({
				variant: "subtle",
				color: "dark",
				"aria-label": ariaLabel,
			});
			expect(children).toHaveProperty("type", icon);
			expect(children).toHaveProperty("props", { size: 16 });
		},
	);

	it("interpolates the column header into the aria-label", () => {
		const result = getSortingIcon(
			createColumnStub({ sortDir: "desc", header: "Release Year" }) as any,
		);
		expect(result?.props["aria-label"]).toBe(
			"Sort Release Year in descending order",
		);
	});

	it.each(headerFallbackCases)(
		"falls back to a generic aria-label for a $scenario",
		({ header }) => {
			const result = getSortingIcon(
				createColumnStub({ sortDir: "asc", header }) as any,
			);
			expect(result?.props["aria-label"]).toBe(
				"Sort column in ascending order",
			);
		},
	);
});
