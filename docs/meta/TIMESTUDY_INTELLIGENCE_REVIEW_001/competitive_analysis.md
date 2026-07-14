# Cross-Workflow Time-Study / Comparison — Competitive Design Input

**Agent:** competitive-researcher (web search, 2026-07-12). Persisted by coordinator (agent is read-only).

## Category-standard patterns (named)
- **Variant Explorer** — end-to-end paths ranked by frequency + duration, selectable to overlay on the process graph (Celonis, UiPath, Signavio, MS/Minit).
- **DFG process-graph overlay** — nodes/edges sized/colored by frequency + mean/median duration; multi-variant overlay renders rare paths thinner/dashed.
- **Happy-path vs deviation** — a canonical/most-frequent/most-compliant trace as backbone; other variants shown as skipped/reordered/inserted/rework deviations.
- **Conformance diff / model overlay** — reference model superimposed on discovered model with deviation counts + fitness scores.
- **Compare mode / side-by-side** — two variants / periods / teams in parallel panes with delta metrics (UiPath Compare, Apromore, ABBYY).
- **Animated token replay** — bubbles traverse the graph at speed ∝ throughput, size ∝ volume (Celonis, Apromore, ABBYY).
- **Interactive trace clustering** — traces grouped by similarity; include/exclude/cluster chip controls (Signavio's new Execution Variant view) rather than a black-box backend step.
- **Baseline benchmarking** — auto-select best-performing variant/team as reference; score all others as deltas (Skan.ai, Celonis benchmarking).
- **Object-centric / work graph** — cross-process relationships beyond single-process traces (Celonis Process Sphere, Soroco Work Graph).

## What Ledgerium should match
Dual frequency+time variant ranking · an explicit **baseline/reference path** · **separate structural-vs-temporal diff lenses** (Apromore's clean split) · cross-dimension benchmarking (team/tool/period) · heat/animation for at-a-glance bottleneck spotting · interactive (not black-box) clustering controls.

## Leapfrog opportunities unique to deterministic, evidence-linked capture
1. **Exact step-fingerprint diffing** — competitors fuzzily align inferred traces (edit-distance/alpha-algorithm); Ledgerium's deterministic segmentation lets two runs be diffed like a **code diff** at exact step-boundary + selector/label fingerprint. No log-inference tool can match this.
2. **Evidence-linked time deltas** — "Step 4 took 3.2× longer in Variant B" links to the immutable captured evidence at that moment — auditable proof, not statistical inference.
3. **Reproducible deterministic clustering** — same inputs → same clusters, every time (competitors' Markov/context clustering shifts run-to-run). "Clusters you can trust and reproduce" — strong for regulated buyers.
4. **Evidence-grounded cross-workflow relationship graph** — relate *distinct* workflows by shared tools/targets/data-fields actually observed (e.g., "these 6 workflows touch the same CRM field") — a different axis than variant-of-one-process tools.
5. **Diff-and-replay** — step two runs side-by-side with automatic first-divergence flagging; impossible for tools working from aggregated logs.

## Pitfalls to avoid
Frequency-only ranking · spaghetti-graph overload without progressive disclosure/happy-path default · blended structural+temporal diff · black-box clustering · animation-as-gimmick (Process Sphere 3D drew mixed reception) · missing baseline anchor.

Sources: Celonis Variant/Process Explorer + Process Sphere + Benchmarking docs; UiPath Process Mining event-analysis + conformance docs; SAP Signavio Feb/May 2026 releases + Process Variant docs; Apromore variant-comparison docs; ABBYY Timeline; Scribe Optimize; Soroco Work Graph; Skan.ai process-intelligence + bottleneck guides; MS Learn Minit variants; arXiv trace-variant + variant-analysis surveys.
