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
import { getCodecOptions } from "@renderer/codecs/common";
import z from "zod";

const aacEncoderOptions = z.object({
	aac_coder: z.int().min(0).max(2).default(2), // "anmr": 0 | "twoloop": 1 | "fast": 2
	aac_ms: z.union([z.literal("auto"), z.boolean()]).default("auto"), // "auto" | true | false
	aac_is: z.boolean().default(true),
	aac_pns: z.boolean().default(true),
	aac_tns: z.boolean().default(true),
	aac_ltp: z.boolean().default(false),
	aac_pred: z.boolean().default(false),
	aac_pce: z.boolean().default(false),
});

export const aac = getCodecOptions(aacEncoderOptions);

export type AAC = z.infer<typeof aac>;

export const aacDefaults = {
	name: "AAC (Advanced Audio Coding)",
	generalOptions: {
		generalCapabilities: ["drl", "delay", "small"],
		threadingCapabilities: null,
		supportedSampleRates: [
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
		],
		supportedSampleFormats: ["fltp"],
	},
	encoderOptions: {
		aac_coder: 2,
		aac_ms: "auto",
		aac_is: true,
		aac_pns: true,
		aac_tns: true,
		aac_ltp: false,
		aac_pred: false,
		aac_pce: false,
	},
} satisfies AAC;
