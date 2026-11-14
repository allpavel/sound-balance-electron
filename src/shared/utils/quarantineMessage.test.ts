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

import { quarantineMessage } from "./quarantineMessage";

describe("quarantineMessage", () => {
	it("sanitizes control characters in the scope prefix", () => {
		const hostileScope = "tracksRepository.getAll\u001b[31m";
		const safeScope = "tracksRepository.getAll\uFFFD[31m";
		const message = quarantineMessage(hostileScope);
		expect(message).toBe(quarantineMessage(safeScope));
		expect(message).not.toContain("\u001b");
		expect(message).toContain("\uFFFD");
	});
});
