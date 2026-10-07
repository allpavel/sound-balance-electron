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
import {
	MAX_BLOB_IMAGE_SIZE,
	MAX_PATH_LENGTH,
	MAX_PICTURE_COUNT,
	MAX_REASON_LENGTH,
	MAX_YEAR,
	MIN_YEAR,
	NULL_BYTE_PATTERN,
	STATUS_VALUES,
} from "@shared/constants";
import { getPlatform, normalizeFilePath } from "@shared/utils";
import z from "zod";

export const nonEmptyStringSchema = z
	.string()
	.min(1, { error: "Must not be empty" })
	.max(MAX_PATH_LENGTH, {
		error: `Must not exceed ${MAX_PATH_LENGTH} characters`,
	})
	.refine((val) => val.trim().length > 0, {
		error: "Must not be blank",
	})
	.refine((val) => !NULL_BYTE_PATTERN.test(val), {
		error: "Must not contain null bytes",
	});

export const reasonSchema = z
	.string()
	.min(1, { error: "Reason must not be empty" })
	.max(MAX_REASON_LENGTH, {
		error: `Reason must not exceed ${MAX_REASON_LENGTH} characters`,
	})
	.refine((val) => val.trim().length > 0, {
		error: "Reason must not be blank",
	})
	.refine((val) => !NULL_BYTE_PATTERN.test(val), {
		error: "Reason must not contain null bytes",
	});

/**
 * Schema for the `filePath` field with OS-aware case normalization.
 *
 * On case-insensitive filesystems (Windows, macOS), the path is lowercased
 * after all string validations pass. On case-sensitive filesystems (Linux),
 * the path is stored unchanged. This ensures the `&filePath` unique index
 * treats `"C:/A.mp3"` and `"c:/a.MP3"` as the same file on Windows/macOS,
 * while preserving case-distinct paths on Linux.
 *
 * The transform is **idempotent**: normalizing an already-normalized path
 * is a no-op, so re-parsing stored data is safe.
 *
 * @see {@link normalizeFilePath} for the full policy documentation.
 */
export const filePathSchema = nonEmptyStringSchema.transform((path) =>
	normalizeFilePath(path, getPlatform()),
);

export const collectionIdsSchema = z.array(nonEmptyStringSchema);
export const targetCollectionIdSchema = nonEmptyStringSchema;
export const selectedSchema = z.union([z.literal(0), z.literal(1)], {
	error: "Must be 0 or 1",
});
export const statusSchema = z.enum(STATUS_VALUES, {
	error: `Must be one of: ${STATUS_VALUES.join(", ")}`,
});
export const eventSeqSchema = z.number().int().min(1).optional();

export const pictureSchema = z
	.object({
		format: z.string().min(1).max(50),
		data: z
			.instanceof(Blob)
			.or(z.instanceof(Uint8Array))
			.refine(
				(val) =>
					(val instanceof Blob ? val.size : val.byteLength) <=
					MAX_BLOB_IMAGE_SIZE,
				`Album art exceeds maximum allowed size (${MAX_BLOB_IMAGE_SIZE / 1024 / 1024}MB)`,
			),
		description: z.string().max(500).optional(),
		name: z.string().max(255).optional(),
	})
	.strict();

const trackInfoSchema = z
	.object({
		id: z.number().int().optional(),
		type: z.number().int().optional(),
		codecName: z.string().optional(),
		container: z.string().optional(),
		channels: z.number().int().optional(),
		bitsPerSample: z.number().int().optional(),
		sampleRate: z.number().int().optional(),
		duration: z.number().optional(),
		bitRate: z.number().int().optional(),
	})
	.strict();
const chapterSchema = z
	.object({
		title: z.string().optional(),
		startTime: z.number().optional(),
		endTime: z.number().optional(),
	})
	.strict();

const baseCommonSchema = z
	.object({
		artist: z.string().optional(),
		title: z.string().optional(),
		album: z.string().optional(),
		year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional(),
		track: z
			.object({ no: z.number().nullable(), of: z.number().nullable() })
			.optional(),
		disk: z
			.object({ no: z.number().nullable(), of: z.number().nullable() })
			.optional(),
		genre: z.array(z.string()).optional(),
		composer: z.array(z.string()).optional(),
		artists: z.array(z.string()).optional(),
		albumartist: z.string().optional(),
		albumartists: z.array(z.string()).optional(),

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

/**
 * Schema for the `common` metadata fields during ingestion (IPC boundary).
 * Accepts raw binary artwork (`Blob` or `Uint8Array`) and enforces payload
 * size limits before the data reaches the database layer.
 */
const ingestionCommonSchema = baseCommonSchema.extend({
	picture: z.array(pictureSchema).max(MAX_PICTURE_COUNT).optional(),
});

/**
 * Schema for the `common` metadata fields at the storage boundary (IndexedDB).
 * Artwork is represented as an array of string UUIDs referencing the separate
 * `artworks` table, preventing quota bloat and improving query performance.
 */
const storedCommonSchema = baseCommonSchema.extend({
	picture: z.array(z.string()).max(MAX_PICTURE_COUNT).optional(),
});

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
		trackPeakLevel: z.number().nullable().optional(),
		albumGain: z.number().optional(),
		albumPeakLevel: z.number().nullable().optional(),
		tagTypes: z.array(z.string()).optional(),
		trackInfo: z.array(trackInfoSchema).optional(),
		chapters: z.array(chapterSchema).optional(),
		hasAudio: z.boolean().optional(),
		hasVideo: z.boolean().optional(),
		codecProfile: z.string().optional(),
	})
	.strict();

/**
 * Base schema containing track fields that are identical across both
 * ingestion (IPC) and storage (IndexedDB) boundaries.
 * Excludes `common` and `status`, which are composed later to prevent
 * type duplication.
 */
const trackBaseSchema = z
	.object({
		id: nonEmptyStringSchema,
		file: nonEmptyStringSchema,
		filePath: filePathSchema,
		selected: selectedSchema,
		collectionIds: collectionIdsSchema,
		statusSeq: eventSeqSchema,
		format: formatSchema.default({}),
	})
	.strip();

/**
 * Validation schema for untrusted track payloads entering the Renderer process
 * via IPC. Enforces ingestion constraints, including raw binary artwork validation.
 */
export const trackInputSchema = z.discriminatedUnion("status", [
	trackBaseSchema.extend({
		status: z.literal("pending"),
		common: ingestionCommonSchema.default({}),
	}),
	trackBaseSchema.extend({
		status: z.literal("processing"),
		common: ingestionCommonSchema.default({}),
	}),
	trackBaseSchema.extend({
		status: z.literal("completed"),
		common: ingestionCommonSchema.default({}),
	}),
	trackBaseSchema.extend({
		status: z.literal("failed"),
		reason: reasonSchema,
		common: ingestionCommonSchema.default({}),
	}),
]);

/**
 * Validation schema for tracks being persisted to or read from IndexedDB.
 * Enforces storage constraints, verifying that artwork references are stored
 * as string UUIDs pointing to the `artworks` table.
 */
export const storedTrackSchema = z.discriminatedUnion("status", [
	trackBaseSchema.extend({
		status: z.literal("pending"),
		common: storedCommonSchema.default({}),
	}),
	trackBaseSchema.extend({
		status: z.literal("processing"),
		common: storedCommonSchema.default({}),
	}),
	trackBaseSchema.extend({
		status: z.literal("completed"),
		common: storedCommonSchema.default({}),
	}),
	trackBaseSchema.extend({
		status: z.literal("failed"),
		reason: reasonSchema,
		common: storedCommonSchema.default({}),
	}),
]);

export const tracksArraySchema = z.array(trackInputSchema);

const trackChangesFieldsSchema = z
	.object({
		filePath: filePathSchema.optional(),
		selected: selectedSchema.optional(),
		collectionIds: collectionIdsSchema.optional(),
	})
	.strict()
	.superRefine((data, ctx) => {
		const hasAnyField =
			data.filePath !== undefined ||
			data.selected !== undefined ||
			data.collectionIds !== undefined;
		if (!hasAnyField) {
			ctx.addIssue({
				code: "custom",
				message:
					"At least one field (filePath, selected, collectionIds) must be provided",
			});
		}
	});

const trackChangesStatusSchema = z.discriminatedUnion("status", [
	z.object({ status: z.literal("pending") }).strict(),
	z.object({ status: z.literal("processing"), seq: eventSeqSchema }).strict(),
	z.object({ status: z.literal("completed"), seq: eventSeqSchema }).strict(),
	z
		.object({
			status: z.literal("failed"),
			reason: reasonSchema,
			seq: eventSeqSchema,
		})
		.strict(),
]);

/**
 * A partial track mutation: either metadata fields (filePath/selected/
 * collectionIds) or a status transition — not both in one payload.
 */
export const trackChangesSchema = z.union([
	trackChangesFieldsSchema,
	trackChangesStatusSchema,
]);

type InputTrack = z.infer<typeof trackInputSchema>;

type StoredTrack = z.infer<typeof storedTrackSchema>;

export type IngestionMetadata = InputTrack;
export type Metadata = StoredTrack;

export type Picture = z.infer<typeof pictureSchema>;

export type TrackChanges = z.infer<typeof trackChangesSchema>;

export type Status = z.infer<typeof statusSchema>;

export type CollectionId = z.infer<typeof targetCollectionIdSchema>;

export type ProcessingStatus =
	| { id: string; status: "processing" | "completed"; seq?: number }
	| { id: string; status: "failed"; reason: string; seq?: number };
