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

export const optionsSchema = z.discriminatedUnion("type", [
	numberOptions,
	selectOptions,
	switchOptions,
	textOption,
]);
