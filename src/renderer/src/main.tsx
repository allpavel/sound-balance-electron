import { createTheme, MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@mantine/core/styles.css";

const theme = createTheme({
	cursorType: "pointer",
});

const root = document.getElementById("root") as HTMLElement;

createRoot(root).render(
	<StrictMode>
		<MantineProvider theme={theme}>
			<App />
		</MantineProvider>
	</StrictMode>,
);
