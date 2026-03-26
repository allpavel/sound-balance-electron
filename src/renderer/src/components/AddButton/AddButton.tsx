import { Button } from "@mantine/core";
import { useTracks } from "@renderer/hooks/useTracks";
import { IconUpload } from "@tabler/icons-react";

export default function AddButton() {
	const { addTracks } = useTracks();
	const loadFiles = async () => {
		const result = await window.api.showDialog();
		addTracks(result);
	};

	return (
		<Button leftSection={<IconUpload size={14} />} onClick={loadFiles}>
			Add
		</Button>
	);
}
