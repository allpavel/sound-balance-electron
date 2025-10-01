import { AppShell, Group } from "@mantine/core";
import TableComponent from "@renderer/components/Table/Table";
import AddButton from "./components/AddButton/AddButton";
import DeleteButton from "./components/DeleteButton/DeleteButton";
import RunButton from "./components/RunButton/RunButton";
import Settings from "./components/Settings/Settings";

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
