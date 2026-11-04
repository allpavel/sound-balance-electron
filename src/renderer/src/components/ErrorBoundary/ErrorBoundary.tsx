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
	MAX_LOGGED_ERROR_NAME_LENGTH,
	MAX_REASON_LENGTH,
	RENDER_CRASH_MESSAGE,
	RENDER_CRASH_RELOAD_LABEL,
	RENDER_CRASH_TITLE,
} from "@shared/constants";
import { sanitizeControlChars } from "@shared/utils";
import {
	Component,
	type CSSProperties,
	type ErrorInfo,
	type ReactElement,
	type ReactNode,
} from "react";

/** Props of {@link ErrorBoundary}. */
export type ErrorBoundaryProps = {
	readonly children: ReactNode;
	/**
	 * Reload action invoked by the fallback button. Injectable for tests and
	 * shell customization; defaults to a full renderer reload.
	 */
	readonly onReload?: () => void;
};

/** Props of {@link ErrorFallback}. */
export type ErrorFallbackProps = {
	readonly onReload?: () => void;
};

type ErrorBoundaryState = {
	readonly hasError: boolean;
};

const fallbackLayout: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: "0.75rem",
	minHeight: "12rem",
	padding: "1.5rem",
	textAlign: "center",
};

/**
 * Default recovery action: a full renderer reload. After an unknown-provenance
 * render crash, in-memory state is not trusted (Zero Trust), so reload — not
 * in-place resume — is the only designed recovery.
 */
function defaultReload(): void {
	window.location.reload();
}

/**
 * Sanitizes and bounds a string before it is interpolated into the crash
 * diagnostic (log-injection / log-flooding defense, consistent with the
 * read-guard quarantine warnings).
 *
 * @param value - Raw text from the error or React's component stack.
 * @param max   - Upper bound on the logged length.
 * @returns The sanitized, capped text.
 */
function boundedText(value: string, max: number): string {
	return sanitizeControlChars(value).slice(0, max);
}

/**
 * Designed fallback rendered instead of a crashed subtree.
 *
 * @param props - Optional `onReload` override for the recovery button.
 * @returns The fallback UI (heading, reassurance copy, reload action).
 */
export function ErrorFallback({ onReload }: ErrorFallbackProps): ReactElement {
	return (
		<div role="alert" style={fallbackLayout}>
			<h1>{RENDER_CRASH_TITLE}</h1>
			<p>{RENDER_CRASH_MESSAGE}</p>
			<button type="button" onClick={onReload ?? defaultReload}>
				{RENDER_CRASH_RELOAD_LABEL}
			</button>
		</div>
	);
}

/**
 * App/route-level error boundary rendering {@link ErrorFallback} when any
 * descendant throws during render.
 */
export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	override state: ErrorBoundaryState = { hasError: false };
	/**
	 * Switches the boundary into fallback mode for any render error.
	 *
	 * @returns The error state (`hasError: true`).
	 */
	static getDerivedStateFromError(): ErrorBoundaryState {
		return { hasError: true };
	}

	/**
	 * Emits the sanitized, bounded developer diagnostic for the caught crash.
	 *
	 * Narrowing note: only `Error` instances are trusted with `name`/`message`
	 * access; arbitrary thrown values are never stringified via `String()`
	 * (a hostile `toString` must not break the crash handler itself).
	 *
	 * @param error     - The value thrown during render.
	 * @param errorInfo - React's component-stack context.
	 */
	override componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
		let name: string;
		let reason: string;
		if (error instanceof Error) {
			name = error.name;
			reason = error.message;
		} else {
			name = "non-error";
			reason = typeof error === "string" ? error : "";
		}
		// biome-ignore lint/suspicious/noConsole: Last-resort crash channel; output is sanitized and bounded before interpolation.
		console.error(`[ErrorBoundary] ${RENDER_CRASH_TITLE}`, {
			name: boundedText(name, MAX_LOGGED_ERROR_NAME_LENGTH),
			reason: boundedText(reason, MAX_REASON_LENGTH),
			componentStack: boundedText(
				errorInfo.componentStack ?? "",
				MAX_REASON_LENGTH,
			),
		});
	}

	/**
	 * Renders the fallback while in error state, otherwise the children.
	 *
	 * @returns The current subtree.
	 */
	override render(): ReactNode {
		if (this.state.hasError) {
			return <ErrorFallback onReload={this.props.onReload} />;
		}
		return this.props.children;
	}
}
