import { Loader, Tooltip, useMantineTheme } from "@mantine/core";
import {
	IconCircleCheck,
	IconCircleX,
	IconClock,
	IconExclamationCircle,
} from "@tabler/icons-react";
import type { Metadata } from "types";

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
