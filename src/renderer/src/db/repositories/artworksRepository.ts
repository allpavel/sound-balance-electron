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
import {
	type GuardedArtworks,
	guardArtworks,
} from "@renderer/db/utils/entityGuards";

export const artworksRepository = {
	/**
	 * Reads artworks by their primary keys, guarded.
	 *
	 * Each raw row is structurally validated before it leaves the
	 * repository; corrupt rows are quarantined (excluded + logged).
	 * The `blob` field is verified as a `Blob` instance; `format` is
	 * verified as a non-empty string.
	 *
	 * @param ids - Artwork primary keys to look up.
	 * @returns Validated artworks plus the guard's quarantined-id list.
	 */
	async getByIds(ids: readonly string[]): Promise<GuardedArtworks> {
		if (ids.length === 0) {
			return { ok: [], quarantinedIds: [] };
		}
		const rows: readonly unknown[] = await db.artworks.bulkGet([...ids]);
		return guardArtworks(rows, "artworksRepository.getByIds");
	},
};
