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

import type { MockInstance } from "vitest";

/**
 * Silences and captures `console.warn` for assertions.
 *
 * @returns The spy; auto-restored by vitest's `restoreMocks`.
 */
export function spyOnConsoleWarn(): MockInstance {
	return vi.spyOn(console, "warn").mockImplementation(() => {});
}

/**
 * Silences and captures `console.error` for assertions.
 *
 * @returns The spy; auto-restored by vitest's `restoreMocks`.
 */
export function spyOnConsoleError(): MockInstance {
	return vi.spyOn(console, "error").mockImplementation(() => {});
}
