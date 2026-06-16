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
import { BaseProcess } from "./baseProcess";

export type ProcessManagerOptions = {
	input: string;
	output: string;
	globalSettings: string[];
	trackSettings: string[];
};

export class ProcessManager extends BaseProcess {
	async run(options: ProcessManagerOptions): Promise<void> {
		const args = [
			...options.globalSettings,
			"-i",
			options.input,
			...options.trackSettings,
			options.output,
		];

		return this.runProcessing(args);
	}

	kill(signal: NodeJS.Signals = "SIGINT"): void {
		if (this.process) {
			this.process.kill(signal);
		}
	}

	isRunning(): boolean {
		return this.process !== null;
	}
}
