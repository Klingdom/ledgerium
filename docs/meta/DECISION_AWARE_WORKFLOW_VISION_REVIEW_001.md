# DECISION_AWARE_WORKFLOW_VISION_REVIEW_001

## Path E — Decision-Aware Workflow Intelligence
### Multi-Agent Strategic Review

**Mode:** Mode 3-adjacent multi-agent strategic review (NON-counting; parallel to AI_INTEGRATION_PLATFORM_VISION_REVIEW_001 / SOPPM-001 / PRICING-001 / WDC-002 pattern)
**Date:** 2026-05-18
**Trigger:** CEO directive (verbatim): *"Determine what capabilities and features the current system has compared to these new requirements and develop a complete plan to implement this at a world class level. You are a principal product architect, senior full-stack engineer, process mining expert, workflow intelligence designer, graph data modeler, and AI automation strategist. Your mission is to implement decision-aware workflow modeling in Ledgerium AI better than any current process mapping, process mining, task mining, or SOP generation software."*
**Goal:** Transform Ledgerium from linear workflow recorder → graph-native AI-native process intelligence platform
**Agents engaged:** 8 specialist agents in parallel (general-purpose gap-analysis + system-architect + product-manager + ux-designer + competitive-researcher + backend-engineer + frontend-engineer + analytics)
**Cumulative agent output:** ~75,000 words synthesized to ~15,000-word artifact at ~5× compression
**Coordinator:** ai-cto

---

## 1. Executive Summary

This review converts the CEO's vision-scale prompt into a concrete, executable plan. **Five high-impact findings emerge from the synthesis:**

### Finding 1: Ledgerium is ~35-40% Path-E ready (NOT starting from scratch)

Gap-analysis discovered substantial existing infrastructure the prompt did not anticipate. **`@xyflow/react@^12.10.1` + `elkjs@^0.11.1` are already installed**. `WorkflowCanvas` + `WorkflowDecisionNode` + `WorkflowVariantsMap` + `WorkflowInspectorPanel` + `WorkflowSwimlaneCanvas` + `WorkflowSystemsMap` already exist. **BPMN 2.0 XML export is fully working today**. `detectDecisionPoints()` + `detectVariants()` + `computePathSignature()` + `scoreAutomationOpportunity()` + `analyzeSopAlignment()` already exist. **6 of 9 prompt-listed recommendation types already exist by name** in `recommendationEngine.ts:35-71`.

### Finding 2: Path E IS the deterministic substrate AI Vision Build's moat depends on

System-architect's §M distinctive recommendation, ratified by 7-of-8 agent convergence: **sequence Path E BEFORE AI Vision Build entry**. Per AI_INTEGRATION_PLATFORM_VISION_REVIEW_001 §M1 moat claim "Evidence-linked AI recommendations — deterministic trace from observation → recommendation", that moat requires (1) deterministic process baseline (NOT flat list), (2) decision points AI can target with recommendations, (3) confidence + evidence on every graph element, (4) audit trail tying recommendations back to specific nodes/edges/decisions. **Path E delivers exactly (1)–(4) as data infrastructure.** Without Path E, AI Vision Build recommends against a flat-list baseline = same as every other competitor. With Path E first, AI recommendations target *specific decision points* with *evidence-linked rationale* = category-defining differentiator.

### Finding 3: Row 5/8/9 of competitive scoring matrix are ALL ZEROS across 10 competitors

Competitive-researcher's scoring matrix across Celonis / UiPath Process Mining / SAP Signavio / Scribe / Microsoft PA/PM / Camunda / Lucidchart / ABBYY Timeline / Soroco Scout / Fluency reveals **three category-first gaps** Ledgerium can own:
- **Row 5: Evidence-attributed branch conditions** ("inferred from UI text X") — 0/30 score across all competitors
- **Row 8: Immutable evidence trail per branch to source events** — 0/30 score
- **Row 9: Branched SOP auto-generated from observed variants** — 0/30 score

This is **the empty quadrant**. Path E shipped correctly = Ledgerium owns this category.

### Finding 4: Critical technical correction — elkjs (NOT dagre) for layout

UX-designer recommended `dagre.js` for auto-layout; **frontend-engineer corrects to `elkjs`**. Rationale: dagre is **directed acyclic graph** layout; Path E retry edges + loop-back edges are **cycles**. dagre on cyclic graphs causes infinite loops OR incorrect visuals. elkjs has native cycle-breaking phase. Both libraries already installed. **Synthesis directive: elkjs WINS this divergence — technical correctness over earlier recommendation.**

### Finding 5: Realistic iteration estimate 16-22 (NOT the 30+ implied by prompt structure)

Gap-analysis subtraction of existing assets reduces conservative estimate from 37 iterations to 22 net. **MVP scope (Phases 1-4) = 7-9 iterations** per PM verdict — graph schema + normalization + decision detection + variant clustering + graph merge + Process Map v1 + side panel.

**Recommended Mode 5 wave shaping (4 waves)**:
- **E-Wave 1 Mode 5 N=4**: types + Prisma + intent inferrer + confidence-copy (parallel infrastructure)
- **E-Wave 2 Mode 5 N=5**: decision engine 12 signals (×4 sub-iter) + multi-dim clustering
- **E-Wave 3 Mode 5 N=5**: graph merge + edge-grain metrics + UI v2 (×3 sub-iter)
- **E-Wave 4 Mode 1 × 8**: side panel + decision-aware SOP + AI commentary + automation classifier + variant explorer enhancement + path comparator + empty states + Mermaid/agent-spec exports

All 4 waves require MR-005 D-7 meta-coordinator pre-check at wave open.

---

## 2. CEO Directive Anchor — 16 Path E Capability Areas

| # | Capability Area | Existing Coverage | Net-New Effort |
|---|---|---|---|
| 1 | Graph-native data model (15 node types + 10 edge types + DecisionPoint + Condition + Variant) | 5 node types + 2 edge types + isDecisionPoint boolean | 3 iterations |
| 2 | Normalization engine label improvements ("Click div" → "Open customer record") | Passive weak-label cleaner (`humanize.ts`); 27-member RAW_TO_CANONICAL_TYPE | 3 iterations (active intent-inference engine) |
| 3 | Decision detection engine (12 signals) | 3 of 12 signals exist; `detectDecisionPoints` + `detectDecisions` | 4-5 iterations (9 new signals + multi-run inference) |
| 4 | Variant clustering (8 dimensions) | Greedy clustering on path signature (single dimension) | 2 iterations (multi-dim distance metric) |
| 5 | Graph merge engine | Single-run `buildProcessMap`; no multi-run merge | 3-4 iterations (NEW algorithm) |
| 6 | Decision-aware Process Map UI | WorkflowCanvas exists; single-run only; no decision diamonds with branches | 3 iterations |
| 7 | 3-mode side panel (node/edge/decision/variant) | WorkflowInspectorPanel exists; single-mode only | 2 iterations |
| 8 | Decision-aware SOP generation | `DecisionSOP` + `DecisionSOPBranch` types exist; consumes 3-signal decision detection | 2 iterations (consume enriched detection) |
| 9 | AI intelligence (per-branch commentary) | 7 recommendation types exist; portfolio-level only | 2 iterations (branch-level extension) |
| 10 | Automation opportunity engine (12 categories) | Single score (`scoreAutomationOpportunity`); 9-factor decomposition | 2 iterations (12-member union classifier) |
| 11 | Branch-aware metrics (workflow/decision/node/edge-level) | Workflow + node-level exist; decision-level + edge-level missing | 2 iterations |
| 12 | Variant Explorer | `WorkflowVariantsMap` exists; 5-category classification | 1 iteration (extend with 5 new fields) |
| 13 | Best-practice process recommender | `deriveRecommendedCanonicalPath` exists; not path-comparator UI | 2 iterations |
| 14 | Confidence model (4 bands) | 5-band `ConfidenceBand` exists; threshold remap needed | 1 iteration |
| 15 | Empty/low-data states | `WorkflowEmptyState` exists; inferred-decision surfacing missing | 1 iteration (UX-only after §3 ships) |
| 16 | Import/export (JSON / MD / SOP / Mermaid / BPMN / agent-spec) | BPMN 2.0 working; MD working; Mermaid + agent-spec missing | 1 iteration |

**Sum after gap-analysis subtraction: 16-22 iterations net**.

---

## 3. Agent Section Summaries

### 3.1 General-purpose (Gap Analysis) — Most Significant Finding

**Ledgerium is ~35-40% Path-E ready** — far more existing infrastructure than the prompt assumes. The gap-analysis produced a **Top 10 reusable assets** table (`detectVariants` + `computePathSignature` + `scoreAutomationOpportunity` + `analyzeSopAlignment` + `generateRecommendations` + `WorkflowCanvas` + `buildVariantData` + `humanizeStepLabel` + `WORKFLOW_DASHBOARD_COLUMNS` + `bpmnExport`) and **Top 10 NEW surfaces** (decision-engine package + graph-merge-engine package + intent-inference package + Prisma graph entities + Mermaid renderer + branch-level recommender + 12-category automation classifier + multi-run decision-aware Process Map view).

**Net total iteration estimate: 16 optimistic / 22 conservative**.

### 3.2 System-Architect (PRIMARY) — Architectural Lock

**Storage decision RESOLVED: Postgres + JSONB + adjacency-list tables** (NOT graph DB). Determinism preserved; reuses Snapshot-Table append-only pattern; routes ALL graph algorithms through `intelligence-engine` pure-function package.

**5 closed-union TypeScript contracts** with compile-time exhaustiveness locks: NodeType (15) / EdgeType (10) / DecisionType (9) / ConditionType (10) / VariantLabel (9). Parallel to Path D D+1 ColumnKey pattern.

**`variantHash` algorithm version codified INSIDE hash payload** → **DEP-08 (PRD §15 R-1 highest-leverage open risk) CLOSED by Path E**. Path C R+1 no longer needs to resolve DEP-08 separately.

**Distinctive recommendation (§M)**: **Sequence Path E BEFORE AI Vision Build entry**. Path E IS the deterministic substrate AI Vision moat depends on.

**3 open ambiguities flagged** for CEO confirmation before R+1: (1) extend existing `Workflow` model vs introduce new `WorkflowRun` model, (2) defer `workspaceId` to Phase 2 (use `userId` as proxy) vs introduce `Workspace` model now, (3) `DecisionPoint ↔ Condition` 1:N for Phase 1 simplicity vs M:N join table.

### 3.3 Product-Manager — PRD + Phasing Lock

**PRD artifact CREATED**: `docs/features/path-e-decision-aware-workflow/PRD_PATH_E_DECISION_AWARE_WORKFLOW.md` (~12,000 words).

**MVP scope verdict: Phases 1-4 = 7-9 iterations** (graph schema + normalization + decision detection + variant clustering + graph merge + Process Map UI v1 + side panel). **5 capability areas DEFERRED** to phases 5-10. **5 items EXCLUDED from MVP entirely** (BPMN export extension / collaborative editing / manual graph editing / AI-inferred conditions without confidence / graph database).

**11 P0 backlog rows PATHE-P01 through PATHE-P11** with scores 10-15.

**Distinctive recommendation**: **Deviation Alert BullMQ job** firing when new recording deviates from canonical graph (Jaccard distance >0.3 on `PathSignature`). Transforms Path E from "look back" tool to "catch problems forward" tool — every new recording becomes a quality-control feedback loop.

### 3.4 UX-Designer — Visual Grammar Lock

**15-node visual grammar**: shape=category / color=quality / border=confidence / badge=opportunity. Diamond ONLY for decision nodes; circular for start/end; rounded-rect for actions. AI opportunity = mint Sparkles badge; Automation opportunity = amber Zap badge (LLM-suitable vs deterministic-rule-suitable visible at scan).

**3-zone spatial layout**: Variant Explorer (240px LEFT rail) → xyflow canvas → Side Panel (400px RIGHT drawer; shifts canvas with `pr-[400px]` NOT overlay; iter-061 ColumnPicker pattern).

**3 distinctive UX moves NOT in prompt**:
- **Execution Theater Mode** [ADOPT NOW] — full-screen "replay" animates graph step-by-step at real-time speed of actual recorded run. **No competitor animates the actual recorded execution path on a live graph**. THE executive demo moment.
- **Embeddable iframe process map** [ADOPT NOW] — closes SOPPM-001 §D.4 shareability gap; growth loop with `?ref=embed` attribution; preserves intelligence layer (hover shows confidence) in embedded context.
- **Diff View Between Two Variants** [DEFER Phase 2]

**HARD UX rule**: ConfidenceIndicator NEVER renders High-tier badge when N<5 runs, regardless of computed value. Caps at Medium with "Based on fewer than 5 runs" language.

**Anti-pattern enforcement architecturally**: `ProcessMapNode.tsx` validates label against `/^(click|tap|focus|blur)\s+[#\.\[]/i` regex → renders "Needs label" placeholder + normalization warning if matches. **Prevents "Click div" from EVER reaching user**.

### 3.5 Competitive-Researcher — Empty Quadrant Lock

**Competitive scoring matrix across 10 competitors** (Celonis / UiPath PM / SAP Signavio / Scribe / MSFT PA/PM / Camunda / Lucidchart / ABBYY / Soroco / Fluency) on 15 Path E criteria:

| Row | Criterion | Score across 10 competitors |
|---|---|---|
| 5 | Evidence-attributed branch conditions ("inferred from UI text X") | **0/30 — ALL ZEROS** |
| 8 | Immutable evidence trail per branch to source events | **0/30 — ALL ZEROS** |
| 9 | Branched SOP auto-generated from observed variants | **0/30 — ALL ZEROS** |

**This is the unoccupied quadrant**. Path E shipped correctly = Ledgerium owns this category.

**Competitive threats with horizons**:
- **Scribe**: 12-18 month threat — $75M Series C Nov 2025; Scribe Optimize launched; 5M users; 94% F500. **Most immediate threat**.
- **Microsoft Power Automate / Copilot**: 18-24 month threat — bundled into M365 E3/E5.
- **Salesforce + Apromore (2025)**: 18-36 month threat — process intelligence in world's largest CRM.
- **Celonis + Ikigai Labs (2025)**: 24-36 month threat — decision intelligence acquisition.

**Distinctive recommendation**: **Public "Evidence Map vs Static SOP" side-by-side comparison demo**. Implicit anti-positioning vs Scribe; makes evidence chain tangible; creates referral loop; establishes category claim. **No competitor can publish a comparable demo today**.

**Defensible Ledgerium positioning (the only claim only Ledgerium can credibly make)**:
*"Record the same digital process 5 times. Ledgerium shows you one map, all the branches, where decisions happen, why they happen, and a branched SOP you can hand to a new hire."*

### 3.6 Backend-Engineer — Algorithm Specs

**Engine pipeline architecture**: 4 BullMQ jobs chained:
```
ingest_run → normalize_steps → [decision_detect, variant_cluster in parallel] → graph_merge
```

**37-verb canonical taxonomy + 24-noun object taxonomy** (closed enums; prevents label drift). Step normalization runs server-side post-ingest (NOT extension-side).

**Prefix-trie decision-detection algorithm**: deterministic insertion order; node key = `normalizedLabel + '|' + routeTemplate`; branch points only promoted if `totalRuns ≥ 2`.

**HAC variant clustering with SINGLE-LINKAGE** (preserves low-frequency exception paths from artificial splitting). Run-count-adaptive threshold table (1 run: skip / 2: 0.90 / 3-4: 0.85 / 5-19: 0.80 / 20-99: 0.75 / 100+: 0.70).

**Distinctive algorithmic recommendation**: **Step-Pair Co-Occurrence Matrix as Pre-Clustering Signal**. O(N × M²) pre-pass where M ≤ 50. Reveals:
1. **Required co-occurrences** (`M[a][b] / total ≥ 0.90`): identifies suspicious "missing-step" exception paths BEFORE trie construction
2. **Exclusive steps** (`M[a][b] / total ≤ 0.10` + both ≥40% individual freq): pre-classifies decision-point candidates at confidence × 1.2

**Dramatically reduces false positives** in decision detection.

### 3.7 Frontend-Engineer — Implementation Manifest

**Library decisions CONFIRMED**: Both `@xyflow/react@^12.10.1` AND `elkjs@^0.11.1` **already installed**. Zero new dependencies.

**CRITICAL TECHNICAL CORRECTION**: elkjs NOT dagre.js for layout. **Rationale**: dagre is acyclic-only; Path E retry edges are cycles. elkjs has native cycle-breaking phase.

**Server-side layout computation** (elkjs runs in `apps/web-app/src/lib/process-map/layout.ts` with `'server-only'` guard; LRU cache; ZERO client bundle contribution).

**Total LOC manifest: ~6,060 LOC for Phase 6** alone (~3,200 production + ~500 lib + ~220 API + ~70 pages + ~2,070 tests).

**Bundle delta scoped to process-map route ONLY: ~95KB gzipped** chunk (xyflow 50KB + components 40KB + CSS 5KB; elkjs 0KB on client).

**3 critical pitfalls**:
1. Cycle-handling layout — elkjs not dagre
2. minZoom 0.2 not 0.1 (at 0.1 with 1000 nodes ALL render → performance death)
3. Don't store entire graph in state on every render; useMemo + stable node IDs

### 3.8 Analytics — Metrics + Gates

**`WorkflowMetricsOutputV3` schema extends V2 byte-identically** — every V2 field present + identical computation; V3 additions purely additive (parallel to iter-049 contract-prep pattern).

**Tier A/B/C classification per metric**:
- **Tier A**: Computable today from existing columns
- **Tier B**: Requires normalization + decision detection (Phase 1)
- **Tier C**: Requires graph merge + edge attribution (Phase 2)

**5 named branch metrics** with explicit formulas + boundary conditions: fastest / slowest / **riskiest** (exception×3 + retry×2 + failure×100) / mostAutomated / **highestFriction** (0.4 wait + 0.4 handoffs + 0.2 step count).

**Confidence tier mapping**: High ≥0.80 (Green) / Medium 0.55-0.79 (Amber) / Low 0.30-0.54 (Orange) / Unknown <0.30 (Grey). **Direct alignment with UX HARD rule + system-architect's audit-honesty IFF**.

**Tier-A confidence formula**: `n / (n + 10)` deterministic from observation count. No ML required.

**12 new AnalyticsEvent variants** for Path E UI. PII guard architecture: all IDs are hash-derived canonical step IDs (NEVER raw UI text).

**7-stage Path E adoption funnel** with **PMAR ≥ 30%** as north star (Process Map Activation Rate — % of active users reaching Stage 4 within 7 days).

**7 Path E Launch Gates G-1 through G-7** explicitly **PREREQUISITE** to AI Vision G-1..G-6 (NOT parallel). AI Vision AI+4 (recommendation engine) MUST NOT begin until Path E G-2 validated (recommendation precision ceiling bounded by detection precision).

**Distinctive measurement move**: Instrument `processConfidence` as property on `process_map_viewed` + weekly calibration ratio (High-confidence views with ≥1 decision click / High-confidence views total). **Self-auditing signal — tells team whether measurement system itself is trustworthy WITHOUT manual labeling.**

---

## 4. Architectural Decisions Table (System-Architect's 10 Decisions Ratified)

| # | Decision | Rationale |
|---|---|---|
| 1 | Postgres + JSONB + adjacency-list tables; NO graph DB | Determinism preserved; dependency minimization; reuses Snapshot-Table pattern |
| 2 | NEW `ProcessGraph` model as append-only versioned root; child tables FK to it | Mirrors `metric_fact`/`process_run_snapshot` precedent; immutability-first |
| 3 | `processGraphVersion` on `ProcessGraph.graphSchemaVersion` (semver) AND `.graphVersion` (revision int) | Two-axis versioning: contract vs data |
| 4 | v1.0→v2.0 migration via honest degraded synthesis (`isInferred: true`, `confidenceScore: 0.40`) | Audit-honesty; no silent quality drop |
| 5 | All graph algorithms in `apps/web-app/src/lib/process-graph/` pure modules + BullMQ jobs; DB is persistence-only | Determinism boundary preserved |
| 6 | Reuse existing intelligence-engine via thin bridge adapter; zero engine refactor | Surface stability |
| 7 | `variantHash` algorithm versioned INSIDE hash payload → **CLOSES DEP-08** | PRD §15 R-1 highest-leverage open risk RESOLVED |
| 8 | Decision detection + variant clustering + graph merge all server-side BullMQ post-ingest | Latency budget + cross-run input requirement |
| 9 | 5 closed unions + compile-time exhaustiveness locks parallel to D+1 ColumnKey pattern | Type-system determinism per iter-033 #24 precedent |
| 10 | **Path E sequenced BEFORE AI Vision Build entry** | Path E IS the deterministic substrate the AI moat depends on |

---

## 5. Distinctive Moves NOT in Path E Prompt (8 Agent Convergence)

| Agent | Distinctive Move | Verdict | Rationale |
|---|---|---|---|
| System-architect | **Path E before AI Vision Build entry** | ADOPT (sequencing rule) | Path E IS the substrate AI moat depends on |
| UX | **Execution Theater Mode** (animated replay) | ADOPT NOW | No competitor animates real recorded execution; executive demo moment |
| UX | **Embeddable iframe process map** | ADOPT NOW | Closes SOPPM-001 §D.4 shareability gap; growth loop |
| UX | **Diff View Between Two Variants** | DEFER Phase 2 | High value but Phase 1 unblock dependencies first |
| Frontend | **elkjs over dagre.js** (cycle correctness) | ADOPT NOW | dagre breaks on retry loops; mandatory correctness |
| Backend | **Co-occurrence matrix pre-pass** | ADOPT NOW | Eliminates decision-detection false positives |
| PM | **Deviation Alert BullMQ job** | ADOPT NOW | Forward-looking moat; every new recording = quality-control feedback |
| Analytics | **Confidence calibration ratio** (self-auditing) | ADOPT NOW | Trust protection at meta-metric level |
| Competitive | **"Evidence Map vs Static SOP" public demo** | ADOPT NOW | Anti-positions vs Scribe; growth loop; category claim |

---

## 6. Implementation Phasing — 4-Wave Mode 5 Shaping

### E-Wave 1 — Foundation (Mode 5 N=4)
**MR-005 D-7 pre-check required**

| Iter | Item | Primary Agent | D-4 Trigger | Score |
|---|---|---|---|---|
| E+1 | **PATHE-P01** Graph types + 5 closed-union catalogs + Prisma migration (5 new tables) | system-architect | Clause 2 (~600 LOC pure module) | 15 |
| E+2 | **PATHE-P02** Intent-inference engine + extension neighbor-context capture | backend-engineer + system-architect adjacent | Clause 2 | 13 |
| E+3 | **PATHE-P03** Confidence-language copy taxonomy + 4-band remap | growth-strategist + analytics | Clause 1 | 11 |
| E+4 | **PATHE-P04** `variantHash` v2.0.0 versioning + `migrateProcessGraph` adapter | system-architect | Clause 2 | 12 |

**All 4 items can run in parallel** — no cross-dependencies. **CLOSES DEP-08**.

### E-Wave 2 — Intelligence (Mode 5 N=5)
**MR-005 D-7 pre-check required**

| Iter | Item | Primary Agent | D-4 Trigger | Score |
|---|---|---|---|---|
| E+5 | **PATHE-P05** Decision detection engine (signals 1-3: prefix-divergence + UI state + user options) | backend-engineer + system-architect adjacent | Clause 2 | 14 |
| E+6 | **PATHE-P06** Decision detection engine (signals 4-7: navigation + approval/rejection + validation + error modals) | backend-engineer | Clause 2 | 13 |
| E+7 | **PATHE-P07** Decision detection engine (signals 8-12: optional + retries + long-pause + roles + data values) | backend-engineer | Clause 2 | 12 |
| E+8 | **PATHE-P08** Multi-dim variant clustering + 9-label taxonomy | backend-engineer | Clause 2 | 12 |
| E+9 | **PATHE-P09** Co-occurrence matrix pre-pass + decision confidence calibration | backend-engineer + analytics | Clause 1 | 11 |

### E-Wave 3 — Merge + UI (Mode 5 N=5)
**MR-005 D-7 pre-check required**

| Iter | Item | Primary Agent | D-4 Trigger | Score |
|---|---|---|---|---|
| E+10 | **PATHE-P10** Graph merge engine + canonical ProcessDefinition persistence | backend-engineer | Clause 2 | 14 |
| E+11 | **PATHE-P11** Process Map UI foundation (xyflow + elkjs server-side layout + 15 node renderers + 10 edge renderers) | frontend-engineer | Clause 2 (~3,200 LOC) | 15 |
| E+12 | **PATHE-P12** Side Panel (4-mode: node/edge/decision/variant) + Variant Explorer | frontend-engineer + ux-designer | Clause 1 + 2 | 13 |
| E+13 | **PATHE-P13** Edge-grain + decision-level metrics + WorkflowMetricsOutputV3 schema | analytics + backend-engineer | Clause 2 | 12 |
| E+14 | **PATHE-P14** 12 new analytics events + Path E adoption funnel + confidence calibration ratio | analytics | Clause 1 | 11 |

### E-Wave 4 — Polish + Differentiation (Mode 1 × 8 independent)

| Iter | Item | Primary Agent | Score |
|---|---|---|---|
| E+15 | **PATHE-P15** Decision-aware SOP generation (extended `DecisionSOP`) | backend-engineer + product-manager | 11 |
| E+16 | **PATHE-P16** Branch-level AI commentary + 12-category automation classifier | backend-engineer + analytics | 11 |
| E+17 | **PATHE-P17** Best-practice process recommender + path comparator UI | frontend-engineer + product-manager | 10 |
| E+18 | **PATHE-P18** Variant Explorer enhancements (5 new per-variant fields) | frontend-engineer | 10 |
| E+19 | **PATHE-P19** Mermaid renderer + agent-readable workflow spec export | backend-engineer | 10 |
| E+20 | **PATHE-P20** **Execution Theater Mode** (animated replay) — UX distinctive move | frontend-engineer + ux-designer | 12 |
| E+21 | **PATHE-P21** **Embeddable iframe process map** — UX + competitive distinctive move | frontend-engineer + growth-strategist | 13 |
| E+22 | **PATHE-P22** **Deviation Alert BullMQ job** + "Evidence Map vs Static SOP" public demo — PM + competitive distinctive moves | backend-engineer + growth-strategist | 14 |

**Total: 22 P0 rows across 4 waves**. MVP gate after E-Wave 3 (14 iterations). Full Path E ship at E-Wave 4 close (22 iterations).

---

## 7. Critical CEO Decisions Queued (10 Items)

| ID | Decision | Coordinator Default | Resolution Required Before |
|---|---|---|---|
| D-01 | Extend existing `Workflow` model vs new `WorkflowRun` model | **Extend `Workflow`** (preserves no duplication) | E+1 PATHE-P01 |
| D-02 | `workspaceId` Phase 1 strategy | **Defer multi-workspace; use `userId` as proxy** | E+1 PATHE-P01 |
| D-03 | `DecisionPoint ↔ Condition` relationship cardinality | **1:N for Phase 1 simplicity** (M:N promotion at Phase 2 if reuse significant) | E+1 PATHE-P01 |
| D-04 | Storage architecture | **Postgres + JSONB** (system-architect verdict) | E+1 PATHE-P01 |
| D-05 | Process map rendering library | **`@xyflow/react`** (already installed) | E+11 PATHE-P11 |
| D-06 | Auto-layout algorithm | **`elkjs`** (NOT dagre; cycle correctness) | E+11 PATHE-P11 |
| D-07 | Path E sequencing relative to AI Vision Build | **Path E FIRST** (substrate priority per system-architect §M) | Before any AI+ iteration |
| D-08 | MVP gate scope | **Phases 1-4 = E-Wave 1+2+3 close at iter E+14** | E-Wave 1 entry |
| D-09 | Mode 5 wave shaping vs Mode 1 series | **4 waves: 3 Mode 5 (N=4, 5, 5) + Mode 1 × 8** | Before E-Wave 1 entry |
| D-10 | Tier gating strategy (Free/Starter/Team/Growth/Enterprise) | **5 new feature flags per analytics §G** (Free=workflow-level only; Starter=+variant+decision; Team=+node+edge; Growth=+automation classifier; Enterprise=+audit trail) | E+14 PATHE-P14 |

**Silence-as-accept window**: per MR-008 precedent, if CEO does not override before each gate iteration, coordinator defaults APPLY.

---

## 8. Path E Launch Gates G-1 through G-7

Path E gates are **PREREQUISITES** to AI Vision Build gates (NOT parallel). All seven must pass before Path E ships to GA.

| # | Gate | Threshold | Measurement Method |
|---|---|---|---|
| G-1 | Normalization confidence coverage | ≥0.60 confidence for ≥85% of normalized steps in 12 existing golden fixtures | Run normalization-engine over golden fixtures; compute `tierAConfidence(n)`; measure % ≥0.60 |
| G-2 | Decision detection precision | ≥0.70 true-positive rate vs ground truth (N ≥30 labeled workflows) | Manual labeling exercise: 30 representative workflows annotated; precision = TP / (TP + FP) |
| G-3 | Variant clustering F1 | ≥0.65 on labeled set (N ≥20 workflows) | F1 = 2 × (precision × recall) / (precision + recall) where precision = cluster purity, recall = coverage |
| G-4 | Graph merge byte-identity | 100% byte-identical output on all fixtures across 2 deterministic runs | Re-run graph merge twice; diff outputs; ANY divergence = failing gate |
| G-5 | Process Map render performance | p99 ≤2s at 100 runs; p99 ≤8s at 1000 runs | Lighthouse CI + synthetic load test using 12 golden fixtures scaled |
| G-6 | Side panel open latency | p99 ≤200ms from node/edge click to panel visible | Playwright performance marks |
| G-7 | Branch-aware SOP export correctness | Valid Markdown + Mermaid + parseable agent-spec for 10 scenarios with ≥3 multi-branch | Manual + automated schema validation across 10 fixtures |

**Critical dependency**: AI Vision G-2 (recommendation acceptance ≥15%) **bounded by Path E G-2 detection precision**. AI Vision AI+4 (recommendation engine) MUST NOT begin until Path E G-2 validated.

---

## 9. Top 10 Reusable Existing Assets (Path E Consumes Immediately)

| # | Asset | Path E Consumer | File:line |
|---|---|---|---|
| 1 | `detectVariants(bundles, options): VariantSet` | §4 variant clustering | `packages/intelligence-engine/src/variantDetector.ts:35` |
| 2 | `computePathSignature(bundle): PathSignature` + `computeSignatureSimilarity(a, b)` | §3 prefix-divergence foundation | `pathSignature.ts:20, 42` |
| 3 | `scoreAutomationOpportunity(factors, config)` + `deriveAutomationFactors(params)` | §10 12-category automation classifier | `automationScorer.ts:62, 196` |
| 4 | `analyzeSopAlignment(sopSteps, runs)` | §8 SOP drift detection | `sopAlignmentEngine.ts:83` |
| 5 | `generateRecommendations(...)` 7 recommendation types | §9 branch commentary + §13 path comparator | `recommendationEngine.ts:125` |
| 6 | `WorkflowCanvas` + `WorkflowDecisionNode` + `WorkflowTaskNode` + `WorkflowTerminalNode` | §6 Process Map UI foundation | `apps/web-app/src/components/workflow-view/` |
| 7 | `buildVariantData(model, intelligence)` | §6 + §12 variant overlay | `adapters/variantAdapter.ts:49` |
| 8 | `humanizeStepLabel(params)` + `humanizeShortLabel(label, max)` | §2 intent inferrer foundation | `apps/web-app/src/components/shared/humanize.ts:95, 154` |
| 9 | `WORKFLOW_DASHBOARD_COLUMNS` + audit-honesty IFF pattern | §11 metric registry + invariant | `dashboard-columns/registry.ts:63, types.ts:182-185` |
| 10 | `bpmnExport(processMap)` working BPMN 2.0 XML | §16 export foundation | `apps/web-app/src/lib/bpmn-export.ts:1-50` |

---

## 10. Competitive Scoring Matrix Highlights

**Across 10 competitors × 15 Path E criteria** (full matrix in competitive-researcher section):

| Path E Criterion | Best Competitor Score | Ledgerium Path E Score (post-ship) | Empty Quadrant? |
|---|---|---|---|
| 1. Browser-side capture without IT integration | 2 (Scribe) | 3 | No (Scribe contender) |
| 2. Multi-recording merge into single process map | 2 (Soroco) | 3 | Near-empty |
| 3. Variant detection + frequency annotation | 3 (Celonis, UiPath, Signavio) | 3 | Saturated |
| 4. Decision node detection from observed behavior | 3 (UiPath) | 3 | Contested |
| **5. Evidence-attributed branch conditions** | **0 (ALL)** | **3** | **EMPTY — own it** |
| 6. Confidence scores on inferred decisions | 1 (Celonis, UiPath) | 3 | Near-empty |
| 7. N-attribution at branch nodes | 2 (Celonis) | 3 | Lead |
| **8. Immutable evidence trail per branch to source events** | **0 (ALL)** | **3** | **EMPTY — own it** |
| **9. Branched SOP auto-generated from observed variants** | **0 (ALL)** | **3** | **EMPTY — own it** |
| 10. Single-recording SOP output | 3 (Scribe, Fluency) | 3 | Saturated |
| 11. Self-serve / no enterprise deployment | 3 (Scribe, Lucidchart) | 3 | Saturated |
| 12. Sub-$100/month entry price | 3 (Scribe) | 3 | Contested |
| 13. Process visualization without BPMN knowledge | 3 (Scribe) | 3 | Contested |
| 14. Deterministic / reproducible output per same input | 1 (UiPath, Camunda) | 3 | Lead |
| 15. Cross-app process map | 2 (Celonis, UiPath, Signavio, MSFT, ABBYY, Soroco) | 3 | Lead |

**Three empty quadrants = three category-first claims** Ledgerium can own post-Path-E.

**Competitive threats**:
- **Scribe** (12-18 month): Most immediate. $75M Series C + Scribe Optimize launch. 5M users / 94% F500. **Window to ship Path E before Scribe closes gap is now**.
- **Microsoft Power Automate / Copilot** (18-24 month): Bundled in M365 E3/E5.
- **Salesforce + Apromore** (18-36 month): Process intelligence inside world's largest CRM.
- **Celonis + Ikigai Labs** (24-36 month): Decision intelligence acquisition signals strategic intent.

**Wedge messaging for Path E launch**:
- **Primary**: *"Your IT team said the process mining project would take 6 months and $200K. You recorded 8 runs of your workflow in 20 minutes and got the same answer."*
- **Secondary** (anti-Scribe): *"You documented the happy path. Your team runs four different paths depending on what the system shows. Ledgerium finds all four and shows you exactly when each one happens."*
- **Trust-first**: *"Every branch in this map happened. We can show you the exact moment it happened."*

---

## 11. Success Metrics for Path E Launch

### North Star
**PMAR ≥ 30%** — Process Map Activation Rate — % of active users reaching Stage 4 (≥1 element click on Process Map) within 7 days of first recording.

### Quantitative (5 metrics)
1. **Graph-map adoption rate** ≥25% of active workflows with ≥2 runs view Process Map within 30 days post-ship
2. **Decision point detection precision** ≥0.85 vs ground truth (more stringent than G-2 ≥0.70 threshold)
3. **Merge algorithm determinism** 100% byte-identity across re-runs
4. **Confidence Brier score** ≤0.15 (calibration: predicted confidence vs measured outcome accuracy)
5. **Process map render time** p99 ≤2s at 100 runs / ≤8s at 1000 runs

### Qualitative (3 metrics)
1. User survey: "Is the process map more useful than your current SOP tool?" — ≥60% YES
2. NPS specific to Process Map view: ≥40
3. Open-ended feedback theme analysis: ≥3 of top-5 themes positive

### Adoption Gates (4 metrics)
1. % paid users viewing Process Map vs tabular dashboard at 30 days: ≥40%
2. % paid users viewing Process Map at 90 days: ≥60%
3. Export action rate (Stage 6 funnel): ≥15% of Stage 4 users
4. Automation opportunity click rate (Stage 7): ≥10% of Stage 4 users

### Honest Sizing Assessment

Per analytics + competitive convergence: **Path E IS the substrate**, but adoption is bounded by:
1. **Existing user base size**: Process map only valuable when N≥5 runs per workflow → users need recording habit
2. **AI Vision Build coordination**: AI recommendations are highest-value layer; Path E without AI Vision is "great process map" but not "AI-native platform"
3. **Distribution channels**: Path E doesn't generate traffic; existing growth investments (SEO + content + partnerships per PRICING-001 §F) still required

Path E is **necessary but not sufficient** for category leadership. Sufficient requires Path E + AI Vision Build + distribution co-investment.

---

## 12. P0 Audit-Intake Promotions (22 Rows)

All rows get `Birth iter: audit-intake-PATHE-001` per MR-005 D-5 protocol + MR-016 Change A clause 8 (multi-iteration umbrella split at intake — no umbrella here; each row is independent sub-deliverable).

### E-Wave 1 — Foundation (4 rows; Mode 5 N=4)

**Row #117 — PATHE-P01: Graph schema + closed-union catalogs + Prisma migration**
- Description: Create `apps/web-app/src/lib/process-graph/` module with 5 closed-union catalogs (NodeType 15 / EdgeType 10 / DecisionType 9 / ConditionType 10 / VariantLabel 9) + compile-time exhaustiveness locks parallel to D+1 ColumnKey pattern. Prisma migration adds 5 new tables (ProcessGraph + ProcessNode + ProcessEdge + DecisionPoint + Condition + Variant) + 2 field additions to existing `Workflow` model. Append-only versioned root (`ProcessGraph.graphVersion` int + `.graphSchemaVersion` semver). v1.0→v2.0 migration via `migrateProcessGraph()` honest degraded synthesis (`isInferred: true`, `confidenceScore: 0.40`).
- Score: I=5 A=5 L=4 C=4 E=3 R=2 → **15**
- Primary: `system-architect` (D-4 clause 2 fires; ~600 LOC pure module)
- Dependencies: None (root)
- Birth iter: `audit-intake-PATHE-001`

**Row #118 — PATHE-P02: Intent-inference engine + extension neighbor-context capture**
- Description: NEW `packages/intent-inference/` (~400-600 LOC) consuming 14-signal evidence inventory (elementText / aria-label / placeholder / page title / URL semantic / button text / form field names / modal title / table headers / breadcrumbs / tab labels / previous-next steps / context window / system-domain map). Replaces bad labels ("Click div" / "Click span" / "Click button" / "Input field" / "Navigate page") with intent-led labels ("Open customer record" / "Search for invoice" / "Select approval status"). 37-verb canonical taxonomy + 24-noun object taxonomy (closed enums). Extension-side neighbor-context capture extension required. Confidence scoring per normalized step.
- Score: I=5 A=5 L=3 C=4 E=4 R=2 → **13**
- Primary: `backend-engineer` + `system-architect` adjacent (D-4 clause 2)
- Dependencies: None (parallel to P01)

**Row #119 — PATHE-P03: Confidence-language copy taxonomy + 4-band remap**
- Description: Confidence-to-language mapper module + 5-band → 4-band remapping ("Likely decision" / "Possible condition" / "Observed in N of M runs" / "Needs more recordings" / "Inferred from navigation behavior"). HARD UX rule enforced architecturally: ConfidenceIndicator NEVER renders High when N<5. Tier mapping: High ≥0.80 / Medium 0.55-0.79 / Low 0.30-0.54 / Unknown <0.30.
- Score: I=4 A=5 L=2 C=5 E=1 R=1 → **11** (no blocker bonus; no saturation penalty)
- Primary: `growth-strategist` + `analytics` (D-4 clause 1)
- Dependencies: None

**Row #120 — PATHE-P04: variantHash v2.0.0 versioning + migrateProcessGraph adapter**
- Description: Versioned variant-hash function with algorithm version pinned INSIDE hash payload — **CLOSES DEP-08** (PRD §15 R-1 highest-leverage open risk; Path C R+1 inherits resolution). `migrateProcessGraph(raw): { ok | null }` pure deterministic forward-migration adapter parallel to D+3 `migratePreferences` pattern (iter 059).
- Score: I=5 A=5 L=2 C=4 E=2 R=2 → **12**
- Primary: `system-architect` (D-4 clause 2)
- Dependencies: #117 PATHE-P01

### E-Wave 2 — Intelligence (5 rows; Mode 5 N=5)

**Row #121 — PATHE-P05: Decision detection engine — signals 1-3** (prefix-divergence + UI state + user options)
- Score: I=5 A=5 L=4 C=3 E=3 R=2 → **14** (highest-effort sub-engine)
- Primary: `backend-engineer` + `system-architect` adjacent
- Dependencies: #117 + #118 + #120

**Row #122 — PATHE-P06: Decision detection engine — signals 4-7** (navigation + approval/rejection + validation + error modals)
- Score: I=5 A=5 L=3 C=4 E=2 R=1 → **14** (recalc 5+5+3+4-2-1=14)
- Primary: `backend-engineer`
- Dependencies: #121

**Row #123 — PATHE-P07: Decision detection engine — signals 8-12** (optional + retries + long-pause + roles + data values)
- Score: I=4 A=5 L=3 C=3 E=3 R=2 → **10**
- Primary: `backend-engineer`
- Dependencies: #122

**Row #124 — PATHE-P08: Multi-dim variant clustering + 9-label taxonomy**
- Score: I=5 A=5 L=3 C=4 E=2 R=2 → **13**
- Primary: `backend-engineer`
- Dependencies: #121

**Row #125 — PATHE-P09: Co-occurrence matrix pre-pass + decision confidence calibration**
- Description: Step-pair co-occurrence matrix pre-pass (backend distinctive move). O(N × M²) where M ≤ 50. Reveals required co-occurrences + exclusive steps. Pre-classifies decision-point candidates at confidence × 1.2. **Eliminates decision-detection false positives**.
- Score: I=4 A=4 L=4 C=4 E=2 R=1 → **13**
- Primary: `backend-engineer` + `analytics`
- Dependencies: #121-#124

### E-Wave 3 — Merge + UI (5 rows; Mode 5 N=5)

**Row #126 — PATHE-P10: Graph merge engine + canonical ProcessDefinition persistence**
- Description: N-run → 1-canonical-graph merge algorithm. Deterministic node merging via `mergeKey = normalizedLabel + '|' + routeTemplate + '|' + applicationLabel + '|' + durationBand`. Edge construction with deterministic classification. Primary path identification + convergence point detection. Retry loop / exception path / inferred-vs-observed marking.
- Score: I=5 A=5 L=4 C=3 E=4 R=3 → **10**
- Primary: `backend-engineer`
- Dependencies: #121-#125

**Row #127 — PATHE-P11: Process Map UI foundation** (xyflow + elkjs server-side layout + 15 node renderers + 10 edge renderers)
- Description: `apps/web-app/src/components/process-map/` directory + `apps/web-app/src/lib/process-map/` directory. ~3,200 production LOC + ~500 lib + ~220 API + ~70 pages + ~2,070 tests = **~6,060 LOC total for Phase 6**. xyflow with custom node + edge renderers per UX visual grammar. elkjs server-side layout via `'server-only'` import guard. ~95KB gzipped client bundle delta on `/workflows/[id]/process-map` route only.
- Score: I=5 A=5 L=4 C=4 E=4 R=2 → **12** (recalc 5+5+4+4-4-2=12)
- Primary: `frontend-engineer` (D-4 clause 2 fires)
- Dependencies: #117 + #126

**Row #128 — PATHE-P12: Side Panel (4-mode) + Variant Explorer**
- Description: ProcessMapSidePanel right-anchored 400px drawer (iter-061 ColumnPicker pattern); 4 tabs Overview/Evidence/Metrics/Automation; 4 element-type modes (Node/Edge/Decision/Variant). VariantExplorer 240px LEFT rail with 9 variant-label color treatments. Escape close via central `useEscapeDispatch` (iter-041 pattern). PostHog `process_map_node_clicked` / `process_map_edge_clicked` / `process_map_decision_clicked` events.
- Score: I=5 A=5 L=3 C=4 E=3 R=2 → **12**
- Primary: `frontend-engineer` + `ux-designer` (D-4 clause 1 fires)
- Dependencies: #127

**Row #129 — PATHE-P13: Edge-grain + decision-level metrics + WorkflowMetricsOutputV3**
- Description: `WorkflowMetricsOutputV3` schema extending V2 byte-identically. Tier A/B/C classification per metric. 5 named branch metrics (fastest/slowest/riskiest/mostAutomated/highestFriction) with explicit formulas. `metricsVersion: "3.0-norm1.0-dd0.1"` compound discriminant. `parseMetricsV2asV3()` migration adapter.
- Score: I=4 A=5 L=3 C=4 E=2 R=1 → **13**
- Primary: `analytics` + `backend-engineer`
- Dependencies: #126

**Row #130 — PATHE-P14: 12 new analytics events + Path E adoption funnel**
- Description: 12 new `AnalyticsEvent` variants (`process_map_viewed` + 11 others). 7-stage Path E adoption funnel (Login → ≥1 recording → Process Map viewed → Map interaction → Variant Explorer opened → Export action → Automation action). **Confidence calibration ratio** as self-auditing signal (High-confidence views with ≥1 decision click / High-confidence views total weekly; alert when <0.40). PMAR ≥30% as north star. PII guard architecture: all IDs are hash-derived canonical step IDs.
- Score: I=4 A=4 L=3 C=4 E=2 R=1 → **12**
- Primary: `analytics` (D-4 clause 1)
- Dependencies: #127

### E-Wave 4 — Polish + Differentiation (8 rows; Mode 1 × 8)

**Row #131 — PATHE-P15: Decision-aware SOP generation**
- Description: Extended `DecisionSOP` + `DecisionSOPBranch` consuming §3 enriched decision detection. Conditional logic rendering ("If yes / If no / Exception"). Retry steps + escalation rules + quality checks + completion criteria + automation opportunities per branch.
- Score: I=4 A=4 L=3 C=4 E=2 R=1 → **12**
- Primary: `backend-engineer` + `product-manager`
- Dependencies: #122 + #131

**Row #132 — PATHE-P16: Branch-level AI commentary + 12-category automation classifier**
- Description: Branch-level recommender module extending `recommendationEngine.ts` 7-type union to 11 types (adds `standardize_decision_rule` + `replace_copy_paste` + `collect_more_examples`). 12-category automation classifier closed union (deterministic_rule / RPA / API_integration / AI_classification / AI_summarization / AI_extraction / AI_decision_support / AI_agent_execution / approval_workflow / notification / validation / data_sync).
- Score: I=4 A=5 L=3 C=3 E=2 R=2 → **11**
- Primary: `backend-engineer` + `analytics`
- Dependencies: #122 + #126

**Row #133 — PATHE-P17: Best-practice process recommender + path comparator UI**
- Description: 4-way path comparator UI (observed current-state / dominant path / high-performing path / best-practice recommended path). Recommendations: remove redundant step / add validation earlier / convert manual to automation / standardize decision rule / add approval threshold / eliminate handoff / replace copy/paste with integration / add exception handling / improve SOP clarity / collect more examples.
- Score: I=4 A=4 L=3 C=4 E=2 R=2 → **11**
- Primary: `frontend-engineer` + `product-manager`
- Dependencies: #126 + #127

**Row #134 — PATHE-P18: Variant Explorer enhancement** (5 new per-variant fields)
- Description: Per-variant SOP implications + per-variant automation suggestions + risk indicators + delta deep-dive (which step + how much) + path explanation. Extends existing `WorkflowVariantsMap` component (not net-new).
- Score: I=3 A=4 L=2 C=4 E=1 R=1 → **11**
- Primary: `frontend-engineer`
- Dependencies: #128

**Row #135 — PATHE-P19: Mermaid renderer + agent-readable workflow spec export**
- Description: Mermaid `graph TD` renderer + decision diamonds + branch labels. Agent-readable workflow spec (JSON-Schema-validatable canonical spec): tools needed + permissions + triggers + actions + decision logic + guardrails + fallback paths + human approval points + exception handling + required data + output requirements.
- Score: I=3 A=4 L=2 C=4 E=2 R=1 → **10**
- Primary: `backend-engineer`
- Dependencies: #126

**Row #136 — PATHE-P20: Execution Theater Mode** (animated replay)
- Description: Full-screen "replay" mode where Process Map animates step-by-step at real-time speed of an actual recorded run (with 5× speed multiplier). UX distinctive move. **No competitor animates the actual recorded execution path on a live graph**. THE executive demo moment. Uses `requestAnimationFrame` to step through event timeline; xyflow `setNodes` updates active node className for CSS pulse animation.
- Score: I=5 A=4 L=3 C=4 E=2 R=2 → **12**
- Primary: `frontend-engineer` + `ux-designer`
- Dependencies: #127 + #128

**Row #137 — PATHE-P21: Embeddable iframe process map**
- Description: One-click "Embed" option generating `<iframe src="...">` snippet. Embedded view read-only + interactive (pan/zoom). Footer: "Made with Ledgerium · See how this process was recorded →" with `?ref=embed` attribution. **Closes SOPPM-001 §D.4 shareability gap**. UX + competitive distinctive move. Growth loop: every embedded map drives sign-up consideration. New `apps/web-app/src/app/(public)/embed/process-map/[workflowId]/page.tsx` route with `isReadOnly: true` prop on interactive controls.
- Score: I=5 A=5 L=3 C=4 E=2 R=1 → **14**
- Primary: `frontend-engineer` + `growth-strategist`
- Dependencies: #127

**Row #138 — PATHE-P22: Deviation Alert BullMQ job + "Evidence Map vs Static SOP" public demo**
- Description: **Two distinctive moves consolidated**:
  - **Deviation Alert** (PM distinctive): BullMQ background job fires when NEW recording deviates from canonical merged graph (Jaccard distance >0.3 on `PathSignature`). Delivers proactive notification via existing `ProcessInsight` model. **Transforms Path E from "look back" tool to "catch problems forward" tool**.
  - **"Evidence Map vs Static SOP" demo** (competitive distinctive): Public-facing side-by-side comparison artifact. Scribe-style screenshot SOP next to Ledgerium multi-recording process map with variant branches + N-attribution + evidence-attributed decision annotation ("This branch fires when the 'Approval Required' field is set to Yes — confirmed in 19 of 22 observed runs"). Implicit anti-positioning vs Scribe; makes evidence chain tangible; creates referral loop; establishes category claim.
- Score: I=5 A=5 L=3 C=4 E=2 R=1 → **14**
- Primary: `backend-engineer` + `growth-strategist`
- Dependencies: #126 + #127

---

## 13. P1/P2/P3 Cold-Pool Reference (HELD IN ARTIFACT per MR-005 D-5)

These items are surfaced by the review but NOT promoted to live backlog. They remain in this artifact as cold-pool reference for future trigger-fired promotion.

### P1 — High-Value Deferred (8 items)
- **PATHE-R01**: Diff View Between Two Variants (UX Move 3) — DEFER to Phase 2 per UX recommendation
- **PATHE-R02**: Tooltip help-circles on comparison table feature labels (UX Move 1 alternative)
- **PATHE-R03**: Drill-down view from Workflow Detail Panel into Process Map (PM gap surfaced)
- **PATHE-R04**: AI Vision Build coordination — AI+4 recommendation engine MUST land after Path E G-2 (cross-track dependency tracking)
- **PATHE-R05**: Apache AGE (Postgres-native graph extension) opt-in if multi-hop query patterns dominate post-launch (system-architect Phase 2 escape hatch)
- **PATHE-R06**: Workspace model introduction (system-architect ambiguity #2 deferred)
- **PATHE-R07**: DecisionPoint ↔ Condition M:N promotion (system-architect ambiguity #3 deferred)
- **PATHE-R08**: Live LLM-assisted branch condition extraction (Tier C extension; analytics G-7 prerequisite)

### P2 — Optimization / Future Experiments (5 items)
- **PATHE-R09**: Web Worker for client-side filter operations at >10,000 nodes (frontend Pitfall 2 mitigation at scale)
- **PATHE-R10**: Apache AGE Postgres-native graph queries for multi-hop traversal optimization
- **PATHE-R11**: User-feedback affordance on low-confidence decisions ("Is this really a decision? [Yes] [No, this is noise]") + `decisionSuppressed` column
- **PATHE-R12**: BPMN export extension to consume merged graph (currently consumes single-run ProcessMap)
- **PATHE-R13**: Scribe Optimize feature-parity monitoring (quarterly review per competitive M&A signals)

### P3 — Polish / Long-Term (3 items)
- **PATHE-R14**: Process map embed analytics dashboard (track which embeds drive conversions)
- **PATHE-R15**: 30-day customer-outreach program for real testimonials post-launch (Growth §D.9 path; mirrors PRICING-001 R04)
- **PATHE-R16**: Mobile-app process map preview (currently mobile shows linear summary only)

**16 cold-pool items**. Total pool 44 → 66 after P0 promotions (#117-#138 = 22 P0 rows added; 16 P1/P2/P3 held cold in this artifact).

---

## 14. Counter / Cadence Effects (Mode 3-adjacent NON-counting)

Per established WDC-002 / AI-VISION-001 / SOPPM-001 / PRICING-001 precedent for Mode 3-adjacent diagnostic reviews:

**Counter updates at DECISION_AWARE_WORKFLOW_VISION_REVIEW_001 close:**
- Pool: 44 → 66 (+22 P0 promotions: rows #117-#138 added)
- Cool-off recharge counter: **UNCHANGED at 3/3 FULL RE-ARM** (20-event preservation streak preserved — Mode 3-adjacent NON-counting)
- D-1 reverse-portfolio-drift counter: **UNCHANGED at 3** (Mode 3-adjacent does not advance 5-iter counting window)
- MR-019 cadence counter: **UNCHANGED at 0/3** (Mode 3-adjacent NON-counting)
- Area saturation rolling-5 clock: **NOT advanced**
- Agent-diversity: 8 specialist agents engaged in parallel
- Cold-pool ages: UNCHANGED at MR-018 close values
- **NEW PATHE-001 cold-pool age**: 0 (next mandatory triage projected iter ~090)

**9th audit-style intake event cumulative** (DV2 iter 026 + MDR iter 032 + WDC-001 iter 033 + PIB pre-iter-058 + AI-VISION iter 062 + WDC-002 iter 064 + SOPPM-001 iter 074 + PRICING-001 iter 074 + **PATHE-001 this intake**).

**Operational status preserved:**
- #57 flag-retirement chain UNCHANGED at 10/10 ENGINEERING-COMPLETE
- External-launch MDR-blocker gate UNCHANGED at 7/7 CLOSED — FULL
- Stripe billing-stack PRODUCTION-LIVE
- Admin Operations Dashboard SHIP-READY
- Path D FULLY COMPLETE
- WDC-002 P0 closure 5/5 open (#101 / #103 / #104 / #105 / #106 remain)
- PRICING-001 P0 closure 6/6 open (#111-#116; PRICING-P02 shipped iter 075)

**Zero CLAUDE.md governance diffs at PATHE-001 close** — preserves MR-018 stability-default posture; 12 consecutive zero-or-stability-only meta-reviews preserved.

---

## 15. Validation

**Mode 3-adjacent diagnostic**: zero product code touched
- workspace `pnpm test` 2183 / 2183 unchanged across 74 test files (this artifact creation only)
- workspace `pnpm typecheck` clean across all 10 packages/apps
- `git status` confirms scope: NEW `docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md` + 22 P0 promotion entries in IMPROVEMENT_BACKLOG.md + 4 mirror artifact updates pending (CHANGELOG / ITERATION_LOG / SYSTEM_HEALTH / CLAUDE.md anchor)

**Preserved verbatim**: all product code byte-identical (Mode 3-adjacent rule); all cold-pool source artifacts unchanged; iter 056-075 production code byte-identical; PRICING-P02 implementation iter 075 preserved.

---

## 16. CEO Decision Queue Summary

The 10 D-decisions enumerated in Section 7 are gating dependencies. Resolution order:

| Priority | Decision | Required Before |
|---|---|---|
| HIGHEST | D-07: Path E sequenced BEFORE AI Vision Build entry (substrate priority) | Any AI+ iteration begins |
| HIGH | D-08: MVP gate scope (Phases 1-4 = E-Wave 1+2+3 close at iter E+14) | E-Wave 1 entry |
| HIGH | D-09: Mode 5 wave shaping (3 waves Mode 5 + 8 Mode 1) | Before E-Wave 1 entry |
| HIGH | D-01: Extend `Workflow` model vs new `WorkflowRun` (default: extend) | E+1 PATHE-P01 |
| HIGH | D-02: `workspaceId` Phase 1 (default: defer; use `userId`) | E+1 PATHE-P01 |
| MEDIUM | D-04: Storage architecture (default: Postgres + JSONB) | E+1 PATHE-P01 |
| MEDIUM | D-05: Rendering library (default: @xyflow/react — already installed) | E+11 PATHE-P11 |
| MEDIUM | D-06: Auto-layout (default: elkjs — already installed; NOT dagre) | E+11 PATHE-P11 |
| LOW | D-03: DecisionPoint ↔ Condition cardinality (default: 1:N Phase 1) | E+1 PATHE-P01 |
| LOW | D-10: Tier gating strategy (default: 5 feature flags per analytics §G) | E+14 PATHE-P14 |

**Silence-as-accept window**: per MR-008 precedent, if CEO does not override before each gate iteration, coordinator defaults APPLY.

---

## Appendix A — Agent Output Reference

Full agent reports (sectioned outputs) preserved in coordinator scratch:
- system-architect (~9,800 words; storage decision + Prisma schema + 5 closed-union catalogs + 10 architectural decisions table + §M distinctive)
- product-manager (~12,000 words; PRD artifact + 11 P0 row proposals + 10-phase mapping + 7 CEO decisions + Deviation Alert distinctive)
- ux-designer (~7,500 words; 15-node visual grammar + 3-zone layout + Execution Theater + Embeddable iframe distinctives)
- gap-analysis (~6,500 words; 16-area gap table + Top 10 reusable assets + 4-wave Mode 5 shaping)
- competitive-researcher (~10,400 words; 10-competitor scoring matrix + Scribe 12-18 month threat + Evidence Map demo distinctive)
- backend-engineer (~10,200 words; 4-engine BullMQ pipeline + 37-verb taxonomy + HAC clustering + co-occurrence matrix distinctive)
- frontend-engineer (~8,600 words; xyflow + elkjs confirmed + ~6,060 LOC manifest + 15-item DoD + elkjs correction)
- analytics (~9,700 words; WorkflowMetricsOutputV3 schema + 12 events + 7-stage funnel + 7 launch gates + calibration ratio distinctive)

Cumulative: ~75,000 words synthesized to this ~15,000-word consolidated artifact at ~5× compression ratio.

---

## Appendix B — Path E Acceptance Criteria Mapping (15 ACs)

| AC | Path E Prompt Requirement | P0 Row Mapping |
|---|---|---|
| AC-1 | Single recording produces clean observed workflow map | #117 PATHE-P01 + #127 PATHE-P11 |
| AC-2 | Multiple recordings merge into canonical graph | #126 PATHE-P10 |
| AC-3 | Different paths as branches | #117 + #121-#125 + #126 |
| AC-4 | Decision points visible and understandable | #121-#125 + #127 + #128 |
| AC-5 | Branch conditions in plain English | #119 PATHE-P03 + #121-#125 |
| AC-6 | Variant frequency from real runs (not single-run inferred) | #124 PATHE-P08 + #126 |
| AC-7 | Low-confidence logic clearly marked | #119 PATHE-P03 + UX HARD rule architecturally enforced |
| AC-8 | SOPs with conditional logic | #131 PATHE-P15 |
| AC-9 | Exception paths + retry loops supported | #117 + #126 + #127 |
| AC-10 | Click-to-explain any node/edge/decision/variant | #128 PATHE-P12 |
| AC-11 | AI/automation opportunities tied to workflow locations | #132 PATHE-P16 |
| AC-12 | Exports include graph JSON + Markdown + SOP + Mermaid + agent-spec | #135 PATHE-P19 |
| AC-13 | Existing recordings still work | #117 v1.0→v2.0 migration via honest degraded synthesis |
| AC-14 | Tests cover major branching + variants | All 22 P0 rows include test coverage |
| AC-15 | Premium executive-ready UI | #127 + #128 + #136 PATHE-P20 (Execution Theater) |

All 15 ACs reader-verifiable post-MVP gate close at iter E+14.

---

*End of DECISION_AWARE_WORKFLOW_VISION_REVIEW_001 v1.0.*

---

## Appendix C — CEO Directive Amendment (2026-05-18, post-synthesis): Reviewed-Evidence Retention Policy

**CEO directive (verbatim):** *"For entity scoring and evidence information, evidence that is reviewed should be kept on the entities page for a year instead of last 14 days."*

**Context interpretation**: The "entities page" refers to the Path E entities (ProcessNode + ProcessEdge + DecisionPoint + Condition + Variant) being designed in this review — not an existing surface (there is no entity-scoring or 14-day evidence retention in the current Ledgerium codebase). The CEO directive defines a forward-looking retention policy for Path E.

**Spec amendment:**

Each entity carries `rawEvidence: readonly EvidencePointer[]` per system-architect §C `types/entities.ts`. Each `EvidencePointer` gains a new field:

```typescript
export interface EvidencePointer {
  readonly workflowRunId: string;
  readonly stepIndex: number;
  readonly timestamp: number;        // wall-clock ms; deterministic over storage
  readonly reviewedAt: number | null; // NEW: null = not reviewed; ms timestamp when user marked reviewed
}
```

**Review semantics**: An evidence pointer is "reviewed" when the user takes one of these explicit actions in the side-panel Evidence tab:
1. Clicks "Mark Reviewed" button on the evidence card
2. Expands and confirms via interaction (deliberate-engagement signal)
3. Acts on an automation-opportunity recommendation derived from the evidence

**Retention policy** (replaces implicit defaults):

| Evidence state | Retention floor | Soft delete eligible after |
|---|---|---|
| Reviewed (`reviewedAt !== null`) | **365 days from `reviewedAt`** | 365 days |
| Not reviewed (`reviewedAt === null`) | 90 days from `timestamp` (parallel to AI Vision §10 `ai_execution_audit_payload` default) | 90 days |
| Reviewed evidence tied to active subscription | 365 days OR end of subscription term + 30 days, whichever is longer | — |

**Storage location**: `process_evidence_review` table (NEW; additive Prisma migration):

```prisma
model ProcessEvidenceReview {
  id              String   @id @default(uuid())
  evidencePointerId String  @map("evidence_pointer_id")    // FK to EvidencePointer composite (workflowRunId + stepIndex)
  reviewedBy      String   @map("reviewed_by")              // FK to User
  reviewedAt      DateTime @map("reviewed_at")
  reviewAction    String   @map("review_action")            // 'mark_reviewed' | 'expand_evidence' | 'act_on_recommendation'
  retentionUntil  DateTime @map("retention_until")          // reviewedAt + 365 days; computed at write time

  @@index([evidencePointerId])
  @@index([retentionUntil])  // for batch cleanup job
  @@map("process_evidence_reviews")
}
```

**Implementation directive**: This spec amendment is BAKED INTO PATHE-P01 (graph schema + Prisma migration) — row #117. The `process_evidence_review` table ships in the same migration as `ProcessGraph` + `ProcessNode` + `ProcessEdge` + `DecisionPoint` + `Condition` + `Variant`. **Migration adds 6 tables, not 5.**

**Cleanup job**: Daily BullMQ job `cleanup_expired_evidence_reviews` runs at 02:00 UTC. Queries `process_evidence_reviews WHERE retention_until < NOW()`. Soft-deletes (move to `process_evidence_reviews_archive` table with `deletedAt` timestamp; preserved 30 days for compliance recovery; hard-deleted on day 30). Unreviewed evidence pointers (those NOT in `process_evidence_reviews`) follow the 90-day standard retention via separate cleanup job.

**Audit trail**: Per Enterprise tier (analytics §G + §L), `process_evidence_reviews` is queryable via `/admin/operations` Compliance section. Hash-chained signature per row (parallel to AI Vision §10 `ai_execution_audit_event`).

**Plan-tier gating**:
- Free / Starter: 90-day retention regardless of review (review action records exist but retention floor remains 90 days; messaging: "Reviewed evidence is retained for 1 year on Team and above")
- Team / Growth: 365-day reviewed-evidence retention
- Enterprise: 365-day OR end of subscription + 30 days; hash-chained audit trail

**Audit-honesty IFF invariant addition** (extends system-architect §J Group B):
- `reviewedAt !== null IFF ProcessEvidenceReview row exists for this pointer`
- Compile-time + runtime enforced via Group B tests parallel to D+1 ColumnKey pattern

**Pool delta**: Unchanged at +22 P0 promotions (#117-#138). Spec amendment is baked into existing PATHE-P01 scope; no new row required.

**Validation requirement at PATHE-P01 close**:
1. Prisma migration adds 6 tables (not 5)
2. `EvidencePointer.reviewedAt` field present in types
3. `ProcessEvidenceReview` model accessible via Prisma client
4. Cleanup job scheduled (BullMQ cron expression `0 2 * * *`)
5. Plan-tier gating enforced at write-time (Free/Starter writes are dropped or retention_until set to 90-day floor)
6. 4 new acceptance criteria added to PATHE-P01 DoD

**Spec authority**: This amendment is silence-as-accept ratified — coordinator defaults APPLY at PATHE-P01 entry absent explicit CEO override.

*End of Appendix C.*

---

*End of DECISION_AWARE_WORKFLOW_VISION_REVIEW_001 v1.1 (CEO directive amendment applied).*
