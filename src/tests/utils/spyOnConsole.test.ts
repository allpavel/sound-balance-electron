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

// biome-ignore-all lint/suspicious/noConsole: direct console calls are the
// subject under test — this suite pins the behavior of the console-capture
// helpers themselves.
import { spyOnConsoleError, spyOnConsoleWarn } from "./spyOnConsole";

describe("spyOnConsoleWarn", () => {
	it("captures console.warn calls with their arguments", () => {
		const spy = spyOnConsoleWarn();
		console.warn("watch out", { detail: 1 });
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith("watch out", { detail: 1 });
	});

	it("replaces the original implementation instead of calling through (suite output stays clean)", () => {
		const realWarn = console.warn;
		let sentinelCalls = 0;
		console.warn = (): void => {
			sentinelCalls += 1;
		};
		const spy = spyOnConsoleWarn();
		try {
			console.warn("silenced");
			expect(spy).toHaveBeenCalledWith("silenced");
			expect(sentinelCalls).toBe(0);
		} finally {
			spy.mockRestore();
			console.warn = realWarn;
		}
	});

	it("is auto-restored between tests (pins the `restoreMocks` contract)", () => {
		expect(vi.isMockFunction(console.warn)).toBe(false);
	});
});

describe("spyOnConsoleError", () => {
	it("captures console.error calls with their arguments", () => {
		const spy = spyOnConsoleError();
		console.error("boom", new Error("detail"));
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0]?.[0]).toBe("boom");
		expect(spy.mock.calls[0]?.[1]).toBeInstanceOf(Error);
	});

	it("replaces the original implementation instead of calling through (suite output stays clean)", () => {
		const realError = console.error;
		let sentinelCalls = 0;
		console.error = (): void => {
			sentinelCalls += 1;
		};
		const spy = spyOnConsoleError();
		try {
			console.error("silenced");
			expect(spy).toHaveBeenCalledWith("silenced");
			expect(sentinelCalls).toBe(0);
		} finally {
			spy.mockRestore();
			console.error = realError;
		}
	});

	it("is auto-restored between tests (pins the `restoreMocks` contract)", () => {
		expect(vi.isMockFunction(console.error)).toBe(false);
	});
});
