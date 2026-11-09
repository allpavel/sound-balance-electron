# ADR-0005 — Quarantine surfacing policy: dedicated dual channel (warning toast + developer log)

- **Status:** Accepted
- **Date:** 2026-11-04
- **Resolves:** W1-5 (WP-1 review, P3 — the dual-channel quarantine toast UX required product sign-off); complements the W1-2 (developer-log signature dedup) and W1-4 (stable toast identity) remediations
- **Decided by:** Project owner — ratified at the WP-1 (FE-132) review remediation close-out, 2026-11-06
- **Implemented in:** WP-1 changeset + WP-1 review remediation — `src/renderer/src/db/utils/readGuard.ts` (bounded quarantine `console.warn`), `src/renderer/src/db/utils/readDiagnostics.ts` (`quarantineSignature`), `src/renderer/src/hooks/useTracks.ts` (quarantine `useDedupedToast` channels, `TRACK_READ_TOAST_IDS`), `src/renderer/src/hooks/useDedupedToast.ts` (per-channel dedup), `src/renderer/src/store/middleware/collectionMiddleware.ts` (stable sonner identity, W1-4)

## Context

The WP-1 guarded read path produces a third outcome besides "data" and "read failure": the read
succeeds but the structural read guard quarantined corrupt rows (the U-01 lineage — rows that
would previously have crashed the renderer or been dropped silently). The WP-1 changeset surfaces
that state through two independent channels: a warning-grade toast per read scope with its own
stable sonner identity, and a bounded `console.warn` for developers. The WP-1 review (W1-5)
flagged that no ADR recorded this split as intended policy. Without a record, a future refactor
could "simplify" quarantine into the read-failure error toast — or back into silence — exactly
the ADR-0003 failure mode (a pinned behavioral contract changed without a decision record).
Two adjacent review findings shape the policy: W1-2 (the developer log needed signature-based
dedup, mirrored by the toast channel's per-signature dedup) and W1-4 (toast channels need stable
sonner identities so repeat reports collapse instead of stacking).

## Decision

Quarantine surfacing is **dual-channel by design**, with five normative properties:

1. **Dedicated warning channel per read scope.** Quarantined records surface as a warning-grade
   toast keyed by a stable sonner identity `tracks-quarantine:<scope>` (`TRACK_READ_TOAST_IDS`),
   so repeated quarantines *update* the open toast rather than stacking (W1-4). Warning — not
   error — because the data itself is usable; the library is degraded, not unavailable.
2. **Read failures keep the error channel.** Read failures use the disjoint identities
   `tracks-read:<scope>`. The two states are orthogonal (data present vs. data unavailable) and
   must never collapse into each other or overwrite one another's toasts.
3. **Tamper-resistant signature dedup.** Both channels dedup by the quarantine signature, which
   JSON-encodes the sanitized quarantined-id list (`quarantineSignature`): a crafted id containing
   a naive join delimiter could otherwise forge the identity of a different quarantine set and
   freeze the toast on a stale count. The signature is opaque — compared for equality only, never
   parsed. A changed set re-raises; a clean read (count 0 → `null` signature) re-arms the channel.
4. **Developer channel stays bounded.** The `console.warn` reports the quarantined count plus
   sanitized, per-id length-capped descriptors only (log-injection / log-flooding defense,
   consistent with every other diagnostic channel in this codebase).
5. **No inline UI in this scope.** Table badges, banners, or per-row markers for quarantined rows
   are deferred, not rejected (see Consequences) — the toast/log pair is the complete WP-1 surface.

## Rationale

- **Quarantine ≠ read failure.** Merging the two would misrepresent severity (an error toast for
  partially usable data) and, sharing one sonner identity, would let a quarantine report and a
  read-failure report overwrite each other on the same channel — losing one of the two signals
  precisely when both are true.
- **Silence is the defect being guarded against.** U-01's core harm was invisible corruption:
  corrupt rows either crashed the UI or vanished. A console-only surface would restore that
  invisibility for every user who never opens devtools.
- **Zero Trust extends to toast identity.** Quarantined ids are descriptors of untrusted rows read
  back from IndexedDB; any identity scheme derived from them must tolerate hostile content, hence
  the JSON encoding and the sanitize-and-bound rule on everything that reaches either channel.
- **Dedup parity.** The user-facing and developer channels now share one dedup contract
  (once-per-signature, re-arm on clean read), so neither channel can flood while the other stays
  quiet — closing W1-2's asymmetry finding.

## Alternatives rejected

1. **Fold quarantine into the read-failure error toast:** **Rejected** — wrong severity, identity
   collision with the error channel, and it hides partial success (the read did return data).
2. **Console-only (no toast):** **Rejected** — regresses to the U-01 invisibility defect the read
   guard exists to fix.
3. **One toast per quarantined row:** **Rejected** — unbounded flooding; a hand-corrupted or
   hostile store could open hundreds of toasts and starve every other channel.
4. **Inline per-row badge/banner instead of a toast:** **Deferred, not rejected** — real UX value,
   but out of WP-1 scope; tracked as a follow-up work order (see Consequences) so it is neither
   dropped nor smuggled in without a decision.

## Consequences

- **Repeats with an unchanged set stay on one collapsed toast.** Accepted: an unchanged quarantine
  set is not new information; the *change* of the set is the signal. The quarantine-visibility
  pins in `useTracks.test.tsx` (corrupt row replaced → warning re-raises, unchanged row count →
  no re-raise) are the executable contract.
- **Clean-read re-arm is observable.** Removing the corrupt row and quarantining a different one
  re-raises exactly once — pinned by the same tests.
- **Inline quarantine UX is deferred to a work order** (FE-132 follow-up, WP-2 lane): surfacing
  quarantined rows inline in the track table. It must not be implemented ad hoc; it requires its
  own decision slice.
- **Numbering.** ADR-0004's Consequences section reserved `ADR-0005-reconciliation-sweep.md` for
  the ZT-3 sweep. That number is now taken by this ADR; when the sweep ADR is authored it shall
  take the next free number (`ADR-0006-reconciliation-sweep.md`) and the P5 register should be
  updated accordingly — the same resolution rule ADR-0004 itself applied to ADR-0003's
  reservation.

  ## Amendment 1 — Uniform guard policy across all entities (WP-4)

- **Date:** 2026-11-08
- **Resolves:** FE-132 WP-4 (R-5, R-7, R-8)

The quarantine-and-guard policy established by this ADR for track reads
now extends uniformly to **all** IndexedDB entities:

| Entity | Guard module | Repository | Pattern |
| :--- | :--- | :--- | :--- |
| **Tracks** | `readGuard.ts` | `trackRepository.ts` | `guardTracks` / `guardTrack` |
| **Collections** | `entityGuards.ts` | `collectionsRepository.ts` | `guardCollections` / `guardCollection` |
| **Artworks** | `entityGuards.ts` | `artworksRepository.ts` | `guardArtworks` / `guardArtwork` |
| **Track write-path internal read** | `readGuard.ts` | `trackRepositoryUtils.ts` | `guardTrack` inside `applyGuardedTrackUpdate` |
| **`common.picture`** | `readGuard.ts` | *(structural check in `isStructurallyValidTrack`)* | `Array.isArray` when present |

All surfaces share the same semantics: **fail-loud at the argument
boundary, quarantine-and-log at the data boundary, never crash the
render.** The `warnQuarantined` emitter and `quarantineMessage` format
are shared across all guard modules via a single export from
`readGuard.ts`.

## See also

- ADR-0004 — merge-lane collection union; source of the ADR-numbering discipline this ADR had to
  reconcile.
- ADR-0003 — `updateMany` error precedence; the pin-contract discipline (decisions recorded with
  the pins that encode them).
- `readGuard.ts` — structural guard producing the quarantined-id lists.
- `readDiagnostics.ts` — `quarantineSignature` (tamper-resistant encoding) and the typed failure
  contract.
- `useTracks.ts` / `useDedupedToast.ts` — the four deduped toast channels (two error, two
  warning) implementing this policy.
- WP-1 review findings W1-2, W1-4, W1-5 — the triggering review record.
