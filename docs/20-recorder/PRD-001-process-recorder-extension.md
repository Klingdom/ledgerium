# PRD-001: Process Recorder Sidebar Extension

**Version:** 1.0
**Status:** Draft
**Phase:** 0 → 1
**Last updated:** 2026-03-24

---

## 1. Problem Statement

Process documentation in most organizations is fiction. SOPs are written
once, never updated, and bear no relationship to how work is actually done.
When a team tries to automate, audit, or improve a process, they discover
the documentation is stale, incomplete, or describes a best-case path that
no one follows.

The root cause is that documentation is created from memory and opinion,
not from observation. There is no low-friction mechanism to capture real
work as it happens in a browser, convert it into structured process
knowledge, and keep that knowledge traceable to the actual evidence that
produced it.

Existing solutions fall into three categories, each with a fatal flaw:
- **Screen recorders:** Capture video or screenshots but produce no
  structured data. Not machine-readable, not privacy-safe, not inspectable.
- **Task mining / process mining tools:** Require data warehouse integration,
  long setup cycles, and enterprise sales. Not available at the point of work.
- **AI summarizers:** Invent structure from thin air. Cannot be audited.
  Output is unverifiable opinion, not evidence.

There is no tool that captures browser workflow activity at the point of
work, converts it into structured, evidence-linked process artifacts, and
stays local by default.

---

## 2. Product Vision

Ledgerium AI is a **trust-first, deterministic, evidence-linked process
intelligence platform** that converts observed browser workflow activity
into auditable process maps, SOPs, and reusable process knowledge.

**Core principle:** Reality before opinion. Evidence before interpretation.
Determinism before abstraction.

### 2.1 What Ledgerium IS

- A browser extension that captures structured signals of real work as you
  do it.
- A deterministic pipeline that converts captured signals into inspectable
  process steps — same input always produces the same output.
- An evidence ledger: every derived output is traceable back to the specific
  events that produced it.
- A local-first tool: all data stays in the browser by default; nothing
  leaves without explicit user action.

### 2.2 What Ledgerium IS NOT

- Not a screen recorder or surveillance tool. No screenshots, no video,
  no keylogging, no raw text capture.
- Not an AI summarizer. AI is an optional enhancement layer (Phase 5),
  never the source of structure.
- Not an autonomous BPM suite. It does not design processes, enforce
  workflows, or instruct users.
- Not a generic analytics dashboard. It is a process knowledge tool, not
  a monitoring tool.

### 2.3 Trust Boundary Model

Every output produced by Ledgerium must carry one of four trust labels.
These labels are not cosmetic — they determine how outputs may be used
and what downstream claims they support:

| Label | Meaning | Examples |
|---|---|---|
| **Observed** | Directly captured from browser activity | Raw events, canonical events |
| **Derived deterministically** | Produced by applying versioned rules to evidence | Steps, activity groups, process maps |
| **User-edited / user-confirmed** | Human override of a derived output | Edited step title, confirmed annotation |
| **AI-assisted** | Optional AI enhancement, never source of truth | Suggested step names, SOP readability pass |

No output may claim a higher trust level than its inputs support. A step
derived from observed events is "derived deterministically," not "observed."
An AI suggestion is "AI-assisted," not "derived."

---

## 3. User Personas

### 3.1 Operator / Individual Contributor (Primary Recorder)

**Who:** A person who executes browser-based workflows regularly — data
entry, procurement, case management, finance operations, HR processing.

**Goals:**
- Record a workflow without it interrupting or slowing down their work.
- See a summary of what was captured and confirm it looks right.
- Export a session for their own records or to share with their team.

**Constraints:**
- Not technical. Should not need to understand event schemas or derivation
  rules.
- Privacy-sensitive. Will not use a tool that captures passwords, personal
  data, or content they consider private.
- Time-constrained. Setup and review must be fast.

### 3.2 Team Lead / Process Improvement Lead (SOP Creator)

**Who:** A person responsible for documenting how their team's processes
work, training new staff, or driving process improvement initiatives.

**Goals:**
- Collect recordings from multiple executions of the same workflow.
- Review the derived process map and SOP for accuracy.
- Publish a canonical SOP that is grounded in observed behavior, not invented.

**Constraints:**
- Needs confidence that the documentation reflects reality, not a best-case
  path someone wrote from memory.
- Needs to be able to show an auditor where each step came from.

### 3.3 Compliance Reviewer / Auditor

**Who:** A person who needs to verify that a process was executed correctly
or that documentation matches actual behavior.

**Goals:**
- Inspect the evidence behind a derived process step.
- Confirm that sensitive fields were not captured.
- Verify that the policy log shows all redaction events.

**Constraints:**
- Needs immutable, timestamped records.
- Needs complete audit trail from derived output back to source event.
- Will be suspicious of any system that "just summarizes" without showing
  its work.

---

## 4. User Journeys

### 4.1 Operator: Recording a Workflow

**Job to be done:** Capture a workflow I do regularly so it can be
documented without me writing anything.

**Journey:**
1. Click the extension icon to open the side panel.
2. Enter a name for the activity (e.g., "Submit expense report").
3. Click Start Recording. The panel immediately shows "Arming..." then
   "Recording."
4. Execute the workflow in the browser tab as normal.
5. Optionally click "Mark important moment" to add an annotation.
6. Optionally click Pause if interrupted; click Resume when ready.
7. Click Stop Recording when the workflow is complete.
8. Review the derived steps in the side panel. Confirm they look right.
9. Click Export to download the session bundle.

**Success criteria:**
- Recording starts within 1 second of clicking Start.
- All meaningful actions are captured as steps with readable titles.
- No passwords or sensitive field values appear anywhere in the export.
- Export completes within 5 seconds of clicking Export.

**Failure modes:**
- Extension crashes mid-recording, losing the session (mitigated by
  persisting `SessionMeta` to `chrome.storage.local` on every state change).
- Sensitive field is captured and appears in the export (prevented by
  multi-layer sensitive field detection at capture and normalization).
- Recording continues silently when paused (prevented by state machine
  gating; content script `CaptureEngine` checks `isPaused` on every event).

### 4.2 Team Lead: Reviewing a Captured Session

**Job to be done:** Understand what was captured and confirm the step
summary is accurate before sharing it.

**Journey:**
1. Open the extension side panel after recording stops.
2. Review the finalized step list. Each step shows: title, confidence,
   boundary reason, and the number of contributing events.
3. Expand a step to see the contributing normalized events, their types,
   and the page context.
4. Note any steps with low confidence (below 0.7) and consider annotating
   them.
5. Export the bundle.

**Success criteria:**
- Every step has a `boundary_reason` and `evidence_refs`.
- Steps with low confidence are visually distinct.
- The evidence drawer shows the trust label for each section (Observed /
  Derived / AI-enhanced / User-edited).

**Failure modes:**
- Derived steps do not map back to recognizable user actions (mitigated by
  evidence refs and `boundary_reason` on every step).
- Steps are over-segmented, producing too many trivial steps (mitigated by
  idle gap deduplication and multi-event grouping rules).

### 4.3 Compliance Reviewer: Auditing an Exported Session

**Job to be done:** Verify that a captured session is complete, tamper-free,
and that sensitive data was handled correctly.

**Journey:**
1. Receive the exported session bundle (zip or JSON).
2. Inspect `manifest.json` for SHA-256 hashes of all bundle files.
3. Verify hashes against the actual file contents.
4. Inspect `policy_log.json` to confirm all redaction events are present.
5. Inspect `normalized_events.json` to confirm no sensitive field labels or
   values appear.
6. Inspect `derived_steps.json` to confirm each step has `source_event_ids`
   traceable to events in `normalized_events.json`.

**Success criteria:**
- Every `system.redaction_applied` event in `normalized_events.json` has a
  corresponding entry in `policy_log.json`.
- No `target_summary.label` appears on any event where `isSensitive: true`.
- Every derived step's `source_event_ids` reference real `event_id` values
  in `normalized_events.json`.
- SHA-256 hashes in `manifest.json` match the actual file contents.

**Failure modes:**
- Policy log is incomplete (prevented by the invariant that every redacted
  or blocked event must produce a policy log entry).
- Hashes do not match (indicates tampering; the manifest is produced at
  export time from the live data in `SessionStore`).

---

## 5. Functional Requirements

### Session Lifecycle

**FR-001 — Start session**
The user must be able to start a recording session by providing an activity
name. The extension must transition to `arming` state within 1 second,
then to `recording` state once initialization is complete.

**FR-002 — Pause session**
The user must be able to pause a recording session. While paused, no
workflow events may be captured or stored. The pause interval must be
recorded with an ISO 8601 timestamp.

**FR-003 — Resume session**
The user must be able to resume a paused session. The resume timestamp
must be recorded against the most recent pause interval.

**FR-004 — Stop session**
The user must be able to stop a recording session. On stop, the extension
must transition to `stopping` state, run final derivation, build the session
bundle, and then transition to `review_ready`.

**FR-005 — Discard session**
The user must be able to discard a session (before or after review). Discard
requires explicit confirmation. After discard, all session data is cleared
from memory and storage, and the extension returns to `idle`.

**FR-006 — State machine enforcement**
All state transitions must be validated against `VALID_TRANSITIONS`. An
invalid transition attempt must throw an error and transition to `error`
state, not silently fail or produce an inconsistent state.

### Capture

**FR-007 — Click capture**
The extension must capture click events on all elements except those
identified as sensitive. Captured data: `target_selector`, `target_label`
(first 80 characters), `target_role`, `target_element_type`, `url`,
`page_title`, `t_ms`, `t_wall`.

**FR-008 — Input change capture**
The extension must capture input change events. For sensitive fields (see
FR-014): emit the event with `is_sensitive_target: true` and no label or
selector. For non-sensitive fields: capture selector, label, role, element
type, and a boolean `value_present` flag. The actual input value must never
be captured.

**FR-009 — Form submit capture**
The extension must capture form submission events with the form action URL
and page title.

**FR-010 — Navigation capture**
The extension must capture navigation events for: initial page load,
`popstate`, `history.pushState`, and `history.replaceState`. Route changes
in SPAs must be captured and distinguished from full page loads.

**FR-011 — Annotation capture**
The user must be able to add an annotation during recording ("Mark important
moment"). The annotation text must be stored in the canonical event's
`annotation_text` field and cause a dedicated annotation step to be created
in the derived output.

### Normalization Pipeline

**FR-012 — Raw-to-canonical mapping**
Every captured raw event must be mapped to a canonical event type using the
`RAW_TO_CANONICAL_TYPE` mapping. Unknown raw types must be logged as
warnings and skipped without crashing the pipeline.

**FR-013 — Normalization provenance**
Every canonical event must carry a `normalization_meta` object with
`sourceEventId`, `sourceEventType`, `normalizationRuleVersion`,
`redactionApplied`, and optionally `redactionReason`.

### Segmentation

**FR-015 — Streaming step derivation**
During recording, the extension must maintain a live step feed showing:
- Recently finalized steps (immutable, labeled as `finalized`).
- The currently forming provisional step (labeled as `provisional`,
  updated in real time as events accumulate).

**FR-016 — Batch step derivation**
On stop, the extension must run batch segmentation over the full canonical
event log to produce the final `DerivedStep[]` for the bundle. Batch output
must match streaming output for the same event sequence.

**FR-017 — Step explainability**
Every finalized step must have: `boundary_reason`, `grouping_reason`,
`confidence` score, and `source_event_ids` referencing the contributing
canonical events.

**FR-018 — Determinism**
Batch segmentation must be a pure function: same input always produces the
same output. No random values, no `Date.now()`, no external state.

### Bundle Export

**FR-019 — Session bundle export**
The extension must produce a five-file session bundle on stop:
`session.json`, `normalized_events.json`, `derived_steps.json`,
`policy_log.json`, `manifest.json`. The bundle must be made available for
download by the user.

**FR-020 — Bundle integrity**
`manifest.json` must include SHA-256 hex digests of all four data files.
Hashes must be computed from the JSON-serialized content at export time.
Export must fail visibly (error state, user-facing message) if
`SessionStore` has no active session; partial bundles must never be written.

### Policy/Privacy Controls

**FR-014 — Sensitive field blocking**
The extension must never capture text values from: `type="password"` or
`type="hidden"` inputs, or any field whose selector, name, id, or
aria-label matches the sensitive pattern set. Sensitive fields at the capture
layer are emitted with `is_sensitive_target: true` and no selector or label.

**FR-021 — Domain block list**
The user must be able to configure a list of blocked domains. Events from
blocked domains must produce `system.capture_blocked` canonical events and
`PolicyLogEntry` records, not canonical events of their natural type.

**FR-022 — Transparency events**
Every redaction and block must produce both a transparency canonical event
(`system.redaction_applied` or `system.capture_blocked`) and a
`PolicyLogEntry`. Silent dropping of events is not permitted.

**FR-023 — Settings persistence**
Privacy settings (allowed domains, blocked domains, upload URL) must be
persisted to `chrome.storage.sync` so they survive browser restarts.

---

## 6. Non-Functional Requirements

**NFR-001 — Immutability**
Raw events and canonical events must never be mutated after write. All
reads from `SessionStore` return shallow copies. Bundle artifacts, once
built, are not modified.

**NFR-002 — Determinism**
The batch segmentation pipeline must be a pure function. The normalization
pipeline must be deterministic: same raw input always produces the same
canonical output. Pipeline logic must not use `Math.random()` or
`Date.now()` internally.

**NFR-003 — Privacy**
No text input values may be captured or stored at any layer. No screenshots
may be taken. The `captureTextInputValues`, `captureScreenshots`, and
`captureDomSnapshots` policy flags are hardcoded `false` in `DEFAULT_POLICY`
and typed as literal `false` — they cannot be set to `true`.

**NFR-004 — Capture performance**
Event capture in content scripts must add no more than 5 ms of latency to
user interactions. Capture logic must not block the browser's main thread.
Normalization and segmentation happen in the service worker, not the content
script.

**NFR-005 — Reliability across service worker restart**
`SessionMeta` is persisted to `chrome.storage.local` on every state change.
On service worker restart, the session meta can be loaded via
`SessionStore.loadFromStorage()`. In-progress event buffers (raw events,
canonical events, policy log) are held in memory — loss of these on
unexpected restart is acceptable in Phase 0.

**NFR-006 — No remote data without user action**
No data leaves the browser without the user explicitly providing an upload
URL and triggering an export. The upload URL field is optional; if empty,
no upload occurs.

---

## 7. Out of Scope (Phase 0-1)

The following are explicitly deferred and must not be built:

- **Backend API / server storage:** Phase 3+. No cloud persistence in Phase
  0-1.
- **AI-assisted step naming or SOP generation:** Phase 5. AI layer is
  disabled by default and does not exist in Phase 0-1.
- **Multi-run process definitions:** Phase 2. Phase 0-1 operates on single
  sessions only.
- **Team sharing / workspaces:** Phase 3.
- **Step editing in the review UI:** Phase 2. Review is read-only in Phase
  0-1.
- **Screenshots or DOM snapshots:** Permanently deferred for privacy.
  May be revisited as an explicit opt-in in Phase 2+ with full user
  disclosure, but are not on the roadmap.
- **Analytics dashboard:** Phase 4.
- **Webhook integrations:** Phase 5.

---

## 8. Acceptance Criteria

### Recording Lifecycle

- [ ] Recording starts (transitions to `arming`, then `recording`) within
      1 second of clicking Start.
- [ ] Pausing stops all event capture immediately; no events are emitted
      while state is `paused`.
- [ ] Resuming restores event capture; `pauseIntervals` array has
      `resumedAt` populated on the last entry.
- [ ] Stopping triggers finalization and transitions to `review_ready`
      with a complete bundle.
- [ ] Discarding from any state returns to `idle` with no session data
      remaining in memory or storage.
- [ ] An invalid state transition (e.g., `idle → recording` directly)
      throws and transitions to `error`.

### Capture

- [ ] Password input changes are captured as `input_changed` with
      `is_sensitive_target: true` and no label or selector.
- [ ] No `target_label` or `target_selector` values appear in any exported
      artifact for events where `is_sensitive_target: true`.
- [ ] SPA navigation events are captured on `pushState` and `replaceState`
      as well as `popstate`.
- [ ] Click deduplication: repeated clicks on the same selector within
      300 ms produce a single raw event.

### Normalization

- [ ] Every raw event type in `RAW_TO_CANONICAL_TYPE` produces the correct
      canonical type.
- [ ] An unknown raw event type produces a warning and is skipped; pipeline
      does not throw.
- [ ] Every canonical event has a valid `normalization_meta` with
      `sourceEventId` traceable to the raw event.
- [ ] A blocked domain produces `system.capture_blocked` and a policy log
      entry; no canonical event of the original type is produced.

### Segmentation

- [ ] `fixtures/capture-runs/demo.ndjson` produces output identical to
      `fixtures/segmentation-golden/demo-expected.*` (golden test).
- [ ] Streaming segmentation output matches batch segmentation output for
      the same input sequence.
- [ ] Every finalized step has `boundary_reason` and `source_event_ids`.
- [ ] Step IDs follow the format `${sessionId}-step-${ordinal}` with
      ordinal starting at 1.
- [ ] `system.*` and `derived.*` events are excluded from step construction.

### Bundle Export

- [ ] The exported bundle contains exactly five logical files.
- [ ] SHA-256 hashes in `manifest.json` match the actual file contents.
- [ ] Export fails with a visible error if no session is active; no partial
      bundle is written.
- [ ] `policy_log.json` contains an entry for every `system.redaction_applied`
      and `system.capture_blocked` event in `normalized_events.json`.

### Privacy

- [ ] No text input values appear in `normalized_events.json` for any event.
- [ ] Password fields (type="password") never appear with a label or
      selector in any exported artifact.
- [ ] `captureTextInputValues`, `captureScreenshots`, and
      `captureDomSnapshots` cannot be set to `true` via any settings path.

---

## 9. Technical Constraints

- **Chrome MV3 only.** The extension uses the Manifest V3 service worker
  model. No background pages. No `XMLHttpRequest` in service workers.
- **`chrome.storage.local` for session persistence.** Not IndexedDB in
  Phase 0. The storage adapter must be abstracted to allow swapping later.
- **No remote data without user-supplied URL.** The `uploadUrl` field in
  settings is optional. If empty, upload is skipped entirely.
- **TypeScript strict mode.** No `any` types without explicit justification
  comment. All pipeline logic is fully typed.
- **Permissions:** `activeTab`, `scripting`, `storage`, `sidePanel`.
  No host permissions in the manifest. Domain-level controls are enforced
  in the policy engine at normalization time, not via manifest permissions.
- **Vite build.** The extension is bundled with Vite. TypeScript source
  is not shipped directly.

---

## 10. Open Questions / ADRs

The following design decisions are unresolved per the recorder spec.
Each must be documented in `docs/adr/` before the relevant code is written.

| # | Decision | Recommended Default | Status |
|---|---|---|---|
| ADR-001 | Screenshots in MVP? | Defer entirely — privacy risk exceeds benefit | Not started |
| ADR-002 | Domain permissions: broad `<all_urls>` vs `activeTab` + allowlist | Start with `activeTab` only; easier store approval + stronger trust signal | Partially resolved: current manifest uses `activeTab` |
| ADR-003 | Raw event detail in exports? | Canonical only by default; raw as debug opt-in | Not started |
| ADR-004 | Long text input: tokenize / truncate / exclude value? | Exclude value; capture field class + label only | Resolved in code: `value_present` boolean flag only |
| ADR-005 | Step list editable in MVP? | Read-only in MVP; editing is Phase 2 | Not started |
| ADR-006 | Route-template inference: content script or normalization layer? | Normalization layer — keeps content scripts simple | Resolved in code: `deriveRouteTemplate` in normalization |
| ADR-007 | Service worker data loss on restart: acceptable in Phase 0? | Acceptable with `SessionMeta` persisted; full event log recovery deferred | Not formally documented |
