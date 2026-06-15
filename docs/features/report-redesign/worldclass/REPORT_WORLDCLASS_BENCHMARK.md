# Report View — World-Class Benchmark (Consolidated)
**Ledgerium AI** · 2026-06-15 · Synthesis of the 6-specialist board (competitive · process-mining expert ·
process-performance-metrics expert · PM strategy · UX · analytics)

## Verdict: **B+ overall** — top-tier content + a unique moat, held back from A by conformance, root-cause, and the delivery layer
The Report (post R-A→R-D) ships the modern **verdict → evidence → source** spine — auto verdict, 5-tile scorecard,
variant Pareto, cycle-time spread, consistency gauge, bottleneck ranking, evidence-anchored insight cards, drift,
Print/PDF — with two genuinely **category-leading** properties no competitor has: **figure-level determinism**
(byte-reproducible) and **figure-level evidence provenance** (every number traces to recorded runs; observed-only).

| Lens | Grade | One line |
|---|---|---|
| Competitive (products) | B+ | Unmatched on evidence-linkage; lacks scheduled/shareable + per-chart AI narrative |
| Process-mining expert | B− / B | Ships the spine; missing the two definitional surfaces: **conformance** + **root-cause** |
| Process-metrics expert | — | 8 KPI families computable; several **computed-but-hidden**; firm must-not-show list |
| UX | — | Strong verdict/honesty; needs chart captions, drill anchors, section structure |

## The biggest gaps (board consensus)
1. **Conformance — and an honesty caution.** What the report labels "Reference path" is the **modal observed path,
   not a designated standard** → it computes *mode-conformance*, not *reference-conformance* (van der Aalst). If the
   common way is the wrong way, it would report "90% conformance" on a 90%-non-compliant process. **Do NOT call it
   "conformance" until the user can pin a standard.** The fix is mostly **wiring**: `analyzeDivergence` already accepts
   an arbitrary backbone, so letting the user designate a standard path converts it to true conformance with zero new
   math. Surface `sequenceStability`/`standardPathFrequency` as "% of runs on the standard path" + a deviation table
   (the divergence branches are already computed).
2. **Root-cause** — the report shows *what* is slow/variable, never *why*. Variant↔cycle-time correlation and
   bottleneck→branch attribution are computable from `evidenceRunIds` already on the payload.
3. **Computed-but-hidden metrics (free wins, zero new engine work):** `completionRate`, `errorStepFrequency`
   (exception rate), `stepCountVariance`, per-step `p90`/`stdDev`/`CV`, `variant.similarityToStandard`,
   `drift.changePercent`, `standardization.factors`, `outlierRuns`, `divergence.conformingPct`. Surface them.
4. **Delivery layer (table-stakes gap):** no **scheduled delivery**, no **shareable URL / immutable snapshot**. This
   makes the report a tool, not a reporting product — and the immutable snapshot is a **moat play** (report-as-audit-
   artifact: "tamper-evident record of what was observed as of this date").
5. **AI narrative per chart section** — extend the deterministic `buildReportVerdict` with a one-sentence
   interpretation caption under each chart (computable now; "based on N recorded runs" — more trustworthy than
   competitors' generative summaries).
6. **Evidence-drill navigability** — `evidenceRunIds`/`stepOrdinals` are plumbed but not rendered as navigable. The
   `runId ≠ workflowId` routing issue blocks live run links, but **step-ordinal anchors** (`id="rpt-step-{n}"` +
   scrollIntoView) are a cheap finding→step drill. Run-level drill from any figure = the moat made visceral.
7. **Dormant engine modules** (`sopAlignmentEngine`, `standardizationScorer.documentationDrift`) compute true SOP
   conformance but are **not wired into the report**.

## Honesty boundaries (firm — must not fabricate)
**Never show:** DPMO / sigma level / Cp-Cpk (no defect definition or spec limits) · value-add % / true PCE (no
VA/NVA classification, no measured wait channel) · takt (no demand) · cost (no cost data). **Label proxies as
proxies:** `errorStepFrequency` is "exception rate," never "defect rate"; first-time-right = "standard-path runs
without error/rework (proxy)"; on-target rate needs a **user-set target**, never a benchmark. The codebase's
observed-only honesty is already enforced — codify it as policy.

## Roadmap (P0 → P2, honest + mostly computable now)
- **P0 (free/cheap, computable today):** surface conformance % + deviation table (honestly framed) · the
  computed-but-hidden metrics (completion rate, exception rate, p90 distribution, variant similarity) · per-chart
  narrative captions · health-score as the hero element · the metric-honesty labels.
- **P1:** root-cause drill (variant/bottleneck → runs) · step-ordinal evidence anchors · trend chart (rolling
  cycle time/variants) · wire the dormant SOP-alignment module · fix print dark-cards · section grouping +
  "Automation before Bottlenecks" reorder.
- **P1/P2 (delivery + moat):** **shareable URL + immutable snapshot** · **scheduled delivery** · "share to
  stakeholder" flow · designated-standard conformance (user pins the standard) · intra-account benchmarking.
- **P2 (frontier):** LLM narrative (additive, disclosed, evidence-grounded) · NL query ("ask the report") · what-if
  (out-of-scope until honest).

## Positioning
Own **"evidence-linked process intelligence"** — every figure is a citation, auto-generated from real work,
reproducible. **The report is evidence about your process, not an analysis of it.** That distinction is worth a
premium in regulated/legal/compliance contexts and is an architectural property competitors who infer from ERP logs
or generate AI summaries cannot match.

## Open CEO decisions
- DD-1 Conformance: confirm the "designate a standard path" model (vs leaving it mode-conformance, relabeled honestly).
- DD-2 Delivery: prioritize shareable-URL/snapshot + scheduled delivery (the table-stakes + moat gap)?
- DD-3 AI narrative: deterministic captions now (rec) vs LLM later.
- DD-4 Which P0 batch first — recommend **conformance-framing + computed-but-hidden metrics + chart captions** (one
  honest, high-comprehension, zero-new-engine batch).
