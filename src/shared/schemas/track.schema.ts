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
import { STATUS_VALUES } from "@shared/constants";
import type { IAudioMetadata } from "music-metadata";
import z from "zod";

export const nonEmptyStringSchema = z
	.string()
	.refine((value) => value.trim().length > 0);

export const collectionIdsSchema = z.array(nonEmptyStringSchema);
export const targetCollectionIdSchema = nonEmptyStringSchema;
export const selectedSchema = z.union([z.literal(0), z.literal(1)]);
export const statusSchema = z.enum(STATUS_VALUES);

const trackBaseSchema = z
	.object({
		id: nonEmptyStringSchema,
		file: nonEmptyStringSchema,
		filePath: nonEmptyStringSchema,
		selected: selectedSchema,
		collectionIds: collectionIdsSchema,
	})
	.loose();

export const trackInputSchema = z.discriminatedUnion("status", [
	trackBaseSchema.extend({ status: z.literal("pending") }),
	trackBaseSchema.extend({ status: z.literal("processing") }),
	trackBaseSchema.extend({ status: z.literal("completed") }),
	trackBaseSchema.extend({
		status: z.literal("failed"),
		reason: nonEmptyStringSchema,
	}),
]);

type TrackInput = z.infer<typeof trackInputSchema>;

export type Metadata = IAudioMetadata & TrackInput;

export type TrackChanges =
	| Partial<Pick<TrackInput, "filePath" | "selected" | "collectionIds">>
	| { status: "pending"; reason?: undefined }
	| { status: "processing"; reason?: undefined }
	| { status: "completed"; reason?: undefined }
	| { status: "failed"; reason: string };

export type ProcessingStatus =
	| { id: string; status: "processing" | "completed" }
	| { id: string; status: "failed"; message: string };
