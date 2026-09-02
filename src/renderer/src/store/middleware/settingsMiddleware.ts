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
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import {
	getSettings,
	resetSettings,
	saveSettings,
} from "@renderer/store/slices/settingsSlice";
import { toast } from "sonner";

export const listenerMiddleware = createListenerMiddleware();

const isLoadRejection = isAnyOf(getSettings.rejected);
const isSaveRejection = isAnyOf(saveSettings.rejected);

listenerMiddleware.startListening({
	matcher: isLoadRejection,
	effect: async (_action, listenerApi) => {
		toast.error("Stored settings are corrupted and were reset to defaults.");
		listenerApi.dispatch(resetSettings());
	},
});

listenerMiddleware.startListening({
	matcher: isSaveRejection,
	effect: async () => {
		toast.error("Unable to save settings. Please try again.");
	},
});
