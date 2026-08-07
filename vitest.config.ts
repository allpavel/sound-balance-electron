import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		restoreMocks: true,
		environment: "node",
		setupFiles: ["./vitest.setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/out/**",
				"**/*.d.ts",
				"**/index.ts",
				"**/*.config.*",
				"tests/**",
				"**/__tests__/**",
				"**/testFactories.ts",
			],
		},
	},
	resolve: {
		alias: {
			"@main": path.resolve(__dirname, "src/main"),
			"@renderer": path.resolve(__dirname, "src/renderer/src"),
			"@shared": path.resolve(__dirname, "src/shared"),
			"@types": path.resolve(__dirname, "src/shared/types/index.ts"),
			"@": path.resolve(__dirname, "."),
		},
	},
});
