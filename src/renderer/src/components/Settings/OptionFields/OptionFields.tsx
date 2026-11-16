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
	Group,
	NumberInput,
	Select,
	Stack,
	Switch,
	TextInput,
	Tooltip,
	VisuallyHidden,
} from "@mantine/core";
import { useSettingsFormContext } from "@renderer/components/Settings/context/SettingsFormContext";
import {
	buildAdvancedHelp,
	humanizeOptionLabel,
} from "@renderer/components/Settings/utils/settingsLabels";
import { palette } from "@renderer/theme/tokens";
import type { FilterOption } from "@shared/schemas/settings.schema";
import { HelpCircle } from "lucide-react";
import type { JSX } from "react";

export type OptionFieldsProps = {
	/** Option definitions from `FILTER_OPTIONS` / `ENCODER_OPTIONS`. */
	options: readonly FilterOption[];
	/** Form path prefix, e.g. `"audio.filterOptions"`. */
	pathPrefix: string;
};

/**
 * Focus props for the inline help trigger. Extracted as a constant because
 * the tooltip must be reachable by keyboard (WCAG 1.4.13) while remaining a
 * non-actionable information affordance.
 */
const HELP_TRIGGER_FOCUS_PROPS = { tabIndex: 0 } as const;

/**
 * Renders a field label: plain language + help icon whose tooltip (and
 * screen-reader equivalent) preserves the exact FFmpeg parameter name so
 * advanced users can still cross-reference documentation.
 *
 * @param field - The option definition (label + desc).
 * @returns Label node for Mantine inputs.
 */
function FieldLabel({
	field,
}: {
	field: Pick<FilterOption, "label" | "desc">;
}): JSX.Element {
	const plain = humanizeOptionLabel(field.label);
	return (
		<Group gap={6} wrap="nowrap" component="span">
			<span>{plain}</span>
			<Tooltip
				label={buildAdvancedHelp(field)}
				multiline
				maw={340}
				withinPortal
			>
				<span
					{...HELP_TRIGGER_FOCUS_PROPS}
					style={{ display: "inline-flex", color: palette.inkSecondary }}
				>
					<HelpCircle size={14} aria-hidden="true" focusable="false" />
					<VisuallyHidden>
						FFmpeg parameter name: {field.label}. {field.desc}
					</VisuallyHidden>
				</span>
			</Tooltip>
		</Group>
	);
}

/**
 * Renders the full option list for one filter or encoder configuration.
 *
 * @param props - See {@link OptionFieldsProps}.
 * @returns A stack of labeled, described form controls bound to the settings
 * form context.
 */
export function OptionFields({
	options,
	pathPrefix,
}: OptionFieldsProps): JSX.Element {
	const form = useSettingsFormContext();

	return (
		<Stack gap="md">
			{options.map((field) => {
				const path = `${pathPrefix}.${field.label}`;
				switch (field.type) {
					case "number":
						return (
							<NumberInput
								key={field.label}
								label={<FieldLabel field={field} />}
								description={field.desc}
								min={field.min}
								max={field.max}
								step={field.min < 1 && field.max <= 1 ? 0.01 : 1}
								defaultValue={field.defaultValue}
								{...form.getInputProps(path)}
							/>
						);
					case "select":
						return (
							<Select
								key={field.label}
								label={<FieldLabel field={field} />}
								description={field.desc}
								data={field.options}
								defaultValue={field.defaultValue}
								searchable
								{...form.getInputProps(path)}
							/>
						);
					case "text":
						return (
							<TextInput
								key={field.label}
								label={<FieldLabel field={field} />}
								description={field.desc}
								defaultValue={field.defaultValue}
								{...form.getInputProps(path)}
							/>
						);
					case "switch":
						return (
							<Switch
								key={field.label}
								label={<FieldLabel field={field} />}
								description={field.desc}
								labelPosition="left"
								onLabel="On"
								offLabel="Off"
								defaultChecked={field.defaultValue}
								{...form.getInputProps(path, { type: "checkbox" })}
								styles={{ body: { justifyContent: "space-between" } }}
							/>
						);
					default:
						return null;
				}
			})}
		</Stack>
	);
}

export default OptionFields;
