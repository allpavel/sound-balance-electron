import type { IAudioMetadata } from "music-metadata";

export type Metadata = IAudioMetadata & { id: string };

export type InfoModalProps = {
	trackId: string;
	data: Metadata[];
	isOpen: boolean;
	onClose: () => void;
};
