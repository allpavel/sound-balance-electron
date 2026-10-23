/**
 * Awaits an operation that must reject and returns the thrown value for
 * type-safe inspection.
 *
 * An unexpected resolution fails the test with an explicit diagnostic; any
 * rejection value is returned untouched (never filtered), so subsequent
 * instance assertions report the actual error in their failure output.
 *
 * @param operation - The promise expected to reject.
 * @returns The rejection value, exactly as thrown.
 */
export async function captureRejection(
	operation: Promise<unknown>,
): Promise<unknown> {
	let rejected = false;
	let thrown: unknown;
	try {
		await operation;
	} catch (error: unknown) {
		rejected = true;
		thrown = error;
	}
	expect(rejected, "expected the operation to reject, but it resolved").toBe(
		true,
	);
	return thrown;
}
