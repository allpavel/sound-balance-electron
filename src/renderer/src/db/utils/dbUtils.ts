import { StorageCapacityError } from "@shared/errors";

/**
 * Type guard to safely identify legacy base64 picture objects during migration.
 */
export function isLegacyPicture(pic: unknown): pic is {
	format: string;
	data: string;
	description?: string;
	name?: string;
} {
	return (
		typeof pic === "object" &&
		pic !== null &&
		"data" in pic &&
		typeof (pic as Record<string, unknown>).data === "string"
	);
}

/**
 * Requests persistent storage to prevent eviction of large datasets.
 * Should be called at application startup.
 */
export async function requestPersistentStorage(): Promise<boolean> {
	if (
		typeof navigator !== "undefined" &&
		navigator.storage &&
		navigator.storage.persist
	) {
		return await navigator.storage.persist();
	}
	return false;
}

/**
 * Checks if there is sufficient storage headroom for a large import operation.
 * @param requiredBytes - The estimated size of the incoming payload.
 * @throws {StorageCapacityError} If available storage is less than required.
 */
export async function checkStorageHeadroom(
	requiredBytes: number,
): Promise<void> {
	if (
		typeof navigator !== "undefined" &&
		navigator.storage &&
		navigator.storage.estimate
	) {
		const estimate = await navigator.storage.estimate();
		const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
		if (available < requiredBytes) {
			throw new StorageCapacityError(
				`Insufficient storage. Required: ${requiredBytes}, Available: ${available}`,
			);
		}
	}
}
