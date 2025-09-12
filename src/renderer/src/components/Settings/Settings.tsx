import {
	Box,
	Button,
	Group,
	Modal,
	NativeSelect,
	Radio,
	Stack,
	TextInput,
	Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useAppDispatch } from "@renderer/hooks/useAppDispatch";
import { useAppSelector } from "@renderer/hooks/useAppSelector";
import { setSettings } from "@renderer/store/slices/settingsSlice";
import { IconSettings, IconUpload } from "@tabler/icons-react";

export default function Settings() {
	const [opened, { open, close }] = useDisclosure(false);
	const settings = useAppSelector((state) => state.settings);
	const dispatch = useAppDispatch();

	const form = useForm({
		mode: "uncontrolled",
		initialValues: {
			...settings,

			overwrite: settings.overwrite ? "yes" : "no",
			noOverwrite: settings.noOverwrite ? "yes" : "no",
		},
	});

	const getOutputDirectoryPath = async () =>
		form.setValues({
			outputDirectoryPath: (await window.api.getOutputDirectoryPath())
				.filePaths[0],
		});

	return (
		<>
			<Modal opened={opened} onClose={close} title="Settings">
				<form
					onSubmit={form.onSubmit((values) => {
						dispatch(
							setSettings({
								...values,
								overwrite: values.overwrite === "yes",
								noOverwrite: values.noOverwrite === "yes",
							}),
						);
						close();
					})}
				>
					<Stack gap={"lg"}>
						<Box>
							<Title order={3}>Global options</Title>
							<Stack>
								<TextInput
									label={"Output directory:"}
									rightSection={<IconUpload onClick={getOutputDirectoryPath} />}
									key={form.key("outputDirectoryPath")}
									{...form.getInputProps("outputDirectoryPath")}
								/>
								<Radio.Group
									name="overwrite"
									label="Overwrite output files"
									key={form.key("overwrite")}
									{...form.getInputProps("overwrite")}
								>
									<Group>
										<Radio value="yes" label="Yes" />
										<Radio value="no" label="No" />
									</Group>
								</Radio.Group>
								<Radio.Group
									name="noOverwrite"
									label="Fail if output file exists"
									key={form.key("noOverwrite")}
									{...form.getInputProps("noOverwrite")}
								>
									<Group>
										<Radio value={"yes"} label="Yes" />
										<Radio value={"no"} label="No" />
									</Group>
								</Radio.Group>
								<TextInput
									label={"Set stats update interval in seconds:"}
									defaultValue={settings.statsPeriod}
									key={form.key("statsPeriod")}
									{...form.getInputProps("statsPeriod")}
								/>
							</Stack>
						</Box>
						<Box>
							<Title order={3}>Audio options</Title>
							<Stack>
								<NativeSelect
									label="Audio codec:"
									key={form.key("audioCodec")}
									{...form.getInputProps("audioCodec")}
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
										<option value="wmav1">wmav2</option>
									</optgroup>
								</NativeSelect>
								<NativeSelect
									label="Audio quality:"
									key={form.key("audioQuality")}
									{...form.getInputProps("audioQuality")}
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
								<NativeSelect
									label="Audio filter:"
									key={form.key("audioFilter")}
									{...form.getInputProps("audioFilter")}
								>
									<option value="loudnorm">loudnorm</option>
									<option value="dynaudnorm">dynaudnorm</option>
								</NativeSelect>
							</Stack>
						</Box>
						<Button type="submit">Submit</Button>
					</Stack>
				</form>
			</Modal>
			<Button leftSection={<IconSettings size={14} />} onClick={open}>
				Settings
			</Button>
		</>
	);
}
