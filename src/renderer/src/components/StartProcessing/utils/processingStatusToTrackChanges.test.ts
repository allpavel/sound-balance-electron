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

import type { ProcessingStatus } from "@shared/schemas/track.schema";
import { processingStatusToTrackChanges } from "./processingStatusToTrackChanges";

describe("processingStatusToTrackChanges", () => {
	it.each([
		["processing", { id: "t1", status: "processing", seq: 3 }],
		["completed", { id: "t1", status: "completed", seq: 3 }],
	] as const)("maps %s event and forwards seq verbatim", (_label, event) => {
		expect(processingStatusToTrackChanges(event)).toEqual({
			status: event.status,
			seq: 3,
		});
	});

	it("maps failed event with reason and seq", () => {
		expect(
			processingStatusToTrackChanges({
				id: "t1",
				status: "failed",
				reason: "FFmpeg crashed",
				seq: 2,
			}),
		).toEqual({ status: "failed", reason: "FFmpeg crashed", seq: 2 });
	});

	it("substitutes a fallback reason when a failed event lacks one", () => {
		const malformed = {
			id: "t1",
			status: "failed",
		} as unknown as ProcessingStatus;
		expect(processingStatusToTrackChanges(malformed)).toEqual({
			status: "failed",
			reason: "Unknown error",
		});
	});

	it("omits seq entirely when the event carries none", () => {
		const changes = processingStatusToTrackChanges({
			id: "t1",
			status: "completed",
		});
		expect(changes).toEqual({ status: "completed" });
		expect(changes).not.toHaveProperty("seq");
	});

	it("never leaks the track id into the mutation payload", () => {
		expect(
			processingStatusToTrackChanges({ id: "t1", status: "processing" }),
		).not.toHaveProperty("id");
	});

	it("forwards seq 0 without dropping it (boundary value)", () => {
		expect(
			processingStatusToTrackChanges({
				id: "t1",
				status: "processing",
				seq: 0,
			}),
		).toEqual({ status: "processing", seq: 0 });
	});

	it("forwards seq 0 on a failed event with reason", () => {
		expect(
			processingStatusToTrackChanges({
				id: "t1",
				status: "failed",
				reason: "boom",
				seq: 0,
			}),
		).toEqual({ status: "failed", reason: "boom", seq: 0 });
	});
});
