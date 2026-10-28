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
import { EllipsisVertical } from "lucide-react";
import { About } from "../About/About";

export default function DropdownMenu() {
	const [aboutOpened, aboutHandlers] = useDisclosure();
	return (
		<>
			<About opened={aboutOpened} close={aboutHandlers.close} />
			<Menu shadow="md" width={200} position="bottom-start">
				<Menu.Target>
					<ActionIcon variant="subtle" aria-label="menu" size={"lg"}>
						<EllipsisVertical />
					</ActionIcon>
				</Menu.Target>
				<Menu.Dropdown>
					<Menu.Item onClick={aboutHandlers.open}>About</Menu.Item>
				</Menu.Dropdown>
			</Menu>
		</>
	);
}
