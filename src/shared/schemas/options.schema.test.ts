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
import { hasIssueWithPath } from "@tests/utils";
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

const nonNumberCases = ["min", "max", "defaultValue"].flatMap((field) =>
	["10", true, null].map((value) => ({ field, value })),
);

describe("optionsSchema", () => {
	describe("discriminated union routing", () => {
		it.each(optionFactories)("accepts valid %s option", (_name, factory) => {
			expect(optionsSchema.safeParse(factory()).success).toBe(true);
		});

		it("rejects an unknown option type and reports the type path", () => {
			const result = optionsSchema.safeParse(
				createNumberOption({ type: "slider" }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(hasIssueWithPath(result.error.issues, ["type"])).toBe(true);
			}
		});

		it("rejects a missing discriminator and reports the type path", () => {
			const { type, ...withoutType } = createNumberOption();
			const result = optionsSchema.safeParse(withoutType);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(hasIssueWithPath(result.error.issues, ["type"])).toBe(true);
			}
		});

		it.each([
			["null", null],
			["undefined", undefined],
			["string", "number"],
			["number", 42],
			["boolean", true],
			["array", []],
		])("rejects non-object input: %s", (_label, value) => {
			expect(optionsSchema.safeParse(value).success).toBe(false);
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
					expect(hasIssueWithPath(result.error.issues, ["label"])).toBe(true);
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
					expect(hasIssueWithPath(result.error.issues, ["desc"])).toBe(true);
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
					expect(hasIssueWithPath(result.error.issues, [field])).toBe(true);
				}
			},
		);

		it.each(nonNumberCases)(
			"rejects a non-number $field value: $value",
			({ field, value }) => {
				const result = optionsSchema.safeParse(
					createNumberOption({ [field]: value }),
				);
				expect(result.success).toBe(false);
			},
		);

		it("rejects when min is greater than max", () => {
			const result = optionsSchema.safeParse(
				createNumberOption({ min: 100, max: 10, defaultValue: 50 }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(hasIssueWithPath(result.error.issues, ["min"])).toBe(true);
			}
		});

		it("rejects when defaultValue is outside the [min, max] range", () => {
			const result = optionsSchema.safeParse(
				createNumberOption({ min: 0, max: 10, defaultValue: 5000 }),
			);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(hasIssueWithPath(result.error.issues, ["defaultValue"])).toBe(
					true,
				);
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
				expect(hasIssueWithPath(result.error.issues, ["options"])).toBe(true);
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

		it.each([
			["missing label", { value: "downward" }],
			["missing value", { label: "Downward" }],
		])("rejects object options with %s", (_desc, optionObj) => {
			expect(
				optionsSchema.safeParse(createSelectOption({ options: [optionObj] }))
					.success,
			).toBe(false);
		});

		it.each([
			["non-string label", { label: 1, value: "downward" }],
			["non-string value", { label: "Downward", value: true }],
		])("rejects object options with %s", (_desc, optionObj) => {
			expect(
				optionsSchema.safeParse(createSelectOption({ options: [optionObj] }))
					.success,
			).toBe(false);
		});

		it.each([
			["number", 0],
			["boolean", true],
			["null", null],
			["array", ["downward"]],
		])("rejects a non-string defaultValue: %s", (_label, value) => {
			const result = optionsSchema.safeParse(
				createSelectOption({ defaultValue: value }),
			);
			expect(result.success).toBe(false);
		});
	});

	describe("switch option", () => {
		it.each([
			["true", true],
			["false", false],
		])("accepts %s defaultValue", (_label, value) => {
			expect(
				optionsSchema.safeParse(createSwitchOption({ defaultValue: value }))
					.success,
			).toBe(true);
		});

		it("rejects a missing defaultValue", () => {
			const { defaultValue, ...withoutDefault } = createSwitchOption();
			const result = optionsSchema.safeParse(withoutDefault);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(hasIssueWithPath(result.error.issues, ["defaultValue"])).toBe(
					true,
				);
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
				expect(hasIssueWithPath(result.error.issues, ["defaultValue"])).toBe(
					true,
				);
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
