# PRD Addendum — Dashboard v2 Executive Refinement

**Status:** **Approved 2026-04-21 (CEO directive: "Accept coordinator recommendations and proceed")**
**Author:** coordinator (synthesizing product-manager, ux-designer, competitive-researcher, market-research)
**Date:** 2026-04-21
**Parent PRD:** `docs/prd/PRD_DASHBOARD_V2.md` (Approved 2026-04-20)
**Trigger:** CEO feedback on shipped surface at `/dashboard?v2=1`: *"not executive level ease of observation and understanding."*
**Phase:** Define / Design complete. Iter 022 proceeds with original a11y/polish/E2E scope (unchanged). Iter 023 is a new directed iteration covering §4.1 executive-refinement items. MR-005 meta-review boundary shifts from iter 023 → iter 024.

---

## 1. Signal Decoded

The CEO's statement contains three distinct criticisms. Disambiguating them is the precondition for any further design work.

| # | Criticism | What it means | Agent consensus |
|---|---|---|---|
| C1 | "Not executive level" | The surface does not answer *"is the portfolio getting better or worse, and what do I do about it"* within 5 seconds. It shows state, not change; data, not action. | PM, UX, competitive, market all agree |
| C2 | "Ease of observation" | Signal is present but not atomic. Health score is a number, not a verdict. Exceptions are not pre-ranked. Trend is absent. | PM + UX + competitive agree |
| C3 | "Ease of understanding" | Language is descriptive ("Health Score 67"), not action-leading ("SLA slipping — 3 workflows drag the portfolio −8 this week"). | All four agents agree |

**The shipped surface is not wrong — it is incomplete for the executive JTBD.** It answers "what do I have?" It does not answer "what changed, what matters, what now?"

---

## 2. Convergent Signals (High confidence — act on these)

Where three or four agents independently recommend the same thing, treat it as settled.

### 2.1 Period-over-period delta on portfolio health *(4/4 agents)*
The single most-cited gap. The Command Header shows a portfolio health integer but no directional context. Executives evaluate trend first and level second. Linear, Datadog, Stripe, and every direct competitor (Celonis, Signavio) anchor a headline number to its prior-period delta.

**Recommendation:** render `Portfolio Health 72 ▼ −4 vs last 30d` in the Command Header. Use existing `/api/workflows` aggregate if available; compute client-side from snapshot-on-load comparison otherwise. No new endpoint required for the MVP implementation.

### 2.2 Action-leading insight language *(4/4 agents)*
Insights Strip currently describes state. Executives need it to *prescribe*. Shift from:
- ❌ "3 workflows have high variation"
- ✅ "3 workflows are pulling your SLA down → review onboarding cohort"

**Recommendation:** rewrite all insight chip templates to the pattern `{signal} → {next action}`. Keep the 4-chip cap from D9. This is copy work, not engineering work.

### 2.3 Ranked exception row above the list *(UX + market + competitive)*
"Which one first?" is an executive question the list does not answer by default sort. PagerDuty, Linear Triage, and every operational dashboard surface a "Top exception" or "Needs attention now" tile above the scrollable list.

**Recommendation:** add a single-row "Top attention" panel between Insights Strip and Workflow List. Surfaces the 1 workflow with the largest negative delta in the selected window. Click navigates to detail.

### 2.4 RAG / 3-state color verdict on Health Score *(competitive + UX)*
All direct competitors and all operational leaders reviewed render health as a 3-state color (green/amber/red), not only a number. The number carries magnitude; the color carries verdict. Executives scan color before number.

**Recommendation:** Health Score column gets a color pip (green ≥80, amber 60–79, red <60) with the integer kept as secondary. Thresholds are a Phase-2 configuration item; hardcode for MVP.

### 2.5 Minimal configurability, default-smart beats configurable *(UX + PM + market)*
Market-research is explicit: executives configure dashboards <10% of the time; analysts 60–80%. Building a preference system primarily serves analysts, not the persona the CEO flagged. The system cost (state, persistence, testing, plan gating) is high.

**Recommendation:** NO user-facing customization in this refinement pass. Ship a single opinionated view with a role-aware default sort (described in E3 below). Reconsider configurability only after observing real usage.

### 2.6 Benchmark context on the portfolio number *(competitive + market)*
"72" is meaningless without an anchor. Competitors anchor to prior period (covered in 2.1), target, or peer benchmark. We own prior-period data today; target/peer are Phase 2.

**Recommendation:** 2.1 satisfies this for MVP. Defer target/peer benchmarks to Phase 2 once pricing/monetization gating is decided.

---

## 3. Divergent Signals (CEO decision required)

Where agents disagree or propose mutually exclusive options, the coordinator must surface the choice rather than pick one.

### D-E1. One view with role-sensitive default sort — OR — two distinct views (Executive vs Process Owner)?

| Option | Advocate(s) | Cost | Risk |
|---|---|---|---|
| **A.** One view. Role-based default sort only (executives land on descending-delta; process owners land on lowest-health-first). | PM, UX | Low — localStorage or server preference. One component tree. | Risk that neither persona feels fully served. |
| **B.** Two views. Persona selector in header. Executive view = scoreboard (fewer columns, bigger numbers, more trend). Process Owner view = current 4-column grid with deeper filters. | Market-research, implied by some direct competitors | High — 2x UI surface, 2x test coverage, plan-gating questions. | Persona split forces users to self-identify; most systems where we've tried this see ~70% stick to default. |

**Coordinator recommendation:** **Option A.** B's cost is disproportionate to its differential value given (a) current ICP overlap — a single user is often both persona in small/mid orgs — and (b) configurability research in §2.5. Revisit only if usage analytics show persona-selector adoption would exceed 30%.

### D-E2. Column-toggle customization (show/hide Systems, Opportunity)?

| Option | Advocate(s) | Cost | Risk |
|---|---|---|---|
| **A.** Allow column-toggle for Systems + Opportunity (secondary columns only; Name + Health Score always visible). | PM | Medium — state, persistence, plan gating, tests. | Signals "configure this" when executives want "just show me." |
| **B.** No column-toggle. Ship default 4-column grid as-is. | UX, market | Zero | Risk of column-fit complaints on smaller viewports. |

**Coordinator recommendation:** **Option B.** Aligns with §2.5. If viewport truncation becomes a complaint, solve with responsive collapse (systems column hides <1024px), not with user preferences.

### D-E3. Add a scoreboard strip above the list?

| Option | Advocate(s) | Cost | Risk |
|---|---|---|---|
| **A.** Three-cell scoreboard above the list: Portfolio Health (with delta from §2.1), Workflows needing attention (count), Biggest mover (this week). | UX | Medium — new component; data exists. | Adds vertical chrome; competes with Insights Strip for attention. |
| **B.** No scoreboard. Fold portfolio delta into Command Header; keep Insights Strip as the only narrative band. | PM (implied) | Zero | CEO feedback says observation is hard — a scoreboard might be the exact fix. |

**Coordinator recommendation:** **Option A, but consolidated.** Merge the scoreboard concept INTO the Command Header as a three-stat header band. Do not add a fourth horizontal band. Reduces chrome, preserves signal.

### D-E4. Variation label badge on the row?

| Option | Advocate(s) | Cost | Risk |
|---|---|---|---|
| **A.** Render variationLabel as a small badge in the Name cell when variation is High/Very High. | PM | Low | Reintroduces a column we intentionally dropped in D10. |
| **B.** Leave variation in the Health Score breakdown tooltip only (current D10 decision). | UX (implied) | Zero | CEO's "can't understand" complaint may partially stem from variation being invisible. |

**Coordinator recommendation:** **Option A.** Only when variation is High or Very High (not for Low/Medium). This is cheap and makes the most actionable row condition visible without touching columns.

### D-E5. "Needs attention" first-class filter?

| Option | Advocate(s) | Cost | Risk |
|---|---|---|---|
| **A.** Add a pinned "Needs attention" filter chip to the filter bar (definition: health <60 OR variation High+ OR delta ≤ −10). | PM, UX | Low — derivable from existing fields. | Definition will need tuning. |
| **B.** No new filter; rely on default sort. | — | Zero | Filter is a common operational verb; absence feels like an omission. |

**Coordinator recommendation:** **Option A.** This is the executive's primary lens. Low cost, high comprehension value.

### D-E6. Run-count qualifier on Health Score?

| Option | Advocate(s) | Cost | Risk |
|---|---|---|---|
| **A.** Annotate Health Score with run-count when N < 10 (e.g., `72 ⚠ n=4`). Low-N scores are not trustworthy. | PM | Low | Visual noise on many rows. |
| **B.** Suppress Health Score entirely when N < 3; otherwise show. | — | Low | Loses information. |
| **C.** No qualifier. | — | Zero | Low-N workflows mislead executives. |

**Coordinator recommendation:** **Option A.** Truthfulness beats completeness. A score computed from 4 runs is not equivalent to a score from 400; the executive should see that.

---

## 4. Proposed Scope Allocation

### 4.1 In-scope for iter 022 (the final Path B Mode 5 iteration)
Iter 022 was originally scoped as "accessibility + polish + E2E." Given CEO feedback, the coordinator proposes **expanding iter 022 to include low-cost convergent items that close the executive-observation gap**, provided the expansion meets guardrail 7:

| Item | Source | Effort | Ship in iter 022? |
|---|---|---|---|
| §2.1 Period delta on portfolio health | Convergent | 1 | **Yes** |
| §2.2 Action-leading copy rewrite | Convergent | 1 | **Yes** (copy only) |
| §2.4 Health Score color pip | Convergent | 1 | **Yes** |
| D-E4 Variation badge on Name cell | Divergent (accepted) | 1 | **Yes** |
| D-E5 "Needs attention" filter | Divergent (accepted) | 2 | **Yes** |
| D-E6 Run-count qualifier | Divergent (accepted) | 1 | **Yes** |
| A11y + polish + E2E (original scope) | — | 3 | **Yes** |

**Guardrail 7 assessment (must be validated by CEO + architect before iter 022 start):**
- (a) Evidence-based expansion: yes — 4 specialist agent artifacts synthesized in this addendum.
- (b) One logical outcome: yes — all items resolve to "executive-grade comprehension of the v2 surface at GA." Not two shippable outcomes.
- (c) Same `Area`: yes — all web-app / dashboard-v2 components.
- (d) Requires explicit `scope-expansion: approved` log entry at iter 022 start.
- (e) Does not touch surfaces modified by iter 021? **VIOLATION RISK.** Every item above touches `dashboard-v2/` components that iter 021 just wrote. This makes the expansion a **continuation of iter 021, not an independent iteration.**

**Coordinator ruling on 4.1(e):** the guardrail-7(e) concern is real. Two legal paths forward:
1. **Split into iter 022 + iter 023:** iter 022 keeps original a11y/polish/E2E scope; iter 023 is a new directed iteration covering §2.1/2.2/2.4/D-E4/D-E5/D-E6. MR-005 meta-review moves from the iter 023 boundary to the iter 024 boundary. Requires CEO approval of a 6-iteration Path B sequence (up from 5).
2. **Accept the violation explicitly:** the guardrail-7(e) clause exists to prevent unreviewable cross-iteration coupling. Here the coupling is intentional and reviewable (the research artifact is this document). CEO may waive (e) with a logged rationale.

**Coordinator recommendation:** **Path 1.** The guardrail exists for a reason; the cost of adding one iteration is smaller than the governance debt of waiving a protocol. MR-005 at the new iter 024 boundary would benefit from having iter 023's outcome data to judge.

### 4.2 Deferred to Phase 2
| Item | Rationale |
|---|---|
| Target and peer benchmarks on portfolio number | Requires benchmarking dataset and pricing/monetization decision |
| User-configurable column visibility | §2.5 — build only after observing real usage |
| Persona selector / two-view architecture | D-E1 — build only if default single-view fails |
| SOP-engagement analytics (from D10 risk note) | Needs analytics instrumentation (backlog #51) before measurement is possible |
| Target-score configuration (RAG thresholds) | §2.4 — hardcoded thresholds for MVP; make configurable after usage data |

---

## 5. CEO Decision Points

Decisions required before any code change:

| ID | Question | Coord reco | CEO answer |
|---|---|---|---|
| E1 | One view (A) or two views (B)? — §3.D-E1 | A | **A — Accepted** |
| E2 | Column-toggle customization? — §3.D-E2 | B (no) | **B — Accepted (no column-toggle)** |
| E3 | Scoreboard placement? — §3.D-E3 | A consolidated into Command Header | **A consolidated — Accepted** |
| E4 | Variation badge on Name? — §3.D-E4 | A (High+ only) | **A — Accepted (High+ only)** |
| E5 | "Needs attention" filter? — §3.D-E5 | A | **A — Accepted** |
| E6 | Run-count qualifier? — §3.D-E6 | A | **A — Accepted (N<10 shows `n=N`)** |
| E7 | Scope allocation — iter 022 expand vs add iter 023? — §4.1 | Add iter 023, MR-005 shifts to iter 024 boundary | **Add iter 023 — Accepted; MR-005 → iter 024 boundary** |

**§8 open questions resolved by default per CEO's blanket acceptance:**
- Q1 Insight copy ownership → delegated to growth-strategist for iter 023
- Q2 Low-N threshold → N<10 confirmed
- Q3 "Needs attention" definition → `health <60 OR variation High+ OR delta ≤ −10` confirmed as v1 (tunable post-launch)
- Q4 Iter 022 today → proceed with original a11y/polish/E2E scope, unchanged
- Q5 MR-005 timing → shifted to iter 024 boundary

---

## 6. Measurement (Before / After)

**Before state (shipped iter 021 at `/dashboard?v2=1`):**
- Command Header shows portfolio integer with no trend context.
- Insights chips use descriptive language.
- Health Score has no color verdict; variation is invisible on the row; low-N scores are indistinguishable from high-N scores.
- No ranked exception; no "Needs attention" filter.
- CEO rating: below executive grade.

**After state (if E1–E7 are accepted and iter 023 ships):**
- Portfolio Health shows directional delta versus prior period.
- Insights chips prescribe next action, not describe state.
- Health Score column renders a 3-state color pip + low-N qualifier.
- Variation surfaces as a badge when it is actionable (High+).
- A pinned "Needs attention" filter is the executive's primary entry lens.

**Measurable outcomes to instrument (depends on backlog #51 v2 analytics):**
- Time-to-first-click from dashboard load. Target: median <10s.
- "Needs attention" filter engagement rate (% of sessions that engage the chip). Target: ≥40% for sessions on accounts with 5+ workflows.
- Trend-delta visual element hover/read rate. Target: ≥25% of executive sessions.
- Self-reported "I understand my portfolio health within 5 seconds" qualitative check with 3 executive users. Target: 3/3.

---

## 7. Non-Goals (explicit, reaffirmed)

- No chart galleries, no BI components.
- No chatbot on this page.
- No column preferences, no saved views, no dashboard builder in this refinement.
- No new backend endpoints required for any item above.
- No new database fields required.

---

## 8. Open Questions for CEO

Beyond E1–E7:

1. **Insight copy ownership** — §2.2 requires rewriting chip templates. Is copy yours to approve, or delegated to growth-strategist?
2. **Low-N threshold for §D-E6** — coordinator proposes N<10. Acceptable, or higher/lower?
3. **"Needs attention" definition** — coordinator proposes `health <60 OR variation High+ OR delta ≤ −10`. Acceptable as v1? Tunable post-launch.
4. **Iter 022 today** — proceed with original a11y/polish/E2E scope as-is? Or pause until E7 is resolved?
5. **MR-005 timing** — confirm shift to iter 024 boundary if iter 023 is added.

---

## 9. Traceability

| Item | Source |
|---|---|
| Parent PRD | `docs/prd/PRD_DASHBOARD_V2.md` (2026-04-20) |
| Shipped surface under review | commit `7bb06bb` (iter 021) + Mode 3 fix `6799604` |
| Agent research artifacts | in-conversation outputs from product-manager, ux-designer, competitive-researcher, market-research (2026-04-21, not persisted as standalone files; synthesis captured in this document) |
| CEO feedback trigger | CEO message 2026-04-21: *"not executive level ease of observation and understanding"* |
| Guardrail-7(e) risk flag | This document §4.1 |

---

**End of addendum.** No code changes until E1–E7 are answered.
