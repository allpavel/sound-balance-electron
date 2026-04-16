import { Box, NativeSelect, Stack } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import type { SettingsForm } from "@renderer/components/Settings/settings.types";
import { EXTENSIONS_LIST } from "../../settings.constants";

export default function OutputExtensions({
	form,
}: {
	form: UseFormReturnType<SettingsForm>;
}) {
	return (
		<Stack>
			<Box>
				<Stack>
					<NativeSelect
						label="Output file extension:"
						key={form.key("audio.outputExtension")}
						{...form.getInputProps("audio.outputExtension")}
					>
						<optgroup label="Default value">
							<option value="copy">Copy</option>
						</optgroup>
						{EXTENSIONS_LIST.map((item) => (
							<option key={item}>{item}</option>
						))}
						<hr />
					</NativeSelect>
				</Stack>
			</Box>
		</Stack>
	);
}
