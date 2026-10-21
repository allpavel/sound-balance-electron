# ADR-0001 filePath Normalization

- **Status:** Accepted
- **Date:** 2026-10-06
- **Resolves:** F-02

## Amendment 1

**Revises:** §4 "Canonical casing (F-10)" sequencing.

On implementation analysis, F-02's scope (resolve legacy duplicates so the
invariant holds for pre-existing databases) is distinct from F-10's
`filePathKey` display-casing design. The latter requires re-architecting
the schema (`filePath` preserved + derived `filePathKey`), the DB index
(`&filePath` → `&filePathKey`), and every `filePath`-matching consumer
(`fetchExistingTrackKeys`, `processBatch`, `dedupeByFilePath`,
`assertBatchUniqueness`) plus the `Metadata`/`IngestionMetadata` types and
`makeTrack`. Conflating that with F-02's one-time migration would bloat
the upgrade and couple two independent concerns.

**Decision:** F-02 implements **normalize-in-place** (the review's own
recommendation): the v3 upgrade rewrites every legacy `filePath` to its
normalized form and collision-merges case-variant duplicates per the
documented policy (survivor = lowest id / earliest UUIDv7; union
`collectionIds`; concatenate `common.picture` UUID refs capped at
`MAX_PICTURE_COUNT`; `max statusSeq`; survivor wins all other fields;
loser deleted; loser artwork refs retained via the survivor's picture
array — no orphans).

**Consequence:** legacy display casing is normalized, consistent with new
data under the current F-01 policy (lowercased on Windows/macOS). A future
**v4 migration** (F-10's implementation) can preserve display casing for
*new* data by switching to `filePath`-original + derived `filePathKey`;
legacy data remains normalized (original casing unrecoverable). This is
accepted and documented.

**Defense in depth:** the v3 upgrade validates each row through
`storedTrackSchema` (Zod) rather than casting, skipping corrupted rows;
a one-shot `findDuplicateFilePaths()` integrity sweep is provided for
support/diagnostics to detect a migration that ran with a misconfigured
platform.
