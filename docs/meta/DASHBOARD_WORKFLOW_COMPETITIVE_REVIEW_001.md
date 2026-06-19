# DASHBOARD + WORKFLOW VIEWS — Competitive Review vs Celonis (REVIEW_001)

**Type:** CEO-directed Mode 3-adjacent multi-agent competitive review (NON-counting).
**Date:** 2026-06-19
**Directive:** review the dashboard + workflow views + codebase; compare and improve both pages to beat Celonis and core process-mining/intelligence competitors.
**Panel (7; 6 completed):** competitive-researcher, product-manager, system-architect, ux-designer, frontend-engineer, growth-strategist (analytics agent thrashed on context — scope covered by PM + competitive).

---

## 1. Executive verdict

Ledgerium's **intelligence engine is already process-mining-grade** (variants, variance, bottlenecks, drift, timestudy, automation scoring, path signatures, SOP alignment). The gap is **the views don't expose it** — the dashboard surfaces ~10 of 38 possible columns and almost none of the bottleneck/drift/variant depth; the workflow views show frequency but not performance/time, and clicking a step reveals no multi-run statistics.

**The single biggest architectural finding (system-architect):** a fully-designed, DFG-grade, evidence-linked, append-only `ProcessGraph / ProcessNode / ProcessEdge / Variant` schema + `lib/process-graph/` library **already exists but has no producer** — nothing writes it. The live views run on **category-sequence approximations re-derived per request** (full-corpus re-analysis on every variants call). Building the merge-engine producer makes DFG performance overlays, case drill-down, attribute filtering, and conformance all *additive* features on a deterministic, reproducible foundation instead of a series of rewrites.

**The strategic wedge (growth + competitive):** don't fight Celonis on ERP scale. Win mid-market ops/automation teams (10–500) doing browser-native work, where Celonis cannot compete on time-to-value (minutes vs months) or behavior-level granularity. Make the **evidence-linked determinism moat VISIBLE** on both pages.

---

## 2. Capability gap vs best-in-class (condensed)

| Capability | Best-in-class | Ledgerium status | Action |
|---|---|---|---|
| DFG frequency overlay | Fluxicon Disco | **Partial (WIP)** `dfgModel.ts`+`DfgFrequencyMap.tsx` | Ship it |
| **DFG performance (time) overlay** | Celonis / Power Automate | **Absent** (DFG carries no edge durations) | **P0 — #1 expected feature** |
| DFG frequency threshold slider | Celonis / Disco | **Absent** | P0 UX |
| Variant explorer + coverage | SAP Signavio (Feb 2026) | Partial (Map/DNA/List) | Add coverage bar + conformance coding |
| Node/edge drill-down panel | Power Automate | Inspector shows single-run only, no multi-run stats | P0 |
| Bottleneck highlight on map | Celonis (red nodes) | **Computed, not rendered** | P0 |
| Drift signals on views | — | **Computed, not surfaced anywhere** | P0 |
| Cycle time as default column | All competitors | In registry, **not in default pack** | P0 quick win |
| Statistical columns (median/variant/stddev/opp-score) | Power Automate (30+ cols) | **Computed in `intelligenceJson`, mis-classified `pending`** | P0 quick win |
| Case-level drill-down (click→runs) | Celonis / UiPath | `evidenceRunIds` threaded, **no UI** | P1 |
| Conformance (SOP deviation) | Celonis PAM (BPMN) | SOP-alignment score exists; no visual conformance | **Leapfrog (recorded-SOP, zero modeling)** |
| Animated case replay | Fluxicon Disco | Absent | P1/P2 |
| **N-attribution on every stat ("4m 32s · 47 runs")** | **No one** | Absent | **Leapfrog — highest-leverage, ~1 line** |
| **Evidence drill (metric→source events)** | **No one** | Architecture ready, no affordance | **Leapfrog — moat made visible** |
| Deterministic Q&A (AskThisProcess) | LLM-inferred only (UiPath/Celonis AI) | **WIP, deterministic** | **Leapfrog** |
| Root-cause / attribute filtering | UiPath (Dec 2025) | Absent (no case attributes captured) | P2 |
| OCPM / BPMN export / what-if | Celonis / Apromore | Absent | **Don't chase** |

**Exploitable competitor weaknesses (sourced):** Celonis needs ERP event-logs + 9–18mo + $150k–$500k setup; **Celonis Analysis layer deprecated Aug 2025** (Explorer/Variant frozen, migration chaos = window); task mining (Celonis/Skan) is surveillance-heavy (Ledgerium is user-initiated/session-scoped = regulated-industry opening); Scribe ($1.3B, 78k orgs, closest threat) is **documentation not deterministic intelligence** — no DFG, no immutable evidence chain, no conformance (18-month window).

---

## 3. Decided top moves (per page)

### Dashboard — highest leverage
1. **Unlock 6 mis-classified statistical columns** (median cycle time, variant_count, top_variant_share, path_length_stddev, path_similarity, ai_opportunity_score) — data already in `intelligenceJson`; registry flip + accessors. Takes the list from 10 → 16 available columns. *(= WDC-002 row #101.)*
2. **Cycle time + N-attribution in the default pack** ("4m 32s · 47 runs"). Most-expected metric + the category-first trust signal no competitor surfaces.
3. **Surface bottleneck + drift** as columns + insight chips (computed, currently invisible).
4. **Make insight chips explain + navigate** (not just filter) — slide-in drawer with the causative workflows/steps + "View details →".

### Workflow view — highest leverage
1. **DFG performance overlay** (frequency ⇄ time toggle, duration-encoded edges/nodes, legend). The single most-cited Celonis gap. Needs edge durations on `DfgEdge` (data exists in `VariantInput.stepDurationsMs`, currently discarded).
2. **DFG frequency threshold slider** (already partially present as coverage slider — confirm/expose) — the core Celonis/Disco interaction.
3. **Per-step timestudy in node inspector** (mean/median/p90/stdDev/N) + **bottleneck highlighting** on flow + swimlane (rings: amber ≥1.5×, red ≥2×).
4. **Drift banner + chips** when `DriftReport.driftDetected`.
5. **Leapfrog: evidence-linked SOP conformance** — color steps deviating from the recorded SOP red on the DFG; "step 5 skipped in 12 of 47 runs." Zero model authoring — unique to Ledgerium.

### Both pages — the moat made visible
- **N-attribution everywhere, no tooltip** ("value · N runs"). Loudest evidence-linked signal; ~1-line.
- **Evidence drill-down**: click any metric → list the source runs (foundation `evidenceRunIds` already threaded).
- **Recording-date + "all time · N runs" in headers** = the zero-setup, minutes-not-months proof.

---

## 4. Code-quality / correctness fixes required FIRST (frontend-engineer)

These are pre-existing defects/risks that must be cleared before piling heavy features on:
- **P0 stale-edges bug:** `WorkflowCanvas.tsx:88-91` (and swimlane) call `setNodes` but **never `setEdges`** on graph change → edges go stale after navigation/filter. One-line fix each.
- **P0 scale crash:** `dfgModel.ts` `Math.max(...activityNodes.map(...))` throws `RangeError` at ~130k activities → replace with `reduce`.
- **DfgNodeComponent memo break** (inline `baseStyle` defeats `React.memo`); **O(n) full-array selection sync** (jank at 200+ nodes); **`filterDfgByCoverage` O(E²)** (Map it); **no `onNodeClick`** on DFG (blocks evidence drill-down); **`setTimeout(50)` in resetView** (non-deterministic); **hardcoded sort** in dashboard fetch URL vs sort state; loose `any` view-model contracts.

## 5. Determinism findings (system-architect)
- **Engine `computedAt = new Date().toISOString()`** in 10+ intelligence modules breaks byte-identical replay / content-hash caching. Fix: inject `computedAtMs` (single-upstream-clock pattern already used in `route.ts:439`). Topology is deterministic; this is metadata only but blocks caching the graph.
- `intelligenceJson` text cache has **no version pin** → silent engine/blob drift.
- Variant analysis is **non-incremental** (full-corpus re-cluster per request) → "N runs" silently changes as corpus grows; persisted versioned `ProcessGraph` fixes reproducibility + cost.

---

## 6. Recommended build sequence (additive; reconciled)

**Quick-win wave (ship visible value now, no schema change):**
- **QW1** Dashboard: unlock 6 stat columns + cycle-time default + **N-attribution** (registry/accessor + format change).
- **QW2** Workflow: **DFG performance overlay** (add durations to `DfgEdge` from existing `stepDurationsMs`; freq⇄perf toggle + legend) + fix `filterDfgByCoverage` O(E²) + dfgModel `Math.max` reduce.
- **QW3** Correctness pass: stale-edges fix, DfgNode memo, `onNodeClick` wiring (enables drill-down).
- **QW4** Surface bottleneck + drift on both pages (columns/chips/banner + node rings) — computed-but-hidden.
- **QW5** Node inspector: per-step timestudy stats + "present in N of M runs."

**Foundation wave (the keystone — unblocks the rest):**
- **S1** Engine determinism hardening (inject `computedAtMs`; version-pin `intelligenceJson`).
- **S3** Persisted incremental `ProcessGraph` + **merge-engine producer** (`mergeProcessGraph`, append-only `graphVersion`, node identity = label+route+system, edge durations) — writes the dormant schema; variant/DFG reads become a single indexed query with node identity instead of category collapse.

**Leapfrog wave (on the foundation):**
- **S4** Case-level drill-down (click edge/node → run list → single-case timeline; uses `EvidencePointer`/`evidenceRunIds`).
- **S6** **Evidence-linked SOP conformance** (user-declared/recorded reference → deviation overlay; honesty-preserving).
- AskThisProcessPanel promoted to persistent (all SOP modes) + provenance line.
- S5 attribute capture + filtering; S7 large-graph perf (virtualization/clustering) when graphs get big.

## 7. Anti-scope (don't chase Celonis here)
ERP event-log connectors; OCPM/object-centric; conformance against imported BPMN models; what-if simulation; BPMN/XML export; million-case scale; full enterprise compliance module (defer to AI-execution Phase 2); algorithm-breadth (Heuristics/Fuzzy/Inductive miners). These win Fortune-500 ERP deals Ledgerium isn't fighting for.

## 8. Positioning lines (growth)
- Hero (logged-in): *"Every process you record becomes a measured, evidence-linked baseline."*
- Dashboard: *"Your process library — measured from real behavior."*
- Workflow: *"Record once. See cycle time, variants, and where time goes."*
- Sales framing: *"Celonis is for Fortune 500 ERP data. Ledgerium is for any team that does digital work in a browser — starting in minutes, not months."*
- Free→paid (in workflow health card): *"You ran this workflow 47 times. See exactly why it scores 73 — and which steps to fix first."*

---

*Mode 3-adjacent diagnostic. No iteration counter incremented. No product code changed. Consolidated from 6 specialist agent analyses. Build waves above are proposed; execution is subsequent iterations pending CEO direction.*
