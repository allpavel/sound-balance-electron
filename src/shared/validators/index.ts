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
import { type Data, dataSchema } from "@shared/schemas/data.schema";
import {
	looseSettingsSchema,
	type SettingsForm,
	strictSettingsSchema,
} from "@shared/schemas/settings.schema";
import {
	type Metadata,
	type TrackChanges,
	trackChangesSchema,
	trackInputSchema,
	tracksArraySchema,
} from "@shared/schemas/track.schema";
import type { ZodError, ZodSafeParseResult } from "zod";

export interface ValidationIssue {
	path: string;
	message: string;
	code: string;
}
// Backward-compatible alias. Existing imports of
// SettingsValidationIssue continue to work without modification.
export type SettingsValidationIssue = ValidationIssue;

export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; issues: ValidationIssue[] };

export type SettingsParseResult = ValidationResult<SettingsForm>;
export type TrackParseResult = ValidationResult<Metadata>;
export type TracksParseResult = ValidationResult<Metadata[]>;
export type DataParseResult = ValidationResult<Data>;
export type TrackChangesParseResult = ValidationResult<TrackChanges>;

function mapZodIssues(error: ZodError): ValidationIssue[] {
	return error.issues.map((issue) => ({
		path: issue.path.join("."),
		message: issue.message,
		code: issue.code,
	}));
}

/**
 * Validates settings input against strict or loose schema.
 */
export function safeParseSettings(
	input: unknown,
	{ mode }: { mode: "strict" | "loose" } = { mode: "strict" },
): SettingsParseResult {
	const schema = mode === "strict" ? strictSettingsSchema : looseSettingsSchema;
	const result: ZodSafeParseResult<SettingsForm> = schema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, issues: mapZodIssues(result.error) };
}

/**
 * Validates an array of track objects against trackInputSchema.
 */
export function safeParseTracks(input: unknown): TracksParseResult {
	const result = tracksArraySchema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, issues: mapZodIssues(result.error) };
}

/**
 * Validates a track object against trackInputSchema.
 */
export function safeParseTrack(input: unknown): TrackParseResult {
	const result = trackInputSchema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, issues: mapZodIssues(result.error) };
}

/**
 * Validates the complete IPC processing payload (tracks + settings).
 * This is the primary boundary validator for Renderer → Main IPC calls.
 * Uses dataSchema which composes tracksArraySchema + strictSettingsSchema.
 */
export function safeParseData(input: unknown): DataParseResult {
	const result = dataSchema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, issues: mapZodIssues(result.error) };
}

/**
 * Validates partial track mutation payloads.
 */
export function safeParseTrackChanges(input: unknown): TrackChangesParseResult {
	const result = trackChangesSchema.safeParse(input);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, issues: mapZodIssues(result.error) };
}
