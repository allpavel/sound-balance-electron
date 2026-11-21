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
import { tracksRepository } from "@renderer/db/repositories/trackRepository";
import { TRACK_READ_TOAST_IDS, useTracks } from "@renderer/hooks/useTracks";
import {
	MAX_REASON_LENGTH,
	RENDER_CRASH_RELOAD_LABEL,
	RENDER_CRASH_TITLE,
	TRACK_READ_VALIDATION_MESSAGE,
} from "@shared/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { spyOnConsoleError } from "@tests/utils";
import { useLiveQuery } from "dexie-react-hooks";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { ErrorBoundary, ErrorFallback } from "./ErrorBoundary";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

/** Pre-WP-1 pattern: raw live query over a fail-loud guarded repository read. */
function UnmanagedReader(): ReactElement {
	const tracks = useLiveQuery(() => tracksRepository.getAll(""), []);
	return (
		<div>{`tracks:${tracks === undefined ? "loading" : tracks.ok.length}`}</div>
	);
}

/** WP-1 pattern: the same fail-loud repository read behind the managed hook. */
function ManagedReader(): ReactElement {
	const { tracks, tracksError } = useTracks("");
	return (
		<div>
			<span>{`error:${tracksError?.kind ?? "none"}`}</span>
			<span>{`tracks:${tracks.length}`}</span>
		</div>
	);
}

function renderWithQueryClient(ui: ReactElement): void {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ErrorBoundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it("renders children while no error occurred", () => {
		spyOnConsoleError();
		render(
			<ErrorBoundary>
				<span>healthy-content</span>
			</ErrorBoundary>,
		);
		expect(screen.getByText("healthy-content")).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: RENDER_CRASH_TITLE }),
		).not.toBeInTheDocument();
	});

	it("renders the designed fallback when a child throws during render", () => {
		spyOnConsoleError();
		function Boom(): ReactElement {
			throw new Error("render exploded");
		}
		render(
			<ErrorBoundary>
				<span>child-content</span>
				<Boom />
			</ErrorBoundary>,
		);
		expect(
			screen.getByRole("heading", { name: RENDER_CRASH_TITLE }),
		).toBeInTheDocument();
		expect(screen.queryByText("child-content")).not.toBeInTheDocument();
	});

	it("shows the fallback for a forced repository failure on an unmanaged live query (fault injection)", async () => {
		spyOnConsoleError();
		render(
			<ErrorBoundary>
				<UnmanagedReader />
			</ErrorBoundary>,
		);
		expect(
			await screen.findByRole("heading", { name: RENDER_CRASH_TITLE }),
		).toBeInTheDocument();
	});

	it("does not reach the fallback when the same repository failure flows through the managed hook surface", async () => {
		spyOnConsoleError();
		renderWithQueryClient(
			<ErrorBoundary>
				<ManagedReader />
			</ErrorBoundary>,
		);
		expect(await screen.findByText("error:validation")).toBeInTheDocument();
		expect(screen.getByText("tracks:0")).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: RENDER_CRASH_TITLE }),
		).not.toBeInTheDocument();
		await vi.waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(TRACK_READ_VALIDATION_MESSAGE, {
				id: TRACK_READ_TOAST_IDS.collectionRead,
			});
		});
	});

	it("invokes the injected reload action from the fallback", () => {
		const onReload = vi.fn();
		render(<ErrorFallback onReload={onReload} />);
		fireEvent.click(
			screen.getByRole("button", { name: RENDER_CRASH_RELOAD_LABEL }),
		);
		expect(onReload).toHaveBeenCalledTimes(1);
	});

	it("sanitizes and bounds hostile error content in the crash diagnostic", () => {
		const errorSpy = spyOnConsoleError();
		const hostile = `\u001b[31m${"x".repeat(MAX_REASON_LENGTH * 2)}`;
		function Boom(): ReactElement {
			throw new Error(hostile);
		}
		render(
			<ErrorBoundary>
				<Boom />
			</ErrorBoundary>,
		);
		const logged = errorSpy.mock.calls.find(
			(call) =>
				typeof call[0] === "string" && call[0].startsWith("[ErrorBoundary]"),
		);
		expect(logged).toBeDefined();
		const payload = logged?.[1];
		expect(payload).toMatchObject({ name: "Error" });
		const reason =
			typeof payload === "object" &&
			payload !== null &&
			"reason" in payload &&
			typeof payload.reason === "string"
				? payload.reason
				: null;
		expect(reason).not.toBeNull();
		expect(reason).not.toContain("\u001b");
		expect(reason).toContain("\uFFFD");
		expect(reason?.length).toBeLessThanOrEqual(MAX_REASON_LENGTH);
	});
});
