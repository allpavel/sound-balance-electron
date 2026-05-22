/*
 * sound-balance-electron
 * Copyright (C) 2026 Pavel Alloyarov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
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
