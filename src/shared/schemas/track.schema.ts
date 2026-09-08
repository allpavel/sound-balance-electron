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
import { STATUS_VALUES } from "@shared/constants";
import z from "zod";

const MAX_PATH_LENGTH = 4096;
const MAX_BASE64_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PICTURE_COUNT = 20;
const NULL_BYTE_PATTERN = /\0/;

export const nonEmptyStringSchema = z
	.string()
	.min(1)
	.max(MAX_PATH_LENGTH)
	.refine((val) => val.trim().length > 0)
	.refine((val) => !NULL_BYTE_PATTERN.test(val));

export const collectionIdsSchema = z.array(nonEmptyStringSchema);
export const targetCollectionIdSchema = nonEmptyStringSchema;
export const selectedSchema = z.union([z.literal(0), z.literal(1)]);
export const statusSchema = z.enum(STATUS_VALUES);
export const pictureSchema = z
	.object({
		format: z.string().min(1).max(50),
		data: z
			.string()
			.max(
				MAX_BASE64_IMAGE_SIZE,
				"Album art exceeds maximum allowed size (5MB)",
			),
		description: z.string().max(500).optional(),
		name: z.string().max(255).optional(),
	})
	.strict();

const commonSchema = z
	.object({
		artist: z.string().optional(),
		title: z.string().optional(),
		album: z.string().optional(),
		year: z.number().int().min(1000).max(9999).optional(),
		track: z
			.object({ no: z.number().nullable(), of: z.number().nullable() })
			.optional(),
		disk: z
			.object({ no: z.number().nullable(), of: z.number().nullable() })
			.optional(),
		picture: z.array(pictureSchema).max(MAX_PICTURE_COUNT).optional(),
		genre: z.array(z.string()).optional(),
		composer: z.array(z.string()).optional(),
		artists: z.array(z.string()).optional(),
		albumartist: z.string().optional(),

		// Dates
		date: z.string().optional(),
		originaldate: z.string().optional(),
		originalyear: z.number().int().optional(),
		releasedate: z.string().optional(),

		// Credits
		lyricist: z.array(z.string()).optional(),
		writer: z.array(z.string()).optional(),
		conductor: z.array(z.string()).optional(),
		remixer: z.array(z.string()).optional(),
		arranger: z.array(z.string()).optional(),
		engineer: z.array(z.string()).optional(),
		producer: z.array(z.string()).optional(),
		djmixer: z.array(z.string()).optional(),
		mixer: z.array(z.string()).optional(),
		technician: z.array(z.string()).optional(),

		// Publishing/legal
		label: z.array(z.string()).optional(),
		publisher: z.array(z.string()).optional(),
		copyright: z.string().optional(),
		license: z.string().optional(),
		encodedby: z.string().optional(),
		encodersettings: z.string().optional(),

		// Descriptions/comments
		grouping: z.string().optional(),
		subtitle: z.array(z.string()).optional(),
		description: z.array(z.string()).optional(),
		longDescription: z.string().optional(),
		discsubtitle: z.array(z.string()).optional(),
		comment: z
			.array(
				z
					.object({
						descriptor: z.string().optional(),
						language: z.string().optional(),
						text: z.string().optional(),
					})
					.strict(),
			)
			.optional(),

		// Musical properties
		bpm: z.number().optional(),
		mood: z.string().optional(),
		key: z.string().optional(),

		// Release info
		media: z.string().optional(),
		catalognumber: z.array(z.string()).optional(),
		releasestatus: z.string().optional(),
		releasetype: z.array(z.string()).optional(),
		releasecountry: z.string().optional(),
		script: z.string().optional(),
		language: z.string().optional(),

		// Identifiers
		barcode: z.string().optional(),
		isrc: z.array(z.string()).optional(),
		asin: z.string().optional(),

		// MusicBrainz IDs
		musicbrainz_recordingid: z.string().optional(),
		musicbrainz_trackid: z.string().optional(),
		musicbrainz_albumid: z.string().optional(),
		musicbrainz_artistid: z.array(z.string()).optional(),
		musicbrainz_albumartistid: z.array(z.string()).optional(),
		musicbrainz_releasegroupid: z.string().optional(),
		musicbrainz_workid: z.string().optional(),
		musicbrainz_trmid: z.string().optional(),
		musicbrainz_discid: z.string().optional(),

		// AcoustID/MusicIP
		acoustid_id: z.string().optional(),
		acoustid_fingerprint: z.string().optional(),
		musicip_puid: z.string().optional(),
		musicip_fingerprint: z.string().optional(),

		// Sort fields
		albumsort: z.string().optional(),
		titlesort: z.string().optional(),
		artistsort: z.string().optional(),
		albumartistsort: z.string().optional(),
		composersort: z.string().optional(),

		// Flags
		compilation: z.boolean().optional(),
		gapless: z.boolean().optional(),
		podcast: z.boolean().optional(),

		// URLs/podcast
		website: z.string().optional(),
		podcasturl: z.string().optional(),
		podcastId: z.string().optional(),

		// Totals
		totaltracks: z.string().optional(),
		totaldiscs: z.string().optional(),
		movementTotal: z.number().int().optional(),

		// Classical/movement
		work: z.string().optional(),
		movement: z.string().optional(),
		movementIndex: z
			.object({ no: z.number().nullable(), of: z.number().nullable() })
			.optional(),

		// Rating
		rating: z
			.array(
				z
					.object({
						source: z.string().optional(),
						rating: z.number().optional(),
					})
					.strict(),
			)
			.optional(),

		// Lyrics
		lyrics: z
			.array(
				z
					.object({
						descriptor: z.string().optional(),
						language: z.string().optional(),
						contentType: z.number().int().optional(),
						timeStampFormat: z.number().int().optional(),
						text: z.string().optional(),
						syncText: z
							.array(
								z
									.object({
										text: z.string(),
										timestamp: z.number().optional(),
									})
									.strict(),
							)
							.optional(),
					})
					.strict(),
			)
			.optional(),

		// ReplayGain
		replaygain_track_gain_ratio: z.number().optional(),
		replaygain_track_peak_ratio: z.number().optional(),
		replaygain_track_gain: z
			.object({ ratio: z.number(), dB: z.number() })
			.strict()
			.optional(),
		replaygain_track_peak: z
			.object({ ratio: z.number(), dB: z.number() })
			.strict()
			.optional(),
		replaygain_album_gain: z
			.object({ ratio: z.number(), dB: z.number() })
			.strict()
			.optional(),
		replaygain_album_peak: z
			.object({ ratio: z.number(), dB: z.number() })
			.strict()
			.optional(),
		replaygain_undo: z
			.object({ leftChannel: z.number(), rightChannel: z.number() })
			.strict()
			.optional(),
		replaygain_track_minmax: z.array(z.number()).optional(),
		replaygain_album_minmax: z.array(z.number()).optional(),

		// Discogs
		discogs_artist_id: z.array(z.number()).optional(),
		discogs_release_id: z.number().optional(),
		discogs_label_id: z.number().optional(),
		discogs_master_release_id: z.number().optional(),
		discogs_votes: z.number().optional(),
		discogs_rating: z.number().optional(),

		// TV
		tvShow: z.string().optional(),
		tvShowSort: z.string().optional(),
		tvSeason: z.number().int().optional(),
		tvEpisode: z.number().int().optional(),
		tvEpisodeId: z.string().optional(),
		tvNetwork: z.string().optional(),

		// iTunes / media type
		stik: z.number().int().optional(),
		hdVideo: z.number().int().optional(),
		showMovement: z.boolean().optional(),

		// Podcast categories
		category: z.array(z.string()).optional(),
		keywords: z.array(z.string()).optional(),

		// Misc
		notes: z.array(z.string()).optional(),
		originalalbum: z.string().optional(),
		originalartist: z.string().optional(),
		averageLevel: z.number().optional(),
		peakLevel: z.number().optional(),
		"performer:instrument": z.array(z.string()).optional(),
	})
	.strict();

const formatSchema = z
	.object({
		duration: z.number().min(0).max(1000000).optional(),
		bitrate: z.number().int().min(0).max(100000000).optional(),
		codec: z.string().max(100).optional(),
		container: z.string().optional(),
		lossless: z.boolean().optional(),
		numberOfChannels: z.number().int().optional(),
		bitsPerSample: z.number().int().optional(),
		bitsPerRawSample: z.number().int().optional(),
		sampleRate: z.number().int().optional(),
		numberOfSamples: z.number().int().optional(),
		tool: z.string().optional(),
		trackGain: z.number().optional(),
		trackPeakLevel: z.number().optional(),
		albumGain: z.number().optional(),
		albumPeakLevel: z.number().optional(),
	})
	.strict();

const trackBaseSchema = z
	.object({
		id: nonEmptyStringSchema,
		file: nonEmptyStringSchema,
		filePath: nonEmptyStringSchema,
		selected: selectedSchema,
		collectionIds: collectionIdsSchema,
		common: commonSchema,
		format: formatSchema,
	})
	.strip();

export const trackInputSchema = z.discriminatedUnion("status", [
	trackBaseSchema.extend({ status: z.literal("pending") }),
	trackBaseSchema.extend({ status: z.literal("processing") }),
	trackBaseSchema.extend({ status: z.literal("completed") }),
	trackBaseSchema.extend({
		status: z.literal("failed"),
		reason: nonEmptyStringSchema.min(1).max(1000),
	}),
]);
export const tracksArraySchema = z.array(trackInputSchema);

type TrackInput = z.infer<typeof trackInputSchema>;

export type Metadata = TrackInput;

export type TrackChanges =
	| Partial<Pick<TrackInput, "filePath" | "selected" | "collectionIds">>
	| { status: "pending"; reason?: undefined }
	| { status: "processing"; reason?: undefined }
	| { status: "completed"; reason?: undefined }
	| { status: "failed"; reason: string };

export type ProcessingStatus =
	| { id: string; status: "processing" | "completed" }
	| { id: string; status: "failed"; message: string };
