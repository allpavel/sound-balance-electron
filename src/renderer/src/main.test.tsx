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
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import type { JSX } from "react";
import { isValidElement, StrictMode } from "react";
import { Provider as RTKProvider } from "react-redux";
import { Toaster } from "sonner";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { store } from "./store/store";

vi.mock("./App", () => ({
	default: (): JSX.Element => <div data-testid="app-shell" />,
}));

/**
 * Narrows one hop of the root tree to its single element child.
 *
 * Narrowing note: `JSX.Element.props` is typed loosely, and `children` may
 * legally be text, an array, or a portal. The root tree is a single-element
 * chain down to the Mantine level by contract, so `isValidElement` (React's
 * own type guard — no cast) re-establishes the element type and fails loud
 * if the wiring ever changes shape.
 */
function childOf(parent: JSX.Element): JSX.Element {
	const { children } = parent.props;
	if (!isValidElement(children)) {
		throw new Error(
			"main.tsx root tree changed shape: expected exactly one element child at this level",
		);
	}
	return children;
}

/**
 * Narrows one hop of the root tree to its element children, tolerating both
 * the single-element and the array form React uses for multiple children.
 *
 * Narrowing note: `Array.isArray` narrows the loosely typed `children` to an
 * array, `isValidElement` filters to elements only — both are React/TS type
 * guards, no cast. Non-element children (text nodes) are intentionally
 * dropped here; the wiring test asserts on elements alone.
 */
function elementChildrenOf(parent: JSX.Element): JSX.Element[] {
	const { children } = parent.props;
	if (Array.isArray(children)) {
		return children.filter(isValidElement);
	}
	if (isValidElement(children)) {
		return [children];
	}
	return [];
}

/**
 * main.tsx self-boots on import (by design), so it is imported dynamically
 * after #root exists — a static import would run the bootstrap before the
 * test DOM is prepared. The hoisted "./App" mock applies both here and to
 * main.tsx's own import.
 */
function importMain(): Promise<typeof import("./main")> {
	return import("./main");
}

describe("main entry wiring (W1-1)", () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="root"></div>';
	});

	it("mounts ErrorBoundary as the outermost app guard and boots it into #root", async () => {
		const { createAppRoot } = await act(() => importMain());
		const root = createAppRoot();
		expect(root.type).toBe(StrictMode);
		const boundary = childOf(root);
		expect(boundary.type).toBe(ErrorBoundary);
		const queryProvider = childOf(boundary);
		expect(queryProvider.type).toBe(QueryClientProvider);
		const rtkProvider = childOf(queryProvider);
		expect(rtkProvider.type).toBe(RTKProvider);
		expect(rtkProvider.props.store).toBe(store);
		const uiProvider = childOf(rtkProvider);
		expect(uiProvider.type).toBe(MantineProvider);
		expect(elementChildrenOf(uiProvider).map((child) => child.type)).toEqual([
			App,
			Toaster,
		]);
		expect(
			document.querySelector("#root [data-testid='app-shell']"),
		).not.toBeNull();
	});

	it("fails loud when the #root mount point is missing (no silent blank window)", async () => {
		document.body.innerHTML = "";
		vi.resetModules();
		await expect(importMain()).rejects.toThrow(/#root/);
	});
});
