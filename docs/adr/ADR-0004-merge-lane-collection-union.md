# ADR-0004 — Merge-lane collection semantics: append-only union

- **Status:** Accepted
- **Date:** 2026-10-24
- **Resolves:** INV-4 🟠 (P5 Post-Refactoring Source Audit §2.1); REC-1 of the Task 1 completion review (closes finding R1, carries A5/REC-5)
- **Decided by:** Project owner — union policy ratified per the audit recommendation ("union recommended"), sign-off recorded by this document (Task 1 close-out instruction, 2026-10-24)
- **Implemented in:** `fix/merge-lane-collection-ids` — `classifyTracks.ts` merge branch (two production statements)

## Context

The import pipeline (`addMany`) merges duplicate tracks by normalized `filePath`. Before
`fix/merge-lane-collection-ids`, the merge branch computed the next collection set exclusively
from the existing row:

```typescript
// classifyTracks.ts — merge branch, PRE-FIX (INV-4)
const nextCollectionIds = normalizeCollectionIds(
  existingRow.collectionIds, // ← existing row only
  targetCollectionId,
);
```

The incoming track's `collectionIds` were never referenced. A user re-importing a track whose
scanner metadata carries `collectionIds: ["all", "rock", "favorites"]` against an existing row of
`["all"]` with target `"mix1"` produced `["all", "mix1"]` — the `"rock"` and `"favorites"`
memberships were **silently discarded**, while `AddManyResult` still reported the row in the
`merged` lane. Any UI that rendered post-merge memberships from the input payload showed
collections that were never persisted.

The P5 audit gated the remediation on a product-level semantic decision: should a re-import
*add* memberships from the incoming payload, or is the existing row's membership set
authoritative? The pre-fix code answered implicitly (existing-authoritative) without a record.
The project's ADR corpus makes that a process defect in its own right: ADR-0002 records a
comparable policy decision, and ADR-0003 exists precisely because a pinned behavioral contract
was once changed without one (finding C-01). This ADR is that record for the merge lane.

## Decision

The merge-lane collection set is the **append-only union** of the existing row's memberships and
the incoming track's memberships, normalized as a whole:

```typescript
// classifyTracks.ts — merge branch, POST-FIX (this decision)
const combinedCollectionIds = [
  ...existingRow.collectionIds,
  ...track.collectionIds,
];
const nextCollectionIds = normalizeCollectionIds(
  combinedCollectionIds,
  targetCollectionId,
);
```

Normative properties:

1. **Union before normalization.** The combined array is formed first, so every
   `normalizeCollectionIds` invariant applies to the union rather than to the existing row alone.
2. **Insertion-order de-duplication.** Existing IDs keep their stored order; new incoming IDs are
   appended in incoming order; later duplicates fold into the first sighting.
3. **System and target assurance.** `SYSTEM_COLLECTION_ID` and `targetCollectionId` are always
   ensured present (a trailing no-op when already seen).
4. **Skip lane preserved.** If the normalized union is set-equal to the existing row
   (`areCollectionIdsEqual`: length guard + set-equality), the row classifies `skip` and no write
   occurs. Idempotency of re-import is retained.
5. **Scope: `collectionIds` only.** The merge lane does not reconcile incoming metadata (title,
   duration, artwork, …) with the existing row; the existing row's metadata remains authoritative.
   This limitation is now stated in the `addMany` JSDoc (REC-3).

The resulting merge-lane decision table (`T` = target, `E` = existing set, `I` = incoming set):

| Scenario | Pre-fix | Contract (this ADR) | Pinned by |
| --- | --- | --- | --- |
| `T ∉ E`; `I ⊆ E` | merge | merge | pre-existing "matches existing tracks by filePath" pin |
| `T ∈ E`; `I ⊆ E` | skip | skip | Task 1 subset pins (unit + repository) |
| `T ∉ E`; `I ⊄ E` | merge, **incoming IDs discarded** (INV-4) | merge, union persisted | Task 1 union pins (unit + repository) |
| `T ∈ E`; `I ⊄ E` | skip | **merge (lane flip)** | REC-2 lane-flip pins (see §Consequences, "Executable contract") |

## Rationale

- **Re-import intent is additive.** Scanner metadata is evidence that a file *belongs to* the
  collections listed in its payload; absence from the payload is not evidence of removal.
  Membership removal has a dedicated, explicit channel (collection deletion via
  `deleteCollection`, direct track edits). Treating payload omission as an implicit delete would
  couple curated library state to the lossiness of scanner output.
- **DRY.** The union is expressed through the existing `normalizeCollectionIds` /
  `areCollectionIdsEqual` utilities; no new merge machinery exists, and the merge lane now shares
  identical normalization invariants with the add lane. One implementation, two consumers.
- **Zero Trust intact.** Both union inputs are validated sources: database-resident rows written
  exclusively through schema-gated, RI-gated paths, and incoming IDs validated by the strict track
  schema and checked against the `collections` table both preflight (`tracks.collectionIds`
  fast-fail) and in-transaction (`tracks.batch.collectionIds`, authoritative). The union cannot
  mint ghost memberships; growth per track is bounded by the cardinality of the collections table.
- **Recovery-path equivalence.** The documented remediation for a mid-import
  `ImportAbortedError` is "re-run the import". Under the union policy, prior `added` rows
  classify `merged` or `skipped` on the re-run, and the union reproduces exactly the final
  collection set an uninterrupted import would have produced. The convergence is a property of
  this decision, not of the pipeline alone, and is therefore recorded here.

## Alternatives rejected

1. **Existing-authoritative** (status quo ante): incoming memberships discarded. **Rejected** —
   this is the INV-4 defect itself: silent, user-visible data loss on a common workflow
   (re-import with collection assignments), with the `merged` lane giving the UI no signal that
   anything was dropped.
2. **Incoming-authoritative replace** (`track.collectionIds` wins, existing set discarded):
   **Rejected** — destroys curated memberships absent from scanner output; a re-import from a
   lossy metadata source would strip the library state the user built in the app. Strictly worse
   blast radius than alternative 1 (it discards the *authoritative* copy).
3. **Interactive merge (prompt per conflicting re-import):** **Rejected for now** — the import
   pipeline is a batch path with no UI affordance for per-row decisions, and a modal per
   conflicting track would make bulk re-imports unusable. Recorded as a future option only if the
   product later wants per-import override semantics on top of this default.

## Consequences

- **INV-4 closed.** No merge path discards incoming memberships; the `merged` lane reports an
  actual union write. With the executable contract below in place, INV-4 may be reclassified as
  RESOLVED without qualification.
- **Monotonic membership growth (R2) — accepted risk.** The union is additive-only: re-import can
  add memberships but never remove them. Repeated re-imports accumulate stale-but-valid
  references (e.g., collections the user has since "moved the file out of" by other means). This
  drift tolerance is accepted pending the product owner's explicit confirmation; it is bounded by
  the cardinality of the collections table and cannot be driven to unbounded amplification by a
  hostile payload.
- **ZT-3 sweep interplay (REC-5 / audit A5).** The planned v3 reconciliation sweep must define
  its strip policy with this decision in view:
  - a **ghost-only strip** (remove IDs whose collections no longer exist, preserving
    `SYSTEM_COLLECTION_ID`) removes nonexistent references but *cannot* reverse valid-but-unwanted
    accumulation caused by the union's additivity — long-term drift remains a product concern, not
    a data-integrity bug;
  - a broader **user-approved-sets policy** (strip anything not explicitly approved) would
    re-imported tracks re-add memberships on the next import, because the union re-adds on every
    encounter. The two mechanisms must be designed together; the sweep ADR should state which
    policy bounds membership drift and record the interaction with this ADR explicitly.
- **Multi-entry index growth.** `collectionIds` is covered by the multi-entry index used by
  `getAll` (`where("collectionIds").equals(id)`). Monotonic growth increases index size linearly
  with memberships per track. Negligible at current scale; noted for capacity planning and for
  the v3 migration's schema review.
- **Lane flip is intended behavior.** Payloads that bring genuinely new memberships while the
  target is already present now classify `merge` (previously `skip`). Write amplification on
  re-imports is bounded by actual union deltas: unchanged libraries still take the skip lane and
  perform strictly fewer writes than a naive always-update merge would.
- **Self-healing convergence (R5) — documented behavior.** The skip comparator reads the raw
  stored row, so a legacy or externally corrupted row missing `SYSTEM_COLLECTION_ID` (or carrying
  duplicates) converges with one self-healing write on first re-encounter, then stabilizes.
  Accepted; the REC-2 convergence pin makes this observable.
- **Executable contract.** The pins enumerated in `classifyTracks.test.ts` (decision table) and
  `trackRepository.test.ts` (pipeline end-state), including the REC-2 additions — lane flip,
  target-in-incoming fold, internal duplicate folding, merge-lane RI negative path, and
  double-import idempotency — are the contract. Per ADR-0003 discipline, any future refactor must
  keep them green unmodified; a behavior change here requires a new ADR.
- **Numbering.** The P5 register's Task 3 (ZT-3) reserved the filename
  `docs/adr/ADR-0004-reconciliation-sweep.md`. That number is now taken by this ADR; when the
  sweep ADR is authored, it shall take the next free number (`ADR-0005-reconciliation-sweep.md`)
  and the register should be updated accordingly.

## See also

- ADR-0002 — asymmetric duplicate policy: `filePath` first-wins dedupe runs before
  classification, so the *surviving* occurrence drives the union; duplicate payloads fold through
  `normalizeCollectionIds` without reaching the merge lane twice.
- ADR-0003 — `updateMany` error precedence: the pin-contract discipline this ADR adopts
  (decisions are recorded before or with the pins that encode them).
- `classifyTracks.ts` — `ClassificationPlan` decision-table JSDoc (unit-level contract).
- `trackRepository.ts` — `addMany` JSDoc (repository-level contract, including the REC-3
  metadata-reconciliation limitation).
- Task 1 Completion Review (INV-4) — Chapter 5 (R1, R2, R5), Chapter 6.4 (recovery equivalence),
  Chapter 7 (A1, A5), Chapter 9 (REC-1, REC-5).
- P5 Post-Refactoring Source Audit — §2.1 (INV-4), §2.5 (ZT-3), §9 Task 1 table.
