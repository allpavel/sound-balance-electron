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

import { createListenerMiddleware } from "@reduxjs/toolkit";
import { setActiveCollection } from "@renderer/store/slices/collectionSlice";
import {
	INVALID_ACTIVE_COLLECTION_TOAST,
	INVALID_ACTIVE_COLLECTION_TOAST_ID,
} from "@shared/constants";
import { formatValidationIssues } from "@shared/utils";
import { safeParseActiveCollection } from "@shared/validators";
import { toast } from "sonner";

/** Listener middleware for the active-collection slice. */
export const collectionListenerMiddleware = createListenerMiddleware();

collectionListenerMiddleware.startListening({
	actionCreator: setActiveCollection,
	effect: (action) => {
		const parsed = safeParseActiveCollection(action.payload);
		if (parsed.success) {
			return;
		}
		toast.error(INVALID_ACTIVE_COLLECTION_TOAST, {
			id: INVALID_ACTIVE_COLLECTION_TOAST_ID,
		});
		// biome-ignore lint/suspicious/noConsole: Developer diagnostics for a rejected store payload; sanitized, count-capped issue text only.
		console.warn(
			"[collectionMiddleware] rejected an invalid setActiveCollection payload",
			{ issues: formatValidationIssues(parsed.issues) },
		);
	},
});
