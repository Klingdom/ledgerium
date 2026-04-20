# Convergence Design: LiveStepBuilder <-> StreamingSegmenter

Iteration: 011 (Mode 5, directed)
Status: Design only. No code changes authorized by this document.
Author: system-architect
Downstream: backend-engineer (implementation), tester/qa (golden regression), devops (CI gate)

---

## 0. Executive Summary

The release blocker describes a "two-way duplication" (`LiveStepBuilder` vs. `StreamingSegmenter`).
Reading the source shows the situation is worse:

- There are **three** segmentation implementations in the tree, not two:
  1. `packages/segmentation-engine/src/batch-segmenter.ts` -> `segmentEvents` (the canonical batch implementation; **not consumed by the extension**).
  2. `packages/segmentation-engine/src/streaming-segmenter.ts` -> `StreamingSegmenter` (canonical streaming; **not consumed by the extension**).
  3. `apps/extension-app/src/background/bundle-builder.ts` -> `buildDerivedSteps` (inline batch; **used to produce the shipped `derived_steps.json`**).
  4. `apps/extension-app/src/background/live-steps.ts` -> `LiveStepBuilder` (inline streaming; **used to drive the sidepanel live feed**).

- The **blocker as tracked** covers only (2) vs (4). But the UX-level trust invariant ("what the user saw during capture matches the exported bundle") is actually decided by (3) vs (4). The package `StreamingSegmenter` is effectively dead code in production today - it has tests but no call site.

- This scope expansion is non-negotiable for correctness: if we only converge (2)+(4) we eliminate a duplication that never shipped and leave the duplication that actually ships. Section 3 ("Target architecture") therefore explicitly brings all four implementations under the package and explains why the third module (`bundle-builder`) is in scope - per the iteration rules, we justify touching it.

- Byte-identical output for the **shipped** DerivedStep shape is achievable between the extension's current batch output and the package batch implementation only after reconciling a set of identified accidental divergences (see Section 2). Byte-identical output between the new streaming path and the new batch path (both produced by the package) is achievable for the canonical set of events but requires preserving the package's existing streaming omission of `idle_gap`/`target_changed`/`action_completed`/`route_changed` boundaries OR porting those rules into the streaming path. Section 3 elects to port them.

- `LiveStep` (the UI-facing shape) and `DerivedStep` (the bundle-facing shape) are different contracts with different fields. The adapter layer that maps one to the other is the **only** place this design keeps behaviour local to the extension.

---

## 1. Current State

### 1.1 Module inventory and responsibilities

| Module | Location | Stateful? | Input type | Output type | Used by |
|---|---|---|---|---|---|
| `StreamingSegmenter` | `packages/segmentation-engine/src/streaming-segmenter.ts` | yes | `SegmentableEvent` (package-local subset of CanonicalEvent) | `DerivedStep` | **No production call site.** Tested in `streaming-segmenter.test.ts` only. |
| `segmentEvents` | `packages/segmentation-engine/src/batch-segmenter.ts` | no (pure) | `SegmentableEvent[]` | `SegmentationResult` containing `DerivedStep[]` | **No production call site.** Tested in `batch-segmenter.test.ts`. |
| `LiveStepBuilder` | `apps/extension-app/src/background/live-steps.ts` | yes | `CanonicalEvent` (extension type) | `LiveStep` (UI shape) | `background/index.ts` on every `RAW_EVENT_CAPTURED` -> emits `MSG.LIVE_STEP_UPDATED` to sidepanel; persisted via `SessionStore.updateLiveStep` / `session-store.ts`. No unit tests (confirmed by `apps/extension-app/**/live-steps*` glob - only `live-steps.ts` exists). |
| `buildDerivedSteps` | `apps/extension-app/src/background/bundle-builder.ts` | no (pure) | `CanonicalEvent[]` | `DerivedStep[]` | `buildBundle()` on session stop -> produces `derivedSteps` field of the shipped `SessionBundle`. Tested in `bundle-builder.test.ts`. |

Two of these (`StreamingSegmenter`, `segmentEvents`) live in the canonical package and are unit-tested but unwired.
Two (`LiveStepBuilder`, `buildDerivedSteps`) live in the extension, are wired in, and are lightly tested (batch has coverage; live has none).

### 1.2 Public APIs today

**`LiveStepBuilder`** (`live-steps.ts`):

```
new LiveStepBuilder(sessionId: string, onUpdate: (step: LiveStep) => void)
  .processEvent(event: CanonicalEvent): void
  .finalize(): LiveStep[]
  .getProvisionalStep(): LiveStep | null
  .getFinalizedSteps(): LiveStep[]
  .reset(): void
```

`LiveStep` shape (from `apps/extension-app/src/shared/types.ts`):

```
{
  stepId: string
  title: string
  status: 'provisional' | 'finalized'
  boundaryReason?: string   // untyped string, not the BoundaryReason enum
  grouping?: string         // untyped string, not the GroupingReason enum
  pageLabel?: string        // derived from page_context.applicationLabel
  confidence: number
  eventCount: number
  startedAt: number         // first event t_ms
  finalizedAt?: number      // last event t_ms when finalized
}
```

**`StreamingSegmenter`** (`streaming-segmenter.ts`):

```
new StreamingSegmenter(sessionId: string, onStepUpdate: (step: DerivedStep) => void)
  .processEvent(event: SegmentableEvent): void
  .finalize(): DerivedStep[]
  .getProvisionalStep(): DerivedStep | null
  .getFinalizedSteps(): DerivedStep[]
  .reset(): void
```

`DerivedStep` shape (canonical, from `packages/segmentation-engine/src/types.ts`):

```
{
  step_id: string
  session_id: string
  ordinal: number
  title: string
  status: StepStatus
  grouping_reason: GroupingReason     // typed enum
  boundary_reason?: BoundaryReason    // typed enum
  confidence: number
  source_event_ids: string[]
  start_t_ms: number
  end_t_ms?: number
  duration_ms?: number
  page_context?: { domain, applicationLabel, routeTemplate }
}
```

### 1.3 Where logic diverges today

This is the side-by-side map the backlog item asks for. The comparison is three-way because `buildDerivedSteps` is the third party in this blocker.

#### 1.3.1 Boundary rules

| Boundary | `LiveStepBuilder` | `StreamingSegmenter` (package) | `buildDerivedSteps` (extension batch) | `segmentEvents` (package batch) |
|---|---|---|---|---|
| `idle_gap` (> `IDLE_GAP_MS` = 45000ms) | yes, BEFORE accumulating | **absent** | yes | yes |
| `navigation_changed` (domain change on any event) | yes (uses last accumulator domain, not last-seen nav domain) | yes (uses `lastNavigationDomain` tracker) | yes (uses `lastDomain` tracker) | yes (uses `lastNavigationDomain` tracker) |
| `route_changed` (same-domain SPA nav) | yes, consumes event (event is dropped, not accumulated) | **absent** | yes - but gated: only finalizes if `newRoute !== lastRoute && lastRoute !== ''` (so first route doesn't split) | **absent** |
| `target_changed` (different interaction target, gap > 2000ms) | yes (gap threshold hard-coded `> 2000`) | **absent** | yes (gap threshold `>= TARGET_CHANGE_GAP_MS = 2000`; uses composite `selector::label` key and tracks `lastLabelBySelector` for spreadsheet cells) | yes (gap threshold `>= TARGET_CHANGE_GAP_MS`; uses composite `selector::label` key WITHOUT cell-label tracking) |
| `form_submitted` (after `interaction.submit`) | yes | yes | yes | yes |
| `action_completed` (click on Send/Save/etc.) | yes (regex anchored `^(send|submit|save|...)`) | **absent** | yes (word-boundary regex list `\bsend\b`, `\bsubmit\b`, ...; rapid-click-repeat defers finalization) | yes (same as bundle-builder; rapid-click-repeat defers finalization) |
| `user_annotation` (single annotation step) | yes | yes | yes (double-finalize pattern in bundle-builder creates an empty-followed-by-real flow; see 1.3.4) | yes |
| `session_stop` (explicit `session.stopped` event) | no - never checks for `session.stopped` | yes (finalizes and clears domain) | yes | yes |
| End-of-stream flush | yes (via explicit `.finalize()` call) | yes (via explicit `.finalize()` call) | yes (end-of-loop drain) | yes (end-of-loop drain) |

**Summary of boundary gaps:**

- `StreamingSegmenter` is missing `idle_gap`, `route_changed`, `target_changed`, `action_completed`. Four boundary types that the batch path and LiveStepBuilder both emit. This is the core reason the package's streaming path cannot be used as-is to back the live UI.
- `LiveStepBuilder` is missing `session.stopped` handling (it relies on the external `handleStop -> liveBuilder.finalize()` call instead).
- Only `buildDerivedSteps` has the spreadsheet-cell label tracking for `target_changed`. `segmentEvents` does not.

#### 1.3.2 GroupingReason classification order

| Check | `LiveStepBuilder` | `StreamingSegmenter` | `buildDerivedSteps` | `segmentEvents` |
|---|---|---|---|---|
| 1. annotation (single) | 1st | 1st | 1st | 1st |
| 2. error_handling (error + human action) | 2nd | **missing** | 2nd | 2nd |
| 3. fill_and_submit (submit + input) | 3rd | 2nd | 3rd | 3rd |
| 4. click_then_navigate | 6th (after file/send) | 3rd | 4th | 4th |
| 5. repeated_click_dedup | 8th (window check: first vs last click) | 4th (pairwise window check) | 5th (window check: first vs last click) | 5th (pairwise window check) |
| 6. send_action (action-button click) | 5th (anchored regex) | **missing** | 6th (word-boundary regex) | 6th (word-boundary regex) |
| 7. file_action (file input) | 4th (checks `elementType === 'file'`) | **missing** | 7th | 7th |
| 8. data_entry (input-heavy accumulator, >= 50%) | 9th (includes keyboard_shortcut) | **missing** | 8th (includes keyboard_shortcut) | 8th (includes keyboard_shortcut) |
| 9. single_action fallback | last | last | last | last |

`StreamingSegmenter` recognises only 5 of the 9 grouping reasons. LiveStepBuilder recognises all 9. The batch implementations also recognise all 9 but in a different order from LiveStepBuilder.

#### 1.3.3 System-event filtering

| Implementation | Filters `system.*` | Filters `derived.*` | Special-case `system.error_displayed` |
|---|---|---|---|
| `LiveStepBuilder` | drop | drop | **keep** (for `error_handling`) |
| `StreamingSegmenter` | drop | drop | **drop** (reason for missing `error_handling`) |
| `buildDerivedSteps` | drop | drop | **keep** |
| `segmentEvents` | drop (via `isSystemOrDerived`) | drop | **keep** |

#### 1.3.4 Annotation handling quirks

- `buildDerivedSteps` has a bug-smelling double-finalize pattern:
  ```
  if (event.event_type === 'session.annotation_added') {
    finalizeStep('user_annotation')      // flush previous
    accumulator = [event]
    finalizeStep('user_annotation')      // flush annotation as its own step
    continue
  }
  ```
  The first call is a no-op if accumulator is empty; the second creates the annotation step. This is functionally equivalent to the `StreamingSegmenter` and `segmentEvents` patterns but uses the double-call idiom instead of an inline "create annotation step with stepCounter+1" call. Accidental divergence, same result.

- `LiveStepBuilder`'s annotation step takes its title from `event.annotation_text` (a CanonicalEvent-only field). The package title derivation reads `target_summary.label`. Intentional - `LiveStep` ignores `DerivedStep`'s channel.

#### 1.3.5 Title derivation

`LiveStepBuilder` and `buildDerivedSteps` share a title-derivation style (with an `appContextSuffix`/`appContext` helper that emits strings like " in email", " in spreadsheet") and share spreadsheet-cell detection (`CELL_REF_RE`).

`deriveStepTitle` in `rules.ts` uses a different style: `Navigate to {destination}`, `Fill and submit {formLabel}`, `Enter {label}`, etc. It has an `enrichedPageDestination` concept (strips generic "Home"/"Dashboard" titles) and a `contextualFallback` helper that neither extension-side impl has.

These produce measurably different strings for the same inputs. Examples:

| Input | `LiveStepBuilder` title | `deriveStepTitle` (rules.ts) title |
|---|---|---|
| Single click, no label | `Click action` (or `Click action in Gmail` with app ctx) | `Click element on {pageTitle}` (or `Click button` if role is meaningful) |
| fill_and_submit, labels `['Subject','Body']` | `Complete Subject, Body and submit in email` | `Fill and submit {submitLabel or pageTitle or 'form'}` |
| data_entry, spreadsheet cells A1-A3 | `Enter data in cells A1, A2, A3 in spreadsheet` | `Enter {firstEventLabel}` (no cell awareness) |
| click_then_navigate | `Navigate to Dashboard` | `Navigate to /orders/new (NetSuite)` when title is generic |

Some differences are genuine improvements (the rules.ts "enriched destination" logic produces better output when page titles are generic). Some are regressions (rules.ts loses spreadsheet-cell awareness and loses the `appContextSuffix` trailing phrase).

#### 1.3.6 Confidence

Scores are identical across all four implementations for every grouping reason. No divergence here.

#### 1.3.7 Step ID format

| Impl | Finalized format | Provisional format |
|---|---|---|
| `LiveStepBuilder` | `${sessionId}-step-${stepCounter}` | `${sessionId}-step-provisional` |
| `StreamingSegmenter` | `${sessionId}-step-${stepCounter}` | `${sessionId}-step-provisional` |
| `buildDerivedSteps` | `${sessionId}-step-${ordinal}` | n/a (no provisional) |
| `segmentEvents` | `${sessionId}-step-${ordinal}` | n/a |

Identical. Invariant holds.

#### 1.3.8 `SEGMENTATION_RULE_VERSION` drift

`docs/invariants.md` line 172 claims the value is `'1.0.0'`. `packages/segmentation-engine/src/rules.ts` line 16 has it at `'1.1.0'`. This is a stale-doc finding, not a code divergence. It is **out of scope** for this iteration (flagged in Section 7).

### 1.4 Constants

All four impls ultimately agree on the three main constants. `packages/segmentation-engine/src/rules.ts` is the declared single source. `apps/extension-app/src/shared/constants.ts` re-exports from `@ledgerium/segmentation-engine` (confirmed - see lines 1-7). This part of iter 003's consolidation did work.

`TARGET_CHANGE_GAP_MS` (= `2_000`) and `ACTION_BUTTON_PATTERNS` are exported from `rules.ts` and are already consumed by `batch-segmenter.ts`. `bundle-builder.ts` has its own inline copies of both. `StreamingSegmenter` doesn't use either.

---

## 2. Divergence Audit

Every logical difference between the streaming implementations (the two named in the blocker) and between them and the batch implementations (brought in because shipping correctness depends on it).

Legend:
- **[intentional]** - must preserve
- **[accidental]** - must reconcile
- **[unknown]** - needs decision; my recommendation is recorded

| # | Divergence | Between | Classification | Resolution (recommended) |
|---|---|---|---|---|
| D1 | Streaming path (package) omits `idle_gap` boundary | `StreamingSegmenter` vs `LiveStepBuilder` and both batch impls | **accidental** | Port the rule into the package streaming path. |
| D2 | Streaming path (package) omits `route_changed` boundary | `StreamingSegmenter` vs `LiveStepBuilder` and `buildDerivedSteps` | **accidental** | Port the rule, using `buildDerivedSteps`'s guarded version (only fires if route actually changes and a `lastRoute` exists). The LiveStepBuilder version is too eager. |
| D3 | Streaming path (package) omits `target_changed` boundary | `StreamingSegmenter` vs the three other impls | **accidental** | Port the rule using the composite `selector::label` key. Include the spreadsheet-cell label-tracking behaviour from `buildDerivedSteps`. |
| D4 | Streaming path (package) omits `action_completed` boundary | `StreamingSegmenter` vs the three other impls | **accidental** | Port the rule using the word-boundary regex list from `rules.ts` (`ACTION_BUTTON_PATTERNS`). Preserve the rapid-click-repeat defer behaviour from `buildDerivedSteps`. |
| D5 | Streaming path (package) omits `error_handling` grouping (drops `system.error_displayed`) | `StreamingSegmenter` vs the three other impls | **accidental** | Change `isSystemOrDerived`-equivalent filter to keep `system.error_displayed` (matches batch impls). |
| D6 | Streaming path (package) omits `send_action`, `file_action`, `data_entry` grouping classifications | `StreamingSegmenter` vs the three other impls | **accidental** | Port classifier. Recommend reusing `batch-segmenter`'s `classifyGroupingReason` as the shared primitive. |
| D7 | `LiveStepBuilder` uses anchored regex `^(send|submit|save|...)` for action detection | `LiveStepBuilder` vs the batch impls | **accidental** (regression) | Adopt the word-boundary `ACTION_BUTTON_PATTERNS` from `rules.ts`. Covers more cases (e.g. "Save Draft", "Confirm Delete") and is already shipped in the exported bundle. |
| D8 | `LiveStepBuilder` uses "last accumulator domain" for domain-change; `StreamingSegmenter`/`segmentEvents`/`buildDerivedSteps` use a dedicated `lastNavigationDomain` tracker | `LiveStepBuilder` vs the others | **accidental** | Use the tracker pattern. The LiveStepBuilder approach breaks when the current accumulator has no page_context but the last seen one did (e.g. session.annotation_added at the start of a step). |
| D9 | `LiveStepBuilder` uses first-vs-last click window for `repeated_click_dedup`; `StreamingSegmenter`/`batch-segmenter` use pairwise window | `LiveStepBuilder` vs the canonical impls | **accidental** (regression) | Use pairwise. The first-vs-last approach misses the case where three clicks span > `RAPID_CLICK_DEDUP_MS` total but any adjacent pair fits. |
| D10 | `LiveStepBuilder` doesn't verify same selector on `repeated_click_dedup`; canonical impls require selector match | `LiveStepBuilder` vs canonical | **accidental** (regression) | Require selector match. Without it, three rapid clicks on three different buttons wrongly classify as a dedup. |
| D11 | `LiveStepBuilder` ignores `session.stopped` event | `LiveStepBuilder` vs `StreamingSegmenter`/`buildDerivedSteps`/`segmentEvents` | **accidental** | Handle it. Currently the extension doesn't emit `session.stopped` into the live stream (handleStop calls `finalize()` directly), so this is latent - but the extension batch path DOES consume it. Port for symmetry. |
| D12 | Title derivation style disagrees (app-context-suffix vs. enriched-destination-with-fallback) | `LiveStepBuilder`+`buildDerivedSteps` vs `deriveStepTitle` in `rules.ts` | **unknown** | RECOMMEND: keep the extension-side style as canonical. It ships; the package style doesn't. Migrate `deriveStepTitle` in `rules.ts` to adopt `appContextSuffix` + `CELL_REF_RE` + `extractFieldLabels` semantics. This is an explicit choice to prefer "what users see today" over "what a parallel test suite says." The user-visible title for 100% of shipped bundles comes from `buildDerivedSteps` today, so that is the authority. |
| D13 | `LiveStep` UI type lacks typed enums for `grouping`/`boundaryReason` (plain string); `DerivedStep` has proper unions | `LiveStep` vs `DerivedStep` | **intentional** | Preserve. `LiveStep` is the MSG wire contract between background and sidepanel and an ADR-001-protected shape. Do not change. The adapter will carry untyped strings into the `LiveStep` field for now. Follow-up item: tighten the `LiveStep` type to match the union in iter 012+. |
| D14 | `LiveStep` carries `pageLabel` (flattened from `applicationLabel`) rather than full `page_context` | `LiveStep` vs `DerivedStep` | **intentional** | Preserve. ADR-001. |
| D15 | Step IDs for finalized steps all use `${sessionId}-step-${n}`; provisional uses `${sessionId}-step-provisional` | across all four | **intentional** | Preserve exactly. Documented invariant (3.2). |
| D16 | `SEGMENTATION_RULE_VERSION` = `'1.1.0'` in code; invariants.md says `'1.0.0'` | docs vs code | **accidental** (docs) | Out of scope - flagged as iter 012+ follow-up. Do not touch this value in this iteration; changing it would imply a semantic rule-version bump. |

### 2.1 Cannot-be-byte-identical cases (escalation candidates)

Following is every case where byte-identical output is **not achievable** under the current contracts. Per the iteration brief, these are escalated rather than silently shipped.

- **E1. `LiveStep` vs `DerivedStep` are different shapes.** They cannot be byte-identical. The byte-equivalence claim in the brief must be interpreted as "byte-identical within each contract": (a) the shipped `derivedSteps` bytes must not change pre/post convergence, and (b) the `LiveStep` stream emitted to the sidepanel must not change pre/post convergence. We treat these as two separate regression targets.

- **E2. Title regressions from D12 will NOT be byte-identical if we adopt the package `deriveStepTitle`.** The recommendation in D12 is to keep the extension-side titles as canonical and align the package, specifically because forcing byte-identical output under the package's current titling would change every title in the shipped bundle. This is the single biggest byte-equivalence risk in the whole design. The backend-engineer must implement the migration such that the shared primitive's titles match the current extension-side titles character-for-character - otherwise the regression fixture will fail.

- **E3. Ordinal sequencing under `LiveStepBuilder` vs the new streaming path.** The current `LiveStepBuilder` does not assign `ordinal` (it's not on `LiveStep`). The new adapter will consume `DerivedStep.ordinal` and drop it on the floor when constructing `LiveStep`. Byte-equivalence on the LiveStep side is unaffected. Byte-equivalence on the DerivedStep side is affected only if the order of boundary firing changes - which D1-D11 will force us to reconcile.

---

## 3. Target Architecture

### 3.1 Decision

**Option C with a specific shape: both current call sites (live + batch) become thin adapters over a single consolidated `@ledgerium/segmentation-engine` package.**

Concretely:

1. The package's `StreamingSegmenter` absorbs the missing boundary rules (D1-D4), the missing grouping classifications (D5-D6), and the reconciled classification/title helpers (D7-D11). After this change, `StreamingSegmenter` produces a `DerivedStep` stream for any `SegmentableEvent` stream that matches, event-for-event, what `segmentEvents` would have produced on the same stream in batch mode. This is a tighter version of the existing invariant 3.7.

2. The package's `deriveStepTitle` is migrated to match the extension-side title semantics (D12).

3. The package's `classifyGroupingReason` (extracted to `rules.ts` or a new `grouping.ts`) becomes the single source of truth consumed by both the batch segmenter and the streaming segmenter internally.

4. `apps/extension-app/src/background/live-steps.ts` becomes a thin adapter. It wraps `StreamingSegmenter`, and maps `DerivedStep -> LiveStep` at the output boundary. File stays, class name stays (`LiveStepBuilder`), public surface stays byte-identical to today (same constructor, same methods, same emitted `LiveStep` shape).

5. `apps/extension-app/src/background/bundle-builder.ts` removes its inline `buildDerivedSteps` implementation and calls `segmentEvents` from the package. `buildDerivedSteps` becomes a thin wrapper: `export function buildDerivedSteps(events, sessionId) { return segmentEvents(events, sessionId).steps }`. This was the deferred step in ADR-001 Phase 1.

6. Both call sites go through the same `classifyGroupingReason` / `deriveStepTitle` / `calculateConfidence` primitives. There is no segmentation logic remaining outside the package.

### 3.2 Why not option A (LiveStepBuilder is a thin adapter, StreamingSegmenter unchanged)

Because `StreamingSegmenter` as it exists today is missing four boundary types and four grouping types. Wrapping it would be a functional regression for the live UI. The backlog blocker would technically close (duplication gone) while the user-visible live feed would degrade (no more idle_gap splits, no more action-button splits, no more spreadsheet data_entry grouping). Rejected.

### 3.3 Why not option B (StreamingSegmenter absorbs LiveStepBuilder's shape; delete LiveStepBuilder entirely)

Because `LiveStep` is a different shape from `DerivedStep` and is an ADR-001 protected UI contract. The sidepanel consumes `LiveStep` via the `MSG.LIVE_STEP_UPDATED` wire protocol. Making `StreamingSegmenter` emit `LiveStep` would either (a) break the package's own shape invariants (every test assumes `DerivedStep`), or (b) couple the package to the extension's UI contract. Both are worse than the adapter approach. Rejected.

### 3.4 Why option C specifically (absorb missing rules upstream, adapt at the call site)

- It collapses **all four** implementations into one, not two.
- It preserves byte-identical output on both contract boundaries (`LiveStep` stream, `DerivedStep` bundle) because the adapter is deterministic and the rules being added are exactly the rules the extension-side impls already use.
- It closes ADR-001 Phase 1 entirely, not half.
- It moves the extension closer to "no segmentation logic outside the package," which is a stated architectural goal.
- It does not touch `session-store.ts`, `constants.ts` storage keys, or `restoreStateIfNeeded` (iter-010 code).
- The extra scope (bundle-builder) is justified because without it we only close half the duplication and the more dangerous half (live-vs-batch divergence between what-user-sees and what-gets-shipped) remains open.

### 3.5 Components and data flow after convergence

```
+--- CanonicalEvent stream (extension content/normalizer) ----------------+
|                                                                         |
|   On every event:                                                       |
|                                                                         |
|   background/index.ts                                                   |
|     -> liveBuilder.processEvent(canonical)   // unchanged wire API      |
|                                                                         |
|   live-steps.ts (LiveStepBuilder, now an adapter)                       |
|     -> toSegmentableEvent(canonical)   // safe downcast                 |
|     -> this.engine.processEvent(segmentable)                            |
|                                                                         |
|   @ledgerium/segmentation-engine                                        |
|     StreamingSegmenter                                                  |
|       -> applies ALL boundary + grouping rules (D1-D11 reconciled)      |
|       -> callback(derivedStep)                                          |
|                                                                         |
|   live-steps.ts (LiveStepBuilder, adapter cont'd)                       |
|     -> liveStep = toLiveStep(derivedStep, canonical events seen)        |
|     -> this.onUpdate(liveStep)                                          |
|                                                                         |
+--- On session stop ------------------------------------------------------+
|                                                                         |
|   handleStop():                                                         |
|     liveBuilder.finalize() -> flushes streaming engine                  |
|     buildBundle(store) ->                                               |
|       buildDerivedSteps(canonicalEvents, sessionId) ->                  |
|         segmentEvents(toSegmentableEvents(canonicalEvents), sessionId). |
|           steps                                                         |
|                                                                         |
+-------------------------------------------------------------------------+
```

Key property: the DerivedSteps the UI saw during streaming are guaranteed equivalent to the DerivedSteps that appear in the final bundle, because they came from the same rule code in the same package.

### 3.6 Adapter contracts

**`toSegmentableEvent(canonical: CanonicalEvent): SegmentableEvent`**

Pure mapping. `CanonicalEvent` is a superset of `SegmentableEvent`; we drop the fields the engine doesn't consume (`annotation_text`, `actor_type`, `normalization_meta` beyond `sourceEventType`, etc.). This is a data narrowing; no information critical to segmentation is lost.

Concern: the streaming engine needs `target_summary.elementType` for `file_action`. Confirm it's present on `SegmentableEvent` - it is (types.ts line 27). OK.

Concern: annotation title derivation reads `annotation_text`. The package reads `target_summary.label`. Resolution: the extension's normalizer must populate `target_summary.label` with `annotation_text` when normalizing a `session.annotation_added` event. Alternatively, extend `SegmentableEvent` with an optional `annotation_text` field. Recommendation: extend `SegmentableEvent` - smaller change, clearer intent, local to the package. The backend-engineer should choose between these during implementation and document which in the PR.

**`toLiveStep(step: DerivedStep, firstEvent: CanonicalEvent): LiveStep`**

Pure mapping:

```
{
  stepId: step.step_id,
  title: step.title,
  status: step.status,
  ...(step.boundary_reason ? { boundaryReason: step.boundary_reason } : {}),
  grouping: step.grouping_reason,
  ...(firstEvent.page_context?.applicationLabel
      ? { pageLabel: firstEvent.page_context.applicationLabel }
      : {}),
  confidence: step.confidence,
  eventCount: step.source_event_ids.length,
  startedAt: step.start_t_ms,
  ...(step.status === 'finalized' && step.end_t_ms !== undefined
      ? { finalizedAt: step.end_t_ms }
      : {}),
}
```

The adapter also needs to keep a small cache of the first-event page_context per step_id so that `pageLabel` can be populated on provisional updates without re-scanning the engine's internal accumulator. Alternative: the engine exposes `page_context` on `DerivedStep` (it already does for finalized), but not always on provisional. Recommendation: use the engine's existing `page_context` field and stop passing `firstEvent` to the adapter at all. Verify the engine sets `page_context` on provisional steps too (line 161 of streaming-segmenter.ts confirms it does via `extractPageContext`).

Final adapter form - no firstEvent param needed:

```
toLiveStep(step: DerivedStep): LiveStep
```

---

## 4. Migration Plan

Each step is independently testable and shippable. The backend-engineer should execute them in order, with a full `pnpm typecheck && pnpm test` green after each.

### Step 1: Lock the current behaviour in golden fixtures (CHECKPOINT-A)

Before changing any behaviour, create regression fixtures that capture the current output.

1.1. Create `packages/segmentation-engine/fixtures/` with:
- `demo-canonical-events.json` - the exact `CanonicalEvent[]` array produced by running the existing `fixtures/capture-runs/demo-events.ndjson` through the extension's normalizer. (Not the raw ndjson - we need the canonical form, because that's what the segmenter consumes.)
- `demo-live-steps-golden.json` - the exact `LiveStep[]` sequence produced by running those canonical events through the current `LiveStepBuilder`, captured as an ordered list of `onUpdate(step)` calls.
- `demo-derived-steps-golden.json` - the exact `DerivedStep[]` produced by `buildDerivedSteps` on those canonical events.

1.2. Create two new test files:
- `packages/segmentation-engine/src/convergence-live.regression.test.ts` - feeds canonical events through the new (post-convergence) streaming engine + adapter, asserts `JSON.stringify(observedLiveSteps) === JSON.stringify(goldenLiveSteps)`.
- `packages/segmentation-engine/src/convergence-batch.regression.test.ts` - feeds same events through `segmentEvents` (post-convergence), asserts `JSON.stringify(observedDerivedSteps) === JSON.stringify(goldenDerivedSteps)`.

1.3. BEFORE landing any of Steps 2-6 below, both regression tests must exist and **fail** (because the convergence hasn't happened yet). This confirms the tests actually discriminate. If either test passes at this step, the fixture is wrong.

1.4. Additional fixtures covering boundary cases:
- `spreadsheet-cells.json` - triggers `target_changed` with cell-label tracking.
- `action-button.json` - triggers `action_completed` with deferred rapid-click repeat.
- `annotation-mid-stream.json` - triggers `user_annotation` flush.
- `idle-gap.json` - triggers `idle_gap`.
- `multi-domain-tabs.json` - triggers `navigation_changed` without a navigation event.
- `error-recovery.json` - triggers `error_handling`.

These are for the backend-engineer to write in step 1. None of them can be captured from "current" `StreamingSegmenter` output because the current impl doesn't emit these boundaries; they should be captured from `buildDerivedSteps` for the DerivedStep fixtures, and from `LiveStepBuilder` for the LiveStep fixtures.

### Step 2: Extract shared classification primitive inside the package

2.1. Move `classifyGroupingReason` from `batch-segmenter.ts` into a new `packages/segmentation-engine/src/grouping.ts` (or into `rules.ts` if small enough). Export it from `index.ts`.

2.2. Update `batch-segmenter.ts` to import the shared primitive. Running `pnpm test` should still show all batch tests passing - no behavioural change.

2.3. Do not touch `streaming-segmenter.ts` yet.

**CHECKPOINT-B:** `pnpm test` green. Regression tests from Step 1 still failing (streaming not converged yet).

### Step 3: Port missing rules into `StreamingSegmenter`

3.1. Change the system-event filter in `StreamingSegmenter.processEvent` to keep `system.error_displayed` (D5).

3.2. Add `idle_gap` detection BEFORE accumulating (D1). Use the same `lastEventT_ms` tracker that already exists.

3.3. Add `route_changed` detection using the `buildDerivedSteps` guard (D2). Track `lastRouteTemplate` on the class. A `navigation.route_change` event:
- if `accumulator.length > 0 && newRoute !== lastRouteTemplate && lastRouteTemplate !== ''`: finalize with `route_changed`.
- update `lastRouteTemplate` if non-empty.
- consume the event (do NOT add to accumulator).

3.4. Add `target_changed` detection (D3):
- track `lastEvent` (or `prev`) across calls.
- track `lastLabelBySelector: Map<string, string>`.
- use the composite `interactionTargetKey` helper (port from `bundle-builder.ts` - the version with label-tracking).

3.5. Add `action_completed` detection (D4):
- after adding the event to the accumulator, check `isActionButtonClick(event)`.
- defer finalization if the NEXT event would be a rapid-click repeat on the same selector. Since streaming is single-event-at-a-time, we cannot peek. Resolution: **defer the boundary one event**. Track `pendingActionBoundary: boolean`. On the next event: if it's a rapid-click repeat on the same selector, clear the pending flag (let dedup grouping handle it naturally). Otherwise, finalize BEFORE processing the new event.

  Note: this is a subtle behavioural change vs. the batch impl, which peeks forward. The streaming impl's deferred-finalize must produce the same output as the batch impl for the same event order. The regression fixture `action-button.json` must cover both the "click Save then click Save rapidly" case (dedup) and the "click Save then do something else" case (action_completed). Both must match.

3.6. Replace the minimal `classifyGroupingReason` with the shared one from Step 2. This is the D5/D6 fix (gains all 4 missing grouping reasons).

3.7. Align `repeated_click_dedup` to pairwise with same-selector (D9/D10) - already correct in the shared primitive, no extra work needed here beyond Step 3.6.

3.8. Align `navigation_changed` with the `lastNavigationDomain` tracker - already correct in `StreamingSegmenter`, no work needed here (this is a LiveStepBuilder-only divergence).

3.9. Handle `session.stopped` - already correct in `StreamingSegmenter`, no work needed.

**CHECKPOINT-C:** `pnpm test` green for all existing streaming segmenter tests. Test failures in the regression fixtures from Step 1 should now be different (closer to golden). Manually inspect diffs to confirm they're shrinking, not shifting.

### Step 4: Align `deriveStepTitle` in the package with the extension-side style

4.1. Port `appContextSuffix`, `CELL_REF_RE`, `extractFieldLabels`, `meaningfulClickLabel` from `bundle-builder.ts` into `rules.ts` (or a new `titling.ts`).

4.2. Rewrite `deriveStepTitle` to use the extension-side logic. Delete the `enrichedPageDestination` / `contextualFallback` helpers, or keep them only in service of single-action fallbacks. Detailed mapping:
- `click_then_navigate` -> `Navigate to ${page.pageTitle ?? page.routeTemplate ?? 'page'}` (extension form, no enrichment).
- `fill_and_submit` -> extension form with `extractFieldLabels` + `appContextSuffix`.
- `send_action` -> extension form.
- `file_action` -> `Attach file${appContextSuffix}`.
- `data_entry` -> extension form with cell-ref detection.
- `annotation` -> read `event.annotation_text` (requires the `SegmentableEvent` field extension discussed in 3.6) or fall back to `target_summary.label`.
- `repeated_click_dedup` -> extension form.
- `error_handling` -> `Handle error${appContextSuffix}`.
- `single_action` -> extension form.

4.3. Update `packages/segmentation-engine/src/rules.test.ts` to match new expected strings. Every string change must be audited - for any title string where the old assertion was "better" than the new one, raise a design question; do not silently regress.

**CHECKPOINT-D:** `pnpm test` green. Regression tests from Step 1 still failing on LiveStep titles but shrinking; batch regression test should now pass for titles (because batch was already using this style - but the change is that the package's `deriveStepTitle` matches it too).

### Step 5: Convert `buildDerivedSteps` to a thin wrapper over `segmentEvents`

5.1. In `bundle-builder.ts`, replace the entire inline segmentation block (lines ~9-356) with:

```
import { segmentEvents, type SegmentableEvent } from '@ledgerium/segmentation-engine'

function toSegmentableEvents(events: CanonicalEvent[]): SegmentableEvent[] {
  return events.map(e => ({
    event_id: e.event_id,
    session_id: e.session_id,
    t_ms: e.t_ms,
    event_type: e.event_type,
    ...(e.page_context ? { page_context: e.page_context } : {}),
    ...(e.target_summary ? { target_summary: e.target_summary } : {}),
    normalization_meta: { sourceEventType: e.normalization_meta?.sourceEventType ?? '' },
    ...(e.annotation_text !== undefined ? { annotation_text: e.annotation_text } : {}),
  }))
}

export function buildDerivedSteps(events: CanonicalEvent[], sessionId: string): DerivedStep[] {
  const segmentable = toSegmentableEvents(events)
  return segmentEvents(segmentable, sessionId).steps
}
```

5.2. Update `bundle-builder.test.ts` - most tests should pass unchanged because the behaviour is preserved (modulo the Step 4 title migration, which already made the package's titles match the extension's).

5.3. Delete the inline helpers (`TARGET_CHANGE_GAP_MS`, `ACTION_BUTTON_PATTERNS`, `interactionTargetKey`, `isActionButtonClick`, `isFileInteraction`, `extractFieldLabels`, `appContextSuffix`, `meaningfulClickLabel`, `deriveTitle`, `calcConfidence`, `classifyGrouping`, `CELL_REF_RE`, the inline `buildDerivedSteps` loop). Keep only the public `buildDerivedSteps` and `buildBundle` exports.

**CHECKPOINT-E:** `pnpm test` green. `convergence-batch.regression.test.ts` now **passes** - DerivedStep output is byte-identical to the pre-convergence golden.

### Step 6: Convert `LiveStepBuilder` to a thin adapter over `StreamingSegmenter`

6.1. Rewrite `apps/extension-app/src/background/live-steps.ts`:

```
import { StreamingSegmenter, type DerivedStep, type SegmentableEvent } from '@ledgerium/segmentation-engine'
import type { CanonicalEvent, LiveStep } from '../shared/types.js'

function toSegmentableEvent(e: CanonicalEvent): SegmentableEvent { /* same as bundle-builder */ }

function toLiveStep(step: DerivedStep): LiveStep { /* see Section 3.6 */ }

export class LiveStepBuilder {
  private engine: StreamingSegmenter
  private onUpdate: (step: LiveStep) => void

  constructor(sessionId: string, onUpdate: (step: LiveStep) => void) {
    this.onUpdate = onUpdate
    this.engine = new StreamingSegmenter(sessionId, (step) => {
      this.onUpdate(toLiveStep(step))
    })
  }

  processEvent(event: CanonicalEvent): void {
    this.engine.processEvent(toSegmentableEvent(event))
  }

  finalize(): LiveStep[] {
    const finalSteps = this.engine.finalize()
    return finalSteps.map(toLiveStep)
  }

  getProvisionalStep(): LiveStep | null {
    const s = this.engine.getProvisionalStep()
    return s ? toLiveStep(s) : null
  }

  getFinalizedSteps(): LiveStep[] {
    return this.engine.getFinalizedSteps().map(toLiveStep)
  }

  reset(): void {
    this.engine.reset()
  }
}
```

6.2. No changes to `background/index.ts`. Public surface of `LiveStepBuilder` is preserved.

6.3. No changes to `session-store.ts`, `constants.ts`, `restoreStateIfNeeded`, or the `MSG.LIVE_STEP_UPDATED` wire format.

**CHECKPOINT-F (the final byte-equivalence gate):** `pnpm test` green. Both `convergence-live.regression.test.ts` and `convergence-batch.regression.test.ts` now pass - output byte-identical to the pre-convergence goldens.

### Step 7: Cleanup

7.1. Delete unused inline types and the `SEND_ACTION_PATTERNS` regex in `live-steps.ts` (now dead).

7.2. Update `docs/invariants.md` section 3.7 to reflect the new single-impl reality ("The streaming segmenter wraps the same rule primitives as the batch segmenter; equivalent finalized output is structurally guaranteed, not tested against a parallel implementation.").

7.3. Update `docs/adr/ADR-001-type-consolidation-strategy.md` status from "Phase 1 in progress" to "Phase 1 completed for segmentation".

7.4. Do NOT update `SEGMENTATION_RULE_VERSION`. No rule semantics changed from the user's perspective (same boundaries, same groupings, same titles, same confidences). A version bump is only appropriate if the rules themselves change, which they don't in this convergence.

### Step 8: Landing

Single commit per step (8 commits total including Step 1 fixtures). This is iter 011 under Mode 5 but the backlog item is a single blocker, so per the iter brief it is one iteration. All commits land together as one PR with CHECKPOINT-A through CHECKPOINT-F each linked in the PR description.

---

## 5. Regression Test Strategy

### 5.1 Golden fixtures

Source of truth: the pre-convergence output captured in Step 1 of the migration plan. These fixtures are the contract. If the fixtures are wrong, the migration is wrong.

The backend-engineer must capture fixtures BY RUNNING THE CURRENT CODE before making any changes, then commit the fixtures in the same commit that introduces the regression tests. This avoids a situation where the fixtures get "updated to match" a broken migration.

Locations:
- `packages/segmentation-engine/fixtures/golden/*.json` - canonical-event input fixtures.
- `packages/segmentation-engine/fixtures/expected/live/*.json` - LiveStep expected outputs.
- `packages/segmentation-engine/fixtures/expected/derived/*.json` - DerivedStep expected outputs.

### 5.2 Required fixtures (minimum set)

1. **demo** - the existing `fixtures/capture-runs/demo-events.ndjson` normalized. Exercises the full flow.
2. **spreadsheet-cells** - tests `target_changed` with cell-label tracking.
3. **action-button-then-other** - click Save, then click something else > 2s later. Should emit `action_completed` boundary.
4. **action-button-rapid-repeat** - click Save, click Save < 1s later. Should emit a single `repeated_click_dedup` step, not two `action_completed` steps.
5. **annotation-mid-stream** - interaction, annotation, more interactions. Should emit two flushes.
6. **idle-gap** - interaction, 50s gap, interaction. Should emit `idle_gap`.
7. **multi-domain-tabs** - interaction on domain A, then interaction on domain B (no nav event). Should emit `navigation_changed`.
8. **spa-route-change** - interaction, `navigation.route_change` to a new route, more interactions. Should emit `route_changed`.
9. **error-recovery** - interaction, `system.error_displayed`, interaction. Should classify as `error_handling`.
10. **fill-and-submit** - inputs then submit. Single step, `fill_and_submit` grouping.
11. **single-action-no-label** - a click with no target label. Confidence 0.55.
12. **empty-session** - zero canonical events. Zero steps.

### 5.3 Diff invariants

The regression test asserts `JSON.stringify(observed) === JSON.stringify(expected)`. NOT deep-equal. Why string equality:
- Catches field-ordering changes that deep-equal misses.
- Catches type changes (`{}` vs `null` vs omitted).
- Same check used by bundle-builder's SHA-256 content hash, so this test is functionally checking the same invariant that ships.

For each fixture, both a LiveStep golden AND a DerivedStep golden. For each golden, the regression test runs it through the new engine and asserts byte-identity.

Two additional invariants beyond direct byte-match:

**I1. Cross-path correspondence.** For every fixture, running events through the live path and running the same events through the batch path must produce equivalent step structure. This is a stronger form of invariant 3.7 and is the behavioural guarantee the convergence delivers.

> **§5.3 revision (coordinator, iter 012, 2026-04-19):** The original single-statement form of I1 (`liveFinalizedDerivedSteps === batchDerivedSteps`) presupposed the live path exposes raw `DerivedStep[]`. Post-iter-011 implementation, `LiveStepBuilder`'s public surface exposes only `LiveStep[]`, and the `DerivedStep → LiveStep` projection is provably lossy: `source_event_ids: string[]` collapses to `eventCount: number`, and `session_id` and `ordinal` are dropped. Byte-identity on the `DerivedStep` contract is therefore not observable through the current public API. I1 is split into two tiers:
>
> **I1a (testable today — iter 012 target).** LiveStep-level cross-path equality. For every fixture, assert `JSON.stringify(livePathLiveSteps) === JSON.stringify(batchPathLiveSteps)` where `batchPathLiveSteps = buildDerivedSteps(events).map(toLiveStep)`. This catches every failure mode the original I1 catches except exact preservation of `source_event_ids` array content, `session_id`, and `ordinal` — and those three are trivially equal in both paths because both paths compute them via the same `StreamingSegmenter` under the hood (iter-011 convergence). Specifically, I1a catches: step-boundary drift, grouping-reason drift, title drift, confidence drift, status drift, timing drift, `eventCount` drift (which detects set-size divergence in `source_event_ids` even without array-content comparison), and page-label drift.
>
> **I1b (deferred — requires production-code change).** Strict DerivedStep-level cross-path byte-identity. Requires a one-line non-breaking addition to `LiveStepBuilder` — `getDerivedSteps(): DerivedStep[]` returning `this.segmenter.getFinalizedSteps()` — so the raw `DerivedStep[]` from the live path is observable to a test. Once that accessor exists, `JSON.stringify(livePathDerivedSteps) === JSON.stringify(batchPathDerivedSteps)` becomes testable. I1b is tracked as an open follow-up in `IMPROVEMENT_BACKLOG.md` (#26, Birth iter 012); it will be its own iteration because the production-code change does not fit a burn-down test-add loop.

**I2. Determinism.** Each fixture is run twice; both runs produce identical output. This mirrors the existing batch-segmenter determinism test.

### 5.4 Test location and CI

Both convergence regression test files live in `packages/segmentation-engine/src/`. They are picked up by the package's existing Vitest configuration. No new CI steps required. They run under `pnpm test`.

The `apps/extension-app/` test suite gets a new file: `apps/extension-app/src/background/live-steps.test.ts`, which does NOT assert byte-identity (the package tests do that). Instead it asserts the adapter mapping: given a handcrafted `DerivedStep`, `toLiveStep` produces the expected `LiveStep` - covering the field-mapping cases documented in Section 3.6.

---

## 6. Risk Register

| # | Risk | Likelihood | Impact | Detection | Rollback |
|---|---|---|---|---|---|
| R1 | Title migration (Step 4) silently regresses shipped bundle titles | High | High (visible to end users, affects reports) | `convergence-batch.regression.test.ts` - must fail before Step 4 is accepted if any title changes | Revert Step 4 commit; keep Steps 1-3 (they don't affect bundle). |
| R2 | Action-boundary deferral (Step 3.5) produces different ordinal assignments than batch | Medium | High (violates invariant I1) | Fixture #3 and #4 cover this exactly | Revert Step 3; investigate; consider alternate deferral strategy (e.g. 100ms timer-based, but this breaks determinism - prefer the lookahead-by-one approach described). |
| R3 | Canonical event `annotation_text` lost across the `SegmentableEvent` boundary | Medium | Medium (annotation step titles degrade) | Fixture #5 covers this | Add `annotation_text?: string` field to `SegmentableEvent` type in `packages/segmentation-engine/src/types.ts`; update `toSegmentableEvent` and `toSegmentableEvents` to pass it through. This is a breaking change for any external consumer of `SegmentableEvent` - currently none exist outside the package itself. |
| R4 | Step 5 (bundle-builder migration) changes `fileHashes` value in the shipped manifest, invalidating prior exports | High (that's what it does) | Medium (but acceptable - any rule/title change does this) | `bundle-builder.test.ts` hash assertions | N/A - this is expected behaviour. If the content changes at all, the hash changes. The goldens prove the content doesn't change (R1). |
| R5 | `StreamingSegmenter` tests written against the old minimal behaviour now fail | High | Low (tests need updating) | `pnpm test` | Update tests to match new behaviour. If the test is asserting behaviour that contradicts the regression fixture, the test was wrong. If the test is asserting behaviour that the regression fixture doesn't cover, add a new fixture. |
| R6 | The extension and package disagree on `CanonicalEvent` vs `SegmentableEvent` field shape at runtime because the types are slightly different | Low | Low | Type-check via `pnpm typecheck`; runtime issues caught in E2E | Keep the explicit `toSegmentableEvent` helper as a coercion point. Do not change `CanonicalEvent` or `SegmentableEvent` type shapes in this iteration. |
| R7 | Live adapter's `pageLabel` field differs from today because the engine sets `page_context` differently on provisional vs current logic | Medium | Low (UI tolerates missing pageLabel) | Fixture #7 (multi-domain) covers this | If output differs, use the `extractPageContext` logic exactly as in `streaming-segmenter.ts` today (it's unchanged). If still different, add a test case in the adapter's own test file. |
| R8 | Iter-010 session event persistence code silently relies on internal `LiveStep` shape fields that change | Low | Critical (blocker regression) | `session-store.test.ts`, `session-restore.integration.test.ts` | The adapter emits the exact same `LiveStep` shape as today. Persistence code is untouched. The regression fixture for LiveSteps proves the shape is preserved. If either session-store test fails, STOP and investigate - do not land. |
| R9 | Provisional step ordinals differ from today because `DerivedStep.ordinal` is incremented but `LiveStep` drops it | Low | Low | Adapter test | Adapter drops `ordinal` (it was never on `LiveStep`). No risk. |
| R10 | The rollout is partial (e.g. Steps 1-3 land, Steps 4-6 don't) and behaviour becomes incoherent | Medium | High | CI fails between steps | Each step is independently revertible. If the merge window closes between steps, the last-landed step is a safe resting point - either the code hasn't converged yet (safe) or the regression tests are still passing (safe). No step leaves the tree in a broken state. |

### Rollback plan (overall)

The migration lands as 8 commits on a feature branch. If byte-equivalence regression tests fail at CHECKPOINT-F, the feature branch is abandoned. The release-blocker reverts to "not yet addressed" but no shipped code changes.

If the branch has been merged and a regression is found post-merge, individual step commits can be reverted in reverse order. Steps 6 (live adapter) and 5 (batch adapter) are the highest-risk; both can be reverted independently and the pre-convergence inline impls restored. Steps 3-4 (package changes) are pure additions; reverting them just unwires the new rules. The `StreamingSegmenter` grows capability monotonically, so a partial rollback does not break the package's own tests.

---

## 7. Out of Scope (iter 012+ follow-up candidates)

Items noticed during the audit that are valid improvements but are explicitly deferred to preserve one-item-per-loop discipline.

1. **`SEGMENTATION_RULE_VERSION` doc drift.** `docs/invariants.md` line 172 says `'1.0.0'`; code says `'1.1.0'`. Low risk, but needs a doc PR.

2. **`LiveStep` type tightening.** `grouping?: string` and `boundaryReason?: string` should be typed unions matching `GroupingReason` / `BoundaryReason`. The adapter already writes valid union values; the type just doesn't enforce it.

3. **`SegmentableEvent` rationalization.** The package defines its own subset of `CanonicalEvent`. The `toSegmentableEvent` helper exists because `CanonicalEvent` has a few extra optional fields. Options: (a) make `SegmentableEvent = CanonicalEvent` and let the package own the canonical type, or (b) publish `SegmentableEvent` from `@ledgerium/shared-types` so both `CanonicalEvent` and `SegmentableEvent` come from the same place. Option (b) matches ADR-001's vector.

4. **Golden regression fixtures for the full normalizer -> segmentation pipeline.** Today the segmentation fixtures start from canonical events. A full-pipeline fixture (`demo-events.ndjson -> derived_steps.json`) would catch normalizer regressions that segmentation tests miss. Referenced in `docs/test-plan.md` lines 62 and 125 but not yet implemented.

5. **Remove the `StreamingSegmenter.lastNavigationDomain` reset on session_stop.** After convergence, this may leak between sessions if the engine is reused (it's not in the current code path, but the new `LiveStepBuilder.reset()` flows through to `StreamingSegmenter.reset()` which handles it).

6. **Tighten the action-button defer logic.** The one-event-lookahead approach works but is a slightly weaker model than the batch peek. Consider exposing a `processEvents(events[])` batch-mode entry on `StreamingSegmenter` for tests that want true lookahead semantics.

7. **Unit tests for `LiveStepBuilder`.** Currently zero. Post-convergence the file is small enough (~30 lines) that the adapter test (`live-steps.test.ts`) proposed in Section 5.4 is sufficient, but additional integration tests against `useRecorderState`'s merge semantics would strengthen coverage.

8. **Spreadsheet cell label tracking symmetry.** The batch `segmentEvents` does not track `lastLabelBySelector` the way `buildDerivedSteps` does. This is a pre-existing divergence between the two batch impls. After Step 5 the extension's `buildDerivedSteps` becomes a wrapper around `segmentEvents`, so the tracking behaviour CHANGES for the extension too unless we port it into `segmentEvents`. This must be addressed inside Step 3 of the migration plan (port the tracking into the shared primitive). If the backend-engineer discovers during implementation that the fixtures don't exercise this and the behaviour accidentally regresses, they must add a fixture AND port the tracking. Flagged here so nobody misses it.

---

## 8. Open Questions

None that block the backend-engineer. The title-derivation strategy (D12) is the only non-mechanical decision and is resolved here: adopt the extension-side style as the package canonical style.

If the backend-engineer finds during implementation that Item 8 above (spreadsheet cell label tracking) requires a more invasive change than expected, they should escalate back to the architect for a scope decision rather than ship a subtle behavioural drift.

---

## 9. Handoff Summary for backend-engineer

You will:
1. Read this doc.
2. Capture golden fixtures from the CURRENT code (Step 1).
3. Write the failing regression tests (Step 1).
4. Execute Steps 2-7 in order, verifying `pnpm typecheck && pnpm test` green at each checkpoint.
5. Confirm CHECKPOINT-F: both regression tests pass, byte-identical output on both contracts.
6. Update `docs/invariants.md` 3.7 per Step 7.2.
7. Open a PR tagged `iter-011` with a description that links each checkpoint to a commit.

You will not:
- Touch `session-store.ts`, `constants.ts` storage keys, or `restoreStateIfNeeded` (iter-010 code).
- Bump `SEGMENTATION_RULE_VERSION`.
- Change the `LiveStep` shape or the `MSG.LIVE_STEP_UPDATED` wire protocol.
- Silently update golden fixtures to make tests pass.
- Introduce new randomness, timer-based logic, or Date.now() calls.

Files you will touch:
- `packages/segmentation-engine/src/streaming-segmenter.ts` (major changes - absorb missing rules)
- `packages/segmentation-engine/src/rules.ts` (title derivation migration; may gain `grouping.ts` / `titling.ts` sibling files)
- `packages/segmentation-engine/src/batch-segmenter.ts` (import shared primitive; no behaviour change)
- `packages/segmentation-engine/src/types.ts` (possibly add `annotation_text?: string` to `SegmentableEvent`)
- `packages/segmentation-engine/src/index.ts` (export any new shared primitives)
- `packages/segmentation-engine/fixtures/**` (new)
- `packages/segmentation-engine/src/convergence-live.regression.test.ts` (new)
- `packages/segmentation-engine/src/convergence-batch.regression.test.ts` (new)
- `packages/segmentation-engine/src/streaming-segmenter.test.ts` (update expectations)
- `packages/segmentation-engine/src/rules.test.ts` (update title expectations if any)
- `apps/extension-app/src/background/bundle-builder.ts` (remove inline impl; import from package)
- `apps/extension-app/src/background/bundle-builder.test.ts` (minimal updates if any)
- `apps/extension-app/src/background/live-steps.ts` (rewrite as adapter)
- `apps/extension-app/src/background/live-steps.test.ts` (new - adapter tests only)
- `docs/invariants.md` (Section 3.7 update at the end)
- `docs/adr/ADR-001-type-consolidation-strategy.md` (status update)

Files you will NOT touch:
- Anything under `apps/extension-app/src/sidepanel/` (UI consumes `LiveStep` and is unchanged)
- `apps/extension-app/src/background/session-store.ts`
- `apps/extension-app/src/background/normalizer.ts` (except to inspect, if needed)
- `apps/extension-app/src/shared/constants.ts`
- `apps/extension-app/src/shared/types.ts` `LiveStep` interface

---

## 10. Ready for backend-engineer implementation

**Ready for backend-engineer implementation: yes** - the design is complete, contracts are explicit, the migration is sequenced with independently-verifiable checkpoints, and the byte-equivalence regression strategy is defined. The one subtle implementation hazard (action-boundary one-event-lookahead determinism - R2) is documented with a concrete mitigation. The one scope ambiguity (spreadsheet cell label tracking in Section 7 item 8) has a resolution embedded in Step 3. No architecture-level guesses required.
