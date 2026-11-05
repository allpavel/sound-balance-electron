import "fake-indexeddb/auto";
import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(), // Deprecated, but included for legacy library compatibility
			removeListener: vi.fn(), // Deprecated, but included for legacy library compatibility
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

vi.mock("electron", () => ({
	dialog: { showOpenDialog: vi.fn() },
	shell: { openPath: vi.fn() },
	ipcMain: { handle: vi.fn(), on: vi.fn() },
	ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeAllListeners: vi.fn() },
}));

vi.mock("ffmpeg-static", () => ({ default: "/fake/ffmpeg" }));

vi.mock("node:fs/promises", async () => {
	const actual = await vi.importActual("node:fs/promises");
	return { ...actual, stat: vi.fn(), rm: vi.fn() };
});

vi.mock("node:child_process", async () => {
	const actual = await vi.importActual("node:child_process");
	return { ...actual, spawn: vi.fn() };
});

vi.mock("node:path", async () => {
	const actual = await vi.importActual("node:path");
	return { ...actual, join: vi.fn((...args) => args.join("/")) };
});

vi.mock("uuid", async () => {
	const actual = await vi.importActual("uuid");
	return { ...actual, v7: vi.fn() };
});
