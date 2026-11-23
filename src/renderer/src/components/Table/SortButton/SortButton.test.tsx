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
import "@testing-library/jest-dom/vitest";
import { MantineProvider } from "@mantine/core";
import type { SortDirection } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import {
	describeSortControl,
	type SortableColumnInfo,
	SortButton,
} from "./SortButton";

/**
 * Builds a structural fake satisfying `SortableColumnInfo` without any type
 * assertion — the props type is intentionally minimal so fakes are assignable.
 */
function makeColumn(
	overrides: {
		canSort?: boolean;
		sorted?: false | SortDirection;
		header?: unknown;
		onToggle?: () => void;
	} = {},
): SortableColumnInfo {
	return {
		getCanSort: () => overrides.canSort ?? true,
		getIsSorted: () => overrides.sorted ?? false,
		getToggleSortingHandler: () => overrides.onToggle ?? (() => {}),
		columnDef: {
			header: "header" in overrides ? overrides.header : "Artist",
		},
	};
}

/** Renders `SortButton` for one column inside a minimal table shell. */
function renderButton(column: SortableColumnInfo) {
	return render(
		<MantineProvider>
			<table>
				<thead>
					<tr>
						<th>
							<SortButton column={column} />
						</th>
					</tr>
				</thead>
			</table>
		</MantineProvider>,
	);
}

describe("describeSortControl", () => {
	it("announces the ascending cycle step for an unsorted column", () => {
		const described = describeSortControl("Artist", "unsorted");
		expect(described.ariaLabel).toBe(
			"Artist, not sorted. Activate to sort ascending.",
		);
	});

	it("announces the descending cycle step for an ascending column", () => {
		const described = describeSortControl("Year", "asc");
		expect(described.ariaLabel).toBe(
			"Year, sorted ascending. Activate to sort descending.",
		);
	});

	it("announces clearing for a descending column", () => {
		const described = describeSortControl("Year", "desc");
		expect(described.ariaLabel).toBe(
			"Year, sorted descending. Activate to clear sorting.",
		);
	});

	it("exposes the matching aria-sort value for header cells", () => {
		expect(describeSortControl("A", "asc").ariaSort).toBe("ascending");
		expect(describeSortControl("A", "desc").ariaSort).toBe("descending");
		expect(describeSortControl("A", "unsorted").ariaSort).toBe("none");
	});
});

describe("<SortButton />", () => {
	it("renders nothing for non-sortable columns", () => {
		const { container } = renderButton(makeColumn({ canSort: false }));
		expect(container.querySelector("button")).toBeNull();
	});

	it("renders a real <button> (keyboard operable) with a descriptive accessible name", () => {
		renderButton(makeColumn({ header: "Album", sorted: false }));
		const button = screen.getByRole("button", {
			name: "Album, not sorted. Activate to sort ascending.",
		});
		expect(button).toBeInTheDocument();
		expect(button.tagName).toBe("BUTTON");
	});

	it("invokes the column toggle handler on click", () => {
		const onToggle = vi.fn();
		renderButton(makeColumn({ onToggle }));
		fireEvent.click(screen.getByRole("button"));
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("falls back to a generic header text when the header is not a string", () => {
		renderButton(makeColumn({ header: undefined }));
		expect(
			screen.getByRole("button", {
				name: /column, not sorted\. Activate to sort ascending\./i,
			}),
		).toBeInTheDocument();
	});

	it("hides the state icon from assistive technology (the label carries the state)", () => {
		const { container } = renderButton(makeColumn({ sorted: "asc" }));
		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		expect(svg).toHaveAttribute("aria-hidden", "true");
	});
});
