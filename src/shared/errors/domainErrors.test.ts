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

/* license header (GPL-3.0) */

import {
	ImportAbortedError,
	ReferentialIntegrityError,
	TrackErrorCode,
} from "@shared/errors/domainErrors";

describe("ImportAbortedError", () => {
	it("carries partial + progress + cause and a stable code", () => {
		const cause = new Error("quota");
		const partial = { added: ["a"], merged: ["b"], skipped: ["c"] };
		const progress = {
			processed: 2,
			total: 3,
			added: 1,
			merged: 1,
			skipped: 1,
		};
		const err = new ImportAbortedError(
			"Import aborted after 2 of 3 tracks (cause: StorageCapacityError)",
			partial,
			progress,
			cause,
		);
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(ImportAbortedError);
		expect(err.code).toBe(TrackErrorCode.ImportAborted);
		expect(err.name).toBe("ImportAbortedError");
		expect(err.partial).toEqual(partial);
		expect(err.progress).toEqual(progress);
		expect(err.cause).toBe(cause);
	});

	it("preserves the cause through the native Error.cause channel", () => {
		const cause = new ReferentialIntegrityError("missing mix1");
		const err = new ImportAbortedError(
			"aborted",
			{ added: [], merged: [], skipped: [] },
			{ processed: 0, total: 1, added: 0, merged: 0, skipped: 0 },
			cause,
		);
		expect(err.cause).toBe(cause);
		expect(err.cause).toBeInstanceOf(ReferentialIntegrityError);
	});
});
