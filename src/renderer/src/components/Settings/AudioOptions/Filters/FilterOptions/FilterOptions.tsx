import { NumberInput, Select, Stack, Title } from "@mantine/core";
import type { AUDIO_FILTERS } from "@renderer/components/Settings/settings.types";
import type { JSX } from "react";

/**
 * A compressor is mainly used to reduce the dynamic range of a signal.
 */
function Acompressor() {
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

/**
 * Simple audio dynamic range compression/expansion filter.
 */
function Acontrast() {
	return (
		<Stack gap={"xs"}>
			<Title order={4} size={"md"}>
				Acontrast options:
			</Title>
			<NumberInput
				label="mix"
				description="Set contrast. Range is between 0 and 100."
			/>
		</Stack>
	);
}

/**
 * Reduce audio bit resolution.
 *
 * This filter is bit crusher with enhanced functionality. A bit crusher is used to audibly reduce number of bits an audio
 * signal is sampled with. This doesn't change the bit depth at all, it just produces the effect. Material reduced in bit
 * depth sounds more harsh and "digital". This filter is able to even round to continuous values instead of discrete bit
 * depths. Additionally it has a D/C offset which results in different crushing of the lower and the upper half of the
 * signal. An Anti-Aliasing setting is able to produce "softer" crushing sounds.
 *
 * Another feature of this filter is the logarithmic mode. This setting switches from linear distances between bits to
 * logarithmic ones. The result is a much more "natural" sounding crusher which doesn't gate low signals for example. The
 * human ear has a logarithmic perception, so this kind of crushing is much more pleasant. Logarithmic crushing is also
 * able to get anti-aliased.
 */
function Acrusher() {
	return (
		<Stack gap={"xs"}>
			<Title order={4} size={"md"}>
				Acrusher options:
			</Title>
			<NumberInput
				label="level_in"
				description="Set level in. Pre-crush input gain. Range is between 0.0125625 and 64."
			/>
			<NumberInput
				label="level_out"
				description="Set level out. Post-crush output gain. Range is between 0.0125625 and 64."
			/>
			<NumberInput
				label="bit"
				description="Set bit reduction. Target simulated bit depth. Range is between 1 and 32."
			/>
			<NumberInput
				label="mix"
				description="Set mixing amount. 0 = unprocessed input, 1 = fully crushed output. Range is between 0 and 1."
			/>
			<Select
				label="mode"
				description="Quantization curve selector."
				data={["lin", "log"]}
			/>
			<NumberInput
				label="dc"
				description="Set DC offset applied before quantization. Range is between -1 and 1."
			/>
			<NumberInput
				label="aa"
				description="Set anti-aliasing blend factor. Range is between 0 and 1."
			/>
			<NumberInput
				label="samples"
				description="Set sample rate reduction factor. Range is between 0 and 255."
			/>
			<Select
				label="lfo"
				description="Enable LFO (Low-Frequency Oscillator)."
				data={["enable", "disable"]}
			/>
			<NumberInput
				label="lforange"
				description="Set LFO modulation depth range. Range is between 0 and 1."
			/>
			<NumberInput
				label="lforate"
				description="Set LFO rate. Range is between 0.1 and 200."
			/>
		</Stack>
	);
}

/**
 * Remove impulsive noise from input audio.
 *
 * Samples detected as impulsive noise are replaced by interpolated samples using autoregressive modelling.
 */
function Adeclick() {
	return (
		<Stack gap={"xs"}>
			<Title order={4} size={"md"}>
				Adeclick options:
			</Title>
			<NumberInput
				label="window"
				description="Set window size, in milliseconds. This sets size of window which will be processed at once. Range is between 10 and 100."
			/>
			<NumberInput
				label="overlap"
				description="Set window overlap, in percentage of window size. Setting this to a very high value increases impulsive noise removal but makes whole process much slower. Range is between 50 and 95."
			/>
			<NumberInput
				label="arorder"
				description="Set autoregression order, in percentage of window size. This option also controls quality of interpolated samples using neighbour good samples. Range is between 0 and 25."
			/>
			<NumberInput
				label="thershold"
				description="Set threshold value. This controls the strength of impulsive noise which is going to be removed. The lower value, the more samples will be detected as impulsive noise. Range is between 1 and 100."
			/>
			<NumberInput
				label="burst"
				description="Set burst fusion, in percentage of window size. If any two samples detected as noise are spaced less than this value then any sample between those two samples will be also detected as noise. Range is between 0 and 10."
			/>
			<Select
				label="method"
				description="Set overlap method."
				data={["add", "save"]}
			/>
		</Stack>
	);
}

/**
 * Remove clipped samples from input audio.
 *
 * Samples detected as clipped are replaced by interpolated samples using autoregressive modelling.
 */
function Adeclip() {
	return (
		<Stack gap={"xs"}>
			<Title order={4} size={"md"}>
				Adeclick options:
			</Title>
			<NumberInput
				label="window"
				description="Set window size, in milliseconds. This sets size of window which will be processed at once. Range is between 10 and 100."
			/>
			<NumberInput
				label="overlap"
				description="Set window overlap, in percentage of window size. Setting this to a very high value increases impulsive noise removal but makes whole process much slower. Range is between 50 and 95."
			/>
			<NumberInput
				label="arorder"
				description="Set autoregression order, in percentage of window size. This option also controls quality of interpolated samples using neighbour good samples. Range is between 0 and 25."
			/>
			<NumberInput
				label="thershold"
				description="Set threshold value. Higher values make clip detection less aggressive. Range is between 1 and 100."
			/>
			<NumberInput
				label="hsize"
				description="Set size of histogram used to detect clips. Higher values make clip detection less aggressive. Range is between 100 and 9999."
			/>
			<Select
				label="method"
				description="Set overlap method."
				data={["add", "save"]}
			/>
		</Stack>
	);
}

/**
 * Apply decorrelation to input audio stream.
 */
function Adecorrelate() {
	return (
		<Stack gap={"xs"}>
			<Title order={4} size={"md"}>
				Adecorrelate options:
			</Title>
			<NumberInput
				label="stages"
				description="Set decorrelation stages of filtering. Range is between 1 and 16."
			/>
			<NumberInput
				label="seed"
				description="Set random seed used for setting delay in samples across channels."
			/>
		</Stack>
	);
}

/**
 * Delay one or more audio channels.
 *
 * Samples in delayed channel are filled with silence.
 */
function Adelay() {
	return (
		<Stack gap={"xs"}>
			<Title order={4} size={"md"}>
				Adelay options:
			</Title>
			<NumberInput
				label="delays"
				description="Set list of delays in milliseconds for each channel separated by '|'. Unused delays will be silently ignored. If number of given delays is smaller than number of channels all remaining channels will not be delayed. If you want to delay exact number of samples, append 'S' to number. If you want instead to delay in seconds, append 's' to number."
			/>
			<Select
				label="all"
				description="Use last set delay for all remaining channels."
				data={["enable", "disable"]}
			/>
		</Stack>
	);
}
export const filterOptions: Partial<Record<AUDIO_FILTERS, () => JSX.Element>> =
	{
		acompressor: Acompressor,
		acontrast: Acontrast,
		acrusher: Acrusher,
		adeclick: Adeclick,
		adeclip: Adeclip,
		adecorrelate: Adecorrelate,
		adelay: Adelay,
	};
