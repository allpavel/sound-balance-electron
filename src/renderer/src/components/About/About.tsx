import { Anchor, Modal, Text } from "@mantine/core";

interface About {
	opened: boolean;
	close: () => void;
}

export function About({ opened, close }: About) {
	return (
		<Modal opened={opened} onClose={close} title="About">
			<Text size="xl" fw={700}>
				Sound Balance Electron
			</Text>
			<Text py="md">Copyright © 2026 Pavel Alloyarov</Text>
			<Text mb={"md"}>
				This program is free software: you can redistribute it and/or modify it
				under the terms of the GNU General Public License as published by the
				Free Software Foundation, either version 3 of the License, or (at your
				option) any later version.
			</Text>
			<Anchor
				href="https://github.com/allpavel/sound-balance-electron"
				target="_blank"
			>
				Source code
			</Anchor>
		</Modal>
	);
}
