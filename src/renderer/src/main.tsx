import { createTheme, MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@mantine/core/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as RTKProvider } from "react-redux";
import { store } from "./store/store";

const theme = createTheme({
	cursorType: "pointer",
});

const queryClient = new QueryClient();

const root = document.getElementById("root") as HTMLElement;

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RTKProvider store={store}>
				<MantineProvider theme={theme}>
					<App />
				</MantineProvider>
			</RTKProvider>
		</QueryClientProvider>
	</StrictMode>,
);
