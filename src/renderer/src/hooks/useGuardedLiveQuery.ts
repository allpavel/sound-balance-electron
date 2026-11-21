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
	type LiveQueryFailure,
	readFailureSignature,
	toLiveQueryFailure,
} from "@renderer/db/utils/readDiagnostics";
import { createSignatureGate, type SignatureGate } from "@renderer/utils";
import { MAX_REASON_LENGTH } from "@shared/constants";
import { sanitizeControlChars } from "@shared/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef } from "react";

/**
 * One emission of a guarded live query: either data or a typed failure —
 * never both. The querier-level catch is what keeps the underlying
 * `useLiveQuery` observable from erroring (and therefore from throwing
 * during render).
 */
type GuardedEmission<T> =
	| { readonly data: T; readonly failure: null }
	| { readonly data: undefined; readonly failure: LiveQueryFailure };

/**
 * State exposed by {@link useGuardedLiveQuery}.
 *
 * @property data      - Last successful emission; `undefined` until the
 *                       first success or while a failure is current.
 * @property failure   - Typed failure of the latest emission; `null` when
 *                       the query is healthy.
 * @property isLoading - `true` until the query produces its first emission
 *                       (success or failure).
 */
export type GuardedLiveQueryState<T> = {
	readonly data: T | undefined;
	readonly failure: LiveQueryFailure | null;
	readonly isLoading: boolean;
};

/**
 * Developer-channel log for a managed read failure. Output is sanitized and
 * bounded (log-injection / log-flooding defense, consistent with the
 * read-guard quarantine diagnostic).
 *
 * @param failure - The classified failure being surfaced to the UI.
 * @param error   - The original thrown value.
 */
function logGuardedReadFailure(
	failure: LiveQueryFailure,
	error: unknown,
): void {
	const reason =
		error instanceof Error
			? sanitizeControlChars(error.message).slice(0, MAX_REASON_LENGTH)
			: null;
	// biome-ignore lint/suspicious/noConsole: Developer channel for a managed read failure; the user-facing surface is the returned failure state. Output is sanitized and bounded.
	console.error(`[${failure.scope}] guarded read failed (${failure.kind})`, {
		detail: failure.detail,
		reason,
	});
}

/**
 * `useLiveQuery` wrapper converting querier rejections into typed state
 * instead of a render-time throw.
 *
 * dexie-react-hooks re-throws observable errors during render (so an error
 * boundary can catch them); guarded repository reads fail loud by contract,
 * so every consumer of guarded data must route through this wrapper — or be
 * wrapped in an error boundary — to remain crash-free.
 *
 * @typeParam T - Querier result type.
 * @param querier - Async read; may reject. May be re-created freely —
 *                  re-runs are driven by `deps`, exactly like `useLiveQuery`.
 * @param deps    - Live-query dependencies, forwarded verbatim. Callers must
 *                  include every value the querier closes over (dexie
 *                  contract).
 * @param scope   - Stable tag used in the failure state and developer logs.
 * @returns Data/failure/loading state; never throws for querier rejections.
 */
export function useGuardedLiveQuery<T>(
	querier: () => Promise<T>,
	deps: readonly unknown[],
	scope: string,
): GuardedLiveQueryState<T> {
	const gateRef = useRef<SignatureGate | null>(null);
	if (gateRef.current === null) {
		gateRef.current = createSignatureGate();
	}
	const gate = gateRef.current;
	const emission = useLiveQuery(async (): Promise<GuardedEmission<T>> => {
		try {
			const data = await querier();
			gate.rearm();
			return { data, failure: null };
		} catch (error) {
			const failure = toLiveQueryFailure(error, scope);
			const signature = readFailureSignature(failure);
			if (signature !== null && gate.admit(signature)) {
				logGuardedReadFailure(failure, error);
			}
			return { data: undefined, failure };
		}
	}, [...deps]);
	return {
		data: emission?.data,
		failure: emission?.failure ?? null,
		isLoading: emission === undefined,
	};
}
