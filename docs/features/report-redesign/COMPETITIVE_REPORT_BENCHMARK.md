# Report View — Competitive Benchmark (best-in-class process/analytics reports)
**Ledgerium AI** · 2026-06-14 · Analysis only (read-only agent output, persisted by coordinator)

## The convergent 3-tier structure (every serious tool)
1. **Verdict (30s)** — a few headline KPI tiles + (increasingly) an auto-generated prose summary that states the answer in plain English. No charts, no methodology.
2. **Evidence (2-5 min)** — charts that explain the verdict: variant Pareto, cycle-time distribution, bottleneck ranking, trend; each captioned with a one-sentence interpretation.
3. **Source (drill)** — run/case-level tables, trace replay, export — defensibility for analysts/auditors.

Lead with impact, not methodology (ServiceNow findings-readout template). Inverted pyramid: the most important fact first.

## Pattern × tool
| Pattern | Celonis | UiPath | Signavio | Apromore | IBM | Analytics (Amp/Mixpanel/Stripe) |
|---|---|---|---|---|---|---|
| Headline KPI tiles | ✅ (3) | ✅ (5) | ✅ PPI | ✅ | ✅ | ✅ (1 big number) |
| Exec prose summary | ✅ AI '25 | — | NL query | — | — | — |
| Pareto variant chart | ✅ | ✅ | ~ | ✅ | ✅ | n/a |
| Per-variant metrics | ✅ | ✅ | ✅ | ✅ | ✅ | n/a |
| Cycle-time distribution | ✅ | ✅ | ✅ | ✅ | ✅ | n/a |
| Consistency/conformance score | ✅ | ✅ | ✅ | ~ | ✅ | n/a |
| Bottleneck ranked list | ✅ | ✅ | ✅ | ✅ | ✅ | n/a |
| Automation candidates | ✅ | ✅ (sim) | — | — | — | n/a |
| Drift / period compare | ✅ | ✅ | ✅ | ✅ | ✅ AI | ✅ |
| Evidence drill-down | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PDF export | ✅ | ✅ | ✅ | ✅ (BI) | ✅ | ✅ |
| Scheduled delivery | ✅ '25 | — | — | — | — | ~ |
| AI insight narrative | ✅ '25 | — | ~ NL | — | — | — |

## How the best make a process understandable in 30s
- One plain-English verdict first (Celonis AI summary): "ran 12×; cycle time +18% driven by Credit Check bottleneck; 12% rework; 2 automation candidates ≈340h/mo."
- Headline numbers carry a reference point (vs prior/target/benchmark) — a bare "12.4h" → "12.4h, 3.1× target."
- One dominant chart (variant Pareto or cycle-time histogram), not six.
- Progressive disclosure: verdict → which step → which runs → the trace. Each level narrows scope.

## How variance/variants are shown
- **Pareto variant chart** (universal): variants ranked by run count, cumulative % — instantly shows "standardized vs chaotic."
- **Per-variant metrics** (frequency + median throughput + conformance) → a decision matrix (common AND slow = standardize target).
- **Side-by-side variant compare** (UiPath) — good run vs bad run.
- **Conformance/consistency score** (0-100) + deviation list. Ledgerium computes sequence-stability from REAL behavior (more honest than a predefined reference model) — label it so.

## Export
Three layers: live shareable link; **PDF snapshot** (the stakeholder lingua franca — verdict + primary chart + key table + a metadata footer); scheduled delivery. Ledgerium's footer differentiator: "All data derived from observed behavior — no modeled estimations."

## 10 moves to make Ledgerium's report best-in-class (all computable today; leverage evidence-linked + deterministic)
1. **Auto-generated 3-sentence verdict paragraph** (highest leverage; no competitor auto-generates from recorded runs).
2. **5-tile KPI scorecard** (Cycle Time · Consistency/CV color-coded · Variant Count · Bottleneck Step · Automation Score).
3. **Variant frequency Pareto** as the dominant visual (run counts, % , standard path = "Reference path").
4. **Cycle-time distribution** (min/p25/median/p75/max + reference line).
5. **Bottleneck contribution ranking** (% of total cycle time + run-count context).
6. **Drift panel** (earlier vs recent runs) — uniquely deterministic via immutable timestamps.
7. **Insight cards** (Standardize/Automate/Investigate) with **evidence anchors (run #s)**.
8. **Consistency-score gauge** ("based on observed behavior, not a defined target").
9. **PDF export** with a fixed 2-page stakeholder layout + evidence-linked footer.
10. **"Process Intelligence Report" header + "evidence-linked" badge** (strongest trust/brand move).

Lowest-effort/highest-impact first: 3, 2, 7; then 1 (verdict); then 5, 4, 6; then 8, 9, 10.

## Sources
Celonis (Variant Explorer; Insight Explorer; Sept 2025 release; process analysis); UiPath Process Mining (automation potential; KPI lists; process graphs; Oct 2025); SAP Signavio (Process Insights; Jul/Nov 2025 releases); Apromore (performance dashboard; key features); Fluxicon/Disco (statistics view); IBM Process Mining; Amplitude/Mixpanel/Stripe Sigma; NN/g (inverted pyramid; progressive disclosure); ServiceNow findings-readout template; arXiv process-drift + conformance-viz papers. Full URL list in board transcript.
