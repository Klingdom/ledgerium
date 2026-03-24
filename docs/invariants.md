# Ledgerium AI — Codebase Invariants

**Last updated:** 2026-03-24
**Authoritative source:** This file is the canonical reference for all
behavioral invariants. After a context compaction event, re-read this file
before writing or reviewing any code.

---

## 1. Recorder State Machine Invariants

### 1.1 Valid States

| State | Meaning |
|---|---|
| `idle` | No session active. Initial state. |
| `arming` | Permissions loading, policy init, session ID assignment in progress. |
| `recording` | Actively capturing events. |
| `paused` | User-initiated pause. No workflow events captured. |
| `stopping` | Final derivation and packaging running. No new workflow events accepted. |
| `review_ready` | Bundle built. User can review, export, or discard. |
| `error` | Unrecoverable error encountered. |

### 1.2 Valid Transitions

```
idle         → arming, error
arming       → recording, idle, error
recording    → paused, stopping, error
paused       → recording, stopping, error
stopping     → review_ready, error
review_ready → idle, error
error        → idle
```

Source of truth: `packages/shared-types/src/session.ts` — `VALID_TRANSITIONS`
constant. The `RecorderStateMachine` class in
`apps/extension-app/src/background/state-machine.ts` enforces these
transitions by throwing `Error: Invalid state transition: X → Y` on any
illegal attempt.

### 1.3 State Behavior Rules

- **Capture events are accepted only when state is `recording`.** The
  background `RAW_EVENT_CAPTURED` handler explicitly gates on
  `sm.state !== 'recording'` and breaks out of the switch if the state does
  not match.
- **`paused` state:** Content scripts are notified via `PAUSE_SESSION`
  broadcast; `CaptureEngine.isPaused` is set to `true`; no raw events
  are emitted.
- **`stopping` state:** No new workflow events are accepted. The live step
  builder is flushed (`liveBuilder.finalize()`), then `buildBundle` is
  awaited before transitioning to `review_ready`.
- **`arming` state:** Session ID is assigned, `SessionStore` is initialized,
  and `LiveStepBuilder` is created before transitioning to `recording`.
- **`review_ready → idle` transition:** Triggered by discard or new session
  start. `store.clear()` and `sm.reset()` are both called, which resets
  the state machine directly to `idle` without going through normal
  transition logic.
- **`error` recovery:** The only valid transition out of `error` is to
  `idle`. Recovery does not re-arm automatically.
- Every state transition broadcasts `SESSION_STATE_UPDATED` to the
  extension runtime.

### 1.4 Pause Interval Tracking

`SessionMeta.pauseIntervals` is an array of `{ pausedAt: string; resumedAt?: string }`.
- A new entry is pushed when state transitions to `paused`.
- The last entry's `resumedAt` is filled when state transitions back to
  `recording`.
- `endedAt` is set when state transitions to `stopping`.

---

## 2. Data Pipeline Invariants

### 2.1 Event Ordering

- `t_ms` is a monotonically non-decreasing integer within a session,
  measured in milliseconds from session start (not epoch).
- `t_wall` is an ISO 8601 datetime string of the wall-clock time at
  capture.
- Both fields are required on every `RawCaptureEvent` and `CanonicalEvent`.
- The pipeline never reorders events. Input order to the segmenter must
  match capture order.

### 2.2 Identifiers

- `raw_event_id`: UUID v4, assigned by the content script at capture time.
- `event_id`: UUID v4, assigned by the normalization engine when producing
  a `CanonicalEvent`. It is NOT the same as `raw_event_id`. Every canonical
  event (including `system.capture_blocked` and `system.redaction_applied`)
  gets a fresh `event_id`.
- `session_id`: Assigned by `SessionStore.initSession()` via `generateId()`
  (UUID v4). The same `session_id` propagates through every raw event,
  canonical event, derived step, and the bundle manifest.

### 2.3 Immutability

- Raw events are appended to `SessionStore.rawEvents` and never mutated
  after write. `getRawEvents()` returns a shallow copy.
- Canonical events are appended to `SessionStore.canonicalEvents` and never
  mutated after write. `getCanonicalEvents()` returns a shallow copy.
- The policy log is append-only. `getPolicyLog()` returns a shallow copy.
- Bundle artifacts are written once. The `BundleManifest.fileHashes`
  record contains SHA-256 digests of the JSON-serialized content of each
  file in the bundle; these must not be regenerated from mutated data.

### 2.4 Normalization Provenance

Every `CanonicalEvent` carries `normalization_meta` with:
- `sourceEventId`: the `raw_event_id` it was derived from.
- `sourceEventType`: the raw event type string.
- `normalizationRuleVersion`: the rule version constant at time of normalization.
- `redactionApplied`: boolean.
- `redactionReason`: present only when `redactionApplied` is `true`.

This field is never omitted, never null.

### 2.5 Raw-to-Canonical Type Mapping

The following mapping is fixed. Adding, removing, or changing a mapping
requires a deliberate schema migration:

```
tab_activated      → navigation.tab_activated
url_changed        → navigation.open_page
page_loaded        → navigation.open_page
spa_route_changed  → navigation.route_change
click              → interaction.click
dblclick           → interaction.click
input_changed      → interaction.input_change
form_submitted     → interaction.submit
element_focused    → interaction.input_change
element_blurred    → interaction.input_change
session_start      → session.started
session_pause      → session.paused
session_resume     → session.resumed
session_stop       → session.stopped
user_annotation    → session.annotation_added
```

An unknown raw type produces a warning and is skipped — it does not
produce a canonical event and does not produce a policy log entry.

### 2.6 Pre-normalization Deduplication

Before the normalization pass, `normalizeSession` applies three dedup rules:

1. **Rapid duplicate click:** A `click` or `dblclick` on the same
   `target_selector` within **300 ms** of the previous click is dropped
   before normalization.
2. **Superseded focus:** An `element_focused` event immediately followed
   by another `element_focused` is dropped (the first is superseded).
3. **Net-zero focus/blur:** An `element_focused` immediately followed by
   `element_blurred` with no intervening input: both are dropped.

---

## 3. Segmentation Invariants

### 3.1 Critical Constants

These values are fixed. They must not be recalculated, tuned, or
"improved" without explicit architectural approval and a new rule version.

| Constant | Value | Location |
|---|---|---|
| `IDLE_GAP_MS` | `45_000` ms | `packages/segmentation-engine/src/rules.ts`, `apps/extension-app/src/shared/constants.ts` |
| `CLICK_NAV_WINDOW_MS` | `2_500` ms | same files |
| `RAPID_CLICK_DEDUP_MS` | `1_000` ms | same files |
| `SEGMENTATION_RULE_VERSION` | `'1.0.0'` | `packages/segmentation-engine/src/rules.ts`, `apps/extension-app/src/shared/constants.ts` |

### 3.2 Step ID Format

Finalized steps in the batch segmenter and bundle builder use:
```
${sessionId}-step-${ordinal}
```
where `ordinal` is a **1-based integer** that increments by 1 for each
finalized step in session order. The first step has ordinal `1`.

The streaming segmenter uses the same format for finalized steps.
Provisional (in-progress) steps use the ID `${sessionId}-step-provisional`
and are never stored in the final bundle.

Step IDs are deterministic. The same event sequence for the same session ID
always produces the same step IDs. **`generateStepId()` in `rules.ts` must
not be used for batch/bundle steps** — it generates a random UUID and would
break determinism. It exists for optional use in non-deterministic contexts.

### 3.3 source_event_ids Filtering

`system.*` and `derived.*` events are **excluded** from step construction.
Only events that do not match those prefixes are accumulated into steps.
The filter is applied before the main segmentation loop in both the batch
segmenter (`isSystemOrDerived` helper) and the bundle builder's
`buildDerivedSteps` function.

### 3.4 Grouping Reason Classification

Evaluation order for `classifyGroupingReason` is strict — more specific
patterns are checked first. Do not reorder:

1. `annotation`: single event of type `session.annotation_added`.
2. `fill_and_submit`: accumulator contains `interaction.submit` AND at
   least one `interaction.input_change`.
3. `click_then_navigate`: a `interaction.click` followed within
   `CLICK_NAV_WINDOW_MS` by `navigation.route_change` or
   `navigation.open_page`.
4. `repeated_click_dedup`: two or more `interaction.click` events on the
   **same selector** within `RAPID_CLICK_DEDUP_MS` of each other.
5. `single_action`: default fallback.

### 3.5 Confidence Scores

These scores are fixed invariants. They map directly to tests in
`packages/segmentation-engine/src/rules.test.ts` and must not change
without a new rule version:

| Grouping Reason | Confidence |
|---|---|
| `annotation` | `1.0` |
| `fill_and_submit` | `0.9` |
| `click_then_navigate` | `0.85` |
| `error_handling` | `0.8` |
| `repeated_click_dedup` | `0.7` |
| `single_action` with a concrete target label | `0.75` |
| `single_action` without any target label | `0.55` |

"Concrete target label" is defined as: `events[0].target_summary.label` is
not `undefined`.

### 3.6 Boundary Reasons

Valid `BoundaryReason` values (from `packages/segmentation-engine/src/types.ts`):
- `form_submitted` — triggered immediately after `interaction.submit` is
  added to the accumulator.
- `navigation_changed` — triggered when a navigation event carries a
  `page_context.domain` different from the most recently seen navigation
  domain, with a non-empty accumulator.
- `app_context_changed` — (reserved; not yet triggered by any rule).
- `idle_gap` — triggered when the gap between consecutive events exceeds
  `IDLE_GAP_MS`.
- `user_annotation` — triggered before and after a
  `session.annotation_added` event: the previous accumulator is flushed,
  then the annotation forms its own single-event step.
- `session_stop` — triggered when `session.stopped` is encountered, and
  at end-of-loop to flush remaining accumulated events.
- `explicit_boundary` — (reserved; not yet triggered by any rule).

### 3.7 Streaming vs Batch Consistency

The streaming segmenter (`StreamingSegmenter`) and the batch segmenter
(`segmentEvents`) must produce **identical finalized steps** for the same
ordered event sequence. This is a tested invariant. The same boundary
trigger logic and `classifyGroupingReason` implementation is maintained
in both files (they are separate implementations that must stay in sync).

### 3.8 Determinism Rule

The batch segmenter `segmentEvents` is a **pure function**: no random
values, no external state, no `Date.now()`. Step IDs derive from
`sessionId` and ordinal. Given the same `events` array and `sessionId`,
the output is bit-for-bit identical every time.

---

## 4. Bundle/Export Invariants

### 4.1 Five-File Bundle Structure

A `SessionBundle` always contains exactly these five logical files:

| Key in SessionBundle | Logical filename | Content |
|---|---|---|
| `sessionJson` | `session.json` | `SessionMeta` — recorder config, version strings, pause intervals |
| `normalizedEvents` | `normalized_events.json` | `CanonicalEvent[]` — the complete canonical event log |
| `derivedSteps` | `derived_steps.json` | `DerivedStep[]` — finalized steps with evidence refs |
| `policyLog` | `policy_log.json` | `PolicyLogEntry[]` — every redaction/block event |
| `manifest` | `manifest.json` | `BundleManifest` — file hashes, export timestamp, version strings |

### 4.2 Manifest Hash Requirements

`BundleManifest.fileHashes` contains SHA-256 hex digests keyed by logical
filename. The manifest covers four files:

```
'session.json'           → sha256Hex(JSON.stringify(meta))
'normalized_events.json' → sha256Hex(JSON.stringify(canonicalEvents))
'derived_steps.json'     → sha256Hex(JSON.stringify(derivedSteps))
'policy_log.json'        → sha256Hex(JSON.stringify(policyLog))
```

The manifest itself is not hashed (it cannot hash itself).

### 4.3 Required Manifest Fields

```typescript
BundleManifest {
  sessionId: string           // same as SessionMeta.sessionId
  exportedAt: string          // ISO 8601 wall-clock time of export
  schemaVersion: string       // SCHEMA_VERSION constant
  recorderVersion: string     // RECORDER_VERSION constant
  segmentationRuleVersion: string  // SEGMENTATION_RULE_VERSION constant
  rendererVersion: string     // RENDERER_VERSION constant
  fileHashes: Record<string, string>
}
```

### 4.4 Export Failure

Export fails visibly (throws, not silently) if `SessionStore.getMeta()`
returns `null`. Partial bundles are never written — the entire bundle is
built in memory and only returned (or uploaded) once complete.

---

## 5. Policy/Privacy Invariants

### 5.1 Hardcoded Privacy Defaults

These three fields in `PolicyConfig` are typed as literal `false` and are
hardcoded in `DEFAULT_POLICY`. They cannot be set to `true` in Phase 0-1:

```typescript
captureTextInputValues: false   // always false
captureScreenshots: false       // always false
captureDomSnapshots: false      // always false
```

`ExtensionSettings.captureScreenshots` is also typed as literal `false`.

### 5.2 Block Outcome

When `applyPolicy` returns `outcome: 'block'` (domain in blocked list, or
domain not in non-empty allowed list), the normalizer produces a
`system.capture_blocked` canonical event with:
- `actor_type: 'system'`
- `normalization_meta.redactionApplied: false`
- `normalization_meta.redactionReason` containing the blocked domain

A `PolicyLogEntry` with `outcome: 'block'` is also written.

The original raw event is not passed through as a canonical event of its
natural type. The `system.capture_blocked` event IS the canonical record
for that raw event.

### 5.3 Redact Outcome

When `applyPolicy` returns `outcome: 'redact'`, or when a sensitive target
is detected during normalization:
- `target_summary.label` is set to `undefined` (omitted from output).
- The canonical `event_type` is changed to `system.redaction_applied`.
- `normalization_meta.redactionApplied: true`.
- A `PolicyLogEntry` with `outcome: 'redact'` is written.

### 5.4 Sensitive Target Detection

A target is classified as sensitive if any of the following is true:
- `is_sensitive_target === true` on the raw event.
- `target_element_type` is `'password'`.
- `target_selector` matches: `/password|passwd|secret/i` (inline check in
  normalizer) or any pattern in `SENSITIVE_SELECTOR_PATTERNS` (policy
  engine).
- `classifySensitivity()` returns `isSensitive: true` based on combined
  selector + label text matching patterns for: password/secret/token/api_key,
  credit card, SSN/government ID.

### 5.5 Sensitive Input Types (Capture Layer)

The content script `CaptureEngine` never captures values from:
- `type="password"` or `type="hidden"` inputs (blocked at capture; emits
  `input_changed` with `is_sensitive_target: true`, no label, no selector).
- Any element whose `data-testid`, `name`, `id`, or `aria-label` matches
  `/password|passwd|secret|token|api[_-]?key|credit|cvv|ssn/i`.

Sensitive elements are never passed the `target_label` or `target_selector`
fields in the raw event — these are omitted at the capture layer, not just
at normalization.

### 5.6 Transparency Requirement

Redaction and blocking are never silent. Every redacted or blocked event
produces:
1. A canonical event of type `system.redaction_applied` or
   `system.capture_blocked` in `normalized_events.json`.
2. A `PolicyLogEntry` in `policy_log.json`.

---

## 6. Schema Version Invariants

All version strings are `as const` literals. They must not be changed
without explicit architectural decision, schema migration, and update to
this document.

| Constant | Value | File |
|---|---|---|
| `SCHEMA_VERSION` | `'1.0.0'` | `packages/schema-events/src/raw-event.schema.ts`, `apps/extension-app/src/shared/constants.ts` |
| `NORMALIZATION_RULE_VERSION` | `'1.0.0'` | `packages/normalization-engine/src/normalizer.ts` |
| `SEGMENTATION_RULE_VERSION` | `'1.0.0'` | `packages/segmentation-engine/src/rules.ts`, `apps/extension-app/src/shared/constants.ts` |
| `RECORDER_VERSION` | `'0.1.0'` | `apps/extension-app/src/shared/constants.ts` |
| `RENDERER_VERSION` | `'0.1.0'` | `apps/extension-app/src/shared/constants.ts` |

The `CanonicalEventSchema` uses `z.literal('1.0.0')` for `schema_version`,
meaning any canonical event not bearing exactly `'1.0.0'` will fail
validation.

The `PolicyConfig.ruleVersion` default is `'1.0.0'` and is tracked
separately from schema version. Rule version changes are auditable via the
`policy_log.json` entries and the `segmentation_rule_version` field in the
bundle manifest.

---

## 7. Message Bus Invariants

### 7.1 MSG Constants

All message type strings are defined on the `MSG` object in
`packages/shared-types/src/messages.ts`. Do not use string literals inline
for message types — always use `MSG.*`.

```typescript
MSG.START_SESSION         = 'START_SESSION'
MSG.PAUSE_SESSION         = 'PAUSE_SESSION'
MSG.RESUME_SESSION        = 'RESUME_SESSION'
MSG.STOP_SESSION          = 'STOP_SESSION'
MSG.DISCARD_SESSION       = 'DISCARD_SESSION'
MSG.SESSION_STATE_UPDATED = 'SESSION_STATE_UPDATED'
MSG.RAW_EVENT_CAPTURED    = 'RAW_EVENT_CAPTURED'
MSG.NORMALIZED_EVENT_ADDED = 'NORMALIZED_EVENT_ADDED'
MSG.LIVE_STEP_UPDATED     = 'LIVE_STEP_UPDATED'
MSG.FINALIZATION_COMPLETE = 'FINALIZATION_COMPLETE'
MSG.FINALIZATION_FAILED   = 'FINALIZATION_FAILED'
MSG.UPLOAD_PROGRESS       = 'UPLOAD_PROGRESS'
MSG.SETTINGS_UPDATED      = 'SETTINGS_UPDATED'
MSG.GET_STATE             = 'GET_STATE'
MSG.EXPORT_BUNDLE         = 'EXPORT_BUNDLE'
MSG.GET_SETTINGS          = 'GET_SETTINGS'
```

### 7.2 Broadcast Messages (fire-and-forget)

These messages are sent with `chrome.runtime.sendMessage` without
expecting a synchronous response. The handler does not return `true`.

| Message | Direction | When |
|---|---|---|
| `SESSION_STATE_UPDATED` | background → side panel | Every state transition |
| `NORMALIZED_EVENT_ADDED` | background → side panel | After each successful normalization |
| `LIVE_STEP_UPDATED` | background → side panel | After each provisional/finalized step update |
| `FINALIZATION_COMPLETE` | background → side panel | After bundle is built on stop |
| `FINALIZATION_FAILED` | background → side panel | If bundle build throws |
| `UPLOAD_PROGRESS` | background → side panel | During and after upload |

### 7.3 Request/Response Messages

These messages use `sendResponse` and require the listener to `return true`
to keep the channel open for async response.

| Message | Direction | Response type |
|---|---|---|
| `GET_STATE` | side panel → background | `GetStateResponse`: `{ state, meta, steps }` |
| `EXPORT_BUNDLE` | side panel → background | `SessionBundle \| null` |
| `GET_SETTINGS` | side panel → background | `GetSettingsResponse`: `{ settings }` |

### 7.4 Command Messages (no response expected from background)

These are sent by the side panel to the background to trigger lifecycle
actions. The background handler processes them and broadcasts state updates.

| Message | Sent by | Action |
|---|---|---|
| `START_SESSION` | side panel | Triggers `handleStart` |
| `PAUSE_SESSION` | side panel | Triggers `handlePause` |
| `RESUME_SESSION` | side panel | Triggers `handleResume` |
| `STOP_SESSION` | side panel | Triggers `handleStop` |
| `DISCARD_SESSION` | side panel | Triggers `handleDiscard` |
| `SETTINGS_UPDATED` | side panel | Updates settings in memory and storage |

### 7.5 Content Script Messages

`START_SESSION`, `PAUSE_SESSION`, `RESUME_SESSION`, `STOP_SESSION`, and
`DISCARD_SESSION` are also forwarded by the background to all tabs via
`broadcastAllTabs`. The content script `CaptureEngine` acts on these to
start, pause, resume, or stop event capture.

`RAW_EVENT_CAPTURED` flows in the reverse direction: content script → background.

### 7.6 Storage Keys

```typescript
STORAGE_KEY_SESSION  = 'ledgerium_active_session'   // chrome.storage.local
STORAGE_KEY_SETTINGS = 'ledgerium_settings'          // chrome.storage.sync
```

Session metadata is persisted to `chrome.storage.local` on every state
change and on session init. Raw events, canonical events, and policy log
entries are held in memory only — they are not persisted to storage.
