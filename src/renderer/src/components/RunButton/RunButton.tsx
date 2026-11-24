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

import { Button } from "@mantine/core";
import { OctagonX, Play } from "lucide-react";
import type { JSX } from "react";

type RunButtonProps = {
	isRunning: boolean;
	handleButtonClick: () => void;
};

/**
 * Primary processing action: starts the batch, or stops it while running.
 *
 * @param props - Run state and click handler (business logic unchanged).
 * @returns The start/stop button.
 */
export default function RunButton({
	isRunning,
	handleButtonClick,
}: RunButtonProps): JSX.Element {
	if (isRunning) {
		return (
			<Button
				color="danger"
				leftSection={<OctagonX size={16} aria-hidden="true" />}
				onClick={handleButtonClick}
			>
				Stop Processing
			</Button>
		);
	}
	return (
		<Button
			leftSection={<Play size={16} aria-hidden="true" />}
			onClick={handleButtonClick}
		>
			Start Processing
		</Button>
	);
}
