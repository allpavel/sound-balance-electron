/**
 * Builds the quarantine-visibility toast copy: tells the user
 * that records were skipped by the read guard, and how many.
 *
 * @param count - Number of quarantined records (≥ 1).
 * @returns The user-facing message.
 */
export function quarantineTracksToastMessage(count: number): string {
	const records = count === 1 ? "track record was" : "track records were";
	return `${count} ${records} skipped because the stored data failed integrity checks.`;
}
