# Compaction Recovery Guide for Claude Code

**Last updated:** 2026-03-24

---

## What Is Compaction

Claude Code compacts conversation context when the context window approaches
its limit. Earlier messages — including detailed architectural discussion,
decisions made during implementation, and explicit constraints established
at session start — are summarized into a compressed representation. The
summary preserves approximate intent but loses the precision of exact values,
explicit prohibitions, and the reasoning behind specific design choices.

---

## Risk to Ledgerium AI

The Ledgerium codebase has a deterministic core: the segmentation engine,
the normalization pipeline, and the state machine all have exact numerical
constants and behavioral rules that must not change. After compaction, an AI
working on this codebase may:

- "Recalculate" segmentation thresholds based on what seems reasonable,
  producing values that differ from the established invariants.
- Generate new step IDs using `generateStepId()` (random UUID) instead of
  the deterministic `${sessionId}-step-${ordinal}` format, silently breaking
  golden-test reproducibility.
- Change confidence scores to values that seem more sensible, invalidating
  existing tests that assert exact values.
- Misremember which messages are broadcasts vs. request/response, producing
  message handlers that never call `sendResponse` or do not `return true`.
- Produce code that does not gate event capture on `sm.state !== 'recording'`,
  allowing events to leak through during `paused` or `stopping` states.

These are **silent violations** — they compile, pass TypeScript, and may
even pass partial tests. They corrupt the system's trust model.

---

## Immediate Recovery Protocol

Perform these steps at the start of any work block when you suspect or know
that compaction has occurred.

**Step 1 — Re-read the engineering brief.**
`CLAUDE.md` is always in context. Read it fully. Confirm the current phase,
active priorities, and coding standards.

**Step 2 — Re-read the invariants document.**
```
docs/invariants.md
```
This is the authoritative reference. Every section covers a distinct layer.
Do not skip sections — invariants in one layer affect behavior in another.

**Step 3 — Re-read the state machine source.**
```
packages/shared-types/src/session.ts
```
Confirm `VALID_TRANSITIONS`, the `RecorderState` type, and `SessionMeta`
shape are exactly as you expect before touching any lifecycle code.

**Step 4 — Run the type checker.**
```
pnpm typecheck
```
The type checker catches structural regressions introduced while compacted
context was in effect. It must be clean (zero errors) before proceeding.

**Step 5 — Run the test suite.**
```
pnpm test
```
The segmentation rule tests in `packages/segmentation-engine/src/rules.test.ts`
assert exact constant values and exact confidence scores. A green test suite
confirms you have not introduced an invariant violation.

---

## Key Files Index

| File Path | What It Owns | Why It Matters |
|---|---|---|
| `CLAUDE.md` | Engineering identity, coding standards, active phase | Always in context; read first |
| `docs/invariants.md` | All behavioral invariants for every layer | Recovery anchor after compaction |
| `packages/shared-types/src/session.ts` | `RecorderState`, `VALID_TRANSITIONS`, `SessionMeta` | State machine contract |
| `packages/shared-types/src/messages.ts` | `MSG` constants, all message types, `ExtensionMessage` union | Message bus contract |
| `packages/shared-types/src/entities.ts` | `PageIdentity`, `SensitivityClass`, `TargetSummary`, `ExtensionSettings` | Shared entity types |
| `packages/schema-events/src/raw-event.schema.ts` | `SCHEMA_VERSION`, `RawCaptureEventSchema`, raw event type enum | Raw event schema + version |
| `packages/schema-events/src/canonical-event.schema.ts` | `CanonicalEventSchema`, all canonical event types, `PageContextSchema`, `TargetSummarySchema` | Canonical event schema |
| `packages/normalization-engine/src/normalizer.ts` | `NORMALIZATION_RULE_VERSION`, `RAW_TO_CANONICAL_TYPE` mapping, `normalizeEvent`, `normalizeSession` | Normalization pipeline |
| `packages/policy-engine/src/rules.ts` | `PolicyConfig`, `DEFAULT_POLICY`, `applyPolicy`, `PolicyDecision` | Privacy/redaction rules |
| `packages/policy-engine/src/sensitivity.ts` | `SENSITIVE_INPUT_TYPES`, `SENSITIVE_SELECTOR_PATTERNS`, `classifySensitivity` | Sensitivity classification |
| `packages/segmentation-engine/src/rules.ts` | `SEGMENTATION_RULE_VERSION`, `IDLE_GAP_MS`, `CLICK_NAV_WINDOW_MS`, `RAPID_CLICK_DEDUP_MS`, `calculateConfidence`, `deriveStepTitle` | Segmentation constants + scoring |
| `packages/segmentation-engine/src/types.ts` | `DerivedStep`, `BoundaryReason`, `GroupingReason`, `SegmentationResult` | Segmentation type contracts |
| `packages/segmentation-engine/src/batch-segmenter.ts` | `segmentEvents` — stateless deterministic segmentation | Batch pipeline |
| `packages/segmentation-engine/src/streaming-segmenter.ts` | `StreamingSegmenter` — stateful live feed segmentation | Live feed pipeline |
| `packages/segmentation-engine/src/rules.test.ts` | Constant assertions, confidence score assertions, title derivation tests | Invariant regression tests |
| `apps/extension-app/src/background/state-machine.ts` | `RecorderStateMachine` class — enforces transitions, throws on violation | Runtime state enforcement |
| `apps/extension-app/src/background/session-store.ts` | `SessionStore` — in-memory event storage, pause interval tracking, chrome.storage persistence | Session state holder |
| `apps/extension-app/src/background/bundle-builder.ts` | `buildBundle`, `buildDerivedSteps` — inline segmentation + SHA-256 manifest | Export pipeline |
| `apps/extension-app/src/background/index.ts` | Message handler, lifecycle orchestration, broadcast helpers | Extension entry point |
| `apps/extension-app/src/background/normalizer.ts` | Bridge between raw events and the normalization engine (inline implementation) | Background normalizer |
| `apps/extension-app/src/background/live-steps.ts` | `LiveStepBuilder` — bridges `StreamingSegmenter` to the message bus | Live step feed |
| `apps/extension-app/src/content/capture.ts` | `CaptureEngine` — DOM event listeners, sensitive field detection, raw event emission | Capture layer |
| `apps/extension-app/src/shared/constants.ts` | `SCHEMA_VERSION`, `RECORDER_VERSION`, `SEGMENTATION_RULE_VERSION`, `RENDERER_VERSION`, `IDLE_GAP_MS`, `CLICK_NAV_WINDOW_MS`, `RAPID_CLICK_DEDUP_MS`, storage keys | Extension-side constants |
| `apps/extension-app/manifest.json` | Extension permissions, entry points, version | Chrome MV3 manifest |

---

## Primitives That Must Never Be Re-Derived

The following values are invariants established by explicit design decision.
Do not recalculate them, adjust them for "reasonableness", or change them
without a new rule version and explicit sign-off:

**Segmentation timing constants:**
- `IDLE_GAP_MS = 45_000`
- `CLICK_NAV_WINDOW_MS = 2_500`
- `RAPID_CLICK_DEDUP_MS = 1_000`

**Confidence scores:**
- `annotation → 1.0`
- `fill_and_submit → 0.9`
- `click_then_navigate → 0.85`
- `error_handling → 0.8`
- `repeated_click_dedup → 0.7`
- `single_action` with label `→ 0.75`
- `single_action` without label `→ 0.55`

**Step ID format:**
- Finalized: `${sessionId}-step-${ordinal}` where ordinal is 1-based.
- Provisional: `${sessionId}-step-provisional` (never stored in bundle).
- `generateStepId()` (random UUID) is NOT used for batch or bundle steps.

**Schema version strings:**
- `SCHEMA_VERSION = '1.0.0'`
- `NORMALIZATION_RULE_VERSION = '1.0.0'`
- `SEGMENTATION_RULE_VERSION = '1.0.0'`
- `RECORDER_VERSION = '0.1.0'`
- `RENDERER_VERSION = '0.1.0'`

**Valid state transitions table** (do not modify):
```
idle         → arming, error
arming       → recording, idle, error
recording    → paused, stopping, error
paused       → recording, stopping, error
stopping     → review_ready, error
review_ready → idle, error
error        → idle
```

**Privacy defaults (must remain `false`, always):**
- `captureTextInputValues`
- `captureScreenshots`
- `captureDomSnapshots`

**Raw-to-canonical event type mapping:** The full mapping in
`packages/normalization-engine/src/normalizer.ts` — `RAW_TO_CANONICAL_TYPE`.
Do not add or remove entries without updating schema version.

---

## Session State Checklist

Run through this checklist at the start of any new work block — especially
after a suspected compaction, after returning to the codebase after time away,
or before beginning any work that touches pipeline logic.

- [ ] What block are we working on? (Phase 0: foundation scaffold; Phase 1: deterministic MVP; etc.)
- [ ] Is `pnpm typecheck` clean (zero errors)?
- [ ] Is `pnpm test` green?
- [ ] Have I re-read `docs/invariants.md` this session?
- [ ] If modifying segmentation: have I confirmed the constants and confidence scores are unchanged?
- [ ] If modifying the state machine: have I confirmed `VALID_TRANSITIONS` is unchanged?
- [ ] If modifying normalization: have I confirmed `RAW_TO_CANONICAL_TYPE` and `NORMALIZATION_RULE_VERSION` are unchanged?
- [ ] If modifying privacy/policy: have I confirmed `captureTextInputValues`, `captureScreenshots`, and `captureDomSnapshots` are still `false`?
- [ ] If modifying the bundle: have I confirmed the five-file structure and SHA-256 manifest hashing are intact?

---

## Known Technical Debt

The following duplication is intentional for Phase 0 and must not be
"fixed" without following the remediation plan:

**Extension-app background duplicates package logic:**
- `apps/extension-app/src/background/normalizer.ts` contains an inline
  implementation of normalization that mirrors `packages/normalization-engine`.
- `apps/extension-app/src/background/bundle-builder.ts` contains an inline
  implementation of segmentation (`buildDerivedSteps`) that mirrors
  `packages/segmentation-engine`.
- `apps/extension-app/src/background/live-steps.ts` wraps
  `StreamingSegmenter` from the package but the package's segmentation
  logic is also duplicated in the bundle builder.

**Why this exists:** Package workspace linking was not fully operational
when the extension background was built. The duplication allows the
extension to function as a standalone unit without workspace resolution.

**The fix:** When workspace packages are fully integrated (Block 2 of the
remediation plan), the inline implementations in `apps/extension-app/src/background/`
will be replaced with direct imports from `@ledgerium/normalization-engine`
and `@ledgerium/segmentation-engine`. The two implementations must remain
behaviorally identical in the interim — any bug fix or rule change must be
applied to both.

**Do not refactor this opportunistically.** Flag it as a separate task.
