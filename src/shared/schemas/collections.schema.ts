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
	CONTROL_CHAR_DETECT_PATTERN,
	MAX_COLLECTION_TITLE_LENGTH,
	REQUIRED_FIELD_MESSAGE,
	SYSTEM_COLLECTION_ID,
} from "@shared/constants";
import { nonEmptyStringSchema } from "@shared/schemas/primitives.schema";
import z from "zod";

/**
 * Collection title: NFC-composed and trimmed, length-bounded, control-char free.
 *
 * Output is the canonical display/storage form; input is any string.
 */
export const collectionTitleSchema = z
	.string()
	.transform((raw: string): string => raw.normalize("NFC").trim())
	.pipe(
		z
			.string()
			.min(1, { error: REQUIRED_FIELD_MESSAGE })
			.max(MAX_COLLECTION_TITLE_LENGTH, {
				error: `Must not exceed ${MAX_COLLECTION_TITLE_LENGTH} characters`,
			})
			.refine((title) => !CONTROL_CHAR_DETECT_PATTERN.test(title), {
				error: "Must not contain control characters",
			}),
	);

/** Identifier of any collection, including the protected system collection. */
export const collectionIdSchema = nonEmptyStringSchema;

/**
 * Identifier of a user-managed collection.
 *
 * Rejects the system collection so rename/delete cannot reach it even when a
 * UI guard regresses (Defense in Depth).
 */
export const customCollectionIdSchema = collectionIdSchema.refine(
	(id) => id !== SYSTEM_COLLECTION_ID,
	{ error: "The system collection cannot be renamed or deleted" },
);

/**
 * Persisted collection shape — also the source of the app-wide collection type.
 *
 * `.strip()` (not `.strict()`): rows are read from storage, so unknown columns
 * added by a future migration must not invalidate existing data.
 */
export const collectionSchema = z
	.object({ id: collectionIdSchema, title: collectionTitleSchema })
	.strip();

/**
 * User-editable collection fields: add form, edit form and `update.changes`.
 *
 * `.strict()`: this crosses a caller boundary, so unknown keys are a caller bug.
 */
export const collectionDraftSchema = z
	.object({ title: collectionTitleSchema })
	.strict();

/** Rename payload; the system collection is rejected at the schema level. */
export const updateCollectionPayloadSchema = z
	.object({ id: customCollectionIdSchema, changes: collectionDraftSchema })
	.strict();

/** Delete payload; `deleteFromAllCollections` stays optional (no coercion). */
export const deleteCollectionPayloadSchema = z
	.object({
		id: customCollectionIdSchema,
		deleteFromAllCollections: z.boolean().optional(),
	})
	.strict();

export type Collection = z.infer<typeof collectionSchema>;
export type CollectionDraft = z.infer<typeof collectionDraftSchema>;
export type AddCollectionPayload = CollectionDraft;
export type UpdateCollectionPayload = z.infer<
	typeof updateCollectionPayloadSchema
>;
export type DeleteCollectionPayload = z.infer<
	typeof deleteCollectionPayloadSchema
>;
