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
 * Characters replaced by {@link sanitizeControlChars}.
 *
 * Scope (Zero Trust: every rendered segment is assumed hostile — e.g.
 * attacker-controlled object keys surfacing through strict-mode Zod
 * issue paths, or symbol descriptions):
 * - C0 controls `\x00`–`\x1F` (NUL, ESC, CR, LF, …)
 * - DEL `\x7F`
 * - C1 controls `\u0080`–`\u009F` (incl. CSI `\u009B`, honored by several
 *   terminal emulators)
 * - Bidirectional embeddings/overrides/isolates `\u202A`–`\u202E` and
 *   `\u2066`–`\u2069` (RLO/RLI-class text spoofing)
 *
 * Deliberately excluded: RLM/LRM (`\u200E`/`\u200F`) and ALM (`\u061C`) —
 * legitimate direction marks common in real Arabic/Hebrew content and not
 * spoofing-capable on their own.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional — this class exists to detect and replace exactly these characters (log-injection / terminal-escape / bidi-spoofing defense).
const CONTROL_CHARS = /[\x00-\x1F\x7F\u0080-\u009F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Replacement for every unsafe character. Outside the `CONTROL_CHARS`
 * class, which is what makes {@link sanitizeControlChars} idempotent.
 */
const REPLACEMENT = "\uFFFD";

/**
 * Replaces control and directional-override characters with U+FFFD.
 *
 * Contract:
 * - **Idempotent** — U+FFFD is not matched, so sanitizing
 *   already-sanitized output is a no-op; safe to call at multiple layers.
 * - **Side-effect-free** — the module-private regex is only ever passed
 *   to `String.prototype.replace`, which resets a global regex's
 *   `lastIndex` before and after the scan (ES2015+); no regex state can
 *   escape this module.
 * - **Length-preserving** — every match is exactly one UTF-16 code unit.
 *
 * Sanitizes *presentation* only. Keep raw data where diagnostics need it;
 * the schema layer independently rejects NUL bytes in known fields
 * (Defense in Depth) — this guard covers what that layer cannot see:
 * unknown keys and symbol descriptions.
 *
 * @param value - String to sanitize (e.g. a validation path segment).
 * @returns The sanitized string; the original value if it is clean.
 */
export function sanitizeControlChars(value: string): string {
	return value.replace(CONTROL_CHARS, REPLACEMENT);
}
