import type { IAudioMetadata } from "music-metadata";

export type AudioMetadata = IAudioMetadata & { id: string };

export type AudioCommonMetadata = {
	album: string;
	artist: string;
	title: string;
	year: number;
	id: string;
};
