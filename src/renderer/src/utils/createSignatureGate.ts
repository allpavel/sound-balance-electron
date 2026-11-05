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

/**
 * Admission gate for developer-channel logs, keyed by an opaque failure
 * signature.
 *
 * Why it exists: dexie-react-hooks re-runs a guarded querier on every
 * observable change; while a read keeps failing, each re-emission used to
 * re-log the identical failure and flood the console. The gate admits a
 * signature once, suppresses immediate recurrences of it, admits a CHANGED
 * signature (a different failure is new information), and re-arms after a
 * healthy emission so a failure that recurs after recovery logs again.
 *
 * One gate per consumer instance (one per hook mount), deliberately not
 * module-level: dedup must span one component's re-emissions, but must never
 * leak across unrelated mounts or across tests.
 */
export type SignatureGate = {
	/**
	 * Reports whether the signature should be logged now: `true` on first
	 * sighting, on a changed signature, or after {@link SignatureGate.rearm};
	 * `false` only for an immediate recurrence of the last admitted signature.
	 *
	 * @param signature - Opaque dedup key; equality-compared only.
	 * @returns Whether to log.
	 */
	admit: (signature: string) => boolean;
	/**
	 * Re-arms the gate after a healthy emission, so the next admission of any
	 * signature — including the previously suppressed one — reports again.
	 */
	rearm: () => void;
};

/**
 * Creates one {@link SignatureGate} instance, initially armed.
 *
 * @returns The gate.
 */
export function createSignatureGate(): SignatureGate {
	let armed = true;
	let lastSignature: string | null = null;
	return {
		admit(signature: string): boolean {
			// A changed signature is always new information, even while the gate
			// is spent: A → B must log B. Only an immediate recurrence of the
			// last admitted signature is suppressed.
			if (armed || signature !== lastSignature) {
				armed = false;
				lastSignature = signature;
				return true;
			}
			return false;
		},
		rearm(): void {
			armed = true;
		},
	};
}
