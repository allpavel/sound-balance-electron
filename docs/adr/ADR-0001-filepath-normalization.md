# ADR-0001 filePath Normalization

- **Status:** Proposed
- **Date:** 2026-10-06
- **Scope:** F-02 (legacy data migration) — not yet implemented
- **Supersedes:** N/A
- **Cross-reference:** ADR-0002 §"Migration question" records the
  accepted-risk decision: no migration has shipped. This ADR documents
  the *planned* migration design for when production data accumulates.

## Amendment 1

**Revises:** §4 "Canonical casing (F-10)" sequencing.

On implementation analysis, F-02's scope (resolve legacy duplicates so the
invariant holds for pre-existing databases) is distinct from F-10's
`filePathKey` display-casing design. The latter requires re-architecting
the schema (`filePath` preserved + derived `filePathKey`), the DB index
(`&filePath` → `&filePathKey`), and every `filePath`-matching consumer
(`fetchExistingTrackRefs`, `processBatch`, `dedupeByFilePath`,
`assertBatchUniqueness`) plus the `Metadata`/`IngestionMetadata` types and
`makeTrack`. Conflating that with F-02's one-time migration would bloat
the upgrade and couple two independent concerns.

**Decision:** F-02 **will** implement **normalize-in-place** when triggered:
a future v3 upgrade shall rewrite every legacy `filePath` to its
normalized form and collision-merge case-variant duplicates per the
documented policy (survivor = lowest id / earliest UUIDv7; union
`collectionIds`; concatenate `common.picture` UUID refs capped at
`MAX_PICTURE_COUNT`; `max statusSeq`; survivor wins all other fields;
loser deleted; loser artwork refs retained via the survivor's picture
array — no orphans).

**Current state:** No v3 migration exists. The database is at version 2.
No `findDuplicateFilePaths()` sweep has been implemented. These are
planned deliverables, not shipped artifacts.

**Consequence:** Legacy display casing will be normalized when the
migration ships, consistent with new data under the current F-01 policy
(lowercased on Windows/macOS). A future **v4 migration** (F-10's
implementation) can preserve display casing for *new* data by switching
to `filePath`-original + derived `filePathKey`; legacy data will remain
normalized (original casing unrecoverable). This is accepted and documented.

**Defense in depth (planned):** The v3 upgrade shall validate each row
through `storedTrackSchema` (Zod) rather than casting, skipping corrupted
rows; a one-shot integrity sweep is planned for support/diagnostics to
detect a migration that ran with a misconfigured platform.

## See also

- ADR-0002 — Asymmetric duplicate policy (records the accepted-risk
  "no migration shipped" decision that supersedes any implication
  of immediate implementation here).
