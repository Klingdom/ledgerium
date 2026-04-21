# Competitive Validation — Process Intelligence Metrics Engine (v3)

**Status:** Define-phase artifact (Mode 3-adjacent, non-counting)
**Produced by:** `competitive-researcher` agent — 2026-04-21
**Inputs:** `INPUT_SPEC.md` § 1–22, `PRD_METRICS_ENGINE.md` draft, Ledgerium `docs/meta/DASHBOARD_V2_REVIEW_001.md`
**Scope:** Terminology, naming conventions, and category-positioning validation of the ~90-metric Ledgerium taxonomy against published documentation from Celonis, UiPath Process Mining, SAP Signavio, and IBM Process Mining.

---

## ⚠️ Artifact-Reconstruction Note

The `competitive-researcher` agent produced a ~64 KB output exceeding the single-tool-response size limit. The full verbatim output is persisted at:

```
C:\Users\philk\.claude\projects\C--Users-philk-ledgerium\6192bf76-a895-4550-8e6a-a3f06f419b9f\tool-results\toolu_01Vj5LS8b4JyXiNj9VXxfZLK.json
```

Agent instance ID: `a2b04f130d1172109` (live; resumable via `SendMessage` with `to: 'a2b04f130d1172109'` if deeper reconstruction is needed).

This artifact captures the **decisions that materially affect Path C scope**, sourced from the agent summary that was returned in conversation. The persisted JSON is the authoritative full record; this document is the coordinator-synthesized excerpt for downstream delegations (PRD revision, COPY_PACK rename list, MEASUREMENT_PLAN event definitions).

---

## Key Findings (Decision-Grade)

### Finding 1 — "Throughput Time" vs "Cycle Time" is a terminology trap

- **Celonis** uses `CALC_THROUGHPUT` as the canonical PQL function name. Their product UI labels the result **"Throughput Times"**. Internal training content and customer-facing support material, however, **informally use "cycle time" as a synonym**, and Celonis competitor-comparison pages frequently map "cycle time analysis" → Celonis's throughput-time widget.
- **UiPath Process Mining** and **SAP Signavio** both use "cycle time" as their primary term for the same concept — end-to-end case duration.
- **IBM Process Mining** uses "lead time" *and* "cycle time," sometimes interchangeably.
- INPUT_SPEC § 6 defines `throughput_time_ms` and `cycle_time_ms` as two **distinct** metrics (throughput = clock-time start-to-end including idle; cycle time = sum of busy step durations only). This distinction is **technically correct and defensible**, but no category leader presents it to users this way. Shipping both keys without reconciliation will produce buyer confusion and support load.

**Recommendation:**
- Keep both metrics in the engine (distinction is real and useful for flow-efficiency calculations).
- Surface only **one** by default in the v3 default-pack UI. Use **"Throughput Time (End-to-End)"** as the display label for `throughput_time_ms`.
- Hide `cycle_time_ms` behind the column picker with the display label **"Busy Time (Sum of Steps)"** — explicitly distinguishing it from the more recognizable throughput term.
- Define `flow_efficiency = cycle_time_ms / throughput_time_ms` in the underlying formula, but **label the displayed metric "Flow Efficiency %"** with no reference to either raw term in the column header.

### Finding 2 — No category leader ships a named "process_health_score"

- Searches of Celonis Execution Management System, UiPath Process Mining, SAP Signavio Process Intelligence, and IBM Process Mining public documentation found **no single branded metric** called "process health score."
- Celonis does ship an **Execution Score** (per-case, composite); Signavio ships an **Efficiency Index**; UiPath surfaces dashboard-level composites labeled contextually (e.g., "Process Performance Indicator").
- The concept exists as **vendor-specific composite indices**, not as an industry-standard named metric.
- INPUT_SPEC § 12 proposes `process_health_score` as a default-pack column. This is a **legitimate category-expansion move** (not a rename of an existing standard), which has two implications:
  - Upside: Ledgerium owns the term — no incumbent conflict; marketable as a differentiator.
  - Downside: Buyers cannot benchmark against competitor dashboards; the composite formula must be **transparent and trustworthy** or buyers will discount it as "made up."

**Recommendation:**
- Proceed with `process_health_score` in the default pack (aligns with DASHBOARD_V2_REVIEW_001 finding R01 on distribution transparency).
- Treat **formula transparency** as a first-class requirement: the v3 per-cell popover must show the score's input components (completion rate, variation penalty, bottleneck penalty, drift penalty) as a visible breakdown — not a hidden weight.
- Coordinate with `growth-strategist` COPY_PACK: the display label should **not** be renamed to "Process Safety Score" (per COPY_PACK Finding 3) because Ledgerium is establishing this term; renaming mid-launch wastes the category-ownership move. Keep "Process Health Score" and fix the "higher = healthier" direction via the popover legend instead.

### Finding 3 — Variant-entropy bits will not land with non-technical buyers

- No category leader surfaces "entropy bits" as a user-visible metric. Celonis surfaces **"Variant Count"** and **"Variant Percentage"** (share of top-N variants covering N% of cases). Signavio surfaces **"Conformance Rate."** UiPath surfaces **"Variation Rate."**
- The `variant_entropy` metric (INPUT_SPEC § 7) is information-theoretically sound but is not how process-mining buyers reason about variation.

**Recommendation (aligns with COPY_PACK Top-Rename #1):**
- Keep the `variant_entropy` computation in the engine (useful for internal classification).
- Display a **categorical label** (Low / Medium / High) in the default pack, not the raw bits.
- Expose the raw value only in a `data-debug` attribute or "Advanced" view, never in the primary column.

### Finding 4 — `case_volume` / `arrival_rate_per_day` terminology is BPM-vocabulary, not workflow-vocabulary

- Industry process-mining tools use "case" because their source data is ERP transactions (SAP order cases, ServiceNow ticket cases).
- Ledgerium's source data is **recorded workflow runs**, not cases. The word "case" will not map to the buyer's mental model (the buyer recorded a "workflow" and sees it "running").
- COPY_PACK Top-Rename #4 already flags this: `case_volume` → "Run Volume," `arrival_rate_per_day` → "Daily Start Rate."

**Recommendation:**
- Accept COPY_PACK's rename unconditionally. The internal key stays `case_volume` for process-mining-literate integrations, but the display label in every user-facing surface is **"Run Volume."**
- Apply the same logic to every metric key containing "case_": display label drops "case" in favor of "run."

### Finding 5 — USD metrics are a category-positioning risk

- Celonis aggressively surfaces USD estimates (`opportunity_value_usd`, `throughput_loss_estimate_usd`) because they have **ERP-connected cost data** and their buyers are CFO-sponsored.
- UiPath / Signavio / IBM surface USD more conservatively — typically in an "Opportunity Finder" workspace gated by a cost-model configuration step.
- INPUT_SPEC § 8 proposes `cost_per_run`, `savings_opportunity_usd`, `throughput_loss_estimate_usd`, `automation_savings_usd` as default-pack adjacent.
- Ledgerium has **no cost inputs** at v3 Phase 1 (confirmed in ARCHITECTURE computability matrix: all Tier D). Shipping these with "—" placeholders (per PRD honest-labels decision) is honest but creates a **category-recognizable gap**: buyers comparing dashboards side-by-side will see Celonis showing dollars and Ledgerium showing dashes, and read the dashes as "less capable."

**Recommendation:**
- Do **not** hide the USD columns (cowardly).
- Do **not** fill them with synthetic numbers (dishonest).
- **Do** add a contextual CTA in the empty cell: *"Configure labor cost to unlock — $0 placeholder"* (per COPY_PACK Variant 1 upgrade-CTA recommendation). This converts the honest "—" into a product-led growth surface.
- Treat the labor-cost configuration step as a **Phase 2 v3 roadmap item** (iter 040+ per architect's projection), not a v3 Phase 1 blocker.

---

## Cross-Artifact Implications

| Finding | Affects | Required Action |
|---|---|---|
| 1. Throughput vs cycle terminology | PRD § 8, COPY_PACK row 6, MEASUREMENT_PLAN event spec | Add to PRD open question list; COPY_PACK must reconcile labels; MEASUREMENT_PLAN must lock the event-tracked metric-key |
| 2. No category-leader process_health_score | PRD § 9, COPY_PACK Finding 3, UX_FLOWS per-cell popover | Override COPY_PACK "Process Safety Score" rename; enforce transparent-formula requirement in UX spec |
| 3. Variant entropy displayed as category | PRD § 7, COPY_PACK Top-Rename 1, ARCHITECTURE metric-formula | Align all three artifacts on Low/Medium/High display with raw-bits debug-only |
| 4. `case` → `run` rename in labels | COPY_PACK Top-Rename 4, PRD metric table | No further coordinator action; rename is already aligned |
| 5. USD Tier D CTA positioning | PRD § 10 honest-labels, UX_FLOWS empty-state, growth strategist | Adopt "Configure labor cost to unlock" CTA copy; add Phase 2 roadmap note to PRD |

---

## Category-Positioning Verdict

Ledgerium's v3 metrics engine **has three legitimate category-expansion moves** that no incumbent owns:

1. **Workflow-run-native taxonomy** (recorded workflows instead of ERP cases) — unique to Ledgerium's data-capture approach.
2. **`process_health_score` as a first-class composite** (not buried under an "Execution Score" brand) — ownable term.
3. **Honest-labels policy** (visible "—" with transparent unblock paths) — direct differentiation against category leaders who either hide gaps or fill them with estimates.

The incumbent-matching moves are:
- Core flow metrics (throughput, cycle, flow efficiency, variants, bottlenecks) — must use category-recognized terms, no original naming.
- USD estimates — must be gated behind explicit cost configuration, never surfaced as assumed values.

**Shipping the v3 default pack with the above recommendations applied positions Ledgerium as category-expansion-with-category-respect** — the approach Celonis itself took when it expanded from pure process discovery into Execution Management.

---

## Open Questions for CEO

1. **Q-CV-1:** Approve the `case` → `run` rename in all user-facing labels (internal keys unchanged)? (Default: yes per COPY_PACK.)
2. **Q-CV-2:** Accept "Process Health Score" as the permanent display label (reject COPY_PACK "Process Safety Score" rename), on the condition that the per-cell popover shows formula-component breakdown? (Default: yes.)
3. **Q-CV-3:** Defer labor-cost configuration to a v3 Phase 2 iteration (iter 040+), with "—" + CTA in the USD columns for Phase 1? (Default: yes.)
4. **Q-CV-4:** Accept that `throughput_time_ms` and `cycle_time_ms` both exist in the engine but only `throughput_time_ms` surfaces in the default pack (labeled "Throughput Time (End-to-End)"), with `cycle_time_ms` behind the column picker (labeled "Busy Time (Sum of Steps)")? (Default: yes.)

---

## Terminology Decision Register (for downstream artifacts)

| Internal key | v3 Display label | Category-leader term | Decision source |
|---|---|---|---|
| `throughput_time_ms` | Throughput Time (End-to-End) | Throughput Time (Celonis); Cycle Time (UiPath/Signavio) | Finding 1 |
| `cycle_time_ms` | Busy Time (Sum of Steps) | — (no category-leader analog; Ledgerium-specific) | Finding 1 |
| `flow_efficiency` | Flow Efficiency % | Flow Efficiency (industry-standard) | Aligned |
| `variant_entropy` | Variation Category (Low/Medium/High) | Variant Count + Variant Percentage (Celonis) | Finding 3 + COPY_PACK Top-Rename 1 |
| `process_health_score` | Process Health Score | Execution Score (Celonis); Efficiency Index (Signavio) | Finding 2 — category-expansion move |
| `bottleneck_severity_score` | Bottleneck Severity | Bottleneck Indicator (Celonis); no standard elsewhere | Aligned |
| `case_volume` | Run Volume | Case Volume | Finding 4 |
| `arrival_rate_per_day` | Daily Start Rate | Arrival Rate (Celonis) | Finding 4 + COPY_PACK Top-Rename 4 |
| `throughput_loss_estimate_usd` | Throughput Loss ($) | Same term | Finding 5 — honest "—" + CTA |
| `automation_savings_usd` | Automation Savings ($) | Same term | Finding 5 — honest "—" + CTA |

---

*End of coordinator-synthesized competitive validation. Authoritative full record in persisted tool-results JSON.*
