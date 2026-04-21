# Path C — Process Intelligence Metrics Engine Sequencing Plan

**Status:** Coordinator synthesis artifact (Define-phase, Mode 3-adjacent, non-counting)
**Date:** 2026-04-21
**Owner:** coordinator
**Inputs synthesized:**
- `INPUT_SPEC.md` — CEO-authored 22-section spec (~750 lines)
- `PRD_METRICS_ENGINE.md` — product-manager (17 sections, ~590 lines)
- `ARCHITECTURE_METRICS_ENGINE.md` — system-architect (~1,200 lines; Tier-computability matrix)
- `UX_FLOWS_METRICS_ENGINE.md` — ux-designer (~510 lines; pinned-columns + drawer picker)
- `TEST_PLAN_METRICS_ENGINE.md` — qa-engineer (~750 lines; per-metric matrix)
- `MEASUREMENT_PLAN_METRICS_ENGINE.md` — analytics (~810 lines; 5 north-star metrics)
- `COPY_PACK_METRICS.md` — growth-strategist (~710 lines; 41/42/4 flags)
- `COMPETITIVE_VALIDATION_METRICS.md` — competitive-researcher (coordinator-synthesized; full output in persisted JSON)

---

## 1. Purpose

This artifact is the coordinator's **integration layer** over the 8 Define-phase inputs. It does NOT define product (PRD owns that). It answers the three coordinator-owned questions:

1. **When does Path C Build begin** — and what must ship first?
2. **How does Path C Build sequence onto the committed burn-down program** (iter 027-031) without violating governance?
3. **What CEO decisions are blocked** before PRD can be approved and Build can begin?

The answer lives in §4 (locked prerequisites), §5 (proposed Build sequence), and §7 (consolidated CEO decision list).

---

## 2. Scope Reconciliation Across Define Inputs

### 2.1 Metric-count alignment

| Source | Stated metric count | Scope |
|---|---|---|
| INPUT_SPEC § 19 default pack | 8 primary + 7 secondary = 15 | Default pack only |
| INPUT_SPEC § 1-18 catalogue | ~90 across 9 layers | Full engine |
| PRD_METRICS_ENGINE v1 | 15 (bounds to INPUT_SPEC § 19 pack) | v3 Phase 1 ship scope |
| ARCHITECTURE computability matrix | 93 total: 32 Tier A + 44 Tier B + 13 Tier C + 4 Tier D | Full engine |
| COPY_PACK | 91 rows: 41 GREEN + 42 AMBER + 4 RED | Display-label review scope |
| TEST_PLAN | ~90 metrics in per-metric matrix | Full engine |
| MEASUREMENT_PLAN | 5 north-star + top-10 column-add tracking | Observable v3 behavior |

**Reconciliation:** Path C Build ships only the **15 PRD-v1 default-pack metrics** in Phase 1. The remaining ~75 metrics exist in the engine and column picker but are **not** in the v3 launch default view. This is consistent across PRD, UX_FLOWS (column picker surfaces full catalogue), and ARCHITECTURE (engine computes full set, UI shows default).

### 2.2 Tier discipline

All 15 default-pack metrics must be Tier A (computable today with no new inputs) or Tier B (computable with a defined formula but no external data). ARCHITECTURE confirms this is achievable: all 8 primary + all 7 secondary map to Tier A or B.

- **Tier C** (requires external inputs, e.g., SLA thresholds, business-rule definitions) — excluded from v3 Phase 1 per PRD.
- **Tier D** (requires cost model or ML) — excluded from v3 Phase 1 per PRD.
- **Exception:** Tier D `cost_per_run` and `savings_opportunity_usd` ship as **honest "—" columns** with CTA per COMPETITIVE_VALIDATION Finding 5.

### 2.3 Naming-convention single source of truth

COPY_PACK + COMPETITIVE_VALIDATION overlap on ~10 metric renames. Conflicts resolved in **COMPETITIVE_VALIDATION § Terminology Decision Register**. That register is the **authoritative naming table** for all downstream work (PRD implementation, UX copy, analytics event definitions, test fixtures). If COPY_PACK and COMPETITIVE_VALIDATION disagree, COMPETITIVE_VALIDATION wins because it is grounded in category-leader evidence.

**One material override:** COPY_PACK's "Process Safety Score" rename (for `risk_score_0_100`) is **rejected**. The display label stays **"Process Health Score"** per COMPETITIVE_VALIDATION Finding 2, with the "higher = healthier" direction clarified via a visible popover legend.

---

## 3. Governance Constraints That Gate Path C Build

### 3.1 MR-005 D-7 — Mode 5 length soft cap

ARCHITECTURE projects **~11 iterations (iter 032-042)** to ship the full metrics-engine scope. This exceeds the N ≥ 6 threshold. Before any Mode 5 sequence begins for Path C Build, **a meta-coordinator Mode 4 pre-check is MANDATORY**. The pre-check must evaluate:

- Projected pool trajectory (starting from iter 032 pool size)
- Projected area-saturation arc (11 consecutive iterations on `web-app` + new `packages/metrics-engine` surface)
- Agent-diversity projection (architect projects 4 consecutive `system-architect` iterations 033-036)
- Whether Path C can be split into **two or more sequences** with a non-Path-C iteration between them

**Coordinator recommendation:** Do NOT run Path C Build as a single Mode 5 sequence of 11. Split into Phase A (foundation, iter 032-037) and Phase B (default-pack UI + analytics, iter 038-042), with a burn-down-plus-non-metric iteration between them. This naturally satisfies D-7 and resets agent-diversity counters.

### 3.2 Follow-up pool ceiling

At Path C Build entry (projected iter 032), pool will be **~28 open follow-ups** per the burn-down trajectory in § 5. This is still **above the hard ceiling of 15** (MR-005 D-2). MR-005 D-2 applies inside Mode 5 only, so each Path C Build iteration can legally select — BUT the hard-stop clause *within* a Mode 5 sequence fires if pool > 15 at any iteration entry. The sequence must therefore embed additional burn-down iterations (see § 5 Phase A design).

### 3.3 Agent-diversity rule

Architect's projection = 4 consecutive `system-architect` iterations (033-036) for schema + engine skeleton + core metrics + storage. This **will trip the 4+ consecutive implementer rule** at iter 036, forcing an agent rotation at iter 037. Rotation to `backend-engineer` (handler wiring) or `qa-engineer` (benchmark harness) is clean.

### 3.4 Reverse portfolio-drift

Iter 027 (#7 policy-engine) clears the armed D-1 trigger, so entering Path C in iter 032 with a web-app-heavy sequence does NOT immediately re-arm D-1. However, 11 consecutive web-app / metrics-engine iterations **will re-arm** D-1 around iter 037. The Phase A/B split proposed in § 3.1 naturally handles this by placing an extension-surface iteration between phases.

---

## 4. Locked Prerequisites (Must Ship Before Path C Build)

The following iterations are **hard prerequisites** identified by the Define-phase agents. They cannot be deferred or run in parallel with Path C Build:

| # | Iteration | Why it blocks | Owner-agent analysis |
|---|---|---|---|
| 1 | **Iter 027** — #7 policy-engine credit-card regex widening | Clears MR-005 D-1 reverse portfolio-drift (armed) and is mandatory burn-down per pool-ceiling rule | Unchanged from prior programming |
| 2 | **Iter 028** — #19 + #20 bundled storage.ts SW-startup burn-down | Mandatory burn-down (pool > 15 hard ceiling still applies until post-028 pool drop) | Unchanged from prior programming |
| 3 | **Iter 029** — DV2-R01 v1-vs-v2 health-score distribution script | Audit-intake P0; MEASUREMENT_PLAN confirms #51 is next-critical prerequisite; this also unblocks #42 v1 retirement | DASHBOARD_V2_REVIEW_001 § Recommended Iter Sequencing |
| 4 | **Iter 030** — #51 v2 analytics instrumentation | **MEASUREMENT_PLAN HARD BLOCKER:** "Must ship in a completed iteration before v3 build begins; NOT safe to run in parallel." Without v2 events in production we cannot measure Configuration Rate / Drill-Through / Time-to-First-Insight baselines for v3. | MEASUREMENT_PLAN §3 critical sequencing |
| 5 | **Iter 031** — DV2-R02 + DV2-R03 bundled `WorkflowRow` interaction hardening | UX_FLOWS top risk 3: "DV2-R02/R03 must be fixed before v3 Phase B" (per-cell popover keyboard interaction depends on the tooltip dismiss pattern fixed in DV2-R03) | UX_FLOWS § Risks |
| 6 | **(within Path C Phase A)** — DV2-R06 v1 shadow-function route audit | PRD DEP-03 hard dependency. DASHBOARD_V2_REVIEW_001 cold-pool P1 row; must be PRD-promoted per MR-005 D-5 clause 5. Blocks #42 final retirement AND blocks any v3 route replacing the v1 `/api/workflows` surface without surprise. | PRD_METRICS_ENGINE DEP-03 + DASHBOARD_V2_REVIEW_001 cold pool |

Items 1-5 are already programmed in the burn-down schedule. **Item 6 (DV2-R06) must be added to the live backlog via PRD-trigger promotion once PRD_METRICS_ENGINE.md is CEO-approved.** The promotion is mechanical — MR-005 D-5 clause 5 allows promotion on an approved PRD with enumerated dependency; PRD_METRICS_ENGINE DEP-03 already cites it.

### 4.1 `packages/intelligence-engine/` reuse

ARCHITECTURE's key discovery: `packages/intelligence-engine/` already ships `buildMetrics`, `analyzeTimestudy`, `analyzeVariance`, `detectVariants`, `detectBottlenecks`, `detectDrift`, `computeStandardizationScore`, `scoreAutomationOpportunity`, `computePathSignature`, `normalizeTitle`, `fingerprintStep`. These functions **cover ~40% of the Tier A + Tier B metric surface**. The architect's projection of 11 iterations ASSUMES this reuse. Any Build iteration that reinvents one of these primitives is scope-expansion and must be caught in review.

---

## 5. Proposed Path C Build Sequence

**Governance precedence:** all proposed iterations below are **subject to** (1) iter 027-031 burn-down commitments completing first, (2) mandatory meta-coordinator Mode 4 pre-check before the first Mode 5 sequence is formally opened, and (3) iter 032 re-evaluation of the then-current pool size against MR-005 D-2.

### Phase A — Foundation (proposed iter 032-037, 6 iterations)

| Iter | Item | Agent | Note |
|---|---|---|---|
| 032 | DV2-R06 v1 shadow-function route audit (PRD-promoted) | `system-architect` OR `qa-engineer` | Hard prerequisite surfaced in § 4 item 6; also serves as Build-phase entry validation |
| 033 | Prisma additive schema: `workflow_runs`, `workflow_steps`, `step_edges`, `metric_facts` | `database-engineer` OR `system-architect` | Tier 0 data model; DECLARED MAY touch existing `WorkflowMetric` table; additive-only migration |
| 034 | `packages/metrics-engine/` scaffold + deterministic primitive wiring from `intelligence-engine/` | `system-architect` | **Agent-diversity counter starts here: 1/3** |
| 035 | Core flow metrics Tier A wiring (throughput_time_ms, cycle_time_ms, flow_efficiency, bottleneck_severity, process_health_score composite) | `system-architect` | **2/3** |
| 036 | BullMQ job pattern for metric_fact rollup + `metric_rollup_daily` materialization | `system-architect` | **3/3** — rotate implementing agent at iter 037 |
| 037 | **Burn-down iteration (MANDATORY agent rotation)** — select from audit cold-pool P1 (DV2-R04 axe-core ratchet recommended; non-web-app extension-surface item also acceptable to clear D-1) | `qa-engineer` OR `backend-engineer` | Resets agent-diversity; resets D-1 counter; Phase A→B transition buffer |

Phase A landmark: post-iter-036, the engine computes all 15 default-pack metrics server-side; they are NOT yet wired to the v3 UI. Phase B does the UI wiring.

### Phase B — Default-pack UI + analytics (proposed iter 038-042, 5 iterations)

| Iter | Item | Agent | Note |
|---|---|---|---|
| 038 | v3 default-column table + pinned-columns + horizontal scroll | `frontend-engineer` | UX_FLOWS § Default view |
| 039 | Column-picker drawer (320px right-anchored, live-preview commit) | `frontend-engineer` | UX_FLOWS § Column picker |
| 040 | User-level saved views + per-cell popover (formula breakdown for `process_health_score` per COMPETITIVE_VALIDATION Finding 2) | `frontend-engineer` | UX_FLOWS § Saved views + popover |
| 041 | v3 analytics events (6-event spec from MEASUREMENT_PLAN § 2) + upgrade-CTA for Tier D honest "—" cells | `backend-engineer` + `analytics` | MEASUREMENT_PLAN + COMPETITIVE_VALIDATION Finding 5 |
| 042 | v3 flag rollout + #42 v1 retirement + #57 v2 flag retirement | `devops-engineer` | Final cleanup; flag-lifecycle parity with v2 rollout |

Phase B landmark: post-iter-042, v3 is the default dashboard route, v1 is retired, v2 flag is retired.

### Phase A/B totals

- Iterations: 11 (architect's estimate validated)
- Burn-down iterations embedded: 1 (iter 037)
- Agent-diversity resets: 1 (iter 037)
- Meta-review triggers during Build: 1 at iter 036 close (3-loop cadence from iter 033 start = iter 035; next at iter 038 cadence-based; plus Phase B implementing-agent-diversity check)

**Net: Path C delivers in 11 counted iterations plus embedded burn-down (iter 037), for 11 iterations of Build work + 1 ride-along maintenance.** No scope reduction vs architect projection.

---

## 6. Risks Surfaced by the Define Lane

| ID | Risk | Source | Mitigation |
|---|---|---|---|
| R-C1 | Variant-hash stability across StreamingSegmenter versions | ARCHITECTURE § risks | Freeze `computePathSignature()` as a versioned pure fn; breakage = new version + parallel run |
| R-C2 | BullMQ rollup job on critical path of workflow-run ingest | ARCHITECTURE § risks | Materialize into `metric_rollup_daily`; default-view reads rollup table, never computes on request |
| R-C3 | `metric_fact` row-count explosion at scale | ARCHITECTURE § risks | Retention policy on metric_fact raw rows; only rollups retained indefinitely |
| R-C4 | Per-cell popover keyboard interaction discoverability | UX_FLOWS top risk 1 | DV2-R03 tooltip dismiss fix (iter 031) provides the pattern; popover reuses the hook |
| R-C5 | Column picker becomes "wall of KPIs" | UX_FLOWS top risk 2 | Default-view gating (15 metrics surfaced; 75 hidden); column-picker category tabs from UX spec |
| R-C6 | No ESLint guard on Date.now() in metric formulas | TEST_PLAN blocker 2 | Add eslint rule in iter 033 (schema-phase adjacency); all formula fns must be pure on injected clock |
| R-C7 | No performance benchmark infrastructure | TEST_PLAN blocker 3 | `perf/` directory + `baselines.json` created in iter 034 with metrics-engine scaffold |
| R-C8 | `seedDashboardV2Dev()` missing (8 E2E suites skipped) | TEST_PLAN blocker 1 / DV2-R05 cold pool | Promote DV2-R05 via PRD-trigger path alongside DV2-R06; iter 037 burn-down or adjacent |
| R-C9 | Free-tier cohort size too small for upgrade-funnel significance | MEASUREMENT_PLAN risk 3 | Acknowledge in MEASUREMENT_PLAN; Phase B iter 041 ships tracking but does not commit to 2% conversion target until cohort size confirmed |
| R-C10 | Formula-transparency gap in `process_health_score` popover | COMPETITIVE_VALIDATION Finding 2 | First-class requirement in UX spec; NOT a "nice to have" — category-positioning depends on it |
| R-C11 | Agent-diversity 4-consecutive `system-architect` (iters 033-036) | Coordinator synthesis | Iter 037 is MANDATORY rotation burn-down (see §5) |
| R-C12 | Tier D USD "—" cells read as capability gap | COMPETITIVE_VALIDATION Finding 5 | Contextual CTA in empty cell converts to PLG surface; labor-cost config deferred to Phase 2 (iter 043+) |

---

## 7. Consolidated CEO Open Questions (from all 8 Define inputs)

Resolving these unblocks PRD_METRICS_ENGINE.md CEO approval, which unblocks Path C Build entry.

### Terminology & labeling (6 questions)

1. **Q-CV-1:** Approve `case` → `run` rename in all user-facing labels (internal keys unchanged)? **(Default: yes.)**
2. **Q-CV-2:** Accept "Process Health Score" as display label (reject "Process Safety Score" rename), conditional on transparent popover breakdown? **(Default: yes.)**
3. **Q-CV-3:** Defer labor-cost configuration to v3 Phase 2 (iter 043+), with honest "—" + CTA in USD columns for Phase 1? **(Default: yes.)**
4. **Q-CV-4:** Accept `throughput_time_ms` ("Throughput Time (End-to-End)") as default-pack column and `cycle_time_ms` ("Busy Time (Sum of Steps)") behind column picker? **(Default: yes.)**
5. **Q-COPY-1:** Accept `variant_entropy` displayed as Low/Medium/High categorical (never raw bits in primary UI)? **(Default: yes.)**
6. **Q-COPY-2:** Approve COPY_PACK's 4 RED flags for rename (`variant_entropy`, `throughput_loss_estimate_usd`, `automation_savings_usd`, and the `risk_score_0_100` label direction) with the Q-CV-2 override applied? **(Default: yes.)**

### Scope & phasing (5 questions)

7. **Q-PRD-1:** Confirm v3 Phase 1 ships only the 15 PRD-v1 default-pack metrics (Tier A + B only); Tier C/D and ~75 additional catalogue metrics deferred to Phase 2+? **(Default: yes.)**
8. **Q-ARCH-1:** Approve new `packages/metrics-engine/` Option B (~3,700 LOC + ~2,000 test LOC) as a new package vs embedding into existing `packages/process-engine/`? **(Default: yes per architect recommendation.)**
9. **Q-ARCH-2:** Accept Postgres same-instance storage for metric facts (reject separate OLAP warehouse) until `metric_fact` row count exceeds 10M? **(Default: yes.)**
10. **Q-UX-1:** Approve user-level saved views for Phase 1; defer org/team-tier saved views to post-team-model (future phase)? **(Default: yes.)**
11. **Q-SEQ-1:** Approve Path C split into Phase A (iter 032-037) and Phase B (iter 038-042) with burn-down iter 037 as embedded transition? **(Default: yes — required by MR-005 D-7 soft cap.)**

### Governance (4 questions)

12. **Q-GOV-1:** Authorize PRD-trigger promotion (MR-005 D-5 clause 5) of DV2-R06 and DV2-R05 from DASHBOARD_V2_REVIEW_001 cold pool into live backlog upon PRD approval? **(Default: yes — citations already in PRD DEP-03; DV2-R05 required to unblock 8 skipped E2E suites.)**
13. **Q-GOV-2:** Acknowledge that MR-005 D-7 meta-coordinator Mode 4 pre-check is MANDATORY before Mode 5 sequence for Path C Phase A is opened? **(Default: yes.)**
14. **Q-GOV-3:** Accept MEASUREMENT_PLAN's hard-blocker determination that #51 (iter 030) must ship in a completed iteration before Path C Build — i.e., no parallel Build-and-instrumentation path? **(Default: yes.)**
15. **Q-GOV-4:** Commit to `process_health_score` formula transparency as a first-class v3 Phase 1 requirement (not deferred)? **(Default: yes.)**

### Measurement (2 questions)

16. **Q-MEAS-1:** Approve the 5 north-star metrics and their targets (Configuration Rate 40% W8, Drill-Through ≥3 metrics >2.0/100 impressions by W8, Time-to-First-Insight p50 <90s W4, Upgrade-CTA Conversion 2% W8, Top-10 Most-Added Columns tracked as a leading indicator)? **(Default: yes — or revise Upgrade-CTA target after cohort-size study in Q-MEAS-2.)**
17. **Q-MEAS-2:** Accept that Upgrade-CTA Conversion target (2% W8) may be revised downward post-cohort-sizing — i.e., not a hard commitment at PRD approval? **(Default: yes.)**

---

## 8. Recommended Decision Path for CEO

Shortest path to Build-readiness:

1. **Approve Q-SEQ-1, Q-GOV-1, Q-GOV-2, Q-GOV-3** — these unlock the sequencing plan. Defaults are yes; no blockers anticipated.
2. **Approve Q-CV-1 through Q-CV-4 + Q-COPY-1/2** — these lock naming. Defaults are yes; CEO is the final arbiter on category-positioning terminology, so any override should happen here before downstream artifacts bake the names in.
3. **Approve Q-PRD-1, Q-ARCH-1, Q-ARCH-2, Q-UX-1** — these lock scope and architecture. Defaults are yes per specialist recommendations.
4. **Approve Q-GOV-4** — formula transparency commitment. This is the single highest-stakes decision in the list because it's a Phase-1 scope addition vs. a deferral; recommend yes because it is the category-expansion insurance policy.
5. **Approve Q-MEAS-1 & Q-MEAS-2** — measurement targets. Defaults are yes; Q-MEAS-2 provides the release valve.

Upon approval:
- PRD_METRICS_ENGINE v1 → CEO-approved.
- DV2-R06 and DV2-R05 → live-backlog promotion via MR-005 D-5 clause 5.
- Iter 027 through iter 031 burn-down program proceeds unchanged.
- Iter 032 (Path C Build Phase A entry) → meta-coordinator Mode 4 pre-check scheduled.
- Post-pre-check: Mode 5 Phase A sequence opened (iter 032-037, 6 items).

---

## 9. What Does NOT Change

- Iter 027 (#7 policy-engine burn-down) is the NEXT MANDATORY counted iteration. Unchanged.
- Iter 028 (#19 + #20 storage.ts bundled burn-down) follows. Unchanged.
- Iter 029 (DV2-R01 distribution script), iter 030 (#51 v2 analytics), iter 031 (DV2-R02 + DV2-R03 bundled) all ship before Path C Build. Unchanged.
- MR-005 D-2 hard-stop ceiling (pool > 15) remains active.
- MR-005 D-7 Mode 5 soft cap (N ≥ 6 requires pre-check) remains active.
- All prior meta-review diffs (MR-001 through MR-005) remain active.

Path C Define is **Mode 3-adjacent, non-counting**. No iteration numbers have been consumed by this Define work. The next counted iteration remains **iter 027 — #7 policy-engine credit-card regex widening (MANDATORY burn-down)**.

---

*End of Path C Sequencing Plan. Re-read before Path C Build kickoff.*
