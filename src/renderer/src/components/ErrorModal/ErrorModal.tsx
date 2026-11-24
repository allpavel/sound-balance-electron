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
import { Button, Flex, Modal, type ModalRootProps, Text } from "@mantine/core";
import { palette, statusTokens } from "@renderer/theme/tokens";
import { CircleAlert } from "lucide-react";
import type { JSX } from "react";

type ErrorModalProps = {
	message: string;
	title?: string;
};

/**
 * Blocking error dialog for pre-flight and processing failures.
 *
 * @param props - Message, optional title, and Mantine modal root props.
 * @returns The error dialog.
 */
export default function ErrorModal({
	title = "Something needs your attention",
	message,
	opened,
	onClose,
	...props
}: ErrorModalProps & ModalRootProps): JSX.Element {
	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={
				<Flex gap="xs" align="center">
					<CircleAlert
						size={20}
						color={statusTokens.failed.fg}
						aria-hidden="true"
					/>
					<Text component="span" fw={600}>
						{title}
					</Text>
				</Flex>
			}
			className="allow-text-select"
			{...props}
		>
			<Text role="status" style={{ color: palette.inkSecondary }}>
				{message}
			</Text>
			<Flex justify="flex-end" mt="lg">
				<Button onClick={onClose} variant="light">
					Got it
				</Button>
			</Flex>
		</Modal>
	);
}
