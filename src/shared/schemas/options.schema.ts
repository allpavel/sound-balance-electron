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

const baseOptions = z.object({
	label: z.string().min(1, "Label must not be empty"),
	desc: z.string().min(1, "Description must not be empty"),
});

const numberOptions = baseOptions
	.extend({
		type: z.literal("number"),
		min: z.number(),
		max: z.number(),
		defaultValue: z.number(),
	})
	.strict()
	.superRefine((data, ctx) => {
		if (data.min > data.max) {
			ctx.addIssue({
				code: "custom",
				path: ["min"],
				message: `min (${data.min}) must be less than or equal to max (${data.max})`,
			});
		}
		if (data.defaultValue < data.min || data.defaultValue > data.max) {
			ctx.addIssue({
				code: "custom",
				path: ["defaultValue"],
				message: `defaultValue (${data.defaultValue}) must be within the [min, max] range [${data.min}, ${data.max}]`,
			});
		}
	});

const selectOptions = baseOptions
	.extend({
		type: z.literal("select"),
		options: z.union([
			z.array(z.string()).min(1),
			z
				.array(
					z
						.object({
							label: z.string().min(1, "Option label must not be empty"),
							value: z.string().min(1, "Option value must not be empty"),
						})
						.strict(),
				)
				.min(1),
		]),
		defaultValue: z.string(),
	})
	.strict();

const switchOptions = baseOptions
	.extend({
		type: z.literal("switch"),
		defaultValue: z.boolean(),
	})
	.strict();

const textOption = baseOptions
	.extend({
		type: z.literal("text"),
		defaultValue: z.string(),
	})
	.strict();

export const optionsSchema = z.discriminatedUnion("type", [
	numberOptions,
	selectOptions,
	switchOptions,
	textOption,
]);
