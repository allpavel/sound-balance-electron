import { AppShell, Group } from "@mantine/core";
import AddButton from "@renderer/components/AddButton/AddButton";
import DeleteButton from "@renderer/components/DeleteButton/DeleteButton";
import Settings from "@renderer/components/Settings/Settings";
import StartProcessing from "@renderer/components/StartProcessing/StartProcessing";
import TableComponent from "@renderer/components/Table/Table";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { loadSelectedTracks } from "@renderer/store/slices/selectedTracksSlice";
import { getSettings } from "@renderer/store/slices/settingsSlice";
import { loadTracksFromDB } from "@renderer/store/slices/tracksSlice";
import { useEffect } from "react";

function App(): React.JSX.Element {
	const dispatch = useAppDispatch();

	useEffect(() => {
		dispatch(loadTracksFromDB());
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
			<AppShell.Main>
				<TableComponent />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
