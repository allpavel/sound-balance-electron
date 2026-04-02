import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
	main: {
		build: {
			externalizeDeps: {
				exclude: ["p-queue"],
			},
		},
		resolve: {
			tsconfigPaths: true,
		},
	},
	preload: {
		build: {
			externalizeDeps: {
				exclude: ["p-queue"],
			},
		},
		resolve: {
			tsconfigPaths: true,
		},
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
