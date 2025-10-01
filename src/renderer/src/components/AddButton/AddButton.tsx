import { Button } from "@mantine/core";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { addTracks } from "@renderer/store/slices/tracksSlice";
import { IconUpload } from "@tabler/icons-react";

export default function AddButton() {
	const dispatch = useAppDispatch();

	const loadFiles = async () => {
		const result = await window.api.showDialog();
		dispatch(addTracks(result));
	};

	return (
		<Button leftSection={<IconUpload size={14} />} onClick={loadFiles}>
			Add
		</Button>
	);
}
