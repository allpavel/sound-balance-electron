export const buildFilter = (
	filterName: string,
	options: Record<string, string | number | boolean>,
) => {
	const optionsArray = Object.entries(options);
	if (optionsArray.length > 0) {
		const filterArgs = optionsArray.map(([k, v]) => `${k}=${v}`).join(":");
		return ["-af", `${filterName}=${filterArgs}`];
	}
	return ["-af", `${filterName}`];
};
