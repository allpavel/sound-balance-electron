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
	type SettingsForm,
	settingsSchema,
} from "@shared/schemas/settings.schema";

export interface SettingsValidationIssue {
	path: string;
	message: string;
	code: string;
}

export type SettingsParseResult =
	| { success: true; data: SettingsForm }
	| { success: false; issues: SettingsValidationIssue[] };

export function safeParseSettings(input: unknown): SettingsParseResult {
	const result = settingsSchema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const issues: SettingsValidationIssue[] = result.error.issues.map(
		(issue) => ({
			path: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		}),
	);
	return { success: false, issues };
}
