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

import { stat } from "node:fs/promises";
import path from "node:path";
import {
	EVENT_CHANNELS,
	INITIALSETTINGS,
	STOP_GRACE_PERIOD_MS,
} from "@main/constants";
import { getGlobalSettings, getTrackSettings } from "@main/lib/ffmpeg";
import { getTrackTitle, isDirectory } from "@main/lib/utils";
import { ProcessManager } from "@main/services/ffmpeg/processManager";
import type { Data } from "@shared/schemas/data.schema";
import type { Metadata, ProcessingStatus } from "@shared/schemas/track.schema";
import { formatValidationIssues } from "@shared/utils";
import { safeParseSettings, safeParseTrack } from "@shared/validators";
import type { IpcMainInvokeEvent } from "electron";
import PQueue from "p-queue";
import type { Failed } from "@/types";
import { TwoPassProcessManager } from "./ffmpeg/twoPassProcessManager";

type ProcessingState = {
	activeProcesses: Map<string, ProcessManager>;
	abortController: AbortController | null;

	// Per-track high-water counters for status-event sequence numbers.
	// Deliberately NOT cleaned up when a track finishes or a batch completes:
	//
	// 1. Cleaning up would allow a subsequent batch within the same
	//    main-process session to reuse a sequence number, causing the
	//    renderer's sequence guard to reject the event as stale.
	// 2. Memory is bounded by the number of unique tracks processed per
	//    session (a desktop-app scale, not an unbounded stream).
	// 3. Across main-process restarts the in-memory counter is lost, but
	//    `nextEventSeq` seeds from the renderer-persisted `statusSeq`
	//    carried in the IPC payload, restoring continuity via Math.max.
	statusSeq: Map<string, number>;
};

export const processingState: ProcessingState = {
	activeProcesses: new Map(),
	abortController: null,
	statusSeq: new Map(),
};

function extractTrackId(rawTrack: unknown, index: number): string {
	if (typeof rawTrack === "object" && rawTrack !== null && "id" in rawTrack) {
		const id = (rawTrack as Record<string, unknown>).id;
		if (typeof id === "string" && id.trim().length > 0) {
			return id;
		}
	}
	return `unknown-track-at-index-${index}`;
}

/**
 * Produces the next strictly-increasing sequence number for a track.
 *
 * The seed is the renderer-persisted `statusSeq` carried on the IPC payload.
 * `Math.max(current, seed)` guarantees monotonicity in both directions:
 * - After a main restart (counter empty, seed dominates).
 * - When the renderer lags behind the in-memory counter (counter dominates).
 *
 * @param trackId - The track whose sequence is being advanced.
 * @param seed - The renderer-persisted high-water mark, or `undefined` if absent.
 * @returns The next sequence number (strictly greater than both current and seed).
 */
function nextEventSeq(trackId: string, seed: number | undefined): number {
	const current = processingState.statusSeq.get(trackId) ?? 0;
	const next = Math.max(current, seed ?? 0) + 1;
	processingState.statusSeq.set(trackId, next);
	return next;
}

export const startProcessing = async (
	event: IpcMainInvokeEvent,
	data: Data,
) => {
	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		throw new Error(
			"Processing payload validation failed: expected a non-null object",
		);
	}

	const settingsResult = safeParseSettings(data.settings, {
		mode: "strict",
	});

	if (!settingsResult.success) {
		throw new Error(
			`Processing payload validation failed — settings are invalid: ` +
				formatValidationIssues(settingsResult.issues),
		);
	}

	const settings = settingsResult.data;

	if (!Array.isArray(data.tracks)) {
		throw new Error(
			"Processing payload validation failed: 'tracks' must be an array",
		);
	}

	const validTracks: Metadata[] = [];
	const skippedTracks: Failed[] = [];

	for (const [index, rawTrack] of data.tracks.entries()) {
		const trackResult = safeParseTrack(rawTrack);

		if (trackResult.success) {
			validTracks.push(trackResult.data);
			continue;
		}
		skippedTracks.push({
			id: extractTrackId(rawTrack, index),
			title: "Skipped (corrupted track data)",
			reason: `Track validation failed: ${formatValidationIssues(trackResult.issues)}`,
		} satisfies Failed);
	}

	const dirPath = settings.global.outputDirectoryPath;
	const isDir = await isDirectory(dirPath);
	if (!isDir) {
		throw new Error("Output directory validation failed.");
	}

	let successful = 0;
	const failed: Failed[] = [...skippedTracks];
	let total = skippedTracks.length;
	processingState.abortController = new AbortController();
	const { signal } = processingState.abortController;
	const queue = new PQueue({ concurrency: +settings.global.concurrency });

	const globalSettings = getGlobalSettings(settings.global);
	const trackSettings = getTrackSettings(INITIALSETTINGS.audio, settings.audio);
	const isTwoPass =
		settings.audio.audioFilter === "loudnorm" &&
		settings.audio.filterOptions?.linear !== false;

	for (const track of validTracks) {
		if (!track.filePath || track.status !== "pending") continue;

		queue.add(async () => {
			if (signal.aborted) return;
			total++;
			const proc = isTwoPass
				? new TwoPassProcessManager()
				: new ProcessManager();
			processingState.activeProcesses.set(track.id, proc);

			try {
				event.sender.send(EVENT_CHANNELS.PROCESSING_RESULT, {
					id: track.id,
					status: "processing",
					seq: nextEventSeq(track.id, track.statusSeq),
				} satisfies ProcessingStatus);

				const inputFile = track.filePath;
				const outputFile = path.join(dirPath, track.file);

				try {
					const stats = await stat(inputFile);
					if (!stats.isFile()) {
						throw new Error(`Input path is not a regular file: ${inputFile}`);
					}
				} catch (err) {
					if (
						err instanceof Error &&
						err.message.startsWith("Input path is not a regular file")
					) {
						throw err;
					}
					throw new Error(
						`Input file does not exist or is inaccessible: ${inputFile}`,
					);
				}

				if (proc instanceof TwoPassProcessManager) {
					await proc.run({
						input: inputFile,
						output: outputFile,
						globalSettings,
						trackSettings,
						filterOptions: settings.audio.filterOptions,
						signal: signal,
					});
				} else if (proc instanceof ProcessManager) {
					await proc.run({
						input: inputFile,
						output: outputFile,
						globalSettings,
						trackSettings,
					});
				}
				successful++;

				event.sender.send(EVENT_CHANNELS.PROCESSING_RESULT, {
					id: track.id,
					status: "completed",
					seq: nextEventSeq(track.id, track.statusSeq),
				} satisfies ProcessingStatus);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				failed.push({
					id: track.id,
					title: getTrackTitle(
						track.common.artist,
						track.common.title,
						track.file,
					),
					reason: errorMessage,
				} satisfies Failed);

				event.sender.send(EVENT_CHANNELS.PROCESSING_RESULT, {
					id: track.id,
					status: "failed",
					reason: errorMessage,
					seq: nextEventSeq(track.id, track.statusSeq),
				} satisfies ProcessingStatus);
			} finally {
				processingState.activeProcesses.delete(track.id);
			}
		});
	}

	await queue.onIdle();

	processingState.abortController = null;
	return {
		successful,
		failed,
		total,
	};
};

export const stopProcessing = async (event: IpcMainInvokeEvent) => {
	if (processingState.abortController) {
		processingState.abortController.abort();
		processingState.abortController = null;
	}

	for (const [id, proc] of processingState.activeProcesses.entries()) {
		proc.kill("SIGINT");
		processingState.activeProcesses.delete(id);
	}

	await new Promise((resolve) => setTimeout(resolve, STOP_GRACE_PERIOD_MS));

	event.sender.send(EVENT_CHANNELS.RESPONSE_ON_STOP, { success: true });
};
