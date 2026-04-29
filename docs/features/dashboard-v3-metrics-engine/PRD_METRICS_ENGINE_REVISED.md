# PRD — Metrics Engine (Revised)

## Revision Metadata

- **Revises:** `PRD_METRICS_ENGINE.md` (original Define phase, iter 026-031)
- **Revision trigger:** MR-008 §6 + Q3 — MDR burn-down sequence (iter 034-039) architecturally delivered the invariants Phase A was scoped to build
- **Revision date:** 2026-04-23
- **Revision mode:** Mode 3-adjacent Define-phase refresh (non-counting; no iteration number consumed)
- **Input reports (this revision):**
  - `product-manager` scope-delta report (section-by-section classification + user-story retargeting)
  - `system-architect` contract-surface delta (10 residual net-new surfaces enumerated with LOC + D-4 clause 2 triggers)
  - `analytics` measurement-plan delta (8 instrumentation gaps + #57 retirement decision rule)
- **Approval status:** **DRAFT — awaits CEO review.** Do not open Phase 1 Build Mode 5 sequence until (a) CEO approves this revised PRD and (b) MR-005 D-7 meta-coordinator Mode 4 pre-check clears.
- **Supersedes:** all Phase A language in original PRD §1, §9, §10, §11, §15, §16, §17 referencing iter 032-037 foundation work — those invariants shipped via iter 034-039 MDR sequence.

---

## Executive Summary (NEW — scope revision rationale)

Between iter 034 and iter 039, a 6-iteration MDR burn-down sequence closed 8 of 9 identified metrics-engine P0 defects and, in doing so, shipped the **foundation invariants** the original PRD Phase A was designed to build:

| Original Phase A invariant | Shipped via | Evidence |
|---|---|---|
| Determinism — no `Date.now()` in formula fns, TZ-safe month boundaries | MDR-P03 + MDR-P04 (iter 037) | `route.ts:431` single `referenceNowMs` injection; `route.ts:583-584` UTC-month boundary; `computeIsStale(createdAt, lastViewedAt, nowMs)` signature |
| Single source of truth — zero v1/v2 shadow numeric divergence | MDR-P05 (iter 039) | v1 `computeVariationScore` + `computeAiOpportunityScore` deleted from `route.ts`; 3 call sites re-wired to `metricsV2.*` |
| Engine correctness — opportunity tag honesty; no fabricated chip copy | MDR-P01 + MDR-P02 (iter 035) | `AUTOMATE_MIN_OVERALL=40` conjunctive guard at `workflow-metrics.ts:454`; variance-high chip now computed-signal-only |
| Analytics decision-blocker instrumentation | MDR-P09 (iter 038) | `dashboard_bounced` event + `userPlan` side-channel + `stats.userPlan` server-resolved thread |
| A11y-compliant host surface | MDR-P06 + MDR-P07 (iter 034) | Kebab keyboard-reachable without hover; `aria-controls` resolves |
| Prisma→pure-engine adapter boundary | Iter 029 | `apps/web-app/src/lib/metrics-input-adapter.ts` (75 LOC) — exact pattern original ARCHITECTURE §15 specified |

**Result:** Original 11-iteration Phase A+B projection collapses to a revised **6-7 iteration Phase 1 Build** focused on persistent step-level data, Tier B metric pipeline, v3 UI, and opportunity engine. The correctness/determinism/instrumentation foundation is already in production.

**Tier count UNCHANGED at 32A / 44B / 13C / 4D = 93.** The MDR sequence did not expand the computability frontier — it stabilized the infrastructure the original Phase A assumed existed.

**D-7 pre-check verdict:** Revised scope at **6-7 iterations** is at or above the MR-005 D-7 threshold (N ≥ 6). `meta-coordinator` Mode 4 pre-check is **MANDATORY** before Phase 1 Build Mode 5 sequence opens.

---

## §1 Product Vision and Intent (REVISED framing)

**What is Path C v3 Metrics Engine?**

A deterministic, evidence-linked process intelligence surface that extends the existing v2 computation base with (a) persistent step-level data, (b) expanded Tier A/B metric library (76 metrics frontier), (c) user-configurable column views with drill-through, and (d) executive portfolio rollups. Built on top of the shipped v2 correctness foundation — **not a replacement for it**.

**What Path C v3 is NOT:**

- A rewrite of v2 computation layer (v2 is now determinism-clean, single-source-of-truth, and honest)
- A new opportunity-tagging model (v2 `opportunityTag` decision tree is correct post-MDR-P01)
- A new analytics instrumentation framework (MDR-P09 closed the decision-blocker surface)

**Original §1 framing change:** "v3 fixes v2's non-determinism and divergent computations" → "v3 extends v2's clean computation base with step-level data persistence and Tier B metric surface."

---

## §2 Scope Boundaries (UNCHANGED from v1.0)

Reference original PRD §2.1 (15-metric default pack: 8 primary + 7 secondary) and §2.2 (Tier C/D exclusions; non-goal list). No scope element in §2 is affected by the MDR sequence — MDR shipped correctness on the existing v2 surface, not new metrics.

---

## §3 User Stories and Personas (REVISED)

### Stories delivered pre-v3 — convert to regression gates only

| Story | Ship evidence | Treatment |
|---|---|---|
| **E-01** (portfolio health delta at a glance) | `computePortfolioHealthScorePrior` @ `workflow-metrics.ts:541-567`; Command Header renders `Portfolio Health [score] ▲/▼ [delta] vs last 30d` in shipped v2 dashboard | Regression acceptance gate only (no new build) |
| **E-03** (insight chips `→` action-leading format) | `computeInsightChips` @ `workflow-metrics.ts:594-657` — all 5 chip templates produce `→`-formatted computed-signal-only labels; MDR-P02 (iter 035) closed last copy-honesty violation | Regression acceptance gate only (no new build) |

### Active v3 stories (retained, two with retargeting)

- **A-01** 9-column default workflow library view — **KEEP** (unshipped; 4-column v2 grid is current)
- **A-02** Drill-through workflow detail view — **KEEP** (no detail route exists)
- **A-03** Column picker — **KEEP** (zero customization surface; WDC-P02 confirms independently)
- **A-04** Server-side column sort — **REVISE**: existing v2 client-side sort on Health/Variation/AvgTime/Runs preserved verbatim; only new Tier B KPI columns require server-side `metric_fact` sort
- **A-05** Threshold filters on KPI columns — **REVISE**: existing v2 variance/opportunity preset-chip filters preserved; threshold filters add only for *new* Tier B columns (`rework_rate_pct > 20%`, `bottleneck_impact_score > threshold`)
- **E-02** Executive portfolio view `/dashboard/portfolio` — **KEEP** (unshipped)

### Phase 2 stories (deferred, unchanged)

Adm-01, Adm-02, Adm-03 per original §3.

---

## §4 Success Metrics (REVISED baselines)

All six PRD §4 metrics remain valid **targets**. Prerequisite warnings are removed because dependencies closed:

| # | Metric | Target | Baseline status |
|---|---|---|---|
| 1 | Column picker adoption within 7d | ≥ 30% of WAU | Zero baseline — v3 surface unshipped |
| 2 | Top-10 most-added columns ranking | Top-10 stable post-launch | Zero baseline |
| 3 | Drill-through rate per metric | ≥ 25% of viewing sessions drill into ≥ 1 metric | Zero baseline — no drill surface |
| 4 | Time-to-first-insight | ≤ 30s median from view to first meaningful interaction | **v2 proxy baseline shipped iter 030/037:** `dashboard_v2_viewed` + `workflow_row_clicked.elapsedMsSinceDashboardView` (reactive state per iter 037 race fix) |
| 5 | NPS lift vs v2 | +10 pts free-tier, +15 pts pro-tier | No baseline — NPS trigger unshipped |
| 6 | Portfolio view engagement rate | ≥ 20% of WAU visit `/dashboard/portfolio` weekly | Zero baseline — portfolio route unshipped |

### NEW: §4.1 Measurement-Plan Launch Gates (per Analytics Report Risk 1)

Per `MEASUREMENT_PLAN_METRICS_ENGINE.md` §12, **14 events must be firing in production for ≥48 hours before Phase 1 Build ships as default**. These gates become explicit PRD §16 acceptance criteria — NOT post-launch follow-ups. The pattern of "instrumentation deferred to Phase 2" directly caused the iter 029 DV2-R01 artifact's N=6 problem. This revision closes that failure mode by promoting instrumentation to build-deliverable status.

### NEW: §4.2 `userPlan` Enrichment Reliability (per Analytics Report Risk 2)

`setUserPlanForAnalytics()` is a side-channel (`window.__ledgerium_userPlan`) populated after `/api/workflows` resolves. Events firing before resolution miss plan-tier enrichment — which affects `dashboard_v2_viewed` and `dashboard_bounced` specifically. **Required remediation before v3 ship:** either (a) gate first `dashboard_v2_viewed` emission on `setUserPlanForAnalytics()` completion, or (b) promote `userPlan` to explicit discriminated-union field on at-risk events.

---

## §5 Default 9-Column Workflow Library Column Specification (UNCHANGED from v1.0)

All 9 columns remain net-new vs. shipped v2 4-column grid. No column has shipped. Reference original PRD §5.

**Honest-labels status flag update:** `automation_readiness_score_0_100` and `bottleneck_impact_score` still require growth-strategist copy review (OQ-06). This must complete before Phase 1 ship.

---

## §6 Column Picker / Configurable Views UX Requirements (UNCHANGED from v1.0)

All of §6.1 through §6.4 remain net-new. WDC-P02 (live backlog row #75, Birth iter: audit-intake) confirms zero shipped customization surface independently.

---

## §7 Workflow Detail View Requirements (UNCHANGED from v1.0)

All of §7.1 (KPI strip, variants, step timing, bottleneck radar, rework/loop summary, AI opportunity, trend view), §7.2 (lineage drill-to-source), §7.3 (minimum-run threshold banner) remain net-new.

---

## §8 Executive Portfolio View Requirements (UNCHANGED from v1.0)

`/dashboard/portfolio` route, `metric_fact`, `metric_rollup_daily` all unshipped. All of §8 remains net-new.

---

## §9 Metric Library MVP Roster (REVISED roster notes)

Roster composition unchanged from v1.0 (15 metrics in default pack). Three notes updated:

1. **Layer 9 `process_health_score_0_100`:** fallback uses `computeHealthScoreV2` which is now **determinism-clean (iter 037 MDR-P03/P04)** and **correctness-clean (iter 035 MDR-P01)**. The v3 extension adds SLA component (5th dimension) + promotes confidence from folded-in to first-class; current 4-component weights (30/30/20/20) become 5-component (30/25/20/15/10 per INPUT_SPEC §2 Layer 9). This is a **formula-level change at version bump `@1.0.0 → @2.0.0`** gated by a distribution-comparison artifact (per §12 recursive measurement gate).
2. **DEP-03 (DV2-R06 shadow-function audit)** status column: **CLOSED** at iter 039 MDR-P05. v1 `computeVariationScore` (former `route.ts:27-45`) and v1 `computeAiOpportunityScore` (former `route.ts:154-187`) deleted; all three call sites re-wired to `metricsV2.*`.
3. **DEP-01 (#51 v2 analytics instrumentation)** status column: **CLOSED** at iter 030.

All other Layer 1-7 entries unchanged from v1.0.

---

## §10 Dependencies (REVISED — 3 closed, 5 remain open)

### CLOSED (no action required)

| Dep | Original description | Closure | Iter |
|---|---|---|---|
| ~~DEP-01~~ | #51 v2 analytics instrumentation | MDR-P09 extended taxonomy; `upgrade_clicked` reuse confirmed | 030 |
| ~~DEP-03~~ | DV2-R06 shadow-function audit | MDR-P05 deleted both v1 shadow functions | 039 |
| ~~DEP-07~~ | DV2-R02 + DV2-R03 interaction hardening | Inline affordances + WCAG 2.1 SC 1.4.13 dismissible pattern | 031 |

### OPEN (retained dependencies)

| Dep | Description | Status |
|---|---|---|
| DEP-02 | DV2-R01 health-score distribution artifact at representative N | Artifact exists at `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` N=6 (insufficient); **DV2-R05 (cold pool) blocks rerun with representative N** — auto-promotes on Phase 1 Build entry per MR-005 D-5 clause 5 |
| DEP-04 | Prisma additive migration (`workflow_runs` extended + `workflow_steps` + `step_edges` + `metric_facts` + `metric_rollup_daily` + `score_fact` + `opportunity_fact` + `workspace_metric_config`) | Net-new; architect §4 R-1 |
| DEP-05 | `packages/process-engine/` canonical action taxonomy for variant hashing | Variant hash algorithm versioning unresolved |
| DEP-06 | #60 snapshot-table architecture decision | OQ-01 open |
| DEP-08 | Variant hash algorithm version pin | Unresolved; **single longest-lead dependency** per PM Risk 3 |

---

## §11 Phased Rollout (COMPRESSED from 11 → 6-7 iterations)

### Phase 1 Build sequence (post-MR-009, post-MDR-P08 close, post-D-7 pre-check)

Entry point: **earliest iter (R+1) = iter 042** assuming iter 040 = MR-009 Mode 4 + iter 041 = MDR-P08 (projected). Sequence may open at iter 042 if CEO approves this revised PRD and D-7 pre-check clears.

| Relative iter | Surface | ≈ LOC | Primary agent | D-4 adjacency |
|---|---|---|---|---|
| **R+1** | Prisma additive migration (DEP-04) + `persistProcessRun()` adapter wiring `processSessionFull` → new tables | ~700 | `backend-engineer` | `system-architect` (clause 2 — ≥200 LOC new contract) |
| **R+2** | `packages/metrics-engine/` package scaffold + normalization module (5 methods per ARCH §8) + `@ledgerium/metrics-engine` workspace boundary + catalog registration over `intelligence-engine` primitives | ~1100 | `system-architect` (primary) | — |
| **R+3** | `metric_facts` + `metric_rollup_daily` + `score_fact` + `opportunity_fact` persistence + `filter_hash` deterministic computer + `metrics-persistence.ts` adapter | ~500 | `backend-engineer` | `system-architect` (clause 2) |
| **R+4** | `/api/metrics/catalog` + `/api/metrics/query` routes + Zod request/response schemas + `{data, error, meta}` envelope (closes DV2-R10 on landing) | ~700 | `backend-engineer` | — |
| **R+5** | `process_health_score@2.0.0` version bump (5-component formula per INPUT_SPEC §2 Layer 9) + distribution comparison artifact at representative N via DV2-R05 seed fixture | ~200 + docs | `analytics` | `system-architect` (major version gate) |
| **R+6** | Dashboard v3 KPI table (column registry, pinned columns, horizontal scroll) + column picker drawer (first 8 default-pack metrics) + 8 v3-prefixed analytics events added to `AnalyticsEvent` union (`v3_dashboard_view`, `v3_column_added`, `v3_column_removed`, `v3_metric_drill_through`, `v3_upgrade_cta_click`, `v3_workflow_detail_view`, `v3_portfolio_view`, `v3_metric_tooltip_viewed` with 500ms debounce) | ~1000 | `frontend-engineer` | `growth-strategist` (clause 1 — ≥3 copy strings); `system-architect` (clause 2) |
| **R+7** | Dashboard v3 remaining 7 default-pack metrics migrated + `/api/scores/query` + `/api/opportunities/query` + opportunity engine v1 (automation-candidate + bottleneck rules from INPUT_SPEC §10) + `/dashboard/portfolio` route scaffold + v3 soak window open | ~900 | `frontend-engineer` + `backend-engineer` | — |

### MR-005 D-7 pre-check obligation

**N = 7** ≥ 6 threshold → **`meta-coordinator` Mode 4 pre-check MANDATORY** before Phase 1 Mode 5 sequence opens. Pre-check output must cover: projected pool trajectory (ratio-based, per Q4), area-saturation arc (7 consecutive web-app iterations = 4-consecutive early-trigger — **directly trips reverse-portfolio-drift D-1 before R+5**), agent-diversity projection (primary rotation required between R+1/R+3/R+4/R+6/R+7 backend/frontend; R+2 architect break), and whether R+6 and R+7 could reasonably be a separate sequence or post-sequence Mode 2.

### Phase 2 (deferred, unchanged from v1.0)

- R-7 BullMQ `metrics-materialize` worker (synchronous fallback during Phase 1 is adequate per architect §4 analysis; first BullMQ production dependency introduced in Phase 2)
- Admin stories Adm-01 / Adm-02 / Adm-03
- Cost-model / labor-config layer
- Team metrics (L5 comparative metrics)
- NPS / in-app survey trigger
- Cold-pool Tier C metrics (SLA config, workspace cost config)

---

## §12 Measurement Plan for the Metrics Engine (UNCHANGED from v1.0)

5 hypotheses + recursive measurement gate unchanged. Instrumentation additions (per §4.1) become PRD §16 acceptance criteria.

---

## §13 MVP Boundary and Non-Goals (UNCHANGED from v1.0)

All listed non-goals (team metrics, cost layers, simulation, alerting) remain correctly excluded.

---

## §14 Open Questions (REVISED — 3 resolved, 14 open)

### RESOLVED by shipped reality

| Q | Question | Resolution |
|---|---|---|
| ~~Q-CV-2~~ | "Process Health Score" label, reject "Process Safety Score" | `workflow-metrics.ts` uses "health score" consistently; MDR-P02 reinforced honest-labels posture — **NO RENAME NEEDED** |
| ~~Q-GOV-3~~ | #51 v2 analytics must ship before Path C Build | CLOSED iter 030 |
| ~~Q-GOV-1 (partial)~~ | DV2-R06 + DV2-R05 PRD-trigger promotion | DV2-R06 promoted iter 036 then DELETED as duplicate at MR-008 §5 (superseded by MDR-P05 closed iter 039); DV2-R05 remains in cold pool — auto-promotes on Phase 1 entry per MR-005 D-5 clause 5 |

### NO LONGER APPLICABLE

| Q | Question | Reason |
|---|---|---|
| Q-SEQ-1 | Path C split into Phase A (6 iter) + Phase B (5 iter) | Replaced by §11 revised sequence (R+1 through R+7 = 7 iterations); Phase A foundation shipped via MDR |

### STILL OPEN (CEO input required)

- **Q-CV-1** — `case` → `run` rename on user-facing copy (no rename shipped; growth-strategist copy pass not completed)
- **Q-CV-3** — Defer labor-cost configuration to Phase 2 with `—` + CTA (de facto operative; formal approval pending)
- **Q-CV-4** — `throughput_time_ms` as default column, `cycle_time_ms` behind picker
- **Q-COPY-1** — `variant_entropy` as Low/Medium/High categorical (default aligned but formal approval pending)
- **Q-COPY-2** — COPY_PACK 4 RED flag renames with Q-CV-2 override applied
- **Q-PRD-1** — Phase 1 ships only 15 default-pack metrics, Tier A + B only
- **Q-ARCH-1** — New `packages/metrics-engine/` package (Option B) — **revised scope may NOT need a separate package** if Tier B computations extend in-place on existing `workflow-metrics.ts` (architect §4 §5 R-3 projects scaffold but notes reuse heavy)
- **Q-ARCH-2** — Postgres same-instance storage for `metric_fact`
- **Q-UX-1** — User-level saved views for Phase 1
- **Q-GOV-2** — D-7 meta-coordinator Mode 4 pre-check MANDATORY before Phase 1 Mode 5 (**YES — see §11**)
- **Q-GOV-4** — `process_health_score` formula transparency as Phase 1 first-class requirement (popover-level transparency unshipped; `HealthScoreV2.isGated` available for wiring)
- **Q-MEAS-1** — 5 north-star metrics and targets (prerequisites now met post-MDR-P09)
- **Q-MEAS-2** — Upgrade-CTA Conversion target may be revised post-cohort-sizing

---

## §15 Risks (REVISED — 1 closed, 5 retained, 3 new from analytics)

### CLOSED

| R | Risk | Closure |
|---|---|---|
| ~~R-4~~ | DV2-R06 shadow-function divergence | MDR-P05 (iter 039) deleted both v1 shadow functions; contract-level closure |

### RETAINED from v1.0

| R | Risk | Status |
|---|---|---|
| R-1 | Variant hash instability (DEP-08 unresolved) | **Highest-leverage open risk** — every Layer 3 KPI depends on stable `canonical_path_hash`; no versioning decision recorded |
| R-2 | Confidence threshold calibration (blocked by DV2-R05) | Auto-resolved on Phase 1 entry via DV2-R05 cold-pool promotion |
| R-3 | `workflow_step` data availability gap | Launching v3 with 6-of-9 columns rendering `—` for every existing workflow is a trust and activation risk; DV2-R05 seed fixture is the mitigation |
| R-5 | `savings_opportunity_usd` over-claiming | No cost model shipped; preserved as Phase 2 deferred |

### NEW from Analytics Report

| R | Risk | Mitigation |
|---|---|---|
| **R-6** | v3 launch without completing MEASUREMENT_PLAN §12 launch gates — 14 events must fire in production ≥ 48 hours pre-launch; zero of 14 v3-prefixed events in `AnalyticsEvent` union today | Gates added to §16 acceptance criteria; R+6 iteration explicitly lists 8 v3 events as build-deliverable |
| **R-7** | `userPlan` side-channel timing at session boundary — events firing before `/api/workflows` resolves miss plan-tier enrichment, specifically `dashboard_v2_viewed` + `dashboard_bounced` | Remediation required before v3 ship: either gate first-event emission on `setUserPlanForAnalytics()` completion, OR promote `userPlan` to explicit discriminated-union field (§4.2) |
| **R-8** | PostHog event volume cost at v3 scale — `v3_metric_tooltip_viewed` high-cardinality noise if 500ms dwell debounce unenforced | Debounce specification must be in tooltip component acceptance criteria, not assumed as PostHog responsibility |

---

## §16 Acceptance Criteria Summary (REVISED)

### Retained regression gates (no new build)

- **E-01 regression:** `computePortfolioHealthScorePrior` returns null for < 3 prior workflows; Command Header delta rendering preserved byte-identically
- **E-03 regression:** `computeInsightChips` enforces `→`-format + computed-signal-only labels on all 5 chip templates (MDR-P02 lock preserved)

### NEW Phase 1 acceptance gates (per MEASUREMENT_PLAN §12 — promoted from post-launch)

- [ ] **G-1** All 8 v3-prefixed events fire in production ≥ 48h before default-flag flip:
  - `v3_dashboard_view`
  - `v3_column_added`
  - `v3_column_removed`
  - `v3_metric_drill_through`
  - `v3_upgrade_cta_click`
  - `v3_workflow_detail_view`
  - `v3_portfolio_view`
  - `v3_metric_tooltip_viewed` (with 500ms debounce)
- [ ] **G-2** `userPlan` enrichment reliability: `dashboard_v2_viewed` + `dashboard_bounced` events carry non-null `userPlan` in ≥ 95% of production emissions over a 48h window
- [ ] **G-3** `{data, error, meta}` envelope on all new `/api/metrics/*` routes (closes DV2-R10 on landing)
- [ ] **G-4** Distribution comparison artifact at representative N (DV2-R05 seed fixture in place): Spearman ρ ≥ 0.80 between v2 `HealthScoreV2.overall` and v3 `process_health_score_0_100@2.0.0`; OR explicit documentation if v3 intentionally diverges
- [ ] **G-5** Determinism invariant hardening preserved: zero new `Date.now()` introductions in any new `packages/metrics-engine/*` or `/api/metrics/*` module (CI lint gate)
- [ ] **G-6** Variant hash version pin decision (DEP-08) in place before any `workflow_run` record is written with `canonical_path_hash`
- [ ] **G-7** Growth-strategist copy pass completed on `automation_readiness_score_0_100` and `bottleneck_impact_score` honest-labels (OQ-06 closed)

### #57 flag-retirement decision rule (NEW — per Analytics Report §4)

14d soak-window retirement criteria, evaluable with shipped instrumentation:

1. Bounce rate across all sessions < 40% (proportion of `dashboard_v2_viewed` sessions that also emit `dashboard_bounced` on unload without prior click)
2. Free-tier `workflow_row_clicked.elapsedMsSinceDashboardView` p50 < 60,000ms
3. `insight_chip_clicked` fires in ≥ 10% of sessions with `dashboard_v2_viewed`

If all three satisfy, soak window converts to retirement. Failure of any criterion blocks retirement pending remediation iteration.

---

## §17 Rollout Integrity and Governance Notes (REVISED)

**Phase 1 iteration count update:** 5 build iterations (iter 033-037) in v1.0 → **7 iterations (R+1 through R+7 post-MR-009 and post-MDR-P08)** in this revision. Build entry earliest iter 042.

**DV2-R06 PRD-trigger promotion paragraph (v1.0 §17):** **REMOVED** — DV2-R06 was promoted iter 036, then DELETED as DUPLICATE of MDR-P05 at MR-008 §5, then superseded by iter 039 closure. No longer a Phase 1 governance anchor.

**MR-005 D-7 pre-check documentation:** Phase 1 Mode 5 sequence entry is **hard-blocked** until `meta-coordinator` produces a Mode 4 pre-check artifact (≤1 page) evaluating the 4 D-7 dimensions. This pre-check is non-counting and will not consume an iteration slot.

**Agent-diversity projection (per §11):** primary rotation required R+1 backend → R+2 architect → R+3 backend → R+4 backend → R+5 analytics → R+6 frontend → R+7 frontend+backend. R+3/R+4 + R+6/R+7 = 2-consecutive same-implementer — within 4+ rule.

**Area saturation projection:** 7 consecutive web-app iterations inside Phase 1 = trips 3-consecutive Area rule at R+3 **AND** D-1 reverse-portfolio-drift at R+5 (N=5 threshold). **CEO saturation user-ack required at sequence open** per MR-004 Change C Mode 5 saturation protocol.

---

## §18 Revision Delta Summary (NEW)

What changed from `PRD_METRICS_ENGINE.md` v1.0 → v2.0 (this document):

### Deletions (shipped/superseded)

- §3 Story E-01 (portfolio health delta) — shipped via `computePortfolioHealthScorePrior`
- §3 Story E-03 (insight chip format) — shipped via `computeInsightChips` + MDR-P02
- §10 DEP-01 (#51 analytics) — closed iter 030
- §10 DEP-03 (DV2-R06 shadow audit) — closed iter 039 MDR-P05
- §10 DEP-07 (DV2-R02/R03 hardening) — closed iter 031
- §14 Q-CV-2 (Process Health Score label) — resolved, no rename needed
- §14 Q-GOV-3 (#51 prerequisite) — closed iter 030
- §14 Q-SEQ-1 (11-iteration Phase A+B split) — replaced by revised §11
- §15 R-4 (shadow-function divergence) — closed iter 039
- §17 DV2-R06 PRD-trigger promotion paragraph — row deleted as duplicate

### Revisions

- §1 Product Vision framing (removed "v3 fixes v2" language)
- §3 Stories A-04 + A-05 scope retargeting (server-side sort + threshold filters apply only to new Tier B columns)
- §4 baselines updated (DEP-01 closed; MDR-P09 closed)
- §9 Layer 9 `process_health_score` roster note (v2 canonical is now determinism-clean)
- §10 5 remaining open dependencies preserved
- §11 Phased Rollout compressed 11 → 7 iterations
- §14 14 questions marked STILL OPEN for CEO disposition
- §15 Risk surface trimmed + 3 new risks from analytics delta
- §16 7 new acceptance gates promoted from post-launch to build-deliverable
- §17 iteration-count + D-7 pre-check + agent-diversity + saturation projection

### Net additions

- **Executive Summary** (scope revision rationale)
- **§4.1** Measurement-Plan Launch Gates as PRD acceptance criteria
- **§4.2** `userPlan` enrichment reliability requirement
- **§16 G-1 through G-7** Phase 1 acceptance gates
- **§16 #57 flag-retirement decision rule** with specific numeric thresholds
- **§18** this delta summary

---

## Coordinator Approval Recommendation

**Recommendation:** Approve this revised PRD with the following conditions:

1. **Answer 14 open questions in §14** — at minimum Q-ARCH-1 (new-package or extend-in-place), Q-ARCH-2 (Postgres storage decision), Q-GOV-4 (formula transparency popover first-class or Phase 2), Q-MEAS-1 (north-star targets) must be settled before R+1 opens.
2. **Commission MR-005 D-7 meta-coordinator Mode 4 pre-check** as part of MR-009 at iter 040 (can be absorbed as additional agenda item — no extra iteration consumed).
3. **Confirm iter 041 sequencing** — MDR-P08 standalone at iter 041 before opening Phase 1 R+1 at iter 042 (coordinator recommendation Option A or C from prior turn).
4. **Confirm MR-008 Q4 ratio-based burn-rate target ≥ 0.5** — currently 0.59 HEALTHY; this revised PRD's Phase 1 will generate ~5-7 follow-ups per iteration at steady state; ratio discipline is the correct governor.
5. **Ack MR-004 Change C saturation protocol** — 7 consecutive web-app iterations in Phase 1 requires explicit user-ack in sequence-opening iteration log.

**Alternative (if Phase 1 cannot be opened in 2026-Q2):** defer all Phase 1 to post-launch follow-up; use shipped v2 surface + 14d soak window to execute #57 flag retirement; treat v3 as Q3 initiative with fresh Define-phase re-review.

---

## Appendices (references)

- `PRD_METRICS_ENGINE.md` (v1.0 — superseded by this document)
- `ARCHITECTURE_METRICS_ENGINE.md` (93-metric A/B/C/D tiering — preserved)
- `INPUT_SPEC.md` (JTBD + user needs — preserved)
- `MEASUREMENT_PLAN_METRICS_ENGINE.md` (5 hypotheses + §12 launch gates — preserved; §12 gates now first-class in §16)
- `TEST_PLAN_METRICS_ENGINE.md` (preserved; revisions needed to reflect closed dependencies — deferred to post-PRD-approval)
- `UX_FLOWS_METRICS_ENGINE.md` (preserved)
- `COPY_PACK_METRICS.md` (preserved; requires growth-strategist pass per OQ-06)
- `COMPETITIVE_VALIDATION_METRICS.md` (preserved)
- `PATH_C_SEQUENCING.md` (v1.0 — superseded by §11 of this document)
- `docs/meta/MR_008_META_REVIEW.md` §6 + Q3 (revision trigger)
- `docs/meta/METRICS_DASHBOARD_REVIEW_001.md` (source of 9 P0s → 8 closed → 1 remaining MDR-P08)
- `docs/meta/MR_007_META_REVIEW.md` (stability-default precedent)
- `CLAUDE.md` § Active work iter 034-039 (shipped-reality citations)
- `apps/web-app/src/lib/workflow-metrics.ts` (v2 canonical — consumption baseline)
- `apps/web-app/src/app/api/workflows/route.ts` (post-iter-039 canonical surface)
- `apps/web-app/src/lib/analytics.ts` (v2 instrumentation — extension baseline for §16 G-1)
- `apps/web-app/src/lib/metrics-input-adapter.ts` (adapter pattern — preserved)
- `packages/intelligence-engine/src/index.ts` (net-new consumption target for R+2)

---

**END — PRD_METRICS_ENGINE_REVISED.md (v2.0 DRAFT)**
