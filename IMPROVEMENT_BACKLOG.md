# Ledgerium AI — Improvement Backlog

Last updated: 2026-04-17 (post Meta-Review 001 — rescored under refined formula)  
Current phase: Phase 1  
Backlog purpose: maintain a ranked, evidence-based portfolio of the highest-value fixes, improvements, and experiments for bounded improvement loops.

## Scoring Formula

```text
priority_score =
    impact + alignment + learning + confidence
  − effort − risk
  + release_blocker_bonus      # +3 if item is in SYSTEM_HEALTH.md Release Blockers
  − saturation_penalty          # −2 if 3 of last 5 iterations landed in the same Area
```

Scoring scale:
- 1 = very low
- 3 = medium
- 5 = very high

Higher total score = higher priority. Post Meta-Review 001: range widened to ~6–18 (was 10–16).

### Saturation status (computed over iter 004–008)

- SOP area (presentation / trust / quality gate) = 4 of last 5 → **SATURATED**
- Affected open items: "Wire validateRenderedSOP into processSession.ts", "Extract confidence thresholds" → each receives −2 saturation penalty until saturation clears (requires 3 non-SOP loops in the last 5).

### Portfolio override rules

See `CLAUDE.md § Selection Policy` — any of these overrides top-score:
1. Release-blocker minimum cadence (1-in-5)
2. Area saturation rule
3. Follow-up burn-down (1-in-5)

---

## Portfolio Summary

- Total candidates reviewed: 27 (prior 26 + LiveStepBuilder convergence blocker surfaced in Meta-Review 001)
- Top priority area: **release blockers** (E2E tests, session persistence, LiveStepBuilder convergence)
- Highest-risk unresolved item: Playwright E2E coverage missing (release blocker, 8 loops unaddressed)
- Last completed item: Integrate `@ledgerium/policy-engine` into content capture pipeline (iteration 008)
- Last meta-review: **Meta-Review 001 (2026-04-17)** — see `META_REVIEW_001.md`
- Next recommended item: **Add Playwright E2E tests for recording lifecycle** (iter 009, new score 15, blocker-cadence rule)

---

## Ranked Backlog

Score column format: `base ± adjustments = final` where adjustments are `+B` (release-blocker bonus) and `−S` (saturation penalty). Ranked by `final`.

### Release Blockers (auto-top per 1-in-5 cadence rule)

| Rank | Title | Type | Area | I | A | L | C | E | R | Score | Status |
|------|-------|------|------|---|---|---|---|---|---|-------|--------|
| 1 | **Add Playwright E2E tests for recording lifecycle** | improvement | quality assurance | 4 | 5 | 4 | 4 | 3 | 2 | 12 `+B3` = **15** | proposed — **iter 009** |
| 2 | Persist full session event stream for service worker restart recovery | fix | session durability | 5 | 5 | 4 | 4 | 4 | 3 | 11 `+B3` = **14** | proposed — iter 010 |
| 3 | Converge LiveStepBuilder with StreamingSegmenter | improvement | extension architecture | 4 | 5 | 3 | 3 | 4 | 3 | 8 `+B3` = **11** | proposed — iter 011 |

### Standard Backlog

| Rank | Title | Type | Area | I | A | L | C | E | R | Score | Status |
|------|-------|------|------|---|---|---|---|---|---|-------|--------|
| 4 | Add dashboard-level process for artifact and system-health refresh after each loop | improvement | agentic CI | 3 | 4 | 5 | 4 | 2 | 1 | **13** | proposed |
| 5 | Create invariant-focused regression suite for segmentation and normalization versions | improvement | invariants / testing | 4 | 5 | 4 | 4 | 3 | 2 | **12** | proposed |
| 6 | Draft clearer product wedge and ICP narrative for deterministic process intelligence | experiment | product / GTM | 3 | 4 | 5 | 3 | 2 | 1 | **12** | proposed |
| 7 | Widen policy-engine `credit[_-]?card` regex to `/credit[\s_-]*card/i` | fix | policy coverage | 2 | 4 | 2 | 5 | 1 | 1 | **11** | new (iter 008 follow-up) |
| 8 | Add try/catch to 11 unguarded API routes | fix | API safety | 4 | 4 | 2 | 5 | 3 | 1 | **11** | new (iter 001) |
| 9 | Add structured error logging with session context | improvement | observability | 4 | 4 | 4 | 4 | 3 | 2 | **11** | proposed |
| 10 | Evaluate event bundle integrity checks before downstream derivation | experiment | evidence linkage | 4 | 5 | 5 | 3 | 3 | 3 | **11** | proposed |
| 11 | Fix (db as any) casts / regenerate Prisma client | fix | type safety | 3 | 4 | 3 | 4 | 2 | 2 | **10** | new (iter 001) |
| 12 | Initialize Prisma migrations baseline | fix | data integrity | 4 | 4 | 3 | 4 | 2 | 3 | **10** | new (iter 001) |
| 13 | Define recorder failure-state UX for service worker interruption and recovery | experiment | UX resilience | 3 | 4 | 4 | 3 | 2 | 2 | **10** | proposed |
| 14 | Wire `validateRenderedSOP` into `processSession.ts` (dev-throws/prod-logs) | fix | SOP quality gate | 3 | 5 | 3 | 4 | 2 | 2 | 11 `−S2` = **9** | new (iter 007 follow-up) — SOP-saturated |
| 15 | Fix DELETE /api/keys error handling | fix | API safety | 2 | 3 | 1 | 5 | 1 | 1 | **9** | new (iter 001) |
| 16 | Extract shared ingestion service (upload/sync) | improvement | API architecture | 4 | 5 | 4 | 3 | 4 | 3 | **9** | new (iter 001) |
| 17 | Extract confidence thresholds to shared constants module (remove `renderHelpers.ts ↔ sopTemplates.ts` circular) | improvement | code hygiene | 2 | 3 | 2 | 5 | 1 | 1 | 10 `−S2` = **8** | new (iter 006 follow-up) — SOP-saturated |

### Completed (historical)

| Iter | Title | Final score |
|------|-------|-------|
| 001 | Add vitest config + test script to web-app | 16 |
| 003 | Replace duplicated background logic with workspace package imports | 14 |
| 004 | Metadata strip + confidence badge above the fold in SOP markdown renderer | 15 |
| 005 | Hoist per-step `evidenceEvents: string[]` onto SOP step interfaces | 15 |
| 006 | Per-step `confidence?: number` + three-tier confidence glyph | 14 |
| 007 | Add `templates/sopValidator.ts` (validator-only, no pipeline wiring) | 13 |
| 008 | Integrate `@ledgerium/policy-engine` into `content/capture.ts` | 13 |

> Ranks 1–3 are release blockers and take priority over higher raw-score items per the 1-in-5 release-blocker cadence rule (see `CLAUDE.md § Selection Policy`).
> SOP-saturated items (rank 14, 17) will return to natural score once 3 of the last 5 iterations are in non-SOP areas.

---

## Candidate Details

### 1. Replace duplicated background logic with workspace package imports
- Type: improvement
- Area: extension architecture
- Problem: the extension background layer duplicates normalization, segmentation, and policy logic instead of importing from workspace packages.
- Evidence: listed as the top active Phase 1 priority and explicitly tracked technical debt in the current engineering brief.
- Expected benefit: stronger determinism, less divergence risk, cleaner package boundaries, easier maintenance.
- Dependencies: verify package interfaces are stable; confirm extension build wiring.
- Impact (1-5): 5
- Strategic alignment (1-5): 5
- Learning value (1-5): 4
- Confidence (1-5): 5
- Effort (1-5): 3
- Risk (1-5): 2
- Priority score: 14
- Recommended next action: select for the next bounded loop unless a blocking reliability issue supersedes it.
- Notes: this is the best current blend of impact, feasibility, and system simplification.

### 2. Persist full session event stream for service worker restart recovery
- Type: fix
- Area: session durability
- Problem: session data is not fully persisted to `chrome.storage.local`; only meta is stored, which weakens recovery after service worker restart.
- Evidence: explicitly listed in known issues and active priorities.
- Expected benefit: stronger resilience, less data loss risk, more trustworthy capture pipeline.
- Dependencies: storage strategy, serialization boundaries, recovery-state validation.
- Impact (1-5): 5
- Strategic alignment (1-5): 5
- Learning value (1-5): 4
- Confidence (1-5): 4
- Effort (1-5): 4
- Risk (1-5): 3
- Priority score: 11
- Recommended next action: keep at the top of the queue; likely follows the package deduplication work.
- Notes: mission-critical for trust and recovery.

### 3. Integrate `@ledgerium/policy-engine` into `content/capture.ts`
- Type: fix
- Area: capture pipeline
- Problem: `content/capture.ts` still uses a local sensitivity pattern instead of the shared policy engine.
- Evidence: explicitly listed in known issues.
- Expected benefit: consistent policy application, less duplication, cleaner trust model.
- Dependencies: import path validation and content-script compatibility.
- Impact (1-5): 4
- Strategic alignment (1-5): 5
- Learning value (1-5): 3
- Confidence (1-5): 5
- Effort (1-5): 2
- Risk (1-5): 2
- Priority score: 13
- Recommended next action: strong low-risk candidate if the next loop favors a smaller change.
- Notes: likely fast win.

### 4. Add Playwright E2E tests for recording lifecycle
- Type: improvement
- Area: quality assurance
- Problem: no Playwright E2E coverage exists for the extension recording lifecycle.
- Evidence: explicitly listed as an active priority and known gap.
- Expected benefit: higher confidence in capture, recovery, and lifecycle behavior.
- Dependencies: reliable extension test harness and stable recording scenarios.
- Impact (1-5): 4
- Strategic alignment (1-5): 5
- Learning value (1-5): 4
- Confidence (1-5): 4
- Effort (1-5): 3
- Risk (1-5): 2
- Priority score: 12
- Recommended next action: likely one of the first testing-focused loops after architectural cleanup.
- Notes: unlocks safer future iteration.

### 5. Add structured error logging with session context
- Type: improvement
- Area: observability
- Problem: logging lacks enough session-aware context to trace failures across capture and recovery flows.
- Evidence: active priority; consistent with observability-first architecture principle.
- Expected benefit: faster debugging, clearer auditability, better recovery analysis.
- Dependencies: log schema and session-context propagation.
- Impact (1-5): 4
- Strategic alignment (1-5): 4
- Learning value (1-5): 4
- Confidence (1-5): 4
- Effort (1-5): 3
- Risk (1-5): 2
- Priority score: 11
- Recommended next action: pair with session recovery or testing work.
- Notes: strong enabling improvement.

### 6. Create invariant-focused regression suite for segmentation and normalization versions
- Type: improvement
- Area: invariants / testing
- Problem: key constants and versioned behaviors are documented, but they should have explicit regression protection.
- Evidence: strong invariant list in compaction protocol; high product risk if changed accidentally.
- Expected benefit: protects deterministic core and reduces silent drift.
- Dependencies: identify critical invariant assertions and placement in test hierarchy.
- Impact (1-5): 4
- Strategic alignment (1-5): 5
- Learning value (1-5): 4
- Confidence (1-5): 4
- Effort (1-5): 3
- Risk (1-5): 2
- Priority score: 12
- Recommended next action: consider early because it increases safety for other refactors.
- Notes: high trust leverage.

### 7. Add dashboard-level process for artifact and system-health refresh after each loop
- Type: improvement
- Area: agentic CI
- Problem: the continuous-improvement system needs consistent artifact refresh discipline after each iteration.
- Evidence: new agentic CI structure requires visible state and repeatable updates.
- Expected benefit: stronger governance, less stale status, clearer operator visibility.
- Dependencies: command + dashboard templates + execution discipline.
- Impact (1-5): 3
- Strategic alignment (1-5): 4
- Learning value (1-5): 5
- Confidence (1-5): 4
- Effort (1-5): 2
- Risk (1-5): 1
- Priority score: 13
- Recommended next action: already partially addressed by the artifact pack; maintain as process discipline.
- Notes: enabling layer, not product feature.

### 8. Define recorder failure-state UX for service worker interruption and recovery
- Type: experiment
- Area: UX resilience
- Problem: interruption and restart recovery likely need clearer user-facing states and guidance.
- Evidence: recovery is an active engineering priority; current UX guidance is not yet captured.
- Expected benefit: better trust, lower confusion, clearer error handling.
- Dependencies: recovery model and state transitions.
- Impact (1-5): 3
- Strategic alignment (1-5): 4
- Learning value (1-5): 4
- Confidence (1-5): 3
- Effort (1-5): 2
- Risk (1-5): 2
- Priority score: 10
- Recommended next action: good paired discovery item once recovery implementation is clearer.
- Notes: not the first build item, but strategically useful.

### 9. Evaluate event bundle integrity checks before downstream derivation
- Type: experiment
- Area: evidence linkage
- Problem: downstream derivation quality depends on trustworthy, complete event bundles.
- Evidence: consistent with Ledgerium's trust-first and evidence-linked positioning.
- Expected benefit: stronger guarantees before normalization and segmentation.
- Dependencies: define integrity criteria and failure behavior.
- Impact (1-5): 4
- Strategic alignment (1-5): 5
- Learning value (1-5): 5
- Confidence (1-5): 3
- Effort (1-5): 3
- Risk (1-5): 3
- Priority score: 11
- Recommended next action: strong future experiment after core recovery and package cleanup.
- Notes: important for long-term trust model.

### 10. Draft clearer product wedge and ICP narrative for deterministic process intelligence
- Type: experiment
- Area: product / GTM
- Problem: product direction is strong, but the clearest ICP and wedge narrative could be made sharper for future launch work.
- Evidence: current docs are engineering-strong; GTM articulation can become more explicit.
- Expected benefit: better product-market framing and future launch efficiency.
- Dependencies: product-manager + market-research + growth-strategist assessment.
- Impact (1-5): 3
- Strategic alignment (1-5): 4
- Learning value (1-5): 5
- Confidence (1-5): 3
- Effort (1-5): 2
- Risk (1-5): 1
- Priority score: 12
- Recommended next action: run as a current-state strategy loop, not a coding loop.
- Notes: useful but not ahead of deterministic-core work.

---

## Selection Rules

See `CLAUDE.md § Selection Policy` for the authoritative policy.

**Portfolio overrides** (any overrides top-score):
1. Release-blocker minimum cadence (1-in-5)
2. Area saturation rule (no 3-in-a-row same Area)
3. Follow-up burn-down (1-in-5 targets a prior follow-up)

**Within those constraints, prefer:**
1. the highest final score
2. lower-risk items among close scores
3. items that improve determinism, traceability, recovery, and validation
4. reversible changes
5. **exactly one item per iteration**

The iteration log's "Candidate Selection" block MUST state which rule drove the selection: `top-score`, `blocker-cadence`, `saturation-rule`, `burn-down`, or `directed`.
