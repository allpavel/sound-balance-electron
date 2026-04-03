import { Button } from "@mantine/core";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useTracks } from "@renderer/hooks/useTracks";
import { IconUpload } from "@tabler/icons-react";

export default function AddButton() {
	const activeCollection = useAppSelector((state) => state.activeCollection);
	const { addTracks } = useTracks();

	const loadFiles = async () => {
		const result = await window.api.showDialog();
		// if (result.length > 0) {
		// 	result.map((item) => item.collectionIds.push(activeCollection.id));
		// }
		addTracks({
			tracks: result,
			options: { targetCollectionId: activeCollection.id },
		});
	};

	return (
		<Button leftSection={<IconUpload size={14} />} onClick={loadFiles}>
			Add
		</Button>
	);
}
