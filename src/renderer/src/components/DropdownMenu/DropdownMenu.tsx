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

import { ActionIcon, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { EllipsisVertical, Info } from "lucide-react";
import { About } from "../About/About";

/**
 * Overflow menu for secondary application actions.
 *
 * @returns Menu trigger + About dialog.
 */
export default function DropdownMenu() {
	const [aboutOpened, aboutHandlers] = useDisclosure();
	return (
		<>
			<About opened={aboutOpened} close={aboutHandlers.close} />
			<Menu shadow="md" width={220} position="bottom-end" withinPortal>
				<Menu.Target>
					<ActionIcon variant="subtle" aria-label="Main menu" size="lg">
						<EllipsisVertical aria-hidden="true" />
					</ActionIcon>
				</Menu.Target>
				<Menu.Dropdown>
					<Menu.Item
						leftSection={<Info size={15} aria-hidden="true" />}
						onClick={aboutHandlers.open}
					>
						About Sound Balance
					</Menu.Item>
				</Menu.Dropdown>
			</Menu>
		</>
	);
}
