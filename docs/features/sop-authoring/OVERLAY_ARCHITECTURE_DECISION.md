# ADR — SOP Overlay Architecture (editable SOPs without breaking determinism)

**Status:** Proposed (Design phase — no product code changed by this ADR)
**Date:** 2026-07-20
**Supersedes:** the unresolved fork recorded in `docs/meta/SOP_BUILDER_REVIEW_001.md` §5 (lines 120, 122)
**Decides:** Proposal A (system-architect, content-addressed overlay event log) vs Proposal B (backend-engineer, relational overlay tables)
**Owner:** `system-architect`

---

## 0. Summary of the decision

**Adopt a hybrid — but not the hybrid that was hypothesised, and not for the reason that was hypothesised.**

- **A's semantics win**: stable content anchors, per-field base fingerprints, append-only supersession, pure fold.
- **B's storage shape wins**: relational tables, because the write path needs indexed queries by anchor and by supersession state, which an opaque log does not give cheaply.
- **B's materialized `mergedContentJson` is rejected as a read path** and re-admitted only as an **evidentiary snapshot of approved versions**. Its justification is legal/audit, not performance. (§7)
- **B's positional anchoring is rejected outright.** (§3)
- **A's `identityHash` and B's `versionNumber` were solving two different problems and both are needed.** Collapsing them, in either direction, re-opens the B-1 finding. (§6)

Two findings not available to either agent change the shape of the answer materially, and one of the coordinator's three framing facts is **partly wrong in a way that makes the problem easier, not harder** (§2).

---

## 1. Verification of the three stated facts

Each was independently checked against source. Citations are `file:line`.

### Fact 1 — `sourceStepId` is positional in disguise — **CONFIRMED**

`docs/invariants.md:176-178` defines step IDs as `` `${sessionId}-step-${ordinal}` `` with `ordinal` a 1-based counter incrementing per finalized step (`docs/invariants.md:180-181`). `docs/invariants.md:187-188` states step IDs are deterministic *for the same event sequence* — which is precisely the qualifier that fails under re-segmentation. The ID is stable against re-run and unstable against re-derivation, while *looking* stable in both cases. Confirmed, including the assessment that this is worse than a bare ordinal: a bare ordinal advertises its own fragility.

### Fact 2 — `SOPInstruction.sourceEventId` is not stable — **CONFIRMED, with an important scope limit**

`packages/process-engine/src/sopBuilder.ts:249` sets `sourceEventId: evt.event_id`. `docs/invariants.md:90-93` confirms `event_id` is a fresh UUID v4 minted by the normalization engine per canonical event, explicitly *not* the same as `raw_event_id`. `apps/extension-app/src/background/normalizer.ts:39` (`const eventId = generateId()`) confirms it at the implementation level.

**Scope limit that matters (see §2.1):** `event_id` is unstable across *re-normalization*. It is perfectly stable across *engine re-run over a stored bundle* — which, today, is the only regeneration the server can actually perform.

### Fact 3 — a stable anchor exists and is already reachable — **CONFIRMED**

- Assigned at capture time, in the immutable raw bundle: `docs/invariants.md:89`.
- Carried into `normalization_meta.sourceEventId`: `docs/invariants.md:112`, and at the implementation level `apps/extension-app/src/background/normalizer.ts:53,82,117` and `packages/normalization-engine/src/normalizer.ts:288,322,388` — every branch sets `sourceEventId: raw.raw_event_id`.
- Present on process-engine's own input type: `packages/process-engine/src/types.ts:144-145`.
- Required by the upload contract: `apps/web-app/src/lib/ingestion.ts:29-34` — `normalization_meta.sourceEventId` is a non-optional `z.string()`. It cannot be absent in a bundle the server accepted.
- **Uniqueness verified:** each raw event produces at most one canonical event — every branch in `normalizeRawEvent` returns early (`apps/extension-app/src/background/normalizer.ts:67, 96, 131`). Pre-normalization dedup (`docs/invariants.md:148-156`) *drops* raw events; it never duplicates them. So `raw_event_id` is unique within a session's canonical event stream. This is a precondition for using it as an anchor key and it holds.

Conclusion: `raw_event_id` is strictly dominant over `event_id` as an anchor — stable under a superset of the operations, already present, zero storage cost. Adopt it. **The recommendation stands even though fact 2's practical bite is smaller than stated** (§2.1), because the cost of adopting it is near zero and it removes a latent trap rather than a live one.

---

## 2. Two facts neither agent nor the coordinator had

### 2.1 The uploaded bundle contains **no raw events at all** — so server-side re-normalization is impossible, and `event_id` is stable server-side today

`apps/web-app/src/lib/ingestion.ts:49-58`: `bundleSchema` accepts `sessionJson`, `normalizedEvents`, `derivedSteps`, `policyLog`, `manifest`. There is no `rawEvents` member. Confirmed at the producing end: `apps/extension-app/src/background/bundle-builder.ts:109-115` returns exactly those five members. Raw events live only in the extension's `SessionStore` and are discarded at export.

`apps/web-app/src/lib/ingestion.ts:82-100` shows the server's engine input is built directly from `bundle.normalizedEvents` and `bundle.derivedSteps`.

**This decomposes "regeneration" into three operations with different stability properties, which had been conflated into one:**

| # | Operation | Trigger | `raw_event_id` | `event_id` | `step_id` | Ordinals | Possible server-side today? |
|---|---|---|---|---|---|---|---|
| **R1** | **Engine re-run** — same stored bundle, new `PROCESS_ENGINE_VERSION` | engine upgrade / backfill | stable | **stable** | stable | may change | **yes — the only one** |
| **R2** | **Re-normalization / re-upload** — same raw capture, fresh normalize+segment | recorder upgrade, re-export | **stable** | changes | may change | may change | no (raw not retained) |
| **R3** | **Re-recording** — a new capture of the same real process | user re-records | changes | changes | changes | changes | n/a — different document |

This is why the orphan problem looked intractable: it was being reasoned about at R2/R3 generality while the actual near-term operation is R1, where **everything the overlay needs is already stable**. R3 is not an orphan problem at all — it is a *different document* and must not inherit overlays silently (§4.5).

**Consequence for sequencing:** an R1-only overlay system is correct, useful, and much smaller than an R2-tolerant one. R2 tolerance is bought by anchoring on `raw_event_id` — cheap enough to take now — but the *conflict machinery* R2 requires should not be built until R2 exists.

**Consequence for risk:** R2 is currently impossible *and so is any re-derivation-based recovery of evidence*. Combined with B-4 (raw evidence not backed up — `SOP_BUILDER_REVIEW_001.md` §7 row 3), the normalized bundle is a single point of truth with no upstream. That is a pre-existing integrity finding, not one this ADR introduces, but overlays raise its cost: an overlay whose evidence is unrecoverable is an assertion with no provenance.

### 2.2 Dedup can move an anchor without any regeneration at all

`packages/process-engine/src/sopBuilder.ts:478-495` (`deduplicateInputChanges`) keeps only the **last** `input_change` per `target_summary.label`. The instruction a user edits is therefore the *representative* of a field, not the only event for it.

If a later engine version changes the dedup predicate — or if `target_summary.label` changes for one event in the group — a **different raw event becomes the representative**. The anchored event is still present in the evidence but no longer produces an instruction. This is an orphan class that arises under R1, with a fully stable anchor, and neither proposal accounts for it. It is case **O3** in §4.

---

## 3. Decision 1 — resolve the fork

**Verdict: hybrid, A-semantics over B-storage — with three corrections to the coordinator's working hypothesis.**

The hypothesis ("A's semantics in B's storage shape") is **substantially correct and I adopt it**, but it does not survive unmodified:

**Correction 1 — `mergedContentJson` is not a read path.** B justifies materialization for cheap reads. A SOP is a small document and the fold is a linear scan of a handful of overlay rows; there is no read-performance problem to solve, and materializing a pure function's output creates a drift class that did not previously exist (snapshot disagrees with fold). Materialization is re-admitted in §7 for a *different* reason — an approved version needs an immutable record of what was approved, independent of any later engine change — and that copy is evidentiary, written once, never recomputed.

**Correction 2 — content-addressed `entryId` is idempotency, not identity.** A proposes `entryId` = content hash. Two authors making the identical edit to the identical field at different times must be distinguishable, so `authorId` and a timestamp must enter the hash preimage — at which point the hash is a UUID with extra steps. It is still worth keeping, but for the honest reason: it makes **retried writes idempotent** (offline queue, double-submit, at-least-once delivery), which is a real benefit. It should not be described as semantic identity.

**Correction 3 — B's positional anchoring is rejected, not merged.** `stepOrdinal` / `instructionSequence` fail under R1 (the *one* regeneration that actually happens), because ordinals are re-assigned on re-derivation while `raw_event_id` is not. There is no version of B's anchor that survives; it is not a tradeoff.

**What B contributes that A lacks:** the write path must answer "give me all live overlays for anchor X" and "give me all overlays superseded by Y" on every read. That is an indexed relational query. An append-only log satisfies it only by maintaining a projection — which is a relational table with extra steps. B is right about storage.

**What A contributes that B lacks:** every stability property. B has no `baseFingerprint` equivalent, so it cannot distinguish "engine output unchanged" from "engine changed under the edit" — which is the entire conflict-detection mechanism (§5).

---

## 4. Decision 2 — anchoring, precisely specified

### 4.1 The anchor

```
SopOverlayAnchor {
  kind:              'instruction' | 'step' | 'document'
  sessionId:         string        // scopes everything; docs/invariants.md:94-96
  sourceRawEventId?: string        // kind='instruction' — the stable key
  stepAnchorSet?:    string[]      // kind='step' — see 4.3
  field:             string        // which field of the target is overlaid
}
```

**`sourceRawEventId` is `raw_event_id`**, sourced from `CanonicalEventInput.normalization_meta.sourceEventId` (`packages/process-engine/src/types.ts:144-145`) — **not** `event_id`.

### 4.2 Required engine change

`packages/process-engine/src/sopBuilder.ts:245-257` must add one field to the pushed instruction:

```ts
sourceRawEventId: evt.normalization_meta.sourceEventId,
```

and `SOPInstruction` (`packages/process-engine/src/types.ts:379-393`) gains the corresponding member.

**Keep `sourceEventId` alongside it.** Reasons: (a) it is the correct key for R1, which is the common case, and a match on both fields is a stronger signal than either alone; (b) it is already consumed by traceability surfaces and removing it is an unnecessary breaking change; (c) a *disagreement* between the two (raw matches, canonical does not) is itself the precise signal that an R2 re-normalization occurred — free instrumentation.

This is a change to generated output and therefore requires `PROCESS_ENGINE_VERSION` `1.4.0 → 1.5.0` under the convention documented at `packages/process-engine/src/types.ts:47-57` ("Bumps are required for any change to generated output"). Note the interaction: bumping the engine version changes `SOP.version` (`packages/process-engine/src/types.ts:455-466`) for **every** document, while `contentHash` is unchanged because the hashed field set (`packages/process-engine/src/contentHash.ts:55-66`) does not include instruction provenance. That is correct behaviour and worth stating explicitly so it is not later mistaken for a bug.

### 4.3 What anchors a step-level edit

A step has many raw events (`StepDefinition.sourceEventIds`, `packages/process-engine/src/types.ts:239`). A single event cannot identify it, because the step may split.

**Decision: a step anchor is a *set with a designated head*.**

- `stepAnchorSet` = the full ordered list of `raw_event_id`s for the step's source events, recorded at edit time.
- **Head** = `stepAnchorSet[0]` (earliest by `t_ms`; ordering is guaranteed non-decreasing by `docs/invariants.md:79-80,84-85`).
- Re-binding on regeneration:
  - Candidate step = the step whose source set contains the head.
  - **Overlap ratio** = `|stored ∩ candidate| / |stored ∪ candidate|`.
  - `ratio == 1.0` → exact match, auto-apply (subject to §5).
  - `ratio >= T` → matched-with-drift, apply and flag.
  - `ratio < T`, or head absent → **orphan**, do not apply (§4.5, cases O2/O4).

`T` is a tuning parameter and **must not be chosen in this ADR** — it is unmeasurable until real regenerations are observed. Ship with re-binding *disabled* (only `ratio == 1.0` auto-applies, everything else is flagged), measure, then set `T`. This mirrors the warn-then-reject discipline already agreed for the quality gate (`SOP_BUILDER_REVIEW_001.md` §6, lines 130-134).

### 4.4 What anchors a document-level edit

`kind='document'` anchors on `sessionId` + `field`. `session_id` propagates unchanged through every raw event, canonical event, derived step and manifest (`docs/invariants.md:94-96`), so it is stable across R1 and R2 and correctly *unstable* across R3. Document-level edits (title, purpose, scope) therefore survive regeneration unconditionally and are the safest edit class — which is a good argument for making them the first shippable edit affordance.

### 4.5 Anchors are re-bound at **write time only** — never at read time

**This is the single most important rule in this ADR and neither proposal contains it.**

If the fold performs fuzzy anchor matching at read time, the rendered document becomes a function of *the matching algorithm's version at read time*. Two servers on different deploys would render the same `(evidence, overlay log)` differently. That is exactly the non-determinism the overlay design exists to avoid, re-introduced through the back door.

Therefore:

- **Read-time fold is exact-match only.** Anchor present → apply. Absent → do not apply. No inference, no scoring, no fallback. Total, pure, and byte-reproducible.
- **Re-binding is a write operation.** Regeneration runs a re-binding pass that emits *new overlay entries* carrying the new anchors, with `supersedesEntryId` pointing at the old ones and a recorded `rebindReason`. The decision is made once, persisted, and auditable.
- **Consequence:** the overlay log is not merely a record of what humans did; it is a record of what the *system* did on their behalf. Both are attributable — `authorId` is required (both proposals already agreed), and system re-binds are attributed to a reserved system principal, never to the original human author.

---

## 5. Decision 3 — the orphan/conflict taxonomy

With a stable anchor, "orphaned overlay" stops being one intractable problem and becomes six cases with different, decidable answers.

Let `A` = the overlay's anchor, `F` = `baseFingerprint` (§6), `B'` = the newly generated value at `A`.

| Case | Condition | Meaning | Resolution |
|---|---|---|---|
| **O0** | `A` found, `hash(B') == F` | Engine output at this anchor is unchanged. | **Auto-apply, silent.** The overlay is still exactly as valid as when authored. This is the overwhelmingly common case and must be free. |
| **O1** | `A` found, `hash(B') != F` | Engine output changed *underneath* a human edit. | **Apply, flag `needs-review`.** Surface both the human text and the new engine text. Do **not** silently discard either. Who wins by default is a product call — **Open Decision 1**. |
| **O2** | `A` absent; head present in a step whose overlap `< T` | The step split or merged. The edit's subject still exists but its boundaries moved. | **Do not apply. Flag `orphaned-boundary`.** Present the overlay against the candidate step for human re-binding. Never auto-place. |
| **O3** | `A` present in evidence, but produces no instruction | Dedup representative changed (§2.2), or the event's classification changed such that it no longer yields an instruction (`sopBuilder.ts:236-240` — `classifyInstructionType` returning `null`, or `deriveInstruction` returning `null`). | **Do not apply. Flag `orphaned-suppressed`.** This is *recoverable and specifically diagnosable*: the evidence is intact, the engine simply stopped rendering it. Offer re-binding to the surviving representative of the same field. |
| **O4** | `A` absent from evidence entirely | The underlying raw event is gone. Under R1 this cannot happen (same bundle) — if it does, it indicates bundle corruption or mutation, both of which violate `docs/invariants.md:98-107`. Under R2 it means the recorder's dedup dropped the event. | **Do not apply. Flag `orphaned-evidence-lost`.** Under R1, additionally raise an integrity alarm — this is a symptom, not a routine outcome. |
| **O5** | New `sessionId` (R3) | Different recording of the same process. | **Do not inherit. No orphan.** Overlays are scoped to `sessionId` by construction (§4.1) and simply do not resolve. Cross-recording overlay transfer is a distinct feature with distinct semantics and is explicitly out of scope — **Open Decision 4**. |

**Invariants over the taxonomy:**

1. **No overlay is ever deleted by regeneration.** Every case above either applies or flags; none discards. Append-only is preserved end to end.
2. **No case auto-applies except O0 and (post-measurement) the exact-match arm of O2.** Silence is earned by proof of unchanged base, never assumed.
3. **The document always renders.** Flagged overlays render as engine output plus a visible unresolved-edit marker. There is no failure mode where a regeneration makes a SOP unviewable.
4. **Every flag is a work item with an owner** — the overlay's `authorId`. An orphan with nobody responsible for it is how these systems rot.

**Why this was previously intractable and is not now:** both agents were anchoring on identifiers that do not survive the operation, so *every* regeneration produced O4 for *every* overlay. With `raw_event_id`, R1 produces O0 for essentially every overlay, and the remaining cases are rare, individually diagnosable, and individually resolvable.

---

## 6. Decision 4 — `baseFingerprint`: CONFIRMED, with the grain specified

A's mechanism is **correct and is adopted**. It is the only thing in either proposal that can distinguish O0 from O1, and without that distinction every regeneration would require full human re-review of every edit — which would make regeneration so expensive it would stop happening, and stale documents are the failure mode SOPs exist to prevent.

**A did not specify the grain, and the grain is the whole design.** A whole-document fingerprint would mark *every* overlay `needs-review` whenever *any* part of the document changed, collapsing O0 into O1 and producing exactly the review-fatigue outcome above.

**Specification — `baseFingerprint` is per-anchor, per-field:**

```
baseFingerprint = computeContentHash(<the engine-generated string value at this exact anchor+field, at edit time>)
```

- Hash function: `computeContentHash` from `packages/process-engine/src/contentHash.ts:46-50`. Already pure, dependency-free, no clock, no randomness, two-pass FNV-1a. It is explicitly documented as non-cryptographic (`contentHash.ts:19-21`) — appropriate here, since this detects accidental change, not adversarial forgery.
- **Hashed input is the field's value alone** — not the step, not the document, not the surrounding context. For `kind='instruction'`, `field='instruction'`, that is the `instruction` string as produced by `deriveInstruction` (`sopBuilder.ts:271`).
- **No delimiters or composite serialization** for single-field fingerprints; `serializeSOPContentForHash` (`contentHash.ts:91-104`) is for whole-document identity and is a separate concern.
- Recorded once at edit time, immutable thereafter, carried on the overlay row.

**Explicitly excluded from the fingerprint:** ordinals, sequence numbers, step titles, sibling instructions, `generatedAt`, `engineVersion`. Including any of these re-couples the fingerprint to position and re-introduces the failure it exists to prevent.

**`engineVersionAtEdit` (A's field) is retained but is metadata, not a conflict input.** Conflict detection must key on *did this value change*, not *did the engine version change* — engine bumps are frequent (`types.ts:47-57` mandates them liberally) and mostly do not touch any given field. Using version as the trigger would flag everything.

---

## 7. Decision 5 — version identity: three identities, three jobs

A proposes `identityHash`; B proposes `versionNumber`; `contentHash` is already shipped. **These are not competing answers to one question. They are answers to three different questions, and the B-1 finding is only closed by the one that neither content hash provides.**

| Identity | Question it answers | Status | Changes when |
|---|---|---|---|
| **`contentHash`** (shipped) | "Which *engine output* is this?" | Live — `types.ts:494-500`, computed `sopBuilder.ts:203` | Generated content changes. Unaffected by overlays (overlays are not engine output). |
| **`renderedContentHash`** (new) | "Which *merged document* is this?" | Proposed | The rendered result of `M(G(evidence), overlay)` changes — i.e. either evidence or overlay changed. This is A's `identityHash`, correctly scoped to the merged artifact. |
| **`versionNumber`** (new) | "Which *revision* do I hold, and is it the current one?" | Proposed | **Only on approval-state transition.** Monotonic integer per `sopId`. This is B's field and it is the one that closes B-1. |

**Why all three, concretely.** `SOP_BUILDER_REVIEW_001.md` §7 row 2 states the disqualifying finding: *"without an incrementing version, two people holding two copies cannot tell which is current."* A content hash **cannot** answer that — two hashes are unordered. `9f3a...` vs `c17b...` tells you they differ, not which supersedes. Only a monotonic counter, or an explicit supersession edge, expresses currency. Conversely, a counter cannot tell you two copies are *the same document*, which is what `contentHash` is for and why the existing behaviour at `types.ts:458-462` (identical regenerations produce identical `version`) is correct and must be preserved.

**Answers to the two questions asked:**

- **Does a no-op regeneration create a new version?** **No.** Same evidence + same overlay log ⇒ identical `renderedContentHash` ⇒ no new version row, no new `versionNumber`. This preserves the property already shipped at `types.ts:458-462` and extends it across the merge. This is the behaviour A was right to insist on.
- **Does an approval-state change create a new version?** **Yes — and it is the *only* thing that increments `versionNumber`.** Approval does not alter content, so `renderedContentHash` is unchanged; but approval is precisely the event `versionNumber` exists to track. A document approved, then regenerated with unchanged content, then re-approved, has one `renderedContentHash` and multiple version rows. That is correct: the content is the same, the *authorisations* are distinct facts.

**Where the materialized snapshot returns.** At the moment of approval — and only then — write an immutable `mergedContentJson` snapshot alongside `renderedContentHash`. Its purpose is evidentiary: it records what a human actually approved, independent of any subsequent engine change. It is written once and never recomputed. On read, if `computeContentHash(fold(...)) != renderedContentHash` for an approved version, that is a **hard error**, not a cache miss — it means content changed under an approval, which is the exact failure a controlled-document system must never absorb silently.

Unapproved documents are folded on read with no snapshot. This is B's mechanism, kept, with its justification corrected from performance to evidence.

---

## 8. Decision 6 — determinism verdict

**Reproducible byte-for-byte, unconditionally:**

- `G(evidence)` — unchanged by this ADR. Still pure. `generatedAt` still sourced from `sessionJson.startedAt` (`sopBuilder.ts:201`), never the clock, per the standing constraint at `types.ts:483-485`.
- `M(G(evidence), overlay)` — the fold. Pure, total, exact-match-only (§4.5). Given the same evidence and the same overlay log, byte-identical output on any machine, any deploy, any engine version *of the fold*.
- `baseFingerprint` and `renderedContentHash` — `computeContentHash` is pure integer arithmetic (`contentHash.ts:29-50`).

**Not reproducible, by nature, and acceptable:**

- **The overlay log's contents.** `authorId`, edit text, and edit timestamp are *inputs from the world*, exactly like recorded evidence. They are recorded once, never recomputed. Evidence is not "non-deterministic" because it was captured at a particular time; neither is an edit. The determinism claim is *"same evidence + same edit history ⇒ same document,"* and that claim holds exactly.
- **Which conflict resolution a human chose** (O1, O2). Also an input, also recorded as an overlay entry, also never re-derived.
- **Which anchors a re-bind pass produced.** This *would* be non-deterministic if inferred at read time — which is why §4.5 forbids it. As a recorded write, the decision is an input like any other.

**Hazards flagged:**

1. **Read-time inference is the one thing that breaks this.** §4.5 exists solely to prevent it. Any future PR that adds fallback matching to the fold — however well-intentioned, however small — is a determinism regression and must be rejected on sight. This warrants an explicit invariant entry in `docs/invariants.md` when the fold ships.
2. **LLM-generated text inside the engine remains out of bounds**, unchanged by this ADR. An overlay whose value came from a model is *authored content with a non-human author* — it must be attributed as such (`authorId` = the model/agent principal, never a human), stored as an overlay like any other, and never allowed to flow back into `G`'s input. The engine stays pure; the model, if ever admitted, is a client of the overlay API, on the same footing as a human editor and subject to the same review gates. `SOP_BUILDER_REVIEW_001.md` §7 line 153 already lists unconstrained AI rewrite as explicitly not-to-build; this ADR does not soften that.
3. **`T` (overlap threshold) is a tuning constant that would enter the merge.** Handled by §4.3: it is a *write-time* re-bind parameter, recorded in the emitted entry, never consulted at read time. A change to `T` therefore cannot retroactively alter any previously rendered document.

---

## 9. Decision 7 — migration, and the expiring property

`SOP_BUILDER_REVIEW_001.md` §5 line 124 records it: because no mutation path has ever existed, **every stored SOP is provably 100% engine-derived.** This ADR confirms the claim independently — the only writer of SOP content is `buildSOP` (`sopBuilder.ts`), reached solely via `processSession` (`apps/web-app/src/lib/ingestion.ts:100`), and `SOP.approvalStatus` is a single-member union (`types.ts:449`) precisely so that no other state can be silently implied.

**That certainty is destroyed the instant the first overlay is written, and it cannot be reconstructed afterwards.** After authoring ships, "was this sentence written by the engine or a person?" is answerable only for documents that carry a provenance stamp — and back-filling a stamp post-hoc is an assertion, not evidence.

**Therefore, mandatory ordering:** stamp provenance on all existing SOPs **before** any overlay write path exists. Concretely, every SOP stored prior to the authoring feature is marked with an origin of fully-engine-derived, at document grain, as a one-time backfill. This is cheap now and impossible later. It should land in the same change as, or before, the `sourceRawEventId` engine change (§4.2) — and certainly before any table that can accept an overlay row exists.

The four-valued origin model (`observed` / `derived` / `authored` / `absent`) already agreed by both agents (`SOP_BUILDER_REVIEW_001.md` §5 line 118) is the right target shape; the backfill sets everything to the engine-derived values and leaves `authored` genuinely unused until a human uses it.

---

## 10. Smallest correct first step

**Build now (small, additive, independently valuable, no overlay machinery):**

1. **Expose `sourceRawEventId` on `SOPInstruction`** — one field read at `sopBuilder.ts:245-257`, one type member at `types.ts:379-393`, `PROCESS_ENGINE_VERSION` `1.4.0 → 1.5.0` per the convention at `types.ts:47-57`. Keep `sourceEventId` (§4.2). Valuable on its own as traceability, independent of authoring.
2. **Provenance backfill stamp** (§9). Must precede any overlay write path. Expiring opportunity.
3. **An anchor-stability regression test.** Take a fixture bundle, run the engine twice across a simulated version bump, and assert every instruction's `sourceRawEventId` is preserved. This converts the central assumption of this ADR from an argument into a gate. Without it, §5's entire taxonomy rests on a property nothing enforces.

That is the whole first step. It ships no authoring, no tables, no UI, and leaves every option in this ADR open.

**Do NOT build yet:**

- Overlay tables, the fold, or any write path — until steps 1-3 land and the review sequence at `SOP_BUILDER_REVIEW_001.md` §7 rows 1-7 is respected. Authoring is item 8 there, and this ADR does not promote it.
- **Anchor re-binding of any kind** (§4.3, §4.5). Exact-match-only first. `T` cannot be chosen before real regenerations are observed, and choosing it early would bake in a guess.
- **The approval workflow.** `versionNumber` (§7) is specified here but must not be implemented until an approver role model exists — Open Decision 3. Shipping a counter with no authorisation semantics recreates B-1 in new clothing.
- **Materialized snapshots** (§7) — they have no purpose before approval exists.
- **Cross-recording overlay inheritance** (O5) — Open Decision 4.
- **Any AI-authored overlay path** (§8 hazard 2).

---

## 11. Open decisions — escalated, not silently made

These are product calls. Each has a technical default recorded so nothing is blocked, but none should be settled by engineering alone.

| # | Decision | Why it is not technical | Recorded default (overridable) |
|---|---|---|---|
| **OD-1** | On **O1** (engine output changed under a human edit), does the human text win by default, or is the engine's new text surfaced as primary? | This is a liability and document-quality judgement. Human text preserves intent; engine text preserves evidence-linkage. In a regulated context the answer may be neither — it may be "block until reviewed." | Human text renders, engine text shown adjacent, `needs-review` flag set. Nothing auto-discarded. |
| **OD-2** | Does an **approved** SOP regenerate at all when the engine changes, or is it frozen until explicitly re-approved? | Goes to what "approved" means as a commitment. Freezing is safer and staler; regenerating is fresher and weakens the approval's meaning. | Approved versions freeze. Regeneration produces a new *unapproved* version alongside; the approved snapshot (§7) is untouched. |
| **OD-3** | **Who may approve**, and may an author approve their own edit? | Governance/role model, with schema consequences that are cheaper to decide before the table exists than after. | Blocks `versionNumber` implementation. No default — this one genuinely must be answered. |
| **OD-4** | May overlays transfer between recordings of the same process (**O5**, R3)? | Product feature with real value (re-record without losing edits) and real risk (edits asserted against evidence that never produced them). | Out of scope. Overlays are `sessionId`-scoped and do not transfer. |
| **OD-5** | What does the product show when an overlay's **evidence is unrecoverable** (§2.1, B-4)? | An overlay whose provenance chain is broken is an unsourced assertion. Whether that renders, renders-with-warning, or suppresses is a truthfulness call the review's own §2 framing bears on directly. | Render with an explicit unverifiable-provenance marker. Never silently. |
| **OD-6** | The overlap threshold **`T`** (§4.3). | Requires measurement that does not exist yet. Setting it now is a guess with a number attached. | Ship at `T = 1.0` (exact match only), measure real regenerations, then decide. |

---

## 12. What I would tell the CEO in three sentences

The fork was real but narrow: the two agents disagreed about storage and agreed about everything that mattered, so the hybrid holds — with the correction that the merged-document cache B wanted for speed is only justified as an audit record at approval.

The orphan problem looked unsolvable because both designs anchored on identifiers that do not survive regeneration; anchoring on `raw_event_id` — which is already in the data and needs one line in the engine to expose — turns "every edit orphans" into "essentially no edit orphans," and the residue decomposes into six individually decidable cases.

The one genuinely urgent item is unrelated to the fork: every SOP in the system is currently provably machine-written, and that fact becomes unprovable the moment the first person edits one — so stamp provenance before authoring ships, not after.
