# Process-Mapping Competitive Benchmark
**Ledgerium AI — Process Intelligence Platform** · Date: 2026-06-12 · Status: FINAL (analysis only)

> Authored by the competitive-researcher agent (read-only); persisted by coordinator.

## Purpose
Benchmark Ledgerium's four existing process-mapping views against market-leading diagramming
and process-intelligence tools, and recommend two new views that make Ledgerium "as good as or
better than Visio." **Hard computability filter:** every recommended view must be deterministically
derivable from already-captured data — no fabricated conditions or values.

## 1. View-type × tool matrix (abridged)

Ledgerium today: **Flow Intelligence** (flowchart), **Swimlane** (cross-functional), **Process
Variants** (diverge/reconverge story map), **System Interaction**.

| View type | Visio | Lucidchart | Celonis | UiPath PM | Apromore | SAP Signavio | Scribe Optimize | Miro |
|---|---|---|---|---|---|---|---|---|
| Basic flowchart | ✅ | ✅ | — | — | — | — | — | ✅ |
| Swimlane / cross-functional | ✅ | ✅ | — | — | — | — | — | ✅ |
| BPMN 2.0 | Pro | ✅ | — | — | ✅ | ✅ | export | ✅ |
| Value Stream Map | Pro | ✅ | — | — | — | — | — | ✅ |
| SIPOC | — | ✅ | — | — | — | — | — | ✅ |
| Evidence-mined process map | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Variant explorer | — | — | ✅ | ✅ | ✅ | ✅ | — | — |
| **Cycle-time histogram** | — | — | ✅ | ✅ | ✅ | ✅ | — | — |
| Bottleneck heatmap on graph | — | — | ✅ | ✅ | ✅ | ✅ | partial | — |
| Frequency-filter graph slider | — | — | ✅ | ✅ | ✅ | ✅ | — | — |

**Visio is a manual drawing tool** — no discovery, no variant detection, no cycle-time, no evidence
linking. **Process-mining suites** ship the broadest analytics surface (cycle-time histograms,
bottleneck heatmaps, sliders) but require ERP/event-log connectors and cannot capture browser
behavior. **Scribe Optimize** ($75M, Nov 2025) captures browser workflows and ships BPMN 2.0 export
— the closest positional threat — but its maps are AI summaries, not deterministic from immutable
evidence.

## 2. Familiarity for ops / process-improvement users
Very high: flowchart, swimlane. High: **BPMN 2.0** (universal enterprise standard), **cycle-time
histogram** (table-stakes in every process-mining tool). Partial-data: SIPOC (Supplier/Customer not
captured), Gantt (no planned schedule), VSM (no takt/inventory) — these require data Ledgerium does
not capture and would risk fabrication.

## 3. Recommended two new views

### A. Cycle-Time Distribution Histogram — **P0**
Histogram of run durations across recorded instances; percentile lines (p50/p85/p95), mean/median,
outlier highlight. Fully computable from `cycle_time_mean/median/stddev/p95/p99_ms` + per-run
durations. Table-stakes in Celonis/UiPath/Disco/Apromore/Signavio; the single most recognizable gap
versus process-mining tools. Different cognitive lens (statistical distribution) from the four
structural views. **Beats Visio:** Visio has no equivalent; ours is auto-generated from N observed
runs and surfaces predictability/variance (mean 4m but p95 22m tells a different story).

### B. BPMN 2.0 view + export — **P1**
Renders the observed graph in standard BPMN 2.0 notation: ordered steps → tasks; variant divergence
→ XOR gateway; reconvergence → XOR merge; **gateways annotated with OBSERVED frequencies only
("62% / 38%"), never fabricated conditions**; system per step → pool/lane. Exportable as BPMN 2.0
XML (Camunda/Bizagi/Signavio integration motion). Universal enterprise standard; direct parity with
Scribe Optimize's BPMN export; credentialing for compliance buyers. **Honesty:** BPMN here is a
*notation rendering of observed structure* — gateways carry measured frequencies, not invented
conditions — so it satisfies the observed-only invariant. **Beats Visio:** Visio BPMN is hand-drawn;
ours is evidence-generated with measured gateway probabilities.

### Runners-up (computable, lower familiarity/fit)
- **Process Timeline** (per-step duration bars, bottleneck markers) — strong, but time-lens overlaps
  the histogram; good Phase-2 candidate.
- **SIPOC summary** — high Lean familiarity, but Supplier/Customer not captured (label as
  "Systems (entry/exit)" to stay honest) — weaker data fit.
- **Sankey / flow-volume** and **animated variant diff** — computable, lower familiarity / higher
  build cost; defer.

## 4. How Ledgerium beats Visio (make these explicit in UI + positioning)
1. **Auto-layout from real evidence** — zero authoring; every view generated from captured events.
2. **Variant overlay with measured frequencies** — shows what actually happens and how often.
3. **Cycle time on the map** — every node/edge annotated with measured durations.
4. **Evidence drill** — every displayed value traces back to the source event ("a citation, not a
   calculation"). No competitor offers verifiable evidence linking.
5. **Determinism / reproducibility** — same input → identical map; cannot be edited to show what the
   process "should" look like.

## 5. Risks / where competitors lead
- **Scribe Optimize** — same "evidence-from-real-work" message, $75M, 5M users, BPMN export, living
  maps, AI bottleneck chat. Mitigation: make determinism **visible in the UI**, ship BPMN parity.
- **Process-mining suites** — broader analytics surface (histograms, dotted charts, sliders).
  Mitigation: ship the cycle-time histogram + a frequency-threshold slider (P2).
- **KYP.ai** — desktop-scope capture (beyond browser); monitor enterprise RFP scope pressure.
- **AI-from-description (Miro/Lucidchart)** — devalues drawing surface; tailwind for evidence-based
  positioning, but buyers may not distinguish AI-drawn vs evidence-generated without prompting.

## Sources
Microsoft Visio (process diagrams; BPMN); Lucidchart (process mapping guide; SIPOC); Celonis (Process
Explorer vs Variant Explorer; analysis components); UiPath Process Mining (process graphs); Apromore
(key features; discover model); SAP Signavio (April 2025 release; BPMN 2.0 wiki); Scribe Optimize
(process maps; SiliconANGLE $75M raise, 2025-11-10); Miro (process mapping); Fluxicon/Disco (statistics
view); Businessmap (cycle-time histogram); KYP.ai (process-intelligence software 2026); Six Sigma US
(VSM). Full URL list retained in board transcript.
