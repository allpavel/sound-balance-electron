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

import { db } from "@renderer/db/db";
import { resetFactorySequences } from "@shared/utils/factories";
import { v7 as uuidV7 } from "uuid";

let uuidSeq = 0;

export function configureUuidMock(): void {
	uuidSeq = 0;
	// biome-ignore lint/suspicious/noExplicitAny: for tests only
	vi.mocked(uuidV7).mockImplementation(() => `mock-uuid-${++uuidSeq}` as any);
}

export async function resetDatabase(): Promise<void> {
	await db.tracks.clear();
	await db.collections.clear();
	await db.settings.clear();
	await db.collections.add({ id: "all", title: "All" });
}

export function resetSequences() {
	uuidSeq = 0;
	resetFactorySequences();
}

export async function resetTestState() {
	resetSequences();
	await resetDatabase();
	configureUuidMock();
}
