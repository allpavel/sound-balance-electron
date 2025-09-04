import type { IAudioMetadata } from "music-metadata";
import type { NativeValue } from "../../../types";

export const processAlbumCover = (data: IAudioMetadata) => {
	const id3Tags = data.native?.["ID3v2.3"] || data.native?.["ID3v2.4"] || null;
	if (!id3Tags) return data;

	const apicFrame = id3Tags.find((item) => item.id === "APIC");
	if (!apicFrame?.value) return data;

	const metadata = structuredClone(data);
	const nativeData =
		metadata.native?.["ID3v2.3"] || metadata.native?.["ID3v2.4"];

	const apicValue = nativeData.find((item) => item.id === "APIC")
		?.value as NativeValue;
	if (apicValue.data instanceof Uint8Array) {
		const base64 = Buffer.from(apicValue.data).toString("base64");
		apicValue.data = base64;
	}

	return metadata;
};
