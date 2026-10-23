# ADR-0002 — Asymmetric duplicate policy (filePath first-wins vs id hard-reject)

- **Status:** Accepted
- **Date:** 2026-10-14
- **Resolves:** PRC-3 (INV-8 policy gap)

## Context

The import pipeline (`addMany`) receives scanner output that may contain
case-variant duplicates of the same file (e.g., `"C:/A.MP3"` and `"c:/a.mp3"`
on Windows/macOS). After F-01/F-09 wired `filePathSchema` into
`trackBaseSchema`, these collapse onto a single normalized key at the schema
boundary. The pipeline must decide how to handle them within one payload.

Two kinds of "duplicate" exist:

1. **filePath duplicates** — case-variant or exact, from scanner noise
   (symlink re-resolution, re-scans, case-renames).
2. **id duplicates** — two ingestion tracks claiming the same primary key.

## Decision

**Asymmetric policy:**

- **filePath duplicates → first-wins + `skipped`** (`dedupeByFilePath`):
  keep the first occurrence, fold the rest into the `skipped` lane. This
  tolerates noisy scanner output without aborting the import or losing data.
- **id duplicates → hard `ConflictError`** (`assertBatchUniqueness` on the
  `id` key): two tracks claiming the same primary key is a genuine integrity
  violation, not a case-folding artifact. It must not be silently folded.

## Alternatives rejected

1. **Strict ConflictError for both** (the pre-F-01 behavior): aborts the
   whole import on a case-variant filePath collision — unacceptable for
   scanner output (a single symlink dup kills a 10 000-track import).
2. **First-wins for both**: silently folds id collisions (data loss — the
   second track's metadata overwrites the first's without warning).

## Interaction with schema-level normalization

`filePathSchema` (in `trackBaseSchema`) normalizes `filePath` at the
schema boundary (F-01/F-09). `dedupeByFilePath` operates on the
already-normalized values — the precondition is enforced, not aspirational.
The `id` field is not normalized (it's a UUIDv7 primary key — no
case-folding concern).

## Migration question

F-02 is accepted-risk (no migration shipped — the app has no legacy data).
If production data accumulates and a normalization policy change requires
a migration, the v3+ migration must backfill normalized `filePath` values
and collision-merge per the F-02 policy. This ADR's first-wins decision
does not affect the migration (the migration operates on already-stored
rows, not on the in-payload dedupe).

## See also

- `dedupeByFilePath` JSDoc (links here)
- ADR-0001 (filePath normalization & canonical casing policy)
