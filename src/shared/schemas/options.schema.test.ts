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
import { optionsSchema } from "./options.schema";

const createNumberOption = (
	overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
	type: "number",
	label: "cutoff",
	desc: "Set cutoff frequency.",
	min: 0,
	max: 24000,
	defaultValue: 0,
	...overrides,
});

const createSelectOption = (
	overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
	type: "select",
	label: "mode",
	desc: "Set operation mode.",
	options: ["downward", "upward"],
	defaultValue: "downward",
	...overrides,
});

const createSwitchOption = (
	overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
	type: "switch",
	label: "linear",
	desc: "Normalize by linearly scaling the source audio.",
	defaultValue: true,
	...overrides,
});

const createTextOption = (
	overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
	type: "text",
	label: "delays",
	desc: "Set list of delays separated by '|'.",
	defaultValue: "1000",
	...overrides,
});

const optionFactories = [
	["number", createNumberOption],
	["select", createSelectOption],
	["switch", createSwitchOption],
	["text", createTextOption],
] as const;

describe("optionsSchema", () => {
	describe("discriminated union routing", () => {
		it("accepts every supported option type", () => {
			expect(optionsSchema.safeParse(createNumberOption()).success).toBe(true);
			expect(optionsSchema.safeParse(createSelectOption()).success).toBe(true);
			expect(optionsSchema.safeParse(createSwitchOption()).success).toBe(true);
			expect(optionsSchema.safeParse(createTextOption()).success).toBe(true);
		});

		it("rejects an unknown option type and reports the type path", () => {
			const result = optionsSchema.safeParse(
				createNumberOption({ type: "slider" }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["type"]);
			}
		});

		it("rejects a missing discriminator and reports the type path", () => {
			const { type, ...withoutType } = createNumberOption();
			const result = optionsSchema.safeParse(withoutType);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["type"]);
			}
		});

		it("rejects non-object input", () => {
			for (const value of [null, undefined, "number", 42, true, []]) {
				expect(optionsSchema.safeParse(value).success).toBe(false);
			}
		});
	});

	describe("shared base fields (label, desc)", () => {
		it.each(optionFactories)(
			"%s option rejects a missing label and reports the label path",
			(_name, factory) => {
				const { label, ...withoutLabel } = factory();
				const result = optionsSchema.safeParse(withoutLabel);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.path).toEqual(["label"]);
				}
			},
		);

		it.each(optionFactories)(
			"%s option rejects a missing desc and reports the desc path",
			(_name, factory) => {
				const { desc, ...withoutDesc } = factory();
				const result = optionsSchema.safeParse(withoutDesc);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.path).toEqual(["desc"]);
				}
			},
		);

		it.each(optionFactories)(
			"%s option rejects non-string label and desc values",
			(_name, factory) => {
				expect(optionsSchema.safeParse(factory({ label: 42 })).success).toBe(
					false,
				);
				expect(optionsSchema.safeParse(factory({ desc: false })).success).toBe(
					false,
				);
			},
		);

		it.each(optionFactories)(
			"%s option rejects an empty label or desc",
			(_name, factory) => {
				expect(optionsSchema.safeParse(factory({ label: "" })).success).toBe(
					false,
				);
				expect(optionsSchema.safeParse(factory({ desc: "" })).success).toBe(
					false,
				);
			},
		);
	});

	describe("number option", () => {
		it("accepts a valid number option and preserves the input data", () => {
			const option = createNumberOption();
			const result = optionsSchema.safeParse(option);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(option);
			}
		});

		it("accepts negative and fractional bounds", () => {
			const result = optionsSchema.safeParse(
				createNumberOption({ min: -70.5, max: -5.25, defaultValue: -24.5 }),
			);
			expect(result.success).toBe(true);
		});

		it.each(["min", "max", "defaultValue"])(
			"rejects a missing %s and reports its path",
			(field) => {
				const option = createNumberOption();
				delete option[field];
				const result = optionsSchema.safeParse(option);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0]?.path).toEqual([field]);
				}
			},
		);

		it.each(["min", "max", "defaultValue"])(
			"rejects a non-number %s",
			(field) => {
				for (const value of ["10", true, null]) {
					const result = optionsSchema.safeParse(
						createNumberOption({ [field]: value }),
					);
					expect(result.success).toBe(false);
				}
			},
		);

		it("rejects when min is greater than max", () => {
			const result = optionsSchema.safeParse(
				createNumberOption({ min: 100, max: 10, defaultValue: 50 }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["min"]);
			}
		});

		it("rejects when defaultValue is outside the [min, max] range", () => {
			const result = optionsSchema.safeParse(
				createNumberOption({ min: 0, max: 10, defaultValue: 5000 }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["defaultValue"]);
			}
		});
	});

	describe("select option", () => {
		it("accepts a non-empty array of string options", () => {
			const result = optionsSchema.safeParse(createSelectOption());
			expect(result.success).toBe(true);
		});

		it("accepts a single string option because the minimum length is 1", () => {
			const result = optionsSchema.safeParse(
				createSelectOption({ options: ["downward"] }),
			);
			expect(result.success).toBe(true);
		});

		it("accepts a non-empty array of { label, value } options", () => {
			const result = optionsSchema.safeParse(
				createSelectOption({
					options: [
						{ label: "Downward", value: "downward" },
						{ label: "Upward", value: "upward" },
					],
				}),
			);
			expect(result.success).toBe(true);
		});

		it("rejects an empty options array", () => {
			const result = optionsSchema.safeParse(
				createSelectOption({ options: [] }),
			);
			expect(result.success).toBe(false);
		});

		it("rejects a missing options array", () => {
			const { options, ...withoutOptions } = createSelectOption();
			const result = optionsSchema.safeParse(withoutOptions);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["options"]);
			}
		});

		it("rejects a mixed string/object options array", () => {
			const result = optionsSchema.safeParse(
				createSelectOption({
					options: ["downward", { label: "Upward", value: "upward" }],
				}),
			);
			expect(result.success).toBe(false);
		});

		it("rejects object options with a missing label or value", () => {
			expect(
				optionsSchema.safeParse(
					createSelectOption({
						options: [{ value: "downward" }],
					}),
				).success,
			).toBe(false);
			expect(
				optionsSchema.safeParse(
					createSelectOption({
						options: [{ label: "Downward" }],
					}),
				).success,
			).toBe(false);
		});

		it("rejects object options with non-string label or value", () => {
			expect(
				optionsSchema.safeParse(
					createSelectOption({
						options: [{ label: 1, value: "downward" }],
					}),
				).success,
			).toBe(false);
			expect(
				optionsSchema.safeParse(
					createSelectOption({
						options: [{ label: "Downward", value: true }],
					}),
				).success,
			).toBe(false);
		});

		it("rejects a non-string defaultValue", () => {
			for (const value of [0, true, null, ["downward"]]) {
				const result = optionsSchema.safeParse(
					createSelectOption({ defaultValue: value }),
				);
				expect(result.success).toBe(false);
			}
		});
	});

	describe("switch option", () => {
		it("accepts true and false defaultValue", () => {
			expect(
				optionsSchema.safeParse(createSwitchOption({ defaultValue: true }))
					.success,
			).toBe(true);
			expect(
				optionsSchema.safeParse(createSwitchOption({ defaultValue: false }))
					.success,
			).toBe(true);
		});

		it("rejects a missing defaultValue", () => {
			const { defaultValue, ...withoutDefault } = createSwitchOption();
			const result = optionsSchema.safeParse(withoutDefault);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["defaultValue"]);
			}
		});

		it.each([0, 1, "true", null])(
			"rejects a non-boolean defaultValue (%s)",
			(value) => {
				const result = optionsSchema.safeParse(
					createSwitchOption({ defaultValue: value }),
				);
				expect(result.success).toBe(false);
			},
		);
	});

	describe("text option", () => {
		it("accepts a valid text option", () => {
			expect(optionsSchema.safeParse(createTextOption()).success).toBe(true);
		});

		it("accepts an empty string defaultValue", () => {
			const result = optionsSchema.safeParse(
				createTextOption({ defaultValue: "" }),
			);
			expect(result.success).toBe(true);
		});

		it("rejects a missing defaultValue", () => {
			const { defaultValue, ...withoutDefault } = createTextOption();
			const result = optionsSchema.safeParse(withoutDefault);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.path).toEqual(["defaultValue"]);
			}
		});

		it.each([123, true, null, []])(
			"rejects a non-string defaultValue",
			(value) => {
				const result = optionsSchema.safeParse(
					createTextOption({ defaultValue: value }),
				);
				expect(result.success).toBe(false);
			},
		);
	});

	describe("parse output contract", () => {
		it("returns the parsed data unchanged (no coercion or defaults)", () => {
			const option = createSelectOption();
			const result = optionsSchema.safeParse(option);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(option);
			}
		});

		it.each(optionFactories)(
			"%s option rejects unknown properties (strict mode)",
			(_name, factory) => {
				const result = optionsSchema.safeParse(
					factory({ legacyField: "value" }),
				);
				expect(result.success).toBe(false);
			},
		);
	});
});
