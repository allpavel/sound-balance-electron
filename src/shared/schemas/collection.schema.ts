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

import z from "zod";
import { nonEmptyStringSchema, targetCollectionIdSchema } from "./track.schema";

/**
 * Runtime contract for the renderer's active-collection selection payload.
 *
 * Reuses the collection-id hygiene schema for `id` and the shared
 * non-empty-string schema for `title` (length cap, null-byte and blank
 * rejection), keeping string-hygiene constraints in a single source.
 */
export const activeCollectionSchema = z
	.object({
		id: targetCollectionIdSchema,
		title: nonEmptyStringSchema,
	})
	.strict();

/** Validated active-collection shape held by the `activeCollection` slice. */
export type ActiveCollection = z.infer<typeof activeCollectionSchema>;
