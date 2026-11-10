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

/**
 * Splits an identifier into words on camelCase boundaries, underscores,
 * hyphens, and dots, then lower-cases them for uniform re-casing.
 *
 * @param raw - Machine identifier such as `level_in` or `measuredLRA`.
 * @returns Lower-cased word list; empty when the input has no word characters.
 */
function splitIdentifier(identifier: string): string[] {
	return identifier
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.split(/[_\-.\s]+/)
		.filter((word) => word.length > 0)
		.map((word) => word.toLowerCase());
}

/**
 * Converts a machine identifier into a sentence-case, human-readable label.
 *
 * Deterministic and pure: the first word is capitalized, subsequent words are
 * lower-cased. Acronyms are preserved when the caller passes an override
 * (see `withOverrides`).
 *
 * @param raw - Machine identifier (e.g. `"level_in"`, `"albumartist"`).
 * @returns Sentence-case label (e.g. `"Level in"`, `"Albumartist"`).
 *
 * @example
 * ```ts
 * humanizeLabel("level_in");      // "Level in"
 * humanizeLabel("measured_LRA");  // "Measured lra" (use an override for acronyms)
 * humanizeLabel("");              // ""
 * ```
 */
export function humanizeLabel(raw: string): string {
	const words = splitIdentifier(raw);
	if (words.length === 0) {
		return "";
	}
	const [first, ...rest] = words;
	const head = first ?? "";
	const capitalized = head.charAt(0).toUpperCase() + head.slice(1);
	return [capitalized, ...rest].join(" ");
}

/**
 * Builds a label resolver that prefers an explicit override map and falls
 * back to the generic {@link humanizeLabel} algorithm.
 *
 * Zero-trust note: override lookups are exact-match on the raw identifier —
 * no fuzzy rewriting — so a missing override degrades gracefully to the
 * generic form instead of producing a wrong label.
 *
 * @param overrides - Exact `rawLabel → plainLabel` pairs for domain jargon.
 * @returns Resolver function `(rawLabel: string) => string`.
 */
export function withOverrides(
	overrides: Readonly<Record<string, string>>,
): (label: string) => string {
	return (label: string): string => {
		const override = overrides[label];
		return typeof override === "string" && override.length > 0
			? override
			: humanizeLabel(label);
	};
}
