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

import { Anchor, Modal, Stack, Text } from "@mantine/core";
import { palette } from "@renderer/theme/tokens";
import { ExternalLink, Scale } from "lucide-react";
import type { JSX } from "react";

interface AboutProps {
	opened: boolean;
	close: () => void;
}

/**
 * About dialog: product name, license summary, and repository link.
 *
 * @param props - Disclosure state owned by the caller (DropdownMenu).
 * @returns The About modal.
 */
export function About({ opened, close }: AboutProps): JSX.Element {
	return (
		<Modal
			opened={opened}
			onClose={close}
			title="About Sound Balance"
			className="allow-text-select"
		>
			<Stack gap="md">
				<Text fz="sm" style={{ color: palette.inkSecondary }}>
					Batch-normalize and re-encode your audio library with FFmpeg —
					collections, filters, and real-time progress in one place.
				</Text>
				<div>
					<Text fw={600} fz="sm">
						<Scale
							size={15}
							aria-hidden="true"
							style={{ verticalAlign: "-2px", marginRight: 6 }}
						/>
						License
					</Text>
					<Text fz="sm" mt={4} style={{ color: palette.inkSecondary }}>
						Copyright © 2026 Pavel Alloyarov. This program is free software: you
						can redistribute it and/or modify it under the terms of the GNU
						General Public License as published by the Free Software Foundation,
						either version 3 of the License, or (at your option) any later
						version.
					</Text>
				</div>
				<Anchor
					href="https://github.com/allpavel/sound-balance-electron"
					target="_blank"
					rel="noreferrer noopener"
					fz="sm"
					inline
				>
					Source code on GitHub
					<ExternalLink
						size={13}
						aria-hidden="true"
						style={{ marginLeft: 4, verticalAlign: "-2px" }}
					/>
				</Anchor>
			</Stack>
		</Modal>
	);
}
