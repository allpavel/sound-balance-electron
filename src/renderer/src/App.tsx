import { AppShell, Button } from "@mantine/core";
import { useState } from "react";
import type { AudioMetadata } from "types";

function App(): React.JSX.Element {
	const [files, setFiles] = useState<AudioMetadata[]>([]);

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
			<AppShell.Header>Menu</AppShell.Header>
			<AppShell.Navbar>Collections</AppShell.Navbar>
			<AppShell.Main>
				<Button onClick={loadFiles}>Open</Button>
				{files.length > 0 &&
					files.map((file) => <p key={file.id}>{file.common.artist}</p>)}
			</AppShell.Main>
		</AppShell>
	);
}

export default App;
