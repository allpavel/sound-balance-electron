# ADR-0003 — `updateMany` error precedence: three-phase validation contract

- **Status:** Accepted
- **Date:** 2026-10-20
- **Resolves:** C-01 (T04-C code review, `T04-C-code-review.md` §4/§11)
- **Amends:** T04-C Definition-of-Done clause "precedence tests from T04-A still green **unchanged**" (consciously overridden for the `updateMany` pins only); the T04-A/F-05 pin contract for `updateMany`
- **Decided by:** Project owner ("we decided … to stay with two-phase `updateMany` instead of interleaved")

## Context

`updateMany` originally validated in a single interleaved pass (per item: shape → id → duplicate → changes), so for payloads with multiple offenders the **first offending item** determined which error surfaced. T04-A pinned that order (three precedence tests) as the safety net for the T04-C uniqueness refactor, and T04-C item 3 permitted a two-phase restructure only "whichever preserves the error precedence pinned by T04-A".

The T04-C implementation adopted a three-phase structure (shape/id → uniqueness → changes), which flips two observable outcomes, and the pins were rewritten to match. The review flagged this as C-01: not because two-phase is wrong, but because a pinned contract was revised without a recorded decision. This ADR is that record.

## Decision

`updateMany` validation is **phase-ordered**; precedence = phase order, and within each phase the first offending item (ascending index) wins:

1. **Phase 1 — structural:** every entry must be a plain object with a non-empty string `id` → `TrackValidationError` (`updates[i]` / `updates[i].id` context).
2. **Phase 2 — cross-item integrity:** ids must be unique across the payload → `ConflictError` (`Updates contains duplicate id: "<key>" at updates[i].id`, sanitized).
3. **Phase 3 — field semantics:** each entry's `changes` must pass `validateTrackChanges` → `TrackValidationError` (`updates[i].changes` context).

Deltas vs. the legacy interleaved order (both now pinned in their new direction):

| Payload | Legacy (interleaved) | Contract (phased) |
| --- | --- | --- |
| `[valid t1, dup t1, malformed@2]` | `ConflictError` | `TrackValidationError` |
| `[{dup, invalid changes}, {dup, valid}]` | `TrackValidationError` | `ConflictError` |
| `[malformed@0, valid, dup]` | `TrackValidationError` | `TrackValidationError` (unchanged) |
| `[valid t1, {t1, invalid changes}]` (intra-item) | `ConflictError` | `ConflictError` (unchanged) |

The four `pins precedence…` / `pins intra-item precedence…` tests in the `updateMany` describe of `trackRepository.test.ts` are the **executable contract**; any future refactor (including T04-D) must keep them green unmodified.

## Rationale

- **Predictable, payload-level semantics.** "The whole payload must be structurally sound before cross-item integrity is assessed, and integrity before per-field semantics" is a contract that can be stated in one sentence and reasoned about without tracing loop order. The legacy order was an implementation artifact of a fused loop, never a designed guarantee.
- **Single uniqueness implementation (DRY).** Phase ordering lets `updateMany` reuse `assertBatchUniqueness` directly; preserving the legacy order would require interleaved-compatible machinery (a guard factory or callback hook) solely for backward compatibility.
- **Consumer audit — blast radius is message text only.** The sole UI path (`useTracks.updateManyTracksAsync` → `createMutationState`) normalizes errors generically to `Error` and exposes `error.message`; **no code branches on `ConflictError` vs `TrackValidationError` (type or `code`) for `updateMany` outcomes.** For the rare multi-fault payload, the user simply sees a different — still actionable — first error.

## Alternatives rejected

1. **Interleaved-compatible guard** (`createUniquenessGuard({label, context, fieldPath}) → check(item, index)`, with `assertBatchUniqueness` re-expressed over it): preserves the legacy order exactly, keeps the original DoD wording intact, and remains a single implementation. Technically viable (~0.5 day). **Rejected by owner decision**: it perpetuates an accidental ordering as a contract and constrains `updateMany`'s design for a compatibility guarantee no consumer needs.
2. **Fault-aggregating validation** (collect all phase-1/2/3 faults, report once): best UX for multi-fault payloads but a larger contract change (error shape, UI rendering); out of scope — recorded as a future option.

## Consequences

- The rewritten/new pins stand as the contract; the T04-A DoD clause is amended **for these pins only** — the mapper (34 cases), rollback, commit-phase, and `addMany` precedence pins are unaffected and remain "green unchanged" obligations (they still gate T04-D).
- The duplicate-id message format (quoted key + positional suffix, `context` prefix preserved) is ratified as part of this contract (review finding C-09 closed by this record).
- No data migration and no UI change required (error ordering is not persisted; no type-based consumers).
- If a future consumer needs deterministic multi-fault reporting, revisit Alternative 2 (aggregate validation) rather than reintroducing interleaving.

## Amendment 1 — the phased contract extends to `addMany` (2026-10-25)

- **Status:** Accepted
- **Resolves:** Task 2 completion-audit residual P3 (INV-5 codification; AR-11): the
  `addMany` precedence ruling previously lived only in the `addMany` JSDoc.
`addMany` shares the phase-ordered validation model:

1. **Phase 1 — structural:** every entry passes `validateAndParseTracks`
   (`trackInputSchema`) → `TrackValidationError` (`tracks[i]` context). This phase
   runs **batch-wide to completion** before any database work, so it wins regardless
   of index ordering.
2. **Phase 2 — cross-item integrity:** `runPreflightChecks` — payload cap, storage
   headroom, `id` uniqueness (`ConflictError`), `filePath` first-wins dedupe
   (ADR-0002), referential integrity (`ReferentialIntegrityError`).
Precedence = phase order; within a phase, the first offending item (ascending
index) wins. A batch containing both a schema-invalid track and a duplicate `id`
therefore always surfaces `TrackValidationError` first — structurally guaranteed
by the pipeline order (validate → preflight → execute), not merely observed.
Blast radius is message text only: no consumer branches on the affected error
types for `addMany` outcomes (same consumer-audit reasoning as the `updateMany`
ruling above). The executable contract is the two permutation pins plus the
all-valid control test in `describe("tracksRepository") → addMany`
(`trackRepository.test.ts`); any future refactor must keep them green unmodified.
This amendment records an existing, already-pinned property; it changes no
behavior and does not touch the ADR-0004 merge-lane semantics that sit downstream
of phase 2.

## See also

- ADR-0002 (asymmetric duplicate policy — `filePath` first-wins vs `id` hard-reject; this ADR keeps the `id` hard-reject semantics, only reordering when it fires)
- `T04-C-code-review.md` — C-01 (finding + ratification path), C-09 (message format), §11 (Revision 1)
- `trackRepository.test.ts` — the four precedence pins in `describe("updateMany")`
- ADR-0004 (merge-lane collection union — downstream of phase 2; the merge lane's
  skip/merge decision presupposes this ADR's phase-ordered error surface)
  