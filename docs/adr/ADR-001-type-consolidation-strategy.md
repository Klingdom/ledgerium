# ADR-001: Type and Logic Consolidation Strategy

**Status:** Partially Implemented — segmentation convergence complete (iter-011)
**Date:** 2026-03-24 (updated 2026-04-18)
**Phase:** 0 → 1 transition

---

## Context

The Ledgerium AI monorepo has two layers that need the same types and logic:

1. **`packages/*`** — workspace packages implementing the deterministic pipeline (normalization, segmentation, policy, schemas)
2. **`apps/extension-app/src/background/`** — Chrome MV3 service worker that runs the same pipeline in the browser

During Phase 0, the extension was built before workspace package linking was fully validated. The background layer contains inline copies of:

- Normalization logic (`background/normalizer.ts` ↔ `packages/normalization-engine`)
- Segmentation logic (`background/bundle-builder.ts`, `background/live-steps.ts` ↔ `packages/segmentation-engine`)
- Policy/sensitivity patterns (`content/capture.ts` ↔ `packages/policy-engine`)
- Type definitions (`shared/types.ts` ↔ `packages/shared-types`)

This duplication is **intentional for Phase 0** — it allowed the extension to build and function while workspace linking was being set up.

---

## Decision

The consolidation strategy is phased:

### Phase 1 (current): Document and Test
- All duplicate code is tested independently via the workspace package tests
- The divergence between package and inline implementations is documented in `docs/invariants.md`
- Technical debt is tracked in `CLAUDE.md` Known Issues section

### Phase 1 Completion: Migrate background to workspace packages
When workspace package linking is verified stable (pnpm install + build + tests all green):

1. **Background normalizer** (`background/normalizer.ts`):
   - Delete the file
   - Import `normalizeEvent`, `normalizeSession`, `RawEvent`, `CanonicalEvent` from `@ledgerium/normalization-engine`
   - Adapter boundary: the package `RawEvent` type uses snake_case fields identical to the background type

2. **Background bundle builder** (`background/bundle-builder.ts`): ✅ DONE (iter-011)
   - Removed inline `buildDerivedSteps`, `classifyGrouping`, `deriveTitle`, `calcConfidence` functions
   - Imports `segmentEvents` from `@ledgerium/segmentation-engine`
   - `buildDerivedSteps(events, sessionId)` → thin wrapper: `toSegmentableEvents()` + `segmentEvents().steps`
   - `buildBundle` retained — it orchestrates, not derives

3. **Background live steps** (`background/live-steps.ts`): ✅ DONE (iter-011)
   - `LiveStepBuilder` replaced with thin adapter wrapping `StreamingSegmenter` from `@ledgerium/segmentation-engine`
   - `DerivedStep → LiveStep` mapping at adapter boundary:
     - `DerivedStep.step_id` → `LiveStep.stepId`
     - `DerivedStep.start_t_ms` → `LiveStep.startedAt`
     - `DerivedStep.end_t_ms` → `LiveStep.finalizedAt`
     - `DerivedStep.title` → `LiveStep.title`
     - `DerivedStep.confidence` → `LiveStep.confidence`
     - `DerivedStep.source_event_ids.length` → `LiveStep.eventCount`
     - `DerivedStep.grouping_reason` → `LiveStep.grouping`
     - `DerivedStep.boundary_reason` → `LiveStep.boundaryReason`
     - `DerivedStep.page_context.applicationLabel` → `LiveStep.pageLabel`

4. **Content script sensitivity** (`content/capture.ts`):
   - Import `classifySensitivity` from `@ledgerium/policy-engine`
   - Thread `PolicyConfig.blockedDomains` and `PolicyConfig.allowedDomains` via the `START_SESSION` message payload
   - Replace the local `isSensitiveElement` with the shared classifier

5. **Shared types** (`shared/types.ts`):
   - Reduce to re-exports from `@ledgerium/shared-types`
   - Keep only extension-specific types not in the workspace package

### What NEVER Changes
- `LiveStep` interface shape used by the sidebar UI — this is the UI contract
- `MSG` constant values — wire protocol between background and sidepanel
- All segmentation constants (IDLE_GAP_MS, etc.) — defined in packages/segmentation-engine

---

## Consequences

**Positive:**
- Single source of truth for normalization, segmentation, policy logic
- Bug fixes propagate to both pipeline and extension automatically
- Tests at the package level cover the extension's runtime behavior

**Negative:**
- Adds dependency on workspace linking being stable (pnpm + Vite resolution)
- Any package API change now requires extension update
- Build time may increase marginally (more code for Vite to tree-shake)

**Risk mitigated by:**
- 307-test suite (post-convergence) catches regressions immediately
- 12-fixture convergence regression suite (batch + live) enforces structural equivalence
- All segmentation paths now share canonical primitives; divergence is structurally impossible

---

## Invariants This ADR Protects

Post-convergence: the "duplicate" segmentation implementations have been eliminated.
The following invariants now apply:

| Behavior | Canonical Source | Consumers | Test |
|----------|-----------------|-----------|------|
| Batch segmentation | `packages/segmentation-engine/batch-segmenter.ts` | `bundle-builder.ts` (wrapper) | `convergence-batch.regression.test.ts` |
| Streaming segmentation | `packages/segmentation-engine/streaming-segmenter.ts` | `live-steps.ts` (adapter) | `convergence-live.regression.test.ts` |
| Grouping classification | `packages/segmentation-engine/grouping.ts` | both segmenters | `batch-segmenter.test.ts`, `streaming-segmenter.test.ts` |
| Title derivation | `packages/segmentation-engine/rules.ts` | both segmenters | `rules.test.ts` |
| `normalizeEvent` redaction | `normalization-engine/normalizer.ts` | `background/normalizer.ts` | `normalizer.test.ts` |
| Sensitivity classification | `policy-engine/sensitivity.ts` | `content/capture.ts` | `sensitivity.test.ts` |
