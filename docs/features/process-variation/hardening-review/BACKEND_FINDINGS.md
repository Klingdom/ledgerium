# Backend Hardening Review — Process Variants Feature

**Date:** 2026-06-11
**Reviewer:** backend-engineer
**Scope:** Read-only review of the server-side variant analysis pipeline
**Test baseline confirmed:** 2806 / 2806 passing

---

## 1. CORRECTNESS BUGS

### BUG-1 [HIGH] Unguarded `JSON.parse` propagates a throw across the entire request
**File:** `apps/web-app/src/lib/intelligence.ts:116`

```ts
processOutput: w.artifacts[0]?.contentJson
  ? JSON.parse(w.artifacts[0].contentJson)  // <-- no try/catch
  : null,
```

`JSON.parse` throws a `SyntaxError` on malformed input. This function is called inside `analyzeWorkflowVariants` (`intelligence.ts:437`), which has no try/catch of its own. If any single workflow in the user's library has a corrupted `process_output` artifact, the **entire variants request fails with HTTP 500** — not just the bad row. The outermost catch at `route.ts:55` logs and returns `{ error: 'Analysis failed' }`, giving the caller no signal to distinguish "bad data" from "engine failure".

More concretely: a user with 20 workflows, one of which has a corrupted artifact, gets a permanent 500 on every variants-mode open, with no workaround short of deleting the corrupt workflow. Because `getWorkflowsWithOutputs` has no `workflowIds` filter when called from `analyzeWorkflowVariants:437`, the bad row is always included.

**Fix:** wrap the `JSON.parse` in a per-row try/catch and set `processOutput: null` on failure (same outcome as the `contentJson === null` branch):

```ts
processOutput: (() => {
  const raw = w.artifacts[0]?.contentJson;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
})(),
```

---

### BUG-2 [HIGH] `computePathSignature` throws when `processDefinition.stepDefinitions` is absent from a corrupt/old stored artifact
**File:** `apps/web-app/src/lib/intelligence.ts:443-449`, `packages/intelligence-engine/src/pathSignature.ts:21`

```ts
// intelligence.ts:443
withOutput.map((w) => ({
  id: w.id,
  signature: computePathSignature({
    processRun: w.processOutput!.processRun,
    processDefinition: w.processOutput!.processDefinition,  // non-null asserted
  }),
})),
```

```ts
// pathSignature.ts:21
const stepCategories = [...bundle.processDefinition.stepDefinitions]  // spread throws if undefined
```

`processOutput` is typed as `{ processRun; processDefinition; sop? } | null` but that type is inferred from a raw `JSON.parse` call with no runtime validation. If the stored JSON has a different schema (from an older engine version, a truncated upload, or any corruption) then `processDefinition` or `processDefinition.stepDefinitions` can be `undefined` at runtime, causing `TypeError: undefined is not iterable` at `pathSignature.ts:21`. This throw propagates all the way up to the outer `try/catch` in the route, again as a generic 500.

**Fix:** Add a runtime guard in the `withOutput` filter at `intelligence.ts:441`:

```ts
const withOutput = all.filter(
  (w) => w.processOutput?.processDefinition?.stepDefinitions != null
);
```

This is consistent with the existing `if (!w.processOutput) continue` guard in `loadBundlesForWorkflows`.

---

### BUG-3 [MEDIUM] `analyzeWorkflowVariants` returns `null` — not a distinct error — for missing processOutput AND for zero-bundle result, making them indistinguishable to callers
**File:** `apps/web-app/src/lib/intelligence.ts:439`, `intelligence.ts:456`

```ts
if (!target?.processOutput) return null;      // line 439 — target has no processOutput
// ...
if (bundles.length === 0) return null;         // line 456 — cluster members all have no output
```

Both conditions collapse to the same `null` return, which the route at `variants/route.ts:51-53` converts to HTTP 422 with the undifferentiated message `"No process output available for analysis"`. A client cannot tell whether the target workflow has not been processed yet (recoverable, show "processing" state), whether no similar runs were found (expected for new workflows, show "record more"), or whether something else failed.

**Fix:** Use a discriminated result type or throw named errors with distinct codes. At a minimum:

```ts
if (!target) return { kind: 'not_found' };
if (!target.processOutput) return { kind: 'no_output' };
if (bundles.length === 0) return { kind: 'no_similar_runs', singleRunBundle };
```

---

### BUG-4 [LOW] `evidenceRunIds` carries `processRun.runId` = `sessionId`, not `workflow.id`
**File:** `packages/process-engine/src/processRunBuilder.ts:28`, `packages/intelligence-engine/src/variantDetector.ts:40,58`

```ts
// processRunBuilder.ts:28
runId: sessionJson.sessionId,  // <-- sessionId, not the DB workflow.id
```

Every `evidenceRunIds` array in the returned `PortfolioIntelligence` (variants, timestudy, metrics, bottlenecks) carries the session ID from the original recording session, not the `workflow.id` from the DB. A UI that tries to link an `evidenceRunId` back to `/api/workflows/[id]` will fail silently because the ID format is different (a recording session UUID versus the Prisma workflow UUID, which may or may not be the same value depending on how uploads are processed).

Specifically, in `processRunBuilder.ts:28`, `runId: sessionJson.sessionId` is assigned, but the corresponding DB row is the `Workflow` with `workflow.id`. These are different unless the upload pipeline explicitly persists `sessionId` as `workflow.id`, which is not enforced.

**Assessment:** Review whether the upload pipeline maps `sessionId → workflow.id` deterministically. If not, evidence traceability from the intelligence output back to a DB row is broken.

---

### BUG-5 [LOW] `analyzePortfolio` throws if `runs` is empty — not guarded in `analyzeWorkflowVariants`
**File:** `packages/intelligence-engine/src/intelligenceEngine.ts:71-74`

```ts
if (runs.length === 0) {
  throw new Error('[intelligence-engine] analyzePortfolio requires at least one ProcessRunBundle');
}
```

`analyzeWorkflowVariants` checks `bundles.length === 0` at line 456 and returns `null`, so this path is guarded. However, the guard was added after the fact; the logic at lines 442-455 is non-obvious and any future refactor that removes the `bundles.length === 0` check would expose the engine throw directly. The route's outer try/catch would catch it as a 500, but a caller inspecting the error log would see a confusing engine-level message rather than a domain message.

---

## 2. PERFORMANCE / SCALING

### PERF-1 [CRITICAL] No `take:` cap on `getWorkflowsWithOutputs` + O(n²) clustering on every variants-mode open
**File:** `apps/web-app/src/lib/intelligence.ts:89-119`, `intelligence.ts:437`

`getWorkflowsWithOutputs` issues an uncapped `db.workflow.findMany` (no `take:` clause, `intelligence.ts:98-107`). For a Team user with `maxRecordingsPerMonth = Number.MAX_SAFE_INTEGER` (`plans.ts:96`), the query returns all active workflows for the user, pulling `contentJson` for every `process_output` artifact — potentially megabytes of JSON across hundreds of rows.

After the DB query, `analyzeWorkflowVariants` then:
1. Deserializes every artifact (`JSON.parse` × N, line 116)
2. Calls `computePathSignature` × N (iterates `stepDefinitions` for every workflow, line 443-449)
3. Passes all N inputs to `clusterSignatures`, which is explicitly documented as O(n²) pairwise at `clusterSignatures.ts:115`: `O(n²) pairwise for now; MinHash/LSH candidate generation is a later iteration (C+5)`

For a user with 200 active workflows:
- DB round-trip: SELECT with 200 artifact blobs (high I/O)
- JSON.parse: 200 calls on potentially large blobs
- O(n²) pairwise: 200×199/2 = 19,900 `traceSimilarity` calls on every variants-map open

At 500 workflows this is 124,750 similarity calls. There is no caching, no debounce, and no rate limiting on the `/api/workflows/[id]/variants` route. A Team user can fire this endpoint in rapid succession (e.g., opening multiple workflow detail panels) and effectively DoS their own request queue.

**Fix strategy (ordered by implementation effort):**

1. **Immediate (P0):** Add `take: 200` (or a configurable `VARIANTS_MAX_CANDIDATE_WORKFLOWS` env constant) to the `getWorkflowsWithOutputs` call inside `analyzeWorkflowVariants`. The existing overload already has an optional `workflowIds` parameter; a bounded variant would pass the 200 most-recent IDs.

2. **Short-term (P1):** Pre-filter by path-signature similarity before clustering. The target workflow's signature is known first; discard any workflow whose `processDefinition.stepDefinitions` has a step-count ratio outside 0.5–2.0× the target before even entering `clusterSignatures`. This prunes the O(n²) input set cheaply.

3. **Medium-term (P1):** Persist the cluster result to `ProcessDefinition.pathSignature` (already stored) so the cluster lookup on the variants endpoint can be resolved via a DB `WHERE pathSignature = ?` rather than recomputing from scratch. The `clusterWorkflows` function already does this write; `analyzeWorkflowVariants` could read it instead of re-clustering on demand.

4. **Long-term (P2):** Replace the O(n²) scan with the MinHash/LSH approach already described in the comment at `clusterSignatures.ts:12-15`.

---

### PERF-2 [MEDIUM] Full artifact content loaded for all workflows even when only the target cluster matters
**File:** `apps/web-app/src/lib/intelligence.ts:98-107`

The Prisma include fetches `contentJson` for ALL workflows, not just those in the target cluster. The `contentJson` of a `process_output` artifact is typically 10–100 KB of serialized JSON (all step definitions, SOP, events summary). For 100 workflows that is 1–10 MB transferred from the DB and then mostly discarded (only the cluster members' bundles are passed to `analyzePortfolio`).

**Fix:** Perform a two-phase fetch: first fetch lightweight rows (no `contentJson`) to compute signatures, cluster, then re-fetch only the cluster members' `contentJson`. This is a 2× DB round-trip but reduces data transfer by a factor of `N / cluster_size` for the second fetch.

---

## 3. DETERMINISM

### DET-1 [HIGH] `new Date().toISOString()` inside `detectVariants` makes `computedAt` nondeterministic
**File:** `packages/intelligence-engine/src/variantDetector.ts:39`

```ts
export function detectVariants(bundles, options): VariantSet {
  const now = new Date().toISOString();  // <-- wall-clock call, not injected
```

This is the same class of `Date.now()` leak closed in the MDR burn-down sequence (MDR-P03/P04, iters 037/043). The `computedAt` field on the `VariantSet` (and therefore on the `PortfolioIntelligence.variants` object) differs on every call for the same inputs. This means:

- The response body from `POST /api/workflows/[id]/variants` is never byte-identical across calls even for unchanged data, defeating any future ETag/caching strategy.
- Persisting the result (as `clusterWorkflows` does via `intelligenceJson`) produces a different stored value on every run.
- The same leak exists in `intelligenceEngine.ts:78`: `const now = new Date().toISOString()` for `computedAt` on the `PortfolioIntelligence` root.

**Fix:** Inject a clock via `IntelligenceOptions` using the established `referenceNowMs: number` pattern from `route.ts:485-487`. Pass `computedAt: new Date(options.referenceNowMs).toISOString()` at both sites. The variants endpoint can pass `Date.now()` at request entry (the determinism contract is per-request, not across requests).

---

### DET-2 [LOW] `intelligenceEngine.ts:78` has the same wall-clock call
**File:** `packages/intelligence-engine/src/intelligenceEngine.ts:78`

```ts
const now = new Date().toISOString();
```

Same pattern as DET-1 but at the `PortfolioIntelligence` root `computedAt` field. Fixed by the same clock-injection approach.

---

## 4. ERROR HANDLING AND RESILIENCE

### ERR-1 [HIGH] `analyzeWorkflowVariants` has no internal try/catch; `computePathSignature` and `clusterSignatures` throws propagate as 500
**File:** `apps/web-app/src/lib/intelligence.ts:433-459`, `apps/web-app/src/app/api/workflows/[id]/variants/route.ts:55-57`

The route wraps in a try/catch (`route.ts:49-58`), but any throw from within `analyzeWorkflowVariants` — including the `TypeError: undefined is not iterable` from BUG-2 and the `SyntaxError` from BUG-1 — surfaces only as:

```json
{ "error": "Analysis failed" }
```

HTTP 500. The client has no way to distinguish:
- Corrupt artifact data (a data problem, not a bug)
- Engine crash on unexpected input shape
- Transient DB timeout

**Recommended contract for the variants route:**

| Condition | HTTP Status | Body |
|---|---|---|
| Not authenticated | 401 | `{ error: 'Unauthorized' }` |
| Not on Team+ plan | 403 | `{ error: ..., feature: ..., requiredPlan: ..., upgradeUrl: ... }` |
| Workflow not found / not owned | 404 | `{ error: 'Workflow not found' }` |
| Workflow has no processOutput yet | 422 | `{ error: 'No process output available', code: 'NO_OUTPUT' }` |
| No similar runs found (single-run fallback) | 200 | `{ intelligence, singleRun: true }` (not 422) |
| Engine/data error | 500 | `{ error: 'Analysis failed' }` |

The critical contract gap: "no similar runs" is not an error state; it is the honest single-run view. Returning 422 for it causes the UI to show an error instead of a meaningful single-run baseline.

---

### ERR-2 [MEDIUM] `analyzePortfolio` throws on empty `runs` array but callers in `clusterWorkflows` do not protect it universally
**File:** `apps/web-app/src/lib/intelligence.ts:186`

In `clusterWorkflows`, `analyzePortfolio` is called at line 186 after `if (bundles.length >= 1)` but that block has a catch-all `} catch { // Intelligence computation failed — store without it }` at line 251-253. So this path is safe. The variants path (`analyzeWorkflowVariants:458`) also guards with `if (bundles.length === 0) return null` at line 456. Assessed as resilient at current code, but fragile to refactor (see BUG-5).

---

## 5. SECURITY / MULTI-TENANT

### SEC-1 [PASS] Multi-tenant isolation is correct throughout the variants path

The following ownership checks are in place and verified:

1. **Route-level ownership check (route.ts:41-46):**
   ```ts
   const workflow = await db.workflow.findFirst({
     where: { id: params.id, userId: session.user.id },
   });
   ```
   The target workflow is verified as belonging to `session.user.id` before `analyzeWorkflowVariants` is called.

2. **Data load scoped to `userId` (intelligence.ts:90-93):**
   ```ts
   const where: Record<string, unknown> = {
     userId,
     status: 'active',
   };
   ```
   `getWorkflowsWithOutputs` always scopes the Prisma query to the authenticated `userId`. The `userId` passed through is `session.user.id` from the route — no user-supplied value is used.

3. **No cross-user leakage in clustering:** `clusterSignatures` only sees the IDs and path signatures of workflows already filtered by `userId`. The member IDs returned are a subset of the user's own workflow IDs.

4. **No write path:** `analyzeWorkflowVariants` is explicitly documented as read-only (`intelligence.ts:428-430`). No DB writes occur in the variants code path.

No cross-tenant vulnerabilities identified.

---

### SEC-2 [NOTE] Rate limiting absent on the `/variants` endpoint

The `/api/workflows/[id]/variants` route has no rate limit. Given the O(n²) compute cost documented in PERF-1, a user or automated script that fires this endpoint rapidly can significantly impact server performance. The `/api/workflows/[id]/analyze` route (the single-workflow counterpart) also has no rate limit. This is not a security bug per se but is an abuse-potential that grows with Team user workflow counts.

---

## 6. PRIORITIZED FIX PLAN

### P0 — Ship-blocking correctness/resilience

| ID | Fix | File | Effort |
|---|---|---|---|
| BUG-1 | Wrap `JSON.parse` in per-row try/catch, set `processOutput: null` on failure | `intelligence.ts:116` | ~5 LOC |
| BUG-2 | Add runtime guard `processDefinition?.stepDefinitions != null` to `withOutput` filter | `intelligence.ts:441` | ~3 LOC |
| PERF-1 | Add `take: MAX_CANDIDATE_WORKFLOWS` (suggest 200) cap to the unbounded `findMany` inside `analyzeWorkflowVariants` | `intelligence.ts:98` | ~5 LOC |
| ERR-1 | Differentiate the 422 "no output" vs 200 "single-run fallback" contract; document codes | `variants/route.ts:51-53` + `intelligence.ts:439/456` | ~15 LOC |

### P1 — High-value hardening

| ID | Fix | File | Effort |
|---|---|---|---|
| DET-1/DET-2 | Inject clock via `IntelligenceOptions.referenceNowMs`; replace `new Date()` calls in `variantDetector.ts:39` and `intelligenceEngine.ts:78` | Both files | ~20 LOC |
| PERF-2 | Two-phase DB fetch: lightweight fetch for clustering, full `contentJson` only for cluster members | `intelligence.ts:89-119` | ~30 LOC |
| BUG-4 | Verify upload pipeline maps `sessionId → workflow.id` deterministically; if not, add `workflowId` to `evidenceRunIds` payload | `processRunBuilder.ts:28` + route | ~10 LOC investigation |

### P2 — Future hardening (non-blocking)

| ID | Fix | File | Effort |
|---|---|---|---|
| BUG-3 | Discriminated result type from `analyzeWorkflowVariants` | `intelligence.ts:433` | ~30 LOC |
| BUG-5 | Make `analyzeWorkflowVariants` resilient to refactor by adding an explicit `bundles.length > 0` assertion before `analyzePortfolio` | `intelligence.ts:456-458` | ~3 LOC |
| PERF-1 (phase 2) | Pre-filter cluster candidates by step-count ratio before O(n²) scan | `intelligence.ts:441-450` | ~15 LOC |
| SEC-2 | Add per-user rate limiting on `/variants` (suggest 10 req/min, in-memory bucket matching the bootstrap-buckets pattern) | `variants/route.ts` | ~20 LOC |

---

## Summary

The variants feature is functionally correct for well-formed data and maintains proper multi-tenant isolation. The two most immediate risks are:

1. A single malformed `process_output` artifact crashing the entire request for all users who have one (BUG-1 + BUG-2 compound) — low probability today, certainty as the corpus grows and schema versions diverge.
2. Unbounded O(n²) compute on every variants-map open for users with many workflows (PERF-1) — the Team plan has no recording cap, making this a certainty for power users.

Both P0 fixes are small (under 15 LOC combined) and do not change the external API contract.
