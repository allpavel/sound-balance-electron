import { Box, NativeSelect, Stack, Title } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import type { SettingsForm } from "@renderer/components/Settings/settings.types";
import OutputExtensions from "./OutputExtensions/OutputExtensions";

export function AudioOptions({
	form,
}: {
	form: UseFormReturnType<SettingsForm>;
}) {
	return (
		<Stack>
			<Box>
				<Title order={3}>Audio options</Title>
				<Stack>
					<OutputExtensions form={form} />
					<NativeSelect
						label="Audio codec:"
						{...form.getInputProps("audio.audioCodec")}
					>
						<optgroup label="Default value">
							<option value="copy">Copy</option>
						</optgroup>
						<hr />
						<optgroup label="Opus">
							<option value="libopus">libopus</option>
						</optgroup>
						<hr />
						<optgroup label="Vorbis">
							<option value="libvorbis">libvorbis</option>
							<option value="orbis">orbis</option>
						</optgroup>
						<hr />
						<optgroup label="AAC LC">
							<option value="libfdk_aac">libfdk_aac</option>
							<option value="aac">aac</option>
						</optgroup>
						<hr />
						<optgroup label="HE-AAC">
							<option value="libfdk_aac">libfdk_aac</option>
						</optgroup>
						<hr />
						<optgroup label="MP3">
							<option value="libmp3lame">libmp3lame</option>
							<option value="libshine">libshine</option>
						</optgroup>
						<hr />
						<optgroup label="Dolby Digital">
							<option value="libmp3lame">ac3</option>
						</optgroup>
						<hr />
						<optgroup label="Dolby Digital Plus">
							<option value="eac3">eac3</option>
						</optgroup>
						<hr />
						<optgroup label="TrueHD 0xFBA">
							<option value="truehd">truehd</option>
						</optgroup>
						<hr />
						<optgroup label="MP2">
							<option value="libtwolame">libtwolame</option>
							<option value="mp2">mp2</option>
						</optgroup>
						<hr />
						<optgroup label="Windows Media Audio 1">
							<option value="wmav1">wmav1</option>
						</optgroup>
						<hr />
						<optgroup label="Windows Media Audio 2">
							<option value="wmav2">wmav2</option>
						</optgroup>
					</NativeSelect>
					<NativeSelect
						label="Audio quality:"
						{...form.getInputProps("audio.audioQuality")}
					>
						<optgroup label="VBR Encoding">
							<option value="0">0</option>
							<option value="1">1</option>
							<option value="2">2</option>
							<option value="3">3</option>
							<option value="4">4 (default value)</option>
							<option value="5">5</option>
							<option value="6">6</option>
							<option value="7">7</option>
							<option value="8">8</option>
							<option value="9">9</option>
						</optgroup>
						<hr />
						<optgroup label="CBR Encoding">
							<option value="320k">302 KB/s</option>
							<option value="256k">256 KB/s</option>
							<option value="224k">224 KB/s</option>
							<option value="192k">192 KB/s</option>
							<option value="160k">160 KB/s</option>
							<option value="128k">128 KB/s</option>
							<option value="112k">112 KB/s</option>
							<option value="96k">96 KB/s</option>
							<option value="80k">80 KB/s</option>
							<option value="64k">64 KB/s</option>
							<option value="48k">48 KB/s</option>
							<option value="40k">40 KB/s</option>
							<option value="32k">32 KB/s</option>
							<option value="24k">24 KB/s</option>
							<option value="16k">16 KB/s</option>
							<option value="8k">8 KB/s</option>
						</optgroup>
					</NativeSelect>
				</Stack>
			</Box>
		</Stack>
	);
}
