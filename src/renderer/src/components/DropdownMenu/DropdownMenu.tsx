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
