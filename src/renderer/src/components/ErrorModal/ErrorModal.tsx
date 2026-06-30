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
import { Flex, Modal, type ModalRootProps, Text } from "@mantine/core";
import { AlertOctagon } from "lucide-react";

type ErrorModal = {
	message: string;
	title?: string;
};

export default function ErrorModal({
	title = "Attention!",
	message,
	opened,
	onClose,
	...props
}: ErrorModal & ModalRootProps) {
	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={
				<Flex gap={"xs"}>
					<AlertOctagon color="red" />
					<Text>{title}</Text>
				</Flex>
			}
			{...props}
		>
			<Text>{message}</Text>
		</Modal>
	);
}
