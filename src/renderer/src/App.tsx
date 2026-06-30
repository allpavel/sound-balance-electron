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
import { AppShell, Group } from "@mantine/core";
import AddButton from "@renderer/components/AddButton/AddButton";
import CollectionsList from "@renderer/components/Collections/components/CollectionsList/CollectionsList";
import { CollectionTitle } from "@renderer/components/Collections/components/CollectionTitle/CollectionTitle";
import DeleteButton from "@renderer/components/DeleteButton/DeleteButton";
import Settings from "@renderer/components/Settings/Settings";
import StartProcessing from "@renderer/components/StartProcessing/StartProcessing";
import TableComponent from "@renderer/components/Table/Table";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { loadSelectedTracks } from "@renderer/store/slices/selectedTracksSlice";
import { getSettings } from "@renderer/store/slices/settingsSlice";
import { useEffect } from "react";

function App(): React.JSX.Element {
	const dispatch = useAppDispatch();

	useEffect(() => {
		dispatch(getSettings());
		dispatch(loadSelectedTracks());
	}, [dispatch]);

	return (
		<AppShell
			padding="md"
			header={{ height: 60 }}
			navbar={{ breakpoint: "sm", width: 150 }}
		>
			<AppShell.Header p={"sm"}>
				<Group justify="space-between">
					<Group gap={"md"}>
						<AddButton />
						<Settings />
						<DeleteButton />
					</Group>
					<StartProcessing />
				</Group>
			</AppShell.Header>
			<CollectionsList />
			<AppShell.Main>
				<CollectionTitle />
				<TableComponent />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
