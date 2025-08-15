import { AppShell, Button } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import type { AudioCommonMetadata } from "types";
import TableComponent from "./components/Table/Table";

function App(): React.JSX.Element {
	const [files, setFiles] = useState<AudioCommonMetadata[]>([]);

	const loadFiles = async () => {
		const result = await window.api.showDialog();
		setFiles(result);
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
				<TableComponent files={files} />
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
