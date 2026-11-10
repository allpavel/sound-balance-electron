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
import { render, screen } from "@testing-library/react";
import SkipLink from "./SkipLink";

describe("<SkipLink />", () => {
	it("renders a link to the main landmark with default copy", () => {
		render(<SkipLink />);
		const link = screen.getByRole("link", { name: "Skip to main content" });
		expect(link).toHaveAttribute("href", "#main-content");
	});

	it("supports custom targets and labels", () => {
		render(<SkipLink targetId="tracks">Jump to tracks</SkipLink>);
		expect(
			screen.getByRole("link", { name: "Jump to tracks" }),
		).toHaveAttribute("href", "#tracks");
	});
});
