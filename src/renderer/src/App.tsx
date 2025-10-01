import { AppShell, Button, Group } from "@mantine/core";
import TableComponent from "@renderer/components/Table/Table";
import { IconUpload } from "@tabler/icons-react";
import RunButton from "./components/RunButton/RunButton";
import Settings from "./components/Settings/Settings";
import { useAppDispatch } from "./hooks/useAppDispatch";
import { addTracks } from "./store/slices/tracksSlice";

function App(): React.JSX.Element {
	const dispatch = useAppDispatch();

	const loadFiles = async () => {
		const result = await window.api.showDialog();
		dispatch(addTracks(result));
	};

	return (
		<AppShell
			padding="md"
			header={{ height: 60 }}
			navbar={{ breakpoint: "sm", width: 150 }}
		>
			<AppShell.Header p={"sm"}>
				<Group justify="space-between">
					<Group gap={"md"}>
						<Button leftSection={<IconUpload size={14} />} onClick={loadFiles}>
							Add
						</Button>
						<Settings />
					</Group>
					<RunButton />
				</Group>
			</AppShell.Header>
			<AppShell.Navbar>Collections</AppShell.Navbar>
			<AppShell.Main>
				<TableComponent />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
