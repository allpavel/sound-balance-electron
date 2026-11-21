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

import { setActiveCollection } from "@renderer/store/slices/collectionSlice";
import { type AppStore, createAppStore } from "@renderer/store/store";
import {
	INVALID_ACTIVE_COLLECTION_TOAST,
	INVALID_ACTIVE_COLLECTION_TOAST_ID,
	SYSTEM_COLLECTION_ID,
	SYSTEM_COLLECTION_TITLE,
} from "@shared/constants";
import { spyOnConsoleWarn } from "@tests/utils";
import { toast } from "sonner";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

describe("collectionMiddleware", () => {
	let store: AppStore;

	beforeEach(() => {
		vi.clearAllMocks();
		store = createAppStore();
	});

	it("updates the state and stays silent for a valid payload", () => {
		const warnSpy = spyOnConsoleWarn();
		store.dispatch(setActiveCollection({ id: "custom", title: "Mix" }));
		expect(store.getState().activeCollection).toEqual({
			id: "custom",
			title: "Mix",
		});
		expect(toast.error).not.toHaveBeenCalled();
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("toasts the managed failure and leaves the state unchanged for an invalid payload", () => {
		const warnSpy = spyOnConsoleWarn();
		const before = store.getState().activeCollection;
		store.dispatch({
			type: setActiveCollection.type,
			payload: { id: "", title: "Corrupt" },
		});
		expect(store.getState().activeCollection).toBe(before);
		expect(store.getState().activeCollection).toEqual({
			id: SYSTEM_COLLECTION_ID,
			title: SYSTEM_COLLECTION_TITLE,
		});
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(toast.error).toHaveBeenCalledWith(INVALID_ACTIVE_COLLECTION_TOAST, {
			id: INVALID_ACTIVE_COLLECTION_TOAST_ID,
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(warnSpy.mock.calls[0]?.[0]).toBe(
			"[collectionMiddleware] rejected an invalid setActiveCollection payload",
		);
	});

	it("rejects payloads with unexpected keys at both layers (strict schema)", () => {
		spyOnConsoleWarn();
		store.dispatch({
			type: setActiveCollection.type,
			payload: { id: "custom", title: "Mix", extra: true },
		});
		expect(store.getState().activeCollection).toEqual({
			id: SYSTEM_COLLECTION_ID,
			title: SYSTEM_COLLECTION_TITLE,
		});
		expect(toast.error).toHaveBeenCalledWith(INVALID_ACTIVE_COLLECTION_TOAST, {
			id: INVALID_ACTIVE_COLLECTION_TOAST_ID,
		});
	});

	it("stays silent for unrelated actions", () => {
		store.dispatch({ type: "unknown/action" });
		expect(toast.error).not.toHaveBeenCalled();
	});
});
