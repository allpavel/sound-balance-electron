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

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Sonner severities used by the managed read surface. */
export type ToastSeverity = "error" | "warning";

/**
 * Fires a sonner toast once per distinct non-null `signature`.
 *
 * Live queries re-emit on every table change; the signature dedupe prevents
 * repeat toasts while the same condition persists, and a `null` signature
 * (healthy state) re-arms the channel so a recurrence reports again. The
 * stable sonner `toastId` is the second defense: same-id toasts replace
 * instead of stacking.
 *
 * @param signature - Dedupe key of the reported condition; `null` when
 *                    there is nothing to report.
 * @param message   - User-facing copy; required when `signature` is
 *                    non-null (a `null` message suppresses the toast).
 * @param severity  - Toast severity channel.
 * @param toastId   - Stable sonner identity of this reporting channel.
 */
export function useDedupedToast(
	signature: string | null,
	message: string | null,
	severity: ToastSeverity,
	toastId: string,
): void {
	const lastSignature = useRef<string | null>(null);
	useEffect(() => {
		if (signature === lastSignature.current) {
			return;
		}
		lastSignature.current = signature;
		if (signature === null || message === null) {
			return;
		}
		toast[severity](message, { id: toastId });
	}, [signature, message, severity, toastId]);
}
