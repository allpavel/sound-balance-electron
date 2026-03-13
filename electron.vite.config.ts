import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	main: {
		build: {
			externalizeDeps: {
				exclude: ["p-queue"],
			},
		},
		plugins: [tsconfigPaths()],
	},
	preload: {
		build: {
			externalizeDeps: {
				exclude: ["p-queue"],
			},
		},
		plugins: [tsconfigPaths()],
	},
	renderer: {
		resolve: {
			alias: {
				"@renderer": resolve("src/renderer/src"),
			},
		},
		plugins: [react()],
	},
});
