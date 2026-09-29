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
 * Discriminated outcome of a batch track insertion.
 *
 * @property added   – Primary keys of tracks that were newly inserted.
 * @property merged  – Primary keys of pre-existing tracks whose `collectionIds`
 *                     were mutated to include the target collection.
 * @property skipped – Primary keys of pre-existing tracks that already belonged
 *                     to the target collection (no mutation performed).
 */
export type AddManyResult = {
	added: string[];
	merged: string[];
	skipped: string[];
};
