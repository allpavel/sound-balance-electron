import z from "zod";

const baseOptions = z.object({
	label: z.string(),
	desc: z.string(),
});

const numberOptions = baseOptions.extend({
	type: z.literal("number"),
	min: z.number(),
	max: z.number(),
	defaultValue: z.number(),
});

const selectOptions = baseOptions.extend({
	type: z.literal("select"),
	options: z.union([
		z.array(z.string()).min(1),
		z.array(z.object({ label: z.string(), value: z.string() })).min(1),
	]),
	defaultValue: z.string(),
});

const switchOptions = baseOptions.extend({
	type: z.literal("switch"),
	defaultValue: z.boolean(),
});

const textOption = baseOptions.extend({
	type: z.literal("text"),
	defaultValue: z.string(),
});

export const optionSchema = z.discriminatedUnion("type", [
	numberOptions,
	selectOptions,
	switchOptions,
	textOption,
]);
