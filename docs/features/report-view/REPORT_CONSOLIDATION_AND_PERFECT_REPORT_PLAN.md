# Report View — Consolidation + "Perfect Report" Plan

**Date:** 2026-06-07 · **Type:** Multi-agent design review (ux-designer, frontend-engineer, system-architect, product-manager, analytics). **Design only — no code; nothing ships until the production flash is fixed + gates pass.**

## 0. Starting point (verified)
- **Running product = 8 detail tabs** (Workflow, SOP, Report, Insights, Interpretation, Intelligence, AI Agents, Evidence). The 2-view (Process | Analysis) consolidation + Intelligence/Agents-fold is parked on branches.
- **The Report (`WorkflowReportPage`, ~1170 LOC) already absorbs most analytics:** Hero metrics, Process-Intelligence scores, Phase Timeline, Insights feed, Automation, Bottlenecks, Step Breakdown, Friction & Decisions, Rework. So **Insights and Interpretation are largely already in Report.**
- **Presentation-only:** no schema/API changes. `intelligenceData` + `agentIntelligenceData` already flow into the Report as props; the new sections just *consume more of what's already fetched*.

## 1. What's unique vs already-in-Report (migration matrix)
| View | Already in Report (retire as duplicate) | UNIQUE — migrate into Report |
|---|---|---|
| **Insights** | insight cards + severity + category filter | **Time-breakdown** (total duration, longest-step % of total) |
| **Interpretation** | scores, phases, decisions, rework, friction | **Process-type + summary prose** (one high-signal sentence) |
| **Intelligence** | bottlenecks | **Run metrics** (median duration/steps, runs, completion); **per-step timestudy** (mean/median/p90); **variance** (sequence stability, duration CV, high-variance steps); **variants** (list, frequency, standard path) |
| **AI Agents** | automation opportunities | **Composed agents**, **skill library**, **integration readiness & risks**, **implementation roadmap** |

**Single-source-of-truth:** physically delete the duplicate render paths (retire `InsightsPanel`, `InterpretationTab`, then `IntelligenceTab`, `AgentIntelligenceTab` after their uniques land). SSOT becomes a *structural* invariant, not a runtime `hide*` flag. (Bonus: this erases a latent bug — `AgentIntelligenceTab`'s SummaryBanner reads `result` not `resolved`, rendering zeros in the Analysis view.)

## 2. The perfected Report — section order (narrative: identity → diagnosis → action → evidence)
1. **`rpt-hero` Overview** — *replace the thrice-repeated title with a deterministic interpretive lead sentence* + a one-line header strip: **"N runs analyzed · median cycle time X · top variant covers Y% · Z friction events."** Health score is supporting, not the hero.
2. **`rpt-lead` The one insight you can't miss** *(NEW, callout)* — **"Step N owns X% of process time and is Y× slower than the average step — start here,"** linked to the step. Works on a *single* run; the highest-leverage universal signal (combines `timeBreakdown.longestStepPercentage` + `BottleneckStep.durationRatio`, both already computed).
3. **`rpt-scores` Process Health** — 4-component breakdown (speed/consistency/dataQuality/standardization) with plain-language captions *(currently computed but absent from Report)*.
4. **`rpt-phases` Phase Timeline**
5. **`rpt-metrics` Run Metrics** *(NEW)* — median duration/steps, run count, completion rate + **cycle-time distribution** (median | p90 | max range bar) from `TimestudyResult.totalDuration`.
6. **`rpt-variance` Variance & Variants** *(NEW — the highest-value add)* — **the diverge/reconverge variant story**: a variant DNA strip + branch view ("82% follow the standard path across 14 runs; 3 variants; runs diverge at step 7 and rejoin at step 9"). Ties directly to the process-clustering research. Multi-run only.
7. **`rpt-timestudy` Step Duration Analysis** *(NEW)* — per-step mean/median/p90 with a duration mini-bar + P90/median tail-latency color flags; sorted slowest-first.
8. **`rpt-steps` Step Breakdown** — surface anomalous steps, not a flat equal-weight list.
9. **`rpt-structure` Friction & Decisions**
10. **`rpt-rework` Rework Patterns**
11. **`rpt-bottlenecks` Bottlenecks** — render the ratio sentence ("3.2× slower than average").
12. **`rpt-insights` Insights** (+ the migrated time-breakdown tiles)
13. **`rpt-automation` Automation Opportunities** — add **ROI with explicit confidence banding** ("~2.1 hrs/mo, low confidence (4 runs)" vs "~14.3 hrs/mo, high (47 runs)") + per-opportunity evidence drawer.
14. **`rpt-agents` Composed Agents** *(NEW)* · 15. **`rpt-skills` Skill Library** *(NEW)* · 16. **`rpt-integrations` Integration Readiness & Risks** *(NEW)* · 17. **`rpt-roadmap` Implementation Roadmap** *(NEW, terminal recommendation)*.
18. **`rpt-evidence` Raw Evidence** — collapsed `<details>`.

TOC/scroll-spy: extend `SECTION_IDS`; **group the right-rail into Analysis / Recommendations / Evidence** and add triage badges (e.g., bottleneck count, high-severity friction dot).

## 3. The differentiators to add (cross-agent consensus)
- **Variant diverge/reconverge story** — the single most analytically valuable output; currently siloed in the Intelligence tab most users never open.
- **Evidence drill-down per finding** — expand any scored finding → the specific run IDs + step sequences that produced it → click to that run. **The moat made visible; no competitor does this at run-grain.**
- **Automation ROI + confidence banding** — converts a score into a budget conversation.
- **Cycle-time distribution, per-step timestudy, health-score breakdown, integration readiness** — all already computed, none surfaced today.
- **Period-over-period drift** (multi-run, later) — "18% faster than your last 3 runs" via the existing `DriftReport`.

## 4. Honest stats hygiene (non-negotiable)
- Show **run count inline** on every aggregate ("Based on 3 runs"); a 1-run step shows "(1 run — trend unavailable)", no false p90.
- **Single-run state:** suppress variance/stability/variant sections; lead with "Recorded 1 time — run again to unlock trend data."
- Label variation-score provenance (authoritative vs proxy); clarify confidence = segmentation confidence, not representativeness.

## 5. Audience + plan-gating (one view, tiered reveal)
- **Free/Starter:** single-run Report (summary, lead insight, steps, friction, SOP alignment).
- **Team:** multi-run unlocks — variant story, distribution, timestudy, evidence drill-down.
- **Growth/Enterprise:** AI-Agents section — agents, skills, integration roadmap, automation ROI. Gating follows data availability (a single run can't produce a variant story), so it feels natural.

## 6. Current-state read (brief)
- **Dashboard:** strong triage list; gap = no path from a health score to its evidence, and no comparative ranking. (WDC-P01 IA inversion is the right fix.)
- **Workflow:** strong map+SOP pairing; the variants map is buried in a mode switcher. Post-consolidation it can become mostly a routing surface (runs + link to Report).
- **SOP:** correct separation; missing SOP↔Report linkage ("executed N times → view Report") and a real PDF/HTML export (JSON-only today).
- **Report:** right shape, wrong hierarchy — leads with scores before evidence, lists steps with equal weight, lacks the variant story and ROI. Fix the hierarchy: identity → variant evidence → diagnosis → action.

## 7. Sequencing (lowest-risk first; each step additive-then-retire, reversible, typecheck+test green)
1. **Delete dead code** (`InsightsPanel`, `InterpretationTab`) — zero behavioral risk.
2. **Add `rpt-metrics` + `rpt-lead` + Hero prose summary** — smallest, single-run-safe, validates the section-add mechanic.
3. **Add `rpt-timestudy` + `rpt-variance` (variant story)** → then **retire `IntelligenceTab`** + its fold render + `hideBottlenecks`.
4. **Add `rpt-agents`/`rpt-skills`/`rpt-integrations`/`rpt-roadmap`** → then **retire `AgentIntelligenceTab`** + `hideOpportunities`.
5. **Add evidence drill-down + automation ROI/confidence** across the scored sections.
6. *(Optional)* split `WorkflowReportPage` (~1170 → ~1720 LOC) into a `WorkflowIntelligenceSections.tsx` seam.

**Effort:** ~12–15 hrs across 5–6 reversible slices. **Net-new ~600 LOC; mostly recomposition.** D-4 clause 1 (≥3 user-visible section strings) → `growth-strategist` adjacency on the implementing iterations.

## 8. Instrumentation (to learn what users value)
`report_section_viewed {section, runCount, hasData}`, `report_section_time_spent`, `report_insight_expanded`, `report_automation_opportunity_clicked`, `report_step_expanded {isBottleneck, hasEvidence}`, `report_intelligence_run_triggered`. Key question for the 30-day soak: which sections pair high scroll-depth with high time-on-section.

---
*Design artifact only. Per the operating guardrails, this does not ship until the production flash is solved with live evidence and the deploy gates (browser smoke + DB backup + staging) pass.*
