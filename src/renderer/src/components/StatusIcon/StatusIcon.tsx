import { Loader, Tooltip } from "@mantine/core";
import {
	IconCircleCheck,
	IconCircleX,
	IconClock,
	IconExclamationCircle,
} from "@tabler/icons-react";
import type { Metadata } from "types";

type Status = Pick<Metadata, "status">;

export default function StatusIcon({ status }: Status) {
	switch (status) {
		case "pending": {
			return (
				<Tooltip label="Pending">
					<IconClock stroke={2} />
				</Tooltip>
			);
		}
		case "processing": {
			return (
				<Tooltip label="Pending">
					<Loader type="dots" />
				</Tooltip>
			);
		}
		case "completed": {
			return (
				<Tooltip label="Completed">
					<IconCircleCheck stroke={2} />
				</Tooltip>
			);
		}
		case "failed": {
			return (
				<Tooltip label="Failed">
					<IconCircleX stroke={2} />
				</Tooltip>
			);
		}
		default: {
			return (
				<Tooltip label="Status unknown">
					<IconExclamationCircle stroke={2} />
				</Tooltip>
			);
		}
	}
}
