import type { IAudioMetadata } from "music-metadata";
import type { NativeValue } from "../../../types";

export const processAlbumCover = (metadata: IAudioMetadata) => {
	const id3v23 = metadata.native?.["ID3v2.3"] || metadata.native?.["ID3v2.4"];
	if (!id3v23) return metadata;

	const apicFrame = id3v23.find((item) => item.id === "APIC");
	if (!apicFrame?.value) return metadata;

	const apicValue = apicFrame.value as NativeValue;
	if (apicValue.data instanceof Uint8Array) {
		apicValue.data = btoa(String.fromCharCode(...apicValue.data));
	}

	return metadata;
};
