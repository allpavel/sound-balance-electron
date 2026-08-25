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

import { useMemo } from "react";
import type { CollectionType } from "@/types";

/**
 * Checks if a collection title already exists (case-insensitive and trims whitespace).
 * @param title The title to check.
 * @param collections The array of existing collections.
 * @param excludeId Optional collection ID to exclude from the check (used when editing).
 * @returns boolean - true if a duplicate is found.
 */
export function useDuplicateCollectionCheck(
	title: string | null | undefined,
	collections: CollectionType[],
	excludeId?: string,
): boolean {
	return useMemo(() => {
		if (!title) return false;

		const trimmedTitle = title.trim().toLowerCase();

		if (!trimmedTitle) return false;

		return collections.some((collection) => {
			if (excludeId && collection.id === excludeId) return false;
			return collection.title.trim().toLowerCase() === trimmedTitle;
		});
	}, [title, collections, excludeId]);
}
