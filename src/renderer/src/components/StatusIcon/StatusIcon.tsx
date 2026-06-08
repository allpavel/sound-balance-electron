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
import { Loader, Tooltip, useMantineTheme } from "@mantine/core";
import {
	IconCircleCheck,
	IconCircleX,
	IconClock,
	IconExclamationCircle,
} from "@tabler/icons-react";
import type { Metadata } from "@/types";

type Status = Pick<Metadata, "status">;

export default function StatusIcon({ status }: Status) {
	const theme = useMantineTheme();

	switch (status) {
		case "pending": {
			return (
				<Tooltip label="Pending">
					<IconClock stroke={2} color={theme.colors.blue[6]} />
				</Tooltip>
			);
		}
		case "processing": {
			return (
				<Tooltip label="Pending">
					<Loader type="dots" color={theme.colors.yellow[6]} />
				</Tooltip>
			);
		}
		case "completed": {
			return (
				<Tooltip label="Completed">
					<IconCircleCheck stroke={2} color={theme.colors.green[6]} />
				</Tooltip>
			);
		}
		case "failed": {
			return (
				<Tooltip label="Failed">
					<IconCircleX stroke={2} color={theme.colors.red[8]} />
				</Tooltip>
			);
		}
		default: {
			return (
				<Tooltip label="Status unknown">
					<IconExclamationCircle stroke={2} color={theme.colors.red[8]} />
				</Tooltip>
			);
		}
	}
}
