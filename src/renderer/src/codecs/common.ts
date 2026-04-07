import { z } from "zod";

const generalCapabilities = z.enum(["drl", "delay", "small"]);
const sampleRate = z.enum([
	"96000",
	"88200",
	"64000",
	"48000",
	"44100",
	"32000",
	"24000",
	"22050",
	"16000",
	"12000",
	"11025",
	"8000",
	"7350",
]);
const sampleFormats = z.enum(["fltp"]);
const channelLayouts = z.enum([
	"mono",
	"stereo",
	"3.0(back)",
	"3.0",
	"quad(side)",
	"quad",
	"4.0",
	"5.0(side)",
	"5.0",
	"2 channels (FC+LFE)",
	"2.1",
	"4 channels (FL+FR+LFE+BC)",
	"3.1",
	"4.1",
	"5.1(side)",
	"5.1",
]);

const generalOptions = z.object({
	generalCapabilities: z.array(generalCapabilities),
	threadingCapabilities: z.null(),
	supportedSampleRates: z.array(sampleRate),
	supportedSampleFormats: z.array(sampleFormats),
	supportedChannelLayouts: z.array(channelLayouts).optional(),
});

export const getCodecOptions = <T extends z.ZodType>(encoderSchema: T) =>
	z.object({
		name: z.string(),
		generalOptions: generalOptions,
		encoderOptions: encoderSchema,
	});
