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
import { render, screen } from "@testing-library/react";
import StatusBadge from "./StatusBadge";

/** Renders `StatusBadge` wrapped in a bare MantineProvider. */
function renderBadge(props: React.ComponentProps<typeof StatusBadge>) {
	return render(
		<MantineProvider>
			<StatusBadge {...props} />
		</MantineProvider>,
	);
}

describe("<StatusBadge />", () => {
	it.each([
		["pending", "Queued"],
		["processing", "Processing"],
		["completed", "Processed"],
		["failed", "Failed"],
	] as const)(
		"renders the visible text label for %s (status is never color-only)",
		(status, label) => {
			renderBadge({ status });
			expect(screen.getByText(label)).toBeInTheDocument();
		},
	);

	it("exposes a role=img with a descriptive accessible name", () => {
		renderBadge({ status: "completed" });
		expect(
			screen.getByRole("img", { name: "Processed — completed successfully" }),
		).toBeInTheDocument();
	});

	it("appends the failure reason to the accessible name", () => {
		renderBadge({ status: "failed", reason: "FFmpeg crashed" });
		expect(
			screen.getByRole("img", {
				name: "Failed — processing did not complete: FFmpeg crashed",
			}),
		).toBeInTheDocument();
	});

	it("hides the state icon from assistive technology", () => {
		const { container } = renderBadge({ status: "processing" });
		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		expect(svg).toHaveAttribute("aria-hidden", "true");
	});

	it("applies the slow-spin class only while processing (<= 3 Hz guarantee)", () => {
		const { container, rerender } = renderBadge({ status: "processing" });
		expect(container.querySelector("svg")).toHaveClass("sb-spin-slow");
		rerender(
			<MantineProvider>
				<StatusBadge status="completed" />
			</MantineProvider>,
		);
		expect(container.querySelector("svg")).not.toHaveClass("sb-spin-slow");
	});

	it("degrades gracefully to Unknown for invalid runtime data (zero trust)", () => {
		renderBadge({ status: "not-a-status" });
		expect(screen.getByText("Unknown")).toBeInTheDocument();
		expect(
			screen.getByRole("img", {
				name: /Status unknown/i,
			}),
		).toBeInTheDocument();
	});

	it("keeps the accessible name in compact (icon-only) mode", () => {
		renderBadge({ status: "pending", compact: true });
		expect(
			screen.getByRole("img", { name: "Queued — waiting to be processed" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Queued")).not.toBeInTheDocument();
	});

	it("ignores whitespace-only reasons", () => {
		renderBadge({ status: "failed", reason: "   " });
		expect(
			screen.getByRole("img", { name: "Failed — processing did not complete" }),
		).toBeInTheDocument();
	});
});
