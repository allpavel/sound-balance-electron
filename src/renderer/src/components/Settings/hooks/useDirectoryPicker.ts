import { useCallback } from "react";

export const useDirectoryPicker = () => {
	return useCallback(async () => {
		try {
			return await window.api.getOutputDirectoryPath();
		} catch {
			throw new Error("Failed to pick the output directory.");
		}
	}, []);
};
