import { AppShell, Group } from "@mantine/core";
import TableComponent from "@renderer/components/Table/Table";
import AddButton from "./components/AddButton/AddButton";
import DeleteButton from "./components/DeleteButton/DeleteButton";
import Settings from "./components/Settings/Settings";
import StartProcessing from "./components/StartProcessing/StartProcessing";

function App(): React.JSX.Element {
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
			<AppShell.Navbar>Collections</AppShell.Navbar>
			<AppShell.Main>
				<TableComponent />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
