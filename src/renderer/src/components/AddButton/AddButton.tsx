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
import { Button } from "@mantine/core";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { useTracks } from "@renderer/hooks/useTracks";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export default function AddButton() {
	const activeCollection = useAppSelector((state) => state.activeCollection);
	const { addTracksAsync, addTracksState } = useTracks();

	const loadFiles = async () => {
		try {
			const result = await window.api.showDialog();
			if (!Array.isArray(result) || result.length === 0) {
				return;
			}
			await addTracksAsync({
				tracks: result,
				options: { targetCollectionId: activeCollection.id },
			});
			toast.success("Tracks were added.");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to add tracks.",
			);
		}
	};

	return (
		<Button
			leftSection={<Upload size={14} />}
			onClick={loadFiles}
			loading={addTracksState.isPending}
		>
			Add
		</Button>
	);
}
