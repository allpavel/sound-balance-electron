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
import type { ZodError, ZodSafeParseResult, ZodType } from "zod";

export const MAX_VALIDATION_ISSUES = 100;
export const ISSUE_LIMIT_CODE = "issue_limit_reached";

const FALLBACK_MESSAGE = "Invalid input";
const FALLBACK_CODE = "custom";

export interface ValidationIssue {
	readonly path: string;
	readonly message: string;
	readonly code: string;
}
// Backward-compatible alias. Existing imports of
// SettingsValidationIssue continue to work without modification.
export type SettingsValidationIssue = ValidationIssue;

export type SettingsParseMode = "strict" | "loose";

export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; issues: ValidationIssue[] };

export type SettingsParseResult = ValidationResult<SettingsForm>;
export type TrackParseResult = ValidationResult<Metadata>;
export type TracksParseResult = ValidationResult<Metadata[]>;
export type DataParseResult = ValidationResult<Data>;
export type TrackChangesParseResult = ValidationResult<TrackChanges>;

interface Issue {
	readonly path?: PropertyKey[];
	readonly message?: string;
	readonly code?: string;
	readonly errors?: readonly (readonly Issue[])[];
}

/**
 * Flattens ZodError.issues into a list of frozen ValidationIssue objects,
 * recursing into union branch errors and deduplicating by
 * (path | code | message) signature.
 */
function mapZodIssues(error: ZodError): ValidationIssue[] {
	const result: ValidationIssue[] = [];
	const seen = new Set<string>();
	let truncated = false;

	const walk = (issues: Issue[], prefix: PropertyKey[] = []): void => {
		if (!Array.isArray(issues)) return;

		for (const issue of issues) {
			if (result.length >= MAX_VALIDATION_ISSUES) {
				truncated = true;
				return;
			}
			if (!issue || typeof issue !== "object") continue;

			const currentPath = [...prefix, ...(issue.path ?? [])];

			if (issue.code === "invalid_union" && Array.isArray(issue.errors)) {
				let flattened = false;
				for (const branch of issue.errors) {
					const leaves = Array.isArray(branch)
						? (branch as readonly Issue[])
						: null;
					if (leaves && leaves.length > 0) {
						// Paths on invalid_union.errors sub-issues
						// are relative to the union node, not absolute from the schema root.
						// If a future Zod major version changes this to absolute
						// paths, this recursion must be updated to avoid double-prefixing.
						walk(leaves as Issue[], currentPath);
						flattened = true;
					}
				}
				if (flattened) continue;
			}

			const path = currentPath.map((segment) => String(segment)).join(".");
			const message = issue.message ?? FALLBACK_MESSAGE;
			let code = issue.code ?? FALLBACK_CODE;
			if (code === "invalid_union") {
				code = "invalid_type";
			}

			const signature = `${path}|${code}|${message}`;
			if (!seen.has(signature)) {
				seen.add(signature);
				result.push(Object.freeze({ path, message, code }));
			}
		}
	};

	walk(error.issues as unknown as Issue[]);

	if (truncated) {
		result.push(
			Object.freeze({
				path: "",
				message: `Validation aborted after ${MAX_VALIDATION_ISSUES} issues; the payload may be malformed or hostile.`,
				code: ISSUE_LIMIT_CODE,
			}),
		);
	}

	return result;
}

/**
 * Single generic implementation for all validators.
 */
function validate<T>(schema: ZodType<T>, input: unknown): ValidationResult<T> {
	const result: ZodSafeParseResult<T> = schema.safeParse(input);
	return result.success
		? { success: true, data: result.data }
		: { success: false, issues: mapZodIssues(result.error) };
}

/**
 * Validates settings input against strict or loose schema.
 */
export function safeParseSettings(
	input: unknown,
	{ mode }: { mode: SettingsParseMode } = { mode: "strict" },
): SettingsParseResult {
	const schema = mode === "strict" ? strictSettingsSchema : looseSettingsSchema;
	return validate(schema, input);
}

/**
 * Validates an array of track objects against trackInputSchema.
 */
export function safeParseTracks(input: unknown): TracksParseResult {
	return validate(tracksArraySchema, input);
}

/**
 * Validates a track object against trackInputSchema.
 */
export function safeParseTrack(input: unknown): TrackParseResult {
	return validate(trackInputSchema, input);
}

/**
 * Validates the complete IPC processing payload (tracks + settings).
 * This is the primary boundary validator for Renderer → Main IPC calls.
 * Uses dataSchema which composes tracksArraySchema + strictSettingsSchema.
 */
export function safeParseData(input: unknown): DataParseResult {
	return validate(dataSchema, input);
}

/**
 * Validates partial track mutation payloads.
 */
export function safeParseTrackChanges(input: unknown): TrackChangesParseResult {
	return validate(trackChangesSchema, input);
}
