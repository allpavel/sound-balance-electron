import { AppShell, Button, Group } from "@mantine/core";
import TableComponent from "@renderer/components/Table/Table";
import { IconPlayerPlayFilled, IconUpload } from "@tabler/icons-react";
import type { Data } from "types";
import Settings from "./components/Settings/Settings";
import { useAppDispatch } from "./hooks/useAppDispatch";
import { useAppSelector } from "./hooks/useAppSelector";
import { getAllSelectedTracks } from "./store/slices/selectedTracksSlice";
import { loadTracks } from "./store/slices/tracksSlice";

function App(): React.JSX.Element {
	const dispatch = useAppDispatch();
	const selectedTracks = useAppSelector((state) => state.selectedTracks);
	const settings = useAppSelector((state) => state.settings);

	const loadFiles = async () => {
		const result = await window.api.showDialog();
		dispatch(loadTracks(result));
	};

	const sendData = () => {
		const tracks = getAllSelectedTracks(selectedTracks);
		const data: Data = { tracks, settings };
		return window.api.startProcessing(data);
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
							Open
						</Button>
						<Settings />
					</Group>
					<Button
						leftSection={<IconPlayerPlayFilled size={14} />}
						onClick={sendData}
					>
						Run
					</Button>
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
