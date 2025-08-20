import type { IAudioMetadata } from "music-metadata";

export type Metadata = IAudioMetadata & { id: string; file: string };

export type NativeValue = {
	data: Uint8Array | string;
	description: string;
	format: string;
	type: string;
};
