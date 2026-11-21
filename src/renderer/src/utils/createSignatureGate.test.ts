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

import { createSignatureGate } from "./createSignatureGate";

describe("createSignatureGate", () => {
	it("admits the first sighting of a signature", () => {
		const gate = createSignatureGate();
		expect(gate.admit("unknown|scope|Error")).toBe(true);
	});

	it("suppresses immediate recurrence of the same signature (W1-2)", () => {
		const gate = createSignatureGate();
		expect(gate.admit("storage|scope|OpenFailedError")).toBe(true);
		expect(gate.admit("storage|scope|OpenFailedError")).toBe(false);
		expect(gate.admit("storage|scope|OpenFailedError")).toBe(false);
	});

	it("admits a changed signature without re-arming", () => {
		const gate = createSignatureGate();
		expect(gate.admit("storage|scope|OpenFailedError")).toBe(true);
		// A different failure is new information and must log.
		expect(gate.admit("validation|scope|id")).toBe(true);
		// ...and becomes the new suppression target.
		expect(gate.admit("validation|scope|id")).toBe(false);
	});

	it("re-arms after recovery so a recurrence logs again (fix for the W1-2 follow-up)", () => {
		const gate = createSignatureGate();
		expect(gate.admit("storage|scope|OpenFailedError")).toBe(true);
		gate.rearm(); // a healthy emission was observed
		expect(gate.admit("storage|scope|OpenFailedError")).toBe(true);
		expect(gate.admit("storage|scope|OpenFailedError")).toBe(false);
	});

	it("re-arming before any admission stays armed", () => {
		const gate = createSignatureGate();
		gate.rearm();
		expect(gate.admit("unknown|scope|Error")).toBe(true);
	});

	it("keeps instances independent (no shared state across gates)", () => {
		const first = createSignatureGate();
		const second = createSignatureGate();
		expect(first.admit("storage|scope|OpenFailedError")).toBe(true);
		// The second gate must not inherit the first gate's spent state.
		expect(second.admit("storage|scope|OpenFailedError")).toBe(true);
	});
});
