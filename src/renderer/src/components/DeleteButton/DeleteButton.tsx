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
import { Button, useMantineTheme } from "@mantine/core";
import { useTracks } from "@renderer/hooks/useTracks";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DeleteButton() {
	const theme = useMantineTheme();
	const { removeManyTracksAsync, removeManyTracksState, selectedTracks } =
		useTracks();
	const hasSelection = selectedTracks.length > 0;
	const ariaLabel = hasSelection
		? `Delete ${selectedTracks.length} selected track${selectedTracks.length === 1 ? "" : "s"}`
		: "Delete selected tracks (none selected)";

	const deleteSelectedTracks = async () => {
		if (selectedTracks.length === 0) {
			toast.info("Please select at least one track to delete.");
			return;
		}
		try {
			await removeManyTracksAsync();
			toast.success("Selected tracks were deleted.");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete tracks.",
			);
		}
	};

	return (
		<Button
			leftSection={<Trash2 size={14} />}
			color={theme.colors.red[8]}
			variant={hasSelection ? "filled" : "light"}
			loading={removeManyTracksState.isPending}
			aria-label={ariaLabel}
			onClick={deleteSelectedTracks}
		>
			Delete
		</Button>
	);
}
