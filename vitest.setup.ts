import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

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
