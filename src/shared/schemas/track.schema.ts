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
import z from "zod";

const MAX_PATH_LENGTH = 4096;
const MAX_BASE64_IMAGE_SIZE = 5 * 1024 * 1024;
const NULL_BYTE_PATTERN = /\0/;

export const nonEmptyStringSchema = z
	.string()
	.min(1)
	.max(MAX_PATH_LENGTH)
	.refine((val) => val.trim().length > 0)
	.refine((val) => !NULL_BYTE_PATTERN.test(val));

export const collectionIdsSchema = z.array(nonEmptyStringSchema);
export const targetCollectionIdSchema = nonEmptyStringSchema;
export const selectedSchema = z.union([z.literal(0), z.literal(1)]);
export const statusSchema = z.enum(STATUS_VALUES);
export const pictureSchema = z
	.object({
		format: z.string().min(1).max(50),
		data: z
			.string()
			.max(
				MAX_BASE64_IMAGE_SIZE,
				"Album art exceeds maximum allowed size (5MB)",
			),
		description: z.string().max(500).optional(),
		name: z.string().max(255).optional(),
	})
	.strict();

const commonSchema = z
	.object({
		artist: z.string().optional(),
		title: z.string().optional(),
		album: z.string().optional(),
		year: z.number().optional(),
		track: z
			.object({ no: z.number().nullable(), of: z.number().nullable() })
			.optional(),
		picture: z.array(pictureSchema).max(20).optional(),
	})
	.strict();

const formatSchema = z
	.object({
		duration: z.number().min(0).max(1000000).optional(),
		bitrate: z.number().int().min(0).max(100000000).optional(),
		codec: z.string().max(100).optional(),
	})
	.strict();

const trackBaseSchema = z
	.object({
		id: nonEmptyStringSchema,
		file: nonEmptyStringSchema,
		filePath: nonEmptyStringSchema,
		selected: selectedSchema,
		collectionIds: collectionIdsSchema,
		common: commonSchema,
		format: formatSchema,
	})
	.strip();

export const trackInputSchema = z.discriminatedUnion("status", [
	trackBaseSchema.extend({ status: z.literal("pending") }),
	trackBaseSchema.extend({ status: z.literal("processing") }),
	trackBaseSchema.extend({ status: z.literal("completed") }),
	trackBaseSchema.extend({
		status: z.literal("failed"),
		reason: nonEmptyStringSchema.min(1).max(1000),
	}),
]);

type TrackInput = z.infer<typeof trackInputSchema>;

export type Metadata = TrackInput;

export type TrackChanges =
	| Partial<Pick<TrackInput, "filePath" | "selected" | "collectionIds">>
	| { status: "pending"; reason?: undefined }
	| { status: "processing"; reason?: undefined }
	| { status: "completed"; reason?: undefined }
	| { status: "failed"; reason: string };

export type ProcessingStatus =
	| { id: string; status: "processing" | "completed" }
	| { id: string; status: "failed"; message: string };
