import { Button, useMantineTheme } from "@mantine/core";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { getSelectedTracksIds } from "@renderer/store/slices/selectedTracksSlice";
import { removeTracks } from "@renderer/store/slices/tracksSlice";
import { IconTrash } from "@tabler/icons-react";

export default function DeleteButton() {
	const dispatch = useAppDispatch();
	const theme = useMantineTheme();
	const selectedTracks = useAppSelector((state) =>
		getSelectedTracksIds(state.selectedTracks),
	);

	const deleteSelectedTracks = () => {
		dispatch(removeTracks(selectedTracks));
	};

	return (
		<Button
			leftSection={<IconTrash size={14} />}
			color={theme.colors.red[8]}
			disabled={selectedTracks.length === 0}
			onClick={deleteSelectedTracks}
		>
			Delete
		</Button>
	);
}
