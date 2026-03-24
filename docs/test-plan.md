# Test Plan: Ledgerium AI

**Last updated:** 2026-03-24
**Current phase:** Phase 0 → Phase 1

---

## Test Philosophy

Ledgerium AI's core value is that outputs are trustworthy and traceable.
This trust extends to the test suite. Tests must be:

- **Deterministic.** No `Math.random()`, no `Date.now()`, no `new Date()`
  inline — use fixed timestamps and injected IDs. Tests that cannot be
  reproduced bit-for-bit are not meaningful tests of a deterministic pipeline.
- **Evidence-linked.** Tests for derived outputs (steps, bundles) must assert
  the exact values of `source_event_ids`, `boundary_reason`, `confidence`,
  and `step_id` — not just that "some steps were produced."
- **Failure-explicit.** Tests for error paths are as important as tests for
  the happy path. Silent failure modes must be specifically tested and
  asserted as having failed.
- **Isolated.** Pipeline functions are pure. Tests must not share state
  between test cases. Each test constructs its own inputs.
- **Co-located.** Test files live next to the source files they test:
  `feature.ts` / `feature.test.ts`. No `tests/` directory for unit tests.

---

## Test Taxonomy

### Unit Tests

**Scope:** A single function or class in isolation, with all external
dependencies either injected as deterministic inputs or mocked.

**Framework:** Vitest

**When to write:** Before or alongside every implementation of pipeline
logic. Mandatory for all of: segmentation rules, normalization rules,
policy rules, state machine transitions, bundle builder, schema validators.

**Examples:**
- `calculateConfidence(['annotation']) === 1.0`
- `segmentEvents(events, sessionId)` with a known input produces a known
  step array.
- `applyPolicy(config, context)` with a blocked domain returns
  `outcome: 'block'`.
- `RecorderStateMachine.transition('recording')` from `idle` throws.

### Integration Tests

**Scope:** Multiple modules wired together, exercising real data flow.
No browser APIs, no `chrome.*` calls.

**Framework:** Vitest

**When to write:** For the full pipeline: raw event array → `normalizeSession`
→ `segmentEvents` → `buildDerivedSteps`. For the bundle builder end-to-end.

**Examples:**
- A fixture of raw events runs through `normalizeSession` then
  `segmentEvents` and produces output matching a golden file.
- A session with a blocked domain produces the correct `system.capture_blocked`
  event in both the canonical event list and the policy log.

### Contract Tests

**Scope:** Zod schema validators. Assert that the schema is the correct
shape, rejects invalid inputs, and accepts all valid inputs.

**Framework:** Vitest

**When to write:** For every schema in `packages/schema-events`. These are
the API contract for the entire pipeline.

**Examples:**
- `RawCaptureEventSchema` accepts all 15 valid event types.
- `RawCaptureEventSchema` rejects `t_ms: -1` and `t_ms: 0.5`.
- `RawCaptureEventSchema` rejects `schema_version: '2.0.0'`.
- `CanonicalEventSchema` rejects any event without `normalization_meta`.

### End-to-End (Extension) Tests

**Scope:** Full extension lifecycle in a real Chrome browser, driven by
Playwright. Tests the complete path from user clicking "Start Recording"
through event capture to bundle export.

**Framework:** Playwright (deferred — see "What Is NOT Tested" below)

**When to write:** Phase 1 exit criteria. Not in scope for Phase 0.

---

## Coverage Targets (by package)

| Package | Target % | Priority | Rationale |
|---|---|---|---|
| `packages/schema-events` | 100% | Critical | Schema validators are the API contract for the entire pipeline. Every field, every enum value, every rejection path must be tested. |
| `packages/segmentation-engine` | 100% | Critical | The segmentation engine is the core product moat. Every rule, every confidence score, every boundary trigger must be asserted to exact values. |
| `packages/normalization-engine` | 95% | Critical | Every event type mapping, every dedup rule, every policy interaction must be covered. The 5% allowance is for unreachable defensive branches. |
| `packages/policy-engine` | 95% | Critical | Every sensitivity pattern, every decision path in `applyPolicy`, every outcome type must be covered. |
| `packages/shared-types` | 80% | High | Types are compile-time; the runtime exports (`VALID_TRANSITIONS`, `isValidTransition`) must be tested. |
| `apps/extension-app/src/background` | 80% | High | State machine, session store, bundle builder, and normalizer bridge must have unit coverage. Chrome API calls are mocked. |
| `apps/extension-app/src/content` | 70% | Medium | `CaptureEngine` logic (sensitive field detection, selector derivation, dedup) can be tested with DOM stubs. Actual browser event emission is E2E scope. |
| `apps/extension-app/src/sidepanel` | 60% | Lower | UI component logic and hooks. Focus on the `useRecorderState` hook. Visual rendering is deferred. |

---

## Test Files Inventory

| Test File | What It Covers | Priority |
|---|---|---|
| `packages/schema-events/src/raw-event.schema.test.ts` | `RawCaptureEventSchema`: required fields, `t_ms` validation, all 15 event types, UUID format, schema version literal, `validateRawEvent` throws on invalid input | Critical |
| `packages/schema-events/src/canonical-event.schema.test.ts` | `CanonicalEventSchema`: all canonical event types, `PageContextSchema`, `TargetSummarySchema`, `NormalizationMetaSchema`, all type guard helpers | Critical |
| `packages/segmentation-engine/src/rules.test.ts` | `IDLE_GAP_MS`, `CLICK_NAV_WINDOW_MS`, `RAPID_CLICK_DEDUP_MS` exact values; `calculateConfidence` for all 7 grouping reasons; `deriveStepTitle` for all grouping reasons with label/fallback paths | Critical |
| `packages/segmentation-engine/src/batch-segmenter.test.ts` | `segmentEvents`: idle gap boundary, navigation domain change boundary, form submit boundary, annotation boundary, session stop boundary, `system.*`/`derived.*` filtering, step ID format, ordinal sequencing, empty input, all-system-events input | Critical |
| `packages/segmentation-engine/src/streaming-segmenter.test.ts` | `StreamingSegmenter`: processEvent for each boundary type, `finalize()` flush, `getProvisionalStep()` shape, streaming output matches batch output for same input sequence, `reset()` | Critical |
| `packages/normalization-engine/src/normalizer.test.ts` | `normalizeEvent`: all type mappings, unknown type warning, domain block → `system.capture_blocked`, sensitive target → `system.redaction_applied`, `label` omitted on redaction, `normalization_meta` provenance; `normalizeSession`: rapid duplicate click dedup (300 ms), superseded focus dedup, net-zero focus/blur dedup | Critical |
| `packages/policy-engine/src/rules.test.ts` | `applyPolicy`: blocked domain, non-allowlisted domain, `isSensitiveTarget: true`, `inputType: 'password'`, selector pattern match, label classification, allow path | Critical |
| `packages/policy-engine/src/sensitivity.test.ts` | `classifySensitivity`: password inputType, all sensitive selector patterns, payment patterns, government ID patterns, email/tel PII (not sensitive), clean inputs | Critical |
| `packages/shared-types/src/session.test.ts` | `VALID_TRANSITIONS` completeness (all 7 states present as keys); `isValidTransition` for all valid pairs; `isValidTransition` false for all illegal transitions | High |
| `apps/extension-app/src/background/state-machine.test.ts` | `RecorderStateMachine`: initial state is `idle`; all valid transitions succeed; all invalid transitions throw; `onChange` listener fires; `reset()` returns to `idle` | High |
| `apps/extension-app/src/background/session-store.test.ts` | `SessionStore`: `initSession` clears previous state; `updateState` populates `pauseIntervals` on pause/resume; `updateState` sets `endedAt` on stopping; `clear()` resets all fields | High |
| `apps/extension-app/src/background/bundle-builder.test.ts` | `buildDerivedSteps`: step ID format, ordinal is 1-based, `system.*` events filtered, correct boundary reasons; `buildBundle`: throws if no session, five keys present in result, `fileHashes` has four entries | High |
| `packages/segmentation-engine/src/golden.test.ts` | Golden file regression: `fixtures/capture-runs/demo.ndjson` → `normalizeSession` → `segmentEvents` produces output byte-for-byte equal to `fixtures/segmentation-golden/demo-expected.json` | Critical (Phase 1) |

---

## Running Tests

**Run all tests:**
```bash
pnpm test
```

**Run tests for a specific package:**
```bash
pnpm --filter @ledgerium/segmentation-engine test
pnpm --filter @ledgerium/normalization-engine test
pnpm --filter @ledgerium/schema-events test
pnpm --filter @ledgerium/policy-engine test
```

**Run tests in watch mode (during development):**
```bash
pnpm --filter @ledgerium/segmentation-engine test --watch
```

**Run with coverage:**
```bash
pnpm test --coverage
```

**Run a specific test file:**
```bash
pnpm --filter @ledgerium/segmentation-engine vitest run src/rules.test.ts
```

**Type check all packages (must be clean before any commit):**
```bash
pnpm typecheck
```

---

## Fixture Strategy

### Demo Fixture Files

The root-level `session.json` and `events.ndjson` are **read-only demo
fixtures**. They are not production data and must not be modified. They
exist as reference inputs for golden-path test development.

Formal fixtures for automated tests live in:
```
fixtures/capture-runs/     — input .ndjson files (ordered raw events)
fixtures/segmentation-golden/ — expected output files for regression tests
```

### How to Use Demo Events in Golden-Path Tests

1. Load the fixture file as a string in the test.
2. Parse each line as a JSON object (NDJSON format — one JSON object per line).
3. Validate each event against `RawCaptureEventSchema` to confirm the
   fixture is still schema-valid.
4. Run through `normalizeSession` to produce `CanonicalEvent[]`.
5. Run through `segmentEvents` to produce `DerivedStep[]`.
6. Deep-equal assert against the corresponding file in
   `fixtures/segmentation-golden/`.

The golden files must be committed to the repository and reviewed on any
change to normalization or segmentation rules. Golden file updates require
a deliberate decision and a rule version bump.

### Building New Fixtures

When adding a new fixture for a specific edge case:
1. Create a minimal NDJSON file in `fixtures/capture-runs/` with only the
   events needed to exercise the edge case.
2. Run the pipeline once and inspect the output.
3. If the output is correct, commit it as the golden file in
   `fixtures/segmentation-golden/`.
4. Add a test that asserts the fixture produces the golden output exactly.

---

## Mock Strategy

### Chrome API Mocking

Tests for `apps/extension-app/src/background/` must not call real Chrome
APIs. Use Vitest's `vi.stubGlobal` or a `chrome` mock module to provide
stubs for:

```typescript
chrome.storage.local.get   — stub returns empty or fixture data
chrome.storage.local.set   — stub records calls for assertion
chrome.storage.sync.get    — stub returns settings fixture
chrome.storage.sync.set    — stub records calls
chrome.runtime.sendMessage — stub records message calls for assertion
chrome.tabs.query          — stub returns a single tab with a known ID
chrome.tabs.sendMessage    — stub records calls
```

The mock must be defined in a `__mocks__/chrome.ts` file or in each test's
`beforeEach`. It must be reset between tests (`vi.clearAllMocks()` or
`vi.restoreAllMocks()` in `afterEach`).

`SessionStore` tests must mock `chrome.storage.local` to avoid real browser
storage. Assertions should verify that `chrome.storage.local.set` was called
with `STORAGE_KEY_SESSION` and the correct meta object.

### Time and ID Injection

Pipeline functions must accept injectable time and ID sources for
deterministic testing:

- `t_ms` in raw events: use fixed integer values (e.g., `0`, `1000`,
  `2500`) that exercise specific timing rules.
- `t_wall`: use a fixed ISO 8601 string (e.g., `'2026-01-15T10:00:00.000Z'`).
- `raw_event_id` and `session_id`: use fixed UUID-format strings.
- Never call `Date.now()`, `new Date()`, or `crypto.randomUUID()` inside a
  test without mocking.

For the `CaptureEngine`, mock `Date.now()` via `vi.useFakeTimers()` to test
time-based deduplication behavior (the 300 ms rapid click dedup).

### Crypto Mock

`generateEventId()` and `generateStepId()` use `crypto.randomUUID()`.
In Vitest (Node environment), `crypto` is available but tests should not
rely on specific UUID values from these functions. Use `vi.spyOn` to return
fixed values when you need to assert on generated IDs:

```typescript
vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234-5678-abcd-000000000001')
```

---

## What Is NOT Tested

### Deferred to Phase 1 Exit

- **Golden file regression tests:** Require fixture files in
  `fixtures/capture-runs/` to be committed. These are Phase 1 exit criteria.
- **Streaming vs batch consistency tests:** Require a full event sequence
  fixture. Phase 1.

### Deferred to Phase 1 / E2E

- **Chrome extension E2E tests (Playwright):** Require a built extension and
  a Playwright browser fixture. Deferred until the extension shell is
  production-stable. No E2E tests in Phase 0.

### Deferred Beyond Phase 1

- **UI component rendering tests:** Side panel React components. Deferred.
  Focus is on logic, not visual correctness.
- **Network upload tests:** `uploadBundle` in `apps/extension-app/src/background/uploader.ts`.
  The upload path is tested with a stubbed `fetch`. Real network tests are
  out of scope until Phase 3 (backend API).
- **`chrome.storage` persistence and reload tests:** Service worker restart
  and `SessionStore.loadFromStorage()` recovery path. Acceptable loss in
  Phase 0; deferred to Phase 1 when the storage adapter is finalized.

---

## Test Invariants

These rules apply to every test in the codebase without exception:

1. **No `Math.random()` or `Date.now()` in test bodies.** Use fixed values
   or `vi.useFakeTimers()` / `vi.spyOn`. A test that uses real random values
   is not a determinism test.

2. **Tests that verify segmentation output must assert deep equality.**
   `expect(steps).toEqual([...])` — not `expect(steps.length).toBe(3)`.
   Shallow checks do not validate that `boundary_reason`, `confidence`,
   `source_event_ids`, and `step_id` are correct.

3. **Constant tests must assert exact values.** The constants
   `IDLE_GAP_MS`, `CLICK_NAV_WINDOW_MS`, `RAPID_CLICK_DEDUP_MS`, and all
   confidence scores must be asserted with `toBe`, not `toBeGreaterThan` or
   approximations.

4. **Schema version tests must use `z.literal` assertions.** Any test that
   validates `schema_version` must assert exactly `'1.0.0'`, not a pattern
   match or partial string.

5. **Error path tests must assert the specific error.** A test for an
   invalid state transition must assert that the thrown error message
   contains the specific `from → to` pair, not just that something threw.

6. **Policy log completeness.** Any test that exercises normalization with
   a sensitive or blocked input must assert that a `PolicyLogEntry` was
   produced in addition to the canonical event.

7. **`source_event_ids` completeness.** Any test that asserts on a
   `DerivedStep` must verify that `source_event_ids` contains the exact
   event IDs from the input events that were expected to contribute to
   that step — not just that the array is non-empty.
