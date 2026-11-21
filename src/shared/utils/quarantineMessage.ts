import { sanitizeControlChars } from "./pathToString";

/**
 * Builds the quarantine diagnostic message for a given repository scope.
 *
 * @param scope - Repository operation tag (e.g. `"tracksRepository.getAll"`).
 * @returns The formatted diagnostic message string.
 */
export function quarantineMessage(scope: string): string {
	return `[${sanitizeControlChars(scope)}] quarantined structurally invalid rows`;
}
