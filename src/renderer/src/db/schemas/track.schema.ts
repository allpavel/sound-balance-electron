import { STATUS_VALUES } from "@renderer/db/constants/constants";
import z from "zod";

export const nonEmptyStringSchema = z
	.string()
	.refine((value) => value.trim().length > 0);

export const collectionIdsSchema = z.array(nonEmptyStringSchema);
export const targetCollectionIdSchema = nonEmptyStringSchema;
export const selectedSchema = z.union([z.literal(0), z.literal(1)]);
export const statusSchema = z.enum(STATUS_VALUES);

export const trackInputSchema = z
	.object({
		id: nonEmptyStringSchema,
		file: nonEmptyStringSchema,
		filePath: nonEmptyStringSchema,
		status: statusSchema,
		selected: selectedSchema,
		collectionIds: collectionIdsSchema,
	})
	.catchall(z.unknown());
