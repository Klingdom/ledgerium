# Competitive Research — Visualizing Process Variants & Decision Points (2026-06-10)

Define-phase research brief (competitive-researcher). READ-ONLY. Filtered through Ledgerium's invariant: deterministic, reproducible, evidence-linked (no black-box inference; every node/edge/branch traces to source runs).

## 1. How leaders visualize variants + decision points

- **Celonis** — frequency-weighted DFG; edge thickness = case count; selectable node KPI (frequency / throughput). **Variant Explorer** = separate companion view enumerating end-to-end sequences with % share; "Happy Path" = highest-frequency start→end overlay. Decision points are **implicit** (node with multiple outgoing edges + per-edge counts); **no fabricated condition label**. (Analysis/Variant Explorer in maintenance mode as of Aug 2025; migrating to Studio Views.)
- **SAP Signavio** — BPMN-overlay with **explicit XOR gateway diamonds** where a model exists; Hotspot heatmap (turquoise circle size = frequency); Conformance widget (red deviations / green conforming). Conditions labeled only from the BPMN model's sequence-flow expressions; discovery-only views don't fabricate.
- **Apromore** — **differential color overlay**: grey = in both logs, blue = B-only, red = A-only ("differential perspective graph"); abstraction slider; Multi-Perspective Comparator (statistically significant differences). Closest analog to a "compare two variant groups" view.
- **UiPath** — **TRACY layout** (dominant path = structural spine); **Variants/complexity slider** (prune low-frequency edges; shows variants count + % cases); **Variant DNA** companion strip (each variant = row of color-coded activity tokens, frequency-sorted).
- **Power Automate (ex-Minit)** — Variants-by-frequency / by-time bar charts + **Variant DNA** strip; DFG with frequency-weighted edges.
- **Scribe / Tango** — documentation authoring; **no variant mining** (author-declared branches only). Category difference, not a competitor on variants.
- **Soroco Scout** — "work graph" with variations/exceptions/decision logic from captured interactions; closed-source; specific decision-point idiom not publicly documented.

## 2. Visual idioms — pros/cons for a deterministic, evidence-linked tool

- **Frequency-weighted DFG** — ADOPT foundational layer. Deterministic, direct read of the log; edge thickness = frequency. Con: spaghetti without a threshold; can't distinguish XOR vs concurrency.
- **BPMN gateway diamonds (XOR/AND/OR)** — AVOID for *inferred* branching (fabricates condition semantics; violates evidence-linkage). Only for externally-provided models / conformance.
- **Sankey/alluvial** — AVOID as the primary map (loses topology, can't show loops, clutters >5–6 paths). OK as a secondary "path distribution" panel.
- **Variant DNA / sequence-alignment strip** — CONSIDER companion panel. Deterministic; great for many variants; LCS-backbone can anchor the alignment columns (leverages existing engine).
- **Decision-point diamond + per-branch %** — ADOPT, labeled honestly ("Observed split — N of M runs"), neutral diamond (no BPMN type), no fabricated condition.
- **Heatmap (frequency/duration)** — CONSIDER toggleable color overlay.
- **Complexity/frequency slider** — ADOPT as primary spaghetti control (numeric, deterministic).

## 3. Honest decision-point labeling (epistemic ladder)
- **Tier 1 (always safe):** per-edge "N runs (P%)". No condition stated.
- **Tier 2 (safe as evidence):** observed-attribute correlation ("in 12/14 runs taking this path, the prior action was click #submit") — label "Observed correlate," not "Condition."
- **Tier 3 (inferred):** only with explicit uncertainty ("Inferred pattern, seen in N/M runs"). Never present as a rule.
- **Never:** XOR symbol without proof of mutual exclusion; condition expressions for fields not captured.

## 4. Layout standards for stable, readable graphs
- **Sugiyama / layered DAG** (cycle removal → layer assignment → crossing minimization → coordinate assignment). Deterministic given fixed input + fixed tie-breaks. Underlies Graphviz/dot, **ELKjs (layered)**, Dagre.
- **ELKjs vs Dagre:** ELKjs supports nested/compound nodes + orthogonal routing (recommended for production); Dagre simpler but no subgraphs. Both deterministic with fixed input ordering.
- **Stability under filtering (Mennens et al. 2019, CGF):** run layout once on the full graph, cache positions per node, hide/fade filtered elements rather than re-layout — preserves the mental map. **Most directly applicable result for Ledgerium.**
- **Left-to-right** canonical orientation; **back-edges (rework loops)** as curved arcs below the spine, distinctly styled, frequency-labeled.

## 5. ADOPT / CONSIDER / AVOID

| Technique | Verdict | Reason |
|---|---|---|
| Frequency-weighted DFG | ADOPT | Deterministic, evidence-linked, industry standard |
| ELKjs layered LTR, layout-once + position cache | ADOPT | Stable/reproducible (Mennens 2019) |
| Complexity/frequency slider | ADOPT | Proven spaghetti control; numeric filter |
| Happy-path / LCS-backbone highlight | ADOPT | Leverages existing engine |
| Neutral divergence diamond + per-branch % | ADOPT | Honest, explicit, no fabricated condition |
| Rework loop as styled back-arc | ADOPT | Sugiyama standard |
| Variant DNA strip (companion) | CONSIDER | High value; needs LCS alignment design |
| Differential A/B overlay | CONSIDER | Apromore-grade; needs group-compare UX |
| Heatmap (freq/duration toggle) | CONSIDER | Useful if duration data present |
| Observed-attribute correlation on click | CONSIDER | High-value; needs event enrichment |
| Inferred BPMN gateway labels | AVOID | Fabricates semantics; violates invariant |
| Inferred condition text | AVOID | Highest trust risk |
| Sankey as primary map | AVOID | Wrong topology for loops |
| Random/force-directed layout | AVOID | Breaks reproducibility |

Sources: Celonis Process/Variant Explorer docs; SAP Signavio Variant Explorer + Conformance docs; Apromore Compare Variants + MPC; UiPath Process Graphs + Detail Slider; MS Power Automate process-mining docs; Mennens et al. 2019 "A stable graph layout algorithm for processes" (CGF); React Flow ELKjs/Dagre examples; Sugiyama method; ProM Decision Miner; Split Miner / Inductive Miner papers.
