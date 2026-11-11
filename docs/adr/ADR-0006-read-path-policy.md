# ADR-0006 — Read-path policy: validate at the engine boundary, quarantine-and-continue, fail loud on arguments

- **Status:** Accepted
- **Date:** 2026-11-12
- **Resolves:** R-6 (documentation half, FE-132 Review §9); codifies the U-01
  remediation policy directed by FE-132 §2.3 and shipped in WP-1 / WP-3 / WP-4.
- **Ratification:** Every decision recorded here was already ratified by an
  existing record — FE-132 (U-01 fail-loud + quarantine directive), ADR-0005
  (dual-channel surfacing, accepted 2026-11-06), and ADR-0005 Amendment 1
  (uniform entity coverage, WP-4). This ADR is the codification of that shipped
  contract; its acceptance ratifies the record, not new behavior. The WP-5 DoD
  lifecycle (proposed → accepted) is satisfied by those prior acceptances.
- **Decided by:** Project owner via the FE-132 directive and the WP-1 / WP-4
  close-outs; this document consolidates them into one discoverable contract.
- **Implemented in:** WP-1 (managed surface), WP-3 (guard layering + single
  log-message source), WP-4 (entity coverage + write-path internal read), and
  the WP-5 conformance repair (ticket FE-132-WP5-D1, this change set).

## Context

Before FE-132, the renderer trusted `EntityTable<T>`'s compile-time row promise.
A stored row missing `common` crashed the render (`track.common.year` on a row
without `common` — the U-01 crash class); a sanitizing band-aid (`uniqueTracks`)
dropped blank ids silently and kept structurally corrupt rows that happened to
have valid ids. The failure mode was invisible corruption: rows either crashed
the UI or vanished without a signal.

WP-1 moved the trust boundary to the last layer that sees raw engine data: every
row leaving an IndexedDB store now passes a cheap structural guard; corrupt rows
are quarantined (excluded + logged); invalid *arguments* throw a structured
`TrackValidationError`; and the hook layer converts rejections into typed state
instead of a render-time exception. WP-3 made the schema the canonical invariant
source and centralized the log-message format. WP-4 extended the same pattern to
collections, artworks, and the write path's internal read.

The behavior was observable only as code and console output. Without a record, a
future refactor could "simplify" quarantine back into silence, or collapse the
fail-loud argument gate into a fail-quiet empty result — exactly the ADR-0003
failure mode (a pinned behavioral contract changed without a decision record).
This ADR is that record for the read path itself. ADR-0005 remains the record for
how quarantine is *surfaced* (toast + developer log); this ADR is the record for
what the engine-boundary contract *guarantees*.

## Decision

The read path is **validate → quarantine-and-continue at the data boundary,
fail-loud at the argument boundary**, with six normative properties:

1. **Engine rows are untrusted.** Every row read from `tracks`, `collections`,
   or `artworks` is treated as `unknown` and passed through a cheap structural
   guard before it leaves the repository. The Dexie `EntityTable<T>` type is a
   compile-time promise, not a runtime guarantee (U-01).

2. **Quarantine-and-continue on corrupt data.** A structurally invalid row is
   excluded from the result, its log-safe descriptor is appended to the complete
   `quarantinedIds` list, and exactly one bounded `console.warn` is emitted per
   guarded batch. A clean read emits nothing. A normal miss (absent primary key)
   is silent `undefined` / empty — never a quarantine.

3. **Fail-loud on invalid arguments.** Track surfaces validate primary-key and
   collection-id arguments via `assertValidTrackId`, throwing
   `TrackValidationError` (`context: "id"`, one `invalid_type` root issue).
   The managed hook surface (`useGuardedLiveQuery`) converts that rejection into
   typed failure state; it never reaches render as an exception.

4. **The guard is a projection, not a schema.** `isStructurallyValidTrack` checks
   only the top-level fields consumers dereference directly, plus
   `common.picture` array-ness when present (WP-4). Deep `common` / `format`
   conformance remains `storedTrackSchema`'s responsibility at the sweep/egress
   boundary (ADR-0001 cost model: cheap guard per emission, full parse at sweep).
   The round-trip pin in `readGuard.test.ts` mechanically ties guard to schema.

5. **One diagnostic format, one emitter.** `quarantineMessage(scope)` and
   `warnQuarantined(ids, scope)` in `readGuard.ts` are the single sources for the
   message string and the bounded warn payload. All guard modules (tracks,
   collections, artworks) reuse them; no module re-implements the log shape.

6. **Uniform across entities and the write-path internal read.** The same
   guard → quarantine → warn semantics apply to `tracks`, `collections`,
   `artworks`, and `applyGuardedTrackUpdate`'s internal read (ADR-0005
   Amendment 1). A corrupt row encountered during a status update is quarantined
   and the update returns `0` — observably, not silently.

### Caller-reliable contract

What callers **may** rely on:

| Surface | Valid data | Corrupt data | Absent key | Invalid argument |
| --- | --- | --- | --- | --- |
| `tracksRepository.getAll` / `getSelectedTracks` | `GuardedTracks` (`ok` deduped by `id`, last-wins at first-seen position, engine order otherwise) | corrupt rows excluded; complete `quarantinedIds`; one warn | empty `ok` | `TrackValidationError` (`getAll` id gate) |
| `tracksRepository.getById` | `Metadata` by reference | `undefined` + one warn naming the requested id | silent `undefined` | `TrackValidationError` |
| `collectionsRepository.getAllCollections` | `GuardedCollections` | excluded + `quarantinedIds` + one warn | empty `ok` | — (see Known gaps) |
| `collectionsRepository.getCollectionById` | `CollectionType` | `undefined` + one warn | silent `undefined` | — (see Known gaps) |
| `artworksRepository.getByIds` | `GuardedArtworks` | excluded + `quarantinedIds` + one warn | `undefined` bulkGet entries skipped silently | — (see Known gaps) |
| `applyGuardedTrackUpdate` (internal read) | patch applied → `1` | `0` + one warn | silent `0` | `TrackValidationError` upstream |

- `quarantinedIds` is the **complete** list (never truncated); only the *log*
  is capped.
- Valid rows are returned **by reference**, never cloned or mutated.
- Guards never throw on data; argument validation throws at the repository
  boundary and is handled by the managed surface.
- Quarantine is visible in-product: the hook layer lifts `quarantinedIds` into
  `TrackQuarantine` state and a deduped warning toast (ADR-0005). Console-only
  reporting for user-impacting skips is gone.

What callers **may not** rely on:

- **Deep conformance.** The guard does not validate nested `common` / `format`
  internals (beyond `picture` array-ness), string-hygiene constraints, length
  caps, or null-byte rules. The schema owns those at ingestion and sweep.
- **`quarantinedIds` being primary keys.** They are log-safe *descriptors*:
  `"<no-id>"` for unreadable ids, `String(value)` for non-string ids, sanitized
  and length-capped. They are for diagnostics, not lookups.
- **Cross-mount toast dedupe.** The signature gate is per hook instance; the
  stable sonner id collapses same-channel toasts best-effort, not globally.
- **The guard as a schema substitute.** The sweep/egress full parse
  (`storedTrackSchema`) remains the authoritative deep validation (ADR-0001).
- **Empty-string `collectionIds` members being rejected.** The cheap guard
  accepts them (pinned "cheap-guard boundary"); the schema rejects them at the
  write boundary.

### Log schema and truncation limits

Message (single source: `quarantineMessage`):

```ts
[${sanitizeControlChars(scope)}] quarantined structurally invalid rows
```

Payload (single emitter: `warnQuarantined`):

```ts
{ count: quarantinedIds.length, ids: quarantinedIds.slice(0, MAX_DISPLAY_MISSING) }
```

| Field / limit | Value | Source | Attacker-influenced? |
| --- | --- | --- | --- |
| `count` | full quarantined count (uncapped) | `quarantinedIds.length` | count only, never content |
| `ids` entries logged | ≤ `MAX_DISPLAY_MISSING` = **5** | `db/constants` | descriptors only |
| chars per id | ≤ `MAX_LOGGED_ID_LENGTH` = **64** | `readGuard.ts` (single source after WP-5 repair) | yes → sanitized + bounded |
| unreadable id placeholder | `"<no-id>"` | `readGuard.ts` | constant |
| `scope` | sanitized, not length-capped | `quarantineMessage` | **no** — developer-supplied operation tag, never derived from stored data |
| warn frequency | once per guarded batch; silent when zero | `warnQuarantined` | n/a |

Sanitization replaces C0 control characters (U+0000–U+001F) and U+007F with
U+FFFD (`sanitizeControlChars`), neutralizing ANSI/log-injection sequences. The
`String(value)` fallback for non-string ids is safe for engine-sourced values:
IndexedDB uses structured clone, which cannot persist functions, proxies, or
custom `toString` implementations — a hostile `toString` cannot survive storage.

### Executable contract

The pins enumerated below are the contract; per ADR-0003 discipline, any future
refactor must keep them green unmodified. A behavior change here requires a new
ADR or an amendment to this one.

- `readGuard.test.ts` — acceptance/corruption tables, warn-once, 5-entry log cap
  with complete returned list, 64-char id cap, control-char sanitization,
  `<no-id>` placeholder, dedupe semantics, schema↔guard round-trip.
- `entityGuards.test.ts` — collection/artwork acceptance/rejection, quarantine
  partitioning, normal-miss silence, and (WP-5) descriptor sanitization pins.
- `trackRepository.test.ts` — `getAll` / `getById` / `getSelectedTracks`
  quarantine pins against `fake-indexeddb` with raw-table corruption seeding.
- `collectionsRepository.test.ts`, `artworksRepository.test.ts` — engine-level
  corruption injection via the raw table API; quarantine + warn assertions.
- `trackRepositoryUtils.test.ts` — `applyGuardedTrackUpdate` guarded internal
  read: corrupt → `0` + warn; absent → silent `0`; valid → patch applied.
- `readDiagnostics.test.ts`, `useGuardedLiveQuery.test.ts`, `useTracks.test.tsx`,
  `ErrorBoundary.test.tsx` — the managed surface: typed failure state, signature
  dedupe, quarantine toast channels, and the last-resort boundary fallback.

## Rationale

- **The trust boundary belongs at the engine egress.** Pre-FE-132, the first
  "validation" of a corrupt row was a React render crash. Intercepting at the
  last layer that sees raw data means every downstream consumer can rely on the
  structural contract without re-checking.
- **Quarantine ≠ read failure.** A partially usable library is degraded, not
  unavailable. Collapsing the two would misrepresent severity and let one signal
  overwrite the other (ADR-0005). Continuing with valid rows preserves the
  usable majority instead of failing the whole read.
- **Fail-loud arguments, fail-soft data.** An invalid argument is a caller bug
  and must be observable (`TrackValidationError`). A corrupt stored row is an
  environment fault and must not crash the user's library view. The polarity
  split is deliberate and is the core of the U-01 remediation.
- **Cheap guard, authoritative schema.** Per-emission Zod parsing of every row
  would tax the hot path (live queries re-emit on every table mutation). The
  projection guard is O(n) with one `Map`/`Set` lookup per row; the full parse
  stays at the planned sweep (ADR-0001). Drift is insured by the round-trip pin,
  not by hope.
- **Diagnostics are an attack surface.** Every interpolated value is sanitized
  and bounded; the returned list stays complete so the UI can show an accurate
  count while the log stays flood-proof. The scope tag is never attacker-derived.
- **One emitter, one format.** DRY across three guard modules means a wording or
  budget change is a one-edit fix, and tests import the same message builder the
  production code uses (no brittle duplicated literals).

## Alternatives rejected

1. **Fail-quiet empty results on corrupt data** (the pre-FE-132 `uniqueTracks`
   behavior): **Rejected** — restores the invisible-corruption defect U-01 was
   created to fix.
2. **Throw on any corrupt row** (fail the whole read): **Rejected** — one corrupt
   row would make the entire library unavailable; the usable majority is lost.
3. **Full Zod parse per emission:** **Rejected for the hot path** — cost model
   violation (ADR-0001); the sweep/egress boundary owns deep validation. The
   cheap projection + round-trip pin gives the same drift safety at O(n) cost.
4. **Console-only quarantine reporting:** **Rejected** — regresses to U-01
   invisibility for every user who never opens devtools (ADR-0005 alternative 2).
5. **Per-entity log formats:** **Rejected** — DRY violation and brittle test
   coupling; one message builder + one emitter serve all entities.

## Consequences

- **Corrupt rows are skipped, logged, and surfaced.** Accepted: the library is
  degraded but usable; the user sees a warning toast with an accurate count, and
  the developer log carries sanitized descriptors. The quarantine-visibility
  pins in `useTracks.test.tsx` encode this.
- **Argument failures are managed, not crashes.** Accepted: `useGuardedLiveQuery`
  exposes typed failure state; the `ErrorBoundary` is the last resort for
  anything that still throws. Both are pinned.
- **The guard can lag the schema between changes.** Mitigated, not eliminated:
  the round-trip pin fails CI when a schema change invalidates the guard. The
  residual is the window between a schema edit and the pin running — covered by
  the normal test gate.
- **Log budget constants remain duplicated.** `MAX_LOGGED_ID_LENGTH` (64,
  `readGuard.ts`) and `MAX_LOGGED_ERROR_NAME_LENGTH` (64, `shared/constants`)
  are separate budgets. Consolidation is tracked under R-9 / WP-6 (P3); until
  then, the entity guards no longer carry their own copies (WP-5 repair removed
  the four hard-coded `64`s).
- **Numbering.** ADR-0005's Consequences reserved `ADR-0006` for the ZT-3 sweep.
  That number is now taken by this ADR; the sweep ADR shall take the next free
  number (**ADR-0007**) and the P5 register should be updated accordingly — the
  same resolution rule ADR-0005 applied to ADR-0004's reservation.

## Known gaps (each ticketed)

| Gap | Status | Ticket |
| --- | --- | --- |
| Write-path internal read, collections, artworks unguarded | **Closed by WP-4** (ADR-0005 Amendment 1) | FE-132 WP-4 |
| Entity-guard log descriptors unsanitized (violated ADR-0005 §Decision.4) | **Closed by WP-5 conformance repair** | FE-132-WP5-D1 |
| Collections/artworks argument gates absent (empty id → silent miss, not fail-loud) | Open — P3; contract extension needs owner decision (throw vs miss) | FE-132-WP5-D2 |
| `deleteCollection` `modify` callback reads tracks unguarded | Open — separate write-path concern | FE-132 WP-4 follow-up |
| U-08 `blocked` / `versionchange` handlers in `db.ts` | Open — deferred per FE-132 §5; the read-path open-failure leg is already classified as `storage` via `ENGINE_UNAVAILABLE_NAMES` | FE-132 §5 (U-08) |
| Full-parse sweep/egress (`storedTrackSchema` runtime call sites) | Open — planned v3 migration; sweep ADR reserved at ADR-0007 | ADR-0001 Amendment 1 |
| v2 migration reads tracks unguarded | Accepted risk — one-time upgrade over v1-schema-written data | FE-132 WP-4 close-out (recorded) |
| Settings entity uses its own policy (`safeParseSettings` + corruption toast + reset) | Intentional — singleton, reset-on-corrupt; not the quarantine pattern | `settingsRepository.ts` / `settingsMiddleware.ts` (documented) |
| Preload payload validation (`processingResult`) | Open — P3, optional | R-14 |
| Test hardening (T-2/T-3/T-5, R-9 constant consolidation, R-13 settingsSlice parse branch) | Open — P1 (R-2) / P3 (rest) | FE-132 WP-6 |

## See also

- **FE-132** §2.3 (U-01, U-09, N-01) and §12 (WP-1…WP-6) — the directive and work
  packages this ADR codifies.
- **ADR-0005** — quarantine surfacing (dual-channel toast + log); this ADR owns
  the engine-boundary contract, ADR-0005 owns the user-facing surface.
- **ADR-0005 Amendment 1** — uniform entity coverage (WP-4).
- **ADR-0003** — the pin-contract discipline (decisions recorded with the pins
  that encode them).
- **ADR-0001 Amendment 1** — the sweep/egress full-parse cost model and the v3
  migration plan (sweep ADR reserved at ADR-0007).
- `readGuard.ts`, `entityGuards.ts`, `readDiagnostics.ts`, `useGuardedLiveQuery.ts`,
  `useTracks.ts`, `ErrorBoundary.tsx` — the implementation surfaces.
