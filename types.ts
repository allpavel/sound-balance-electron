import type { IAudioMetadata } from "music-metadata";

export type Metadata = IAudioMetadata & { id: string; file: string };

export type NativeValue = {
	data: Uint8Array | string;
	description: string;
	format: string;
	type: string;
};

type AudioMetadata = {
	id: string;
	file: string;
	common: {
		track: { no: number | null; of: number | null };
		disk: { no: number | null; of: number | null };
		/**
		 * Release year
		 */
		year?: number;
		/**
		 * Track title
		 */
		title?: string;
		/**
		 * Track, maybe several artists written in a single string.
		 */
		artist?: string;
		/**
		 * Track artists, aims to capture every artist in a different string.
		 */
		artists?: string[];
		/**
		 * Track album artists
		 */
		albumartist?: string;
		/**
		 * Album title
		 */
		album?: string;
		/**
		 * Date
		 */
		date?: string;
		/**
		 * Original release date
		 */
		originaldate?: string;
		/**
		 * Original release year
		 */
		originalyear?: number;
		/**
		 * Release date
		 */
		releasedate?: string;
		/**
		 * List of comments
		 */
		comment?: {
			descriptor?: string;
			language?: string;
			text?: string;
		}[];
		/**
		 * Genre
		 */
		genre?: string[];
		/**
		 * Embedded album art
		 */
		picture?: {
			/**
			 * Image mime type
			 */
			format: string;
			/**
			 * Image data
			 */
			data: Uint8Array;
			/**
			 * Optional description
			 */
			description?: string;
			/**
			 * Picture type
			 */
			type?: string;
			/**
			 * File name
			 */
			name?: string;
		}[];
		/**
		 * Track composer
		 */
		composer?: string[];
		/**
		 * Synchronized lyrics
		 */
		lyrics?: {
			descriptor?: string;
			language?: string;
			contentType: {
				other: 0;
				lyrics: 1;
				text: 2;
				movement_part: 3;
				events: 4;
				chord: 5;
				trivia_pop: 6;
			};
			timeStampFormat: {
				notSynchronized0: 0;
				mpegFrameNumber: 1;
				milliseconds: 2;
			};
			/**
			 * Un-synchronized lyrics
			 */
			text?: string;
			/**
			 * Synchronized lyrics
			 */
			syncText: {
				text: string;
				timestamp?: number;
			}[];
		}[];
		/**
		 * Album title, formatted for alphabetic ordering
		 */
		albumsort?: string;
		/**
		 * Track title, formatted for alphabetic ordering
		 */
		titlesort?: string;
		/**
		 * The canonical title of the work
		 */
		work?: string;
		/**
		 * Track artist, formatted for alphabetic ordering
		 */
		artistsort?: string;
		/**
		 * Album artist, formatted for alphabetic ordering
		 */
		albumartistsort?: string;
		/**
		 * Composer, formatted for alphabetic ordering
		 */
		composersort?: string;
		/**
		 * Lyricist(s)
		 */
		lyricist?: string[];
		/**
		 * Writer(s)
		 */
		writer?: string[];
		/**
		 * Conductor(s)
		 */
		conductor?: string[];
		/**
		 * Remixer(s)
		 */
		remixer?: string[];
		/**
		 * Arranger(s)
		 */
		arranger?: string[];
		/**
		 * Engineer(s)
		 */
		engineer?: string[];
		/**
		 * Publisher(s)
		 */
		publisher?: string[];
		/**
		 * Producer(s)
		 */
		producer?: string[];
		/**
		 * Mix-DJ(s)
		 */
		djmixer?: string[];
		/**
		 * Mixed by
		 */
		mixer?: string[];
		technician?: string[];
		label?: string[];
		grouping?: string;
		subtitle?: string[];
		description?: string[];
		longDescription?: string;
		discsubtitle?: string[];
		totaltracks?: string;
		totaldiscs?: string;
		movementTotal?: number;
		compilation?: boolean;
		rating?: {
			/**
			 * Rating source, could be an e-mail address
			 */
			source?: string;
			/**
			 * Rating [0..1]
			 */
			rating?: number;
		}[];
		bpm?: number;
		/**
		 * Keywords to reflect the mood of the audio, e.g. 'Romantic' or 'Sad'
		 */
		mood?: string;
		/**
		 * Release format, e.g. 'CD'
		 */
		media?: string;
		/**
		 * Release catalog number(s)
		 */
		catalognumber?: string[];
		/**
		 * TV show title
		 */
		tvShow?: string;
		/**
		 * TV show title, formatted for alphabetic ordering
		 */
		tvShowSort?: string;
		/**
		 * TV season title sequence number
		 */
		tvSeason?: number;
		/**
		 * TV Episode sequence number
		 */
		tvEpisode?: number;
		/**
		 * TV episode ID
		 */
		tvEpisodeId?: string;
		/**
		 * TV network
		 */
		tvNetwork?: string;
		podcast?: boolean;
		podcasturl?: string;
		releasestatus?: string;
		releasetype?: string[];
		releasecountry?: string;
		script?: string;
		language?: string;
		copyright?: string;
		license?: string;
		encodedby?: string;
		encodersettings?: string;
		gapless?: boolean;
		barcode?: string; // ToDo: multiple??
		// International Standard Recording Code
		isrc?: string[];
		asin?: string;
		musicbrainz_recordingid?: string;
		musicbrainz_trackid?: string;
		musicbrainz_albumid?: string;
		musicbrainz_artistid?: string[];
		musicbrainz_albumartistid?: string[];
		musicbrainz_releasegroupid?: string;
		musicbrainz_workid?: string;
		musicbrainz_trmid?: string;
		musicbrainz_discid?: string;
		acoustid_id?: string;
		acoustid_fingerprint?: string;
		musicip_puid?: string;
		musicip_fingerprint?: string;
		website?: string;
		"performer:instrument"?: string[];
		averageLevel?: number;
		peakLevel?: number;
		notes?: string[];
		originalalbum?: string;
		originalartist?: string;
		// Discogs:
		discogs_artist_id?: number[];
		discogs_release_id?: number;
		discogs_label_id?: number;
		discogs_master_release_id?: number;
		discogs_votes?: number;
		discogs_rating?: number;

		/**
		 * Track gain ratio [0..1]
		 */
		replaygain_track_gain_ratio?: number;
		/**
		 * Track peak ratio [0..1]
		 */
		replaygain_track_peak_ratio?: number;

		/**
		 * Track gain ratio
		 */
		replaygain_track_gain?: {
			/**
			 * [0..1]
			 */
			ratio: number;

			/**
			 * Decibel
			 */
			dB: number;
		};
		/**
		 * Track peak ratio
		 */
		replaygain_track_peak?: {
			/**
			 * [0..1]
			 */
			ratio: number;
			/**
			 * Decibel
			 */
			dB: number;
		};
		/**
		 * Album gain ratio
		 */
		replaygain_album_gain?: {
			/**
			 * [0..1]
			 */
			ratio: number;
			/**
			 * Decibel
			 */
			dB: number;
		};
		/**
		 * Album peak ratio
		 */
		replaygain_album_peak?: {
			/**
			 * [0..1]
			 */
			ratio: number;
			/**
			 * Decibel
			 */
			dB: number;
		};
		/**
		 * minimum & maximum global gain values across a set of files scanned as an album
		 */
		replaygain_undo?: {
			leftChannel: number;
			rightChannel: number;
		};

		/**
		 * minimum & maximum global gain values across a set of file
		 */
		replaygain_track_minmax?: number[];

		/**
		 * minimum & maximum global gain values across a set of files scanned as an album
		 */
		replaygain_album_minmax?: number[];

		/**
		 * The initial key of the music in the file, e.g. "A Minor".
		 * Ref: https://docs.microsoft.com/en-us/windows/win32/wmformat/wm-initialkey
		 */
		key?: string;

		/**
		 * Podcast Category
		 */
		category?: string[];
		/**
		 * iTunes Video Quality
		 *
		 * 2: Full HD
		 * 1: HD
		 * 0: SD
		 */
		hdVideo?: number;
		/**
		 * Podcast Keywords
		 */
		keywords?: string[];
		/**
		 * Movement
		 */
		movement?: string;
		/**
		 * Movement Index/Total
		 */
		movementIndex: { no: number | null; of: number | null };
		/**
		 * Podcast Identifier
		 */
		podcastId?: string;
		/**
		 * Show Movement
		 */
		showMovement?: boolean;
		/**
		 * iTunes Media Type
		 *
		 * 1: Normal
		 * 2: Audiobook
		 * 6: Music Video
		 * 9: Movie
		 * 10: TV Show
		 * 11: Booklet
		 * 14: Ringtone
		 *
		 * https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata#user-content-media-type-stik
		 */
		stik?: number;
	};
};

export type GeneralSettings = {
	// ===== GLOBAL OPTIONS =====
	/** Overwrite output files without prompt (-y) */
	outputDirectoryPath: string;
	/** Overwrite output files without prompt (-y) */
	overwrite: boolean;
	/** Fail if output file exists (-n) */
	noOverwrite: boolean;
	/** Set stats update interval in seconds (-stats_period) */
	statsPeriod: number;

	// ===== AUDIO ENCODING =====
	/** Audio codec (e.g., 'libmp3lame', 'flac', 'copy') (-c:a) */
	audioCodec: string;
	/** Audio quality (VBR scale, 0-9 for MP3) (-q:a) */
	audioQuality: string | number;

	// ===== AUDIO PROCESSING =====
	/** Audio filter chain (e.g., 'volume=0.8, loudnorm') (-af) */
	audioFilter: string;
	/** Recast media type when needed (-recast_media) */
	recastMedia: boolean;
};

export type TrackSettings = {
	// ===== GLOBAL OPTIONS =====
	/** Overwrite output files without prompt (-y) */
	outputDirectoryPath: string;
	/** Overwrite output files without prompt (-y) */
	overwrite?: boolean;
	/** Fail if output file exists (-n) */
	noOverwrite?: boolean;
	/** Set stats update interval in seconds (-stats_period) */
	statsPeriod?: number;

	// ===== INPUT OPTIONS =====
	/** Seek to position in input (hh:mm:ss.mmm) (-ss input) */
	startTime?: string;
	/** Limit input duration (hh:mm:ss.mmm) (-t input) */
	inputDuration?: string;
	/** Time offset for sync adjustment (-itsoffset) */
	timeOffset?: string;
	/** Number of input loops (-1=infinite) (-stream_loop) */
	streamLoop?: number;
	/** Max channels for layout guessing (-guess_layout_max) */
	guessLayoutMax?: number;

	// ===== OUTPUT OPTIONS =====
	/** Output duration (hh:mm:ss.mmm) (-t output) */
	outputDuration?: string;
	/** Disable audio recording (-an output) */
	noAudio?: boolean;
	/** Disable data streams (subtitles/chapters) (-dn) */
	disableDataStreams?: boolean;

	// ===== AUDIO ENCODING =====
	/** Audio codec (e.g., 'libmp3lame', 'flac', 'copy') (-c:a) */
	audioCodec?: string;
	/** Audio quality (VBR scale, 0-9 for MP3) (-q:a) */
	audioQuality?: string | number;
	/** Audio frame count limit (-frames:a) */
	audioFrameCount?: number;
	/** Audio tag/fourcc (e.g., 'mp4a') (-atag) */
	audioTag?: string;

	// ===== AUDIO PARAMETERS =====
	/** Audio sample rate (Hz) (-ar) */
	audioSampleRate?: number;
	/** Audio channel count (-ac) */
	audioChannels?: number;
	/** Channel layout (e.g., 'stereo', '5.1') (-channel_layout) */
	channelLayout?:
		| "mono"
		| "stereo"
		| "2.1"
		| "3.0"
		| "3.1"
		| "4.0"
		| "4.1"
		| "5.0"
		| "5.1"
		| "6.1"
		| "7.1";
	/** Audio sample format (e.g., 's16p', 'fltp') (-sample_fmt) */
	audioSampleFormat?:
		| "u8"
		| "s16"
		| "s32"
		| "flt"
		| "dbl"
		| "u8p"
		| "s16p"
		| "s32p"
		| "fltp"
		| "dblp";

	// ===== AUDIO PROCESSING =====
	/** Audio filter chain (e.g., 'volume=0.8, loudnorm') (-af) */
	audioFilter?: string;
	/** Recast media type when needed (-recast_media) */
	recastMedia?: boolean;

	// ===== METADATA & ART =====
	/** Top-level metadata (title, artist, etc.) (-metadata) */
	metadata?: AudioMetadata;
	/** Embed album art file (-attach) */
	albumArt?: string;
	/** Mark attached stream as album art (-disposition:v:0 attached_pic) */
	isAlbumArt?: boolean;
};

export type Settings = {
	// // ===== GLOBAL OPTIONS =====
	// /** Overwrite output files without prompt (-y) */
	// outputDirectoryPath: string;
	// /** Overwrite output files without prompt (-y) */
	// overwrite?: boolean;
	// /** Fail if output file exists (-n) */
	// noOverwrite?: boolean;
	// /** Set stats update interval in seconds (-stats_period) */
	// statsPeriod?: number;

	// ===== INPUT OPTIONS =====
	/** Seek to position in input (hh:mm:ss.mmm) (-ss input) */
	startTime?: string;
	/** Limit input duration (hh:mm:ss.mmm) (-t input) */
	inputDuration?: string;
	/** Time offset for sync adjustment (-itsoffset) */
	timeOffset?: string;
	/** Number of input loops (-1=infinite) (-stream_loop) */
	streamLoop?: number;
	/** Max channels for layout guessing (-guess_layout_max) */
	guessLayoutMax?: number;

	// ===== OUTPUT OPTIONS =====
	/** Output duration (hh:mm:ss.mmm) (-t output) */
	outputDuration?: string;
	/** Disable audio recording (-an output) */
	noAudio?: boolean;
	/** Disable data streams (subtitles/chapters) (-dn) */
	disableDataStreams?: boolean;

	// ===== AUDIO ENCODING =====
	/** Audio codec (e.g., 'libmp3lame', 'flac', 'copy') (-c:a) */
	audioCodec?: string;
	/** Audio quality (VBR scale, 0-9 for MP3) (-q:a) */
	audioQuality?: string | number;
	/** Audio frame count limit (-frames:a) */
	audioFrameCount?: number;
	/** Audio tag/fourcc (e.g., 'mp4a') (-atag) */
	audioTag?: string;

	// ===== AUDIO PARAMETERS =====
	/** Audio sample rate (Hz) (-ar) */
	audioSampleRate?: number;
	/** Audio channel count (-ac) */
	audioChannels?: number;
	/** Channel layout (e.g., 'stereo', '5.1') (-channel_layout) */
	channelLayout?:
		| "mono"
		| "stereo"
		| "2.1"
		| "3.0"
		| "3.1"
		| "4.0"
		| "4.1"
		| "5.0"
		| "5.1"
		| "6.1"
		| "7.1";
	/** Audio sample format (e.g., 's16p', 'fltp') (-sample_fmt) */
	audioSampleFormat?:
		| "u8"
		| "s16"
		| "s32"
		| "flt"
		| "dbl"
		| "u8p"
		| "s16p"
		| "s32p"
		| "fltp"
		| "dblp";

	// // ===== AUDIO PROCESSING =====
	// /** Audio filter chain (e.g., 'volume=0.8, loudnorm') (-af) */
	// audioFilter?: string;
	// /** Recast media type when needed (-recast_media) */
	// recastMedia?: boolean;

	// ===== METADATA & ART =====
	/** Top-level metadata (title, artist, etc.) (-metadata) */
	metadata?: AudioMetadata;
	/** Embed album art file (-attach) */
	albumArt?: string;
	/** Mark attached stream as album art (-disposition:v:0 attached_pic) */
	isAlbumArt?: boolean;
};

export type Data = {
	tracks: Metadata[];
	settings: GeneralSettings;
};
