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

import { Group, Progress, Text } from "@mantine/core";
import { getStatusPresentation } from "@renderer/components/StatusBadge/statusPresentation";
import { palette } from "@renderer/theme/tokens";
import type { JSX } from "react";
import { useMemo } from "react";
import {
	summarizeProgressPercent,
	summarizeTrackStatuses,
} from "./summarizeTrackStatuses";

export type ProcessingSummaryProps = {
	/** Tracks in the current batch (only `status` is read). */
	tracks: readonly { status: unknown }[];
};

/** Canonical statuses rendered as counters, in pipeline order. */
const COUNTER_STATUSES = [
	"pending",
	"processing",
	"completed",
	"failed",
] as const;

/**
 * Renders the batch progress panel, or `null` for an empty batch.
 *
 * @param props - See {@link ProcessingSummaryProps}.
 * @returns A `<section>` landmark with progressbar semantics.
 */
export default function ProcessingSummary({
	tracks,
}: ProcessingSummaryProps): JSX.Element | null {
	const summary = useMemo(() => summarizeTrackStatuses(tracks), [tracks]);

	if (summary.total === 0) {
		return null;
	}

	const finished = summary.processed + summary.failed;
	const percent = summarizeProgressPercent(summary);
	/** Percentage of the whole batch represented by `count`. */
	const share = (count: number): number => (count / summary.total) * 100;

	return (
		<section
			aria-labelledby="processing-summary-heading"
			className="sb-surface-card"
			style={{ padding: "14px 18px" }}
		>
			<Group justify="space-between" gap="md">
				<Text id="processing-summary-heading" fw={600} fz="sm">
					Batch progress
				</Text>
				<Text fz="sm" style={{ color: palette.inkSecondary }}>
					{finished} of {summary.total} finished
				</Text>
			</Group>

			<Progress.Root
				role="progressbar"
				aria-label="Batch processing progress"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent}
				aria-valuetext={`${percent}% finished — ${summary.processed} processed, ${summary.failed} failed`}
				size="lg"
				radius="md"
				mt="xs"
				style={{ backgroundColor: palette.surfaceSunken }}
			>
				<Progress.Section
					value={share(summary.processed)}
					color="success.6"
					aria-hidden="true"
				/>
				<Progress.Section
					value={share(summary.failed)}
					color="danger.6"
					aria-hidden="true"
				/>
				<Progress.Section
					value={share(summary.processing)}
					color="warning.5"
					// Slow continuous stripe crawl (not a flash); Mantine disables
					// it automatically under prefers-reduced-motion.
					animated={summary.processing > 0}
					aria-hidden="true"
				/>
			</Progress.Root>

			<Group gap="sm" mt="sm" wrap="wrap">
				{COUNTER_STATUSES.map((status) => {
					const presentation = getStatusPresentation(status);
					const count =
						status === "pending"
							? summary.queued
							: status === "processing"
								? summary.processing
								: status === "completed"
									? summary.processed
									: summary.failed;
					const { Icon, tone } = presentation;
					return (
						<span
							key={status}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								padding: "3px 10px",
								borderRadius: 999,
								border: `1px solid ${tone.border}`,
								backgroundColor: tone.bg,
								color: tone.fg,
								fontSize: "0.8125rem",
								fontWeight: 600,
							}}
						>
							<Icon size={14} aria-hidden="true" focusable="false" />
							{presentation.label}: {count}
						</span>
					);
				})}
			</Group>

			{/* Polite live region: re-announced whenever counts change. Polite
			    (not assertive) so it never interrupts the user's current task. */}
			<p aria-live="polite" className="visually-hidden">
				Batch progress: {finished} of {summary.total} finished,{" "}
				{summary.processing} processing, {summary.failed} failed.
			</p>
		</section>
	);
}
