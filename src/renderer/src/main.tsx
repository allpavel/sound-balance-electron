/*
 * sound-balance-electron
 * Copyright (C) 2026 Pavel Alloyarov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
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
