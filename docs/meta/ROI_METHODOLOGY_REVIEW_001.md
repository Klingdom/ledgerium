# ROI Methodology + UX Review (REVIEW_001)

**Type:** CEO-directed multi-agent review of ROI calculation methodology, before/after framework, and UX. Mode 3-adjacent (no product code). 6 agents: product-manager, system-architect, analytics, ux-designer, frontend-engineer, market-research.
**Date:** 2026-06-22
**CEO directive:** "ROI should relate to projected workflow **volume × level of effort × cost of the persona** doing the work. Very easy interface + report-out structure, clearly connected to **before/after** measures — which also need to be investigated and developed."

---

## 1. Review of the current model (`workflow-comparison.ts` + `/compare`)

**What's right (preserve unconditionally):** ROI = `timeSaved/run (observed) × monthlyRuns × $/hr`; honesty-first (no fabricated savings — explicit `slower` state); confidence gated on `min(runs)` (≥10 high / ≥2 med / 1 low); pure & deterministic; assumptions surfaced not hidden.

**Gaps vs. volume × effort × persona-cost:**
1. **Flat `$/hr`, no persona** — same time-saving yields the same $ for a $28 clerk and a $130 compliance officer. **No persona-cost model exists anywhere in the codebase.**
2. **Volume is ambiguous** — `/compare` pre-fills a *lifetime* run count into a "runs/month" field; user can't tell observed from assumed.
3. **No multi-role / per-step costing** (step durations already exist via `deriveTimeLeverage`).
4. **Effort = `avgTimeMs` proxy** (single representative duration, not a per-run distribution until Path C R+1).
5. **No formal before/after data model** — "before/after" lives in UI copy only; no "set as baseline."
6. **What-if not in the engine** — `deriveTimeLeverage` shows where time goes, not projected savings.
7. **No shareable report-out** — ROI is live UI state; nothing a champion can forward to a CFO.

---

## 2. The target model, defined

**The honesty boundary (the moat):** *time saved is OBSERVED; volume and rate are the user's ASSUMPTIONS applied to our measurement.* Every $ figure must show its derivation, each input labeled **Observed / Assumed / Projected**.

```
effortHrPerRun   = laborMsPerRun / 3,600,000        # OBSERVED (proxy today)
baselineCostPerRun = effortHrPerRunBefore × loadedRate
afterCostPerRun    = effortHrPerRunAfter  × loadedRate
savingsPerRun      = baselineCostPerRun − afterCostPerRun     # null if ≤0 (slower) — never fabricate
monthlySavings     = savingsPerRun × projectedRunsPerPeriod
annual             = monthly × 12
hoursSaved         = (effortBefore − effortAfter)/hr × volume
```
- **Effective rate** = flat rate, OR (later) effort-weighted blend across per-step roles: `Σ(effortShare_i × rate_i)`.
- Returns **null (not 0)** when any input is unknown; `confidence: 'none'` is a first-class state.
- Add a `source` discriminant — `both_observed | snapshot_baseline | projected_after` — that drives the confidence badge and disclaimers (projected can never show "high").

**Auto-source the inputs (highest-credibility move):** volume pre-filled from **observed run-rate** (shown as context, user confirms/adjusts projection); effort from observed median/avg. Then *the only unobserved input is the reduction* — cite a benchmark (McKinsey 20–35% first-year for structured back-office) and let the user adjust. No competitor can do this.

---

## 3. Persona-cost library (the missing piece)

A frozen default catalog (role → fully-loaded $/hr), **editable**, every rate surfaced as an assumption. **Methodology:** `loaded = base × 1.30 ÷ ~1,880 productive hrs` (1.30× burden, 1,880 = 2,080 − holidays/PTO/meeting overhead). US mid-market defaults:

| Role | Loaded $/hr (default) |
|---|---|
| Customer Support Rep | 32 |
| AP/AR Clerk | 35 |
| HR / People Ops | 39 |
| IT Admin / Helpdesk | 44 |
| Procurement Specialist | 45 |
| Ops Analyst | 50 |
| Finance Analyst | 52 |
| **Knowledge Worker (default fallback)** | **55** |
| Compliance / Audit Officer | 59 |
| RevOps / Automation Analyst | 62 |
| Ops Manager | 69 |

MVP = **single role per workflow** (default = Knowledge Worker $55; pre-select from SOP role when matchable). Per-step multi-role weighting deferred to Path C R+1. Catalog ships as a pure constant + override; org-level overrides persist later via the dashboard-preferences pattern. Localize via a country multiplier (UK 1.28× / DE 1.45× / AU 1.32×) — not FX. Expose the 1,880-hr denominator as editable.

---

## 4. Before/after framework (investigated + developed)

Three capture modes, one result layout. `source` field distinguishes them.

- **Mode A — Dual real recordings (PRIMARY).** Record → improve → re-record. **Both sides observed** → the only defensible, exportable "savings." Confidence on `min(runs)`.
- **Mode B — Saved baseline snapshot (follow-up).** "Mark as baseline" freezes today's metrics; future runs are the after. Needs a `WorkflowBaseline` snapshot (aligns with the Path C R+1 `process_run_snapshot` ADR). Until then, return null — don't fake it.
- **Mode C — Projected what-if (entry point).** Baseline only; user marks steps removed/automated → projected after recomputed from `deriveTimeLeverage` step durations. **Always labeled "projected — not yet observed";** confidence capped (never "high").

UX: mode tabs `[Compare recordings] [Saved baseline] [Project what-if]`; side-by-side before/after with **shared assumptions entered once**; per-side confidence badges.

---

## 5. The easy interface (inputs-first, live result)

One compact card, three always-visible cells + period:

- **EFFORT** — observed avg cycle time, **read-only**, "Observed · N runs" (gray, not editable; "Adjust effort" is a progressive what-if that flips the result to "projected").
- **VOLUME** — editable; shows observed run-rate as context ("Ledgerium observed ~74/mo · your assumption: 80"). User must own the projection.
- **PERSONA / COST** — picker from the catalog (rate auto-fills; "change" → popover of roles; Custom allowed); labeled "default — verify for your org."
- **Period** — Monthly / Weekly / Quarterly (rescales).

Result updates live (150 ms debounce). **Lead with time recaptured, then dollars** (ops buyers feel time). Show a **range** (conservative/base/optimistic) + confidence inline; downgrade the $ headline visually at low confidence. Assumptions panel always visible, each line **Observed vs Assumed**. Mobile stacks. Lives on `/compare`, in the report, and as a shareable URL.

---

## 6. Report-out structure (forward-to-CFO artifact)

Self-contained, assumptions frozen in a shareable URL/snapshot:
1. **Headline** — "This process costs ~$1,350/mo; after, ~$986 — **saving ~$364/mo · $4,368/yr**" (range + confidence; "estimated/projected" per source).
2. **What changed** — before/after table (cycle time, steps, systems, runs); green/red change column.
3. **How we calculated** — every assumption plainly: "Volume 40/mo (you set) · Ops Analyst $50/hr (default) · effort observed from N runs."
4. **Where the time goes** — per-step bar chart; eliminated/shortened steps tagged.
5. **Confidence** — "After 18 runs (high), before 12 (medium); record 5+ more to confirm."
6. **Evidence footnote** — "All timing traces to recorded events on [dates]. No benchmarks or industry averages used."

One required disclosure: *time savings = cost reduction only when freed time is redeployed; otherwise it is reclaimed capacity.* Payback (<6 mo highlighted) requires an implementation-cost input — defer, keep the field open.

---

## 7. Honesty guardrails (invariants — non-negotiable)
1. No $ figure without its derivation chain within one tap.
2. Confidence must match evidence: projected → "projected"; single run → "low"; never overridable.
3. Never default volume to a value that looks measured; the user must own it.
4. Persona rates are always labeled estimates/defaults, never "verified."
5. `slower` is an honest result, not a failure — no fallback to zero.

---

## 8. Build plan (sequenced)

| Tier | Deliverable | Effort | Notes |
|---|---|---|---|
| **0** | Pure engine + catalog: extend ROI to `laborCost = flat \| persona` + `effectiveRate` helper; new frozen `persona-cost` catalog; co-located tests | **S** | Reuse `workflow-comparison.ts` honesty primitives; returns null not 0 |
| **1** | `/compare` UI: persona picker + volume-observed-context + inputs-first + period + assumptions panel + per-side confidence + shareable frozen-assumption URL | **M** | growth-strategist D-4 copy consult likely |
| **2** | Report ROI panel: single-workflow **current cost** (volume×effort×rate, honest "cost" not "savings") + Mode C what-if | **M** | additive section in the report |
| **3** | Saved baseline snapshots (`WorkflowBaseline` Prisma + API + selector) | **L** | Mode B; aligns with process_run_snapshot |
| **4** | Org-level persona override persistence (dashboard-preferences pattern) | **S** | versioned payload |

**Recommended MVP: ship Tier 0 + Tier 1 together** (shared `RoiInput` contract; `/compare` is the primary surface), then Tier 2.

---

## 9. Open decisions for CEO
1. Default unassigned persona = **Knowledge Worker $55/hr**? *(rec: yes)*
2. Effort proxy = **summed active step time** when present, else `avgTimeMs`? *(rec: yes)*
3. MVP = **single-role** per workflow; per-step multi-role deferred to Path C R+1? *(rec: yes)*
4. Primary before/after = **Mode A (dual recording)** now; Mode B + C as follow-ups? *(rec: yes)*
5. Volume input: **blank/observed-rate-as-context** (user sets projection) vs auto-fill? *(rec: observed-rate as context)*
6. Build **Tier 0 + 1 as MVP** next? *(rec: yes)*

*Mode 3-adjacent diagnostic. No iteration counter incremented; no product code changed. Synthesized from 6 specialist analyses (full outputs retained in session).*
