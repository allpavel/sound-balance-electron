export const getTrackTitle = (
	artist: string | undefined,
	title: string | undefined,
	defaultTitle: string,
) => {
	if (artist && title) {
		return `${artist} - ${title}`;
	}
	const singleTitle = artist || title;
	return singleTitle || defaultTitle;
};
