import { NumberInput, Select, Stack, Title } from "@mantine/core";

/**
 * A compressor is mainly used to reduce the dynamic range of a signal.
 */
export default function Acompressor() {
	return (
		<Stack gap={"xs"}>
			<Title order={4} size={"md"}>
				Acompressor options:
			</Title>
			<NumberInput
				label="level_in"
				description="Set input gain. Range is between 0.015625 and 64."
			/>
			<Select
				label="mode"
				description="Set mode of compressor operation."
				data={["downward", "upward"]}
			/>
			<NumberInput
				label="threshold"
				description="Set a threshold above which a stream signal affects gain reduction. Range is between 0.00097563 and 1."
			/>
			<NumberInput
				label="ratio"
				description="Set a ratio by which the signal is reduced. Range is between 1 and 20."
			/>
			<NumberInput
				label="attack"
				description="Amount of milliseconds the signal has to rise above the threshold before gain reduction starts. Range is between 0.01 and 2000."
			/>
			<NumberInput
				label="release"
				description="Amount of milliseconds the signal has to fall below the threshold before reduction is decreased again. Range is between 0.01 and 9000."
			/>
			<NumberInput
				label="makeup"
				description="Set the amount by how much signal will be amplified after processing. Range is between 1 and 64."
			/>
			<NumberInput
				label="knee"
				description="Curve the sharp knee around the threshold to enter gain reduction more softly. Range is between 1 and 8."
			/>
			<Select
				label="link"
				description="Choose if the average level between all channels of input stream or the louder(maximum) channel of input stream affects the reduction."
				data={["average", "maximum"]}
			/>
			<Select
				label="detection"
				description="Should the exact signal be taken in case of peak or an RMS one in case of rms."
				data={["peak", "rms"]}
			/>
			<NumberInput
				label="mix"
				description="How much to use compressed signal in output. Range is between 0 and 1."
			/>
		</Stack>
	);
}
