import { AppShell, Button } from "@mantine/core";
import TableComponent from "@renderer/components/Table/Table";
import { IconUpload } from "@tabler/icons-react";
import { useDispatch } from "react-redux";
import { loadTracks } from "./store/tracksSlice";

function App(): React.JSX.Element {
	const dispatch = useDispatch();

	const loadFiles = async () => {
		const result = await window.api.showDialog();
		dispatch(loadTracks(result));
	};

	return (
		<AppShell
			padding="md"
			header={{ height: 60 }}
			navbar={{ breakpoint: "sm", width: 150 }}
		>
			<AppShell.Header p={"sm"}>
				<Button leftSection={<IconUpload size={14} />} onClick={loadFiles}>
					Open
				</Button>
			</AppShell.Header>
			<AppShell.Navbar>Collections</AppShell.Navbar>
			<AppShell.Main>
				<TableComponent />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
