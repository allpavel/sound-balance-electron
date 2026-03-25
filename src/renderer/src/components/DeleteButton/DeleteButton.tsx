import { Button, useMantineTheme } from "@mantine/core";
import { useTracks } from "@renderer/hooks/useTracks";
import { IconTrash } from "@tabler/icons-react";

export default function DeleteButton() {
	const theme = useMantineTheme();
	const { removeManyTracks } = useTracks();

	const deleteSelectedTracks = () => {
		removeManyTracks();
	};

	return (
		<Button
			leftSection={<IconTrash size={14} />}
			color={theme.colors.red[8]}
			// disabled={selectedTracksIds.length === 0}
			onClick={deleteSelectedTracks}
		>
			Delete
		</Button>
	);
}
