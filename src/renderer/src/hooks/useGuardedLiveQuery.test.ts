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
import {
	MAX_REASON_LENGTH,
	TRACK_READ_STORAGE_MESSAGE,
	TRACK_READ_UNKNOWN_MESSAGE,
	TRACK_READ_VALIDATION_MESSAGE,
} from "@shared/constants";
import { TrackValidationError } from "@shared/errors";
import { createRootIssue } from "@shared/validators";
import { act, renderHook, waitFor } from "@testing-library/react";
import { spyOnConsoleError } from "@tests/utils";
import { useGuardedLiveQuery } from "./useGuardedLiveQuery";

const SCOPE = "testRepository.read";

type QueryProps = {
	querier: () => Promise<unknown>;
	deps: readonly unknown[];
	scope: string;
};

function renderQuery(
	querier: () => Promise<unknown>,
	deps: readonly unknown[] = [],
	scope = SCOPE,
) {
	return renderHook(
		({ querier: q, deps: d, scope: s }: QueryProps) =>
			useGuardedLiveQuery(q, d, s),
		{ initialProps: { querier, deps, scope } },
	);
}

function validationRejection(): Promise<unknown> {
	return Promise.reject(
		new TrackValidationError("id", [
			createRootIssue("invalid_type", "ID must be a non-empty string"),
		]),
	);
}

describe("useGuardedLiveQuery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("starts in the loading state and resolves to data without failure", async () => {
		const { promise, resolve } = Promise.withResolvers<string[]>();
		const { result } = renderQuery(() => promise);
		expect(result.current).toEqual({
			data: undefined,
			failure: null,
			isLoading: true,
		});
		resolve(["t1"]);
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current).toEqual({
			data: ["t1"],
			failure: null,
			isLoading: false,
		});
	});

	it("converts a querier rejection into typed failure state instead of a render throw", async () => {
		spyOnConsoleError();
		const { result } = renderQuery(validationRejection);
		await waitFor(() => expect(result.current.failure).not.toBeNull());
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
		expect(result.current.failure).toEqual({
			kind: "validation",
			message: TRACK_READ_VALIDATION_MESSAGE,
			scope: SCOPE,
			detail: "id",
		});
	});

	it("classifies an engine open failure as the storage kind", async () => {
		spyOnConsoleError();
		const engineError = new Error("Failed to open database");
		engineError.name = "OpenFailedError";
		const { result } = renderQuery(() => Promise.reject(engineError));
		await waitFor(() => expect(result.current.failure).not.toBeNull());
		expect(result.current.failure).toMatchObject({
			kind: "storage",
			scope: SCOPE,
			detail: "OpenFailedError",
		});
		expect(result.current.failure?.message).toBe(TRACK_READ_STORAGE_MESSAGE);
	});

	it("never leaks raw error text through an unrecognized rejection", async () => {
		spyOnConsoleError();
		const { result } = renderQuery(() =>
			Promise.reject(new Error("raw internal detail")),
		);
		await waitFor(() => expect(result.current.failure).not.toBeNull());
		expect(result.current.failure?.message).toBe(TRACK_READ_UNKNOWN_MESSAGE);
		expect(result.current.failure?.message).not.toContain(
			"raw internal detail",
		);
	});

	it("logs a sanitized, bounded developer-channel error once per failed emission", async () => {
		const errorSpy = spyOnConsoleError();
		const raw = `\u001b[31m${"x".repeat(MAX_REASON_LENGTH * 2)}`;
		const { result } = renderQuery(() => Promise.reject(new Error(raw)));
		await waitFor(() => expect(result.current.failure).not.toBeNull());
		await waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1));
		const expectedReason = `\uFFFD[31m${"x".repeat(MAX_REASON_LENGTH - 5)}`;
		expect(errorSpy).toHaveBeenCalledWith(
			`[${SCOPE}] guarded read failed (unknown)`,
			expect.objectContaining({ reason: expectedReason }),
		);
	});

	it("does not read a message from non-Error rejections (hostile toString safety)", async () => {
		const errorSpy = spyOnConsoleError();
		const hostile = {
			message: "hostile payload",
			toString() {
				throw new Error("toString trap");
			},
		};
		const { result } = renderQuery(() => Promise.reject(hostile));
		await waitFor(() => expect(result.current.failure).not.toBeNull());
		expect(result.current.failure?.kind).toBe("unknown");
		expect(errorSpy).toHaveBeenCalledWith(
			`[${SCOPE}] guarded read failed (unknown)`,
			expect.objectContaining({ reason: null }),
		);
	});

	it("maps a primitive rejection into the managed surface as well", async () => {
		spyOnConsoleError();
		const { result } = renderQuery(() =>
			Promise.reject("plain string failure"),
		);
		await waitFor(() => expect(result.current.failure).not.toBeNull());
		expect(result.current.failure).toMatchObject({
			kind: "unknown",
			message: TRACK_READ_UNKNOWN_MESSAGE,
			scope: SCOPE,
		});
	});

	it("re-runs on deps changes only — querier identity alone does not re-subscribe", async () => {
		const first = vi.fn(() => Promise.resolve("one"));
		const second = vi.fn(() => Promise.resolve("two"));
		const { result, rerender } = renderQuery(first, [1]);
		await waitFor(() => expect(result.current.data).toBe("one"));
		rerender({ querier: second, deps: [1], scope: SCOPE });
		await act(async () => {});
		expect(second).not.toHaveBeenCalled();
		expect(result.current.data).toBe("one");
		rerender({ querier: second, deps: [2], scope: SCOPE });
		await waitFor(() => expect(result.current.data).toBe("two"));
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("recovers to a clean state when a later emission succeeds", async () => {
		spyOnConsoleError();
		const { result, rerender } = renderQuery(validationRejection, ["bad"]);
		await waitFor(() => expect(result.current.failure).not.toBeNull());
		rerender({
			querier: () => Promise.resolve(["ok"]),
			deps: ["good"],
			scope: SCOPE,
		});
		await waitFor(() => expect(result.current.failure).toBeNull());
		expect(result.current).toEqual({
			data: ["ok"],
			failure: null,
			isLoading: false,
		});
	});

	it("clears previously emitted data while a failure is current", async () => {
		spyOnConsoleError();
		const { result, rerender } = renderQuery(
			() => Promise.resolve(["ok"]),
			["good"],
		);
		await waitFor(() => expect(result.current.data).toEqual(["ok"]));
		rerender({ querier: validationRejection, deps: ["bad"], scope: SCOPE });
		await waitFor(() => expect(result.current.failure).not.toBeNull());
		expect(result.current.data).toBeUndefined();
	});
});
