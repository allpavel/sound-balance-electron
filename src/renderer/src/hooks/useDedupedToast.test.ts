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
import { renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { useDedupedToast } from "./useDedupedToast";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

type HookProps = {
	signature: string | null;
	message: string | null;
	severity: "error" | "warning";
	toastId: string;
};

const baseProps: HookProps = {
	signature: null,
	message: null,
	severity: "warning",
	toastId: "channel-1",
};

function renderToastHook(initialProps: Partial<HookProps> = {}) {
	return renderHook(
		({ signature, message, severity, toastId }: HookProps) =>
			useDedupedToast(signature, message, severity, toastId),
		{ initialProps: { ...baseProps, ...initialProps } },
	);
}

describe("useDedupedToast", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("does not toast while the signature is null", () => {
		renderToastHook({ signature: null, message: "never shown" });
		expect(toast.warning).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("fires once when a distinct condition appears", () => {
		renderToastHook({ signature: "a", message: "condition A" });
		expect(toast.warning).toHaveBeenCalledTimes(1);
		expect(toast.warning).toHaveBeenCalledWith("condition A", {
			id: "channel-1",
		});
	});

	it("does not re-fire while the same signature persists across re-renders", () => {
		const { rerender } = renderToastHook({
			signature: "a",
			message: "condition A",
		});
		rerender({
			...baseProps,
			signature: "a",
			message: "condition A",
			severity: "warning",
			toastId: "channel-1",
		});
		rerender({
			...baseProps,
			signature: "a",
			message: "condition A",
			severity: "warning",
			toastId: "channel-1",
		});
		expect(toast.warning).toHaveBeenCalledTimes(1);
	});

	it("re-fires when the signature changes to a different condition", () => {
		const { rerender } = renderToastHook({
			signature: "a",
			message: "condition A",
		});
		rerender({
			...baseProps,
			signature: "b",
			message: "condition B",
			severity: "warning",
			toastId: "channel-1",
		});
		expect(toast.warning).toHaveBeenCalledTimes(2);
		expect(toast.warning).toHaveBeenLastCalledWith("condition B", {
			id: "channel-1",
		});
	});

	it("re-arms after the condition clears, so a recurrence reports again", () => {
		const { rerender } = renderToastHook({
			signature: "a",
			message: "condition A",
		});
		rerender({
			...baseProps,
			signature: null,
			message: null,
			severity: "warning",
			toastId: "channel-1",
		});
		expect(toast.warning).toHaveBeenCalledTimes(1);
		rerender({
			...baseProps,
			signature: "a",
			message: "condition A",
			severity: "warning",
			toastId: "channel-1",
		});
		expect(toast.warning).toHaveBeenCalledTimes(2);
	});

	it("routes to the requested severity channel", () => {
		renderToastHook({
			signature: "a",
			message: "failure A",
			severity: "error",
			toastId: "channel-err",
		});
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith("failure A", {
			id: "channel-err",
		});
		expect(toast.warning).not.toHaveBeenCalled();
	});

	it("suppresses the toast when the signature is set but the message is null", () => {
		renderToastHook({ signature: "a", message: null });
		expect(toast.warning).not.toHaveBeenCalled();
	});
});
