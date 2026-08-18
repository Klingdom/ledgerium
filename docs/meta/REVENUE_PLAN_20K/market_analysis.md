# Revenue Plan: $20K MRR — Market Research Track (Pricing & Willingness-to-Pay)

**Author:** market-research agent
**Date:** 2026-08-18
**Scope:** Is Ledgerium's pricing right for a $20,000/month recurring revenue target, and is there demonstrable willingness to pay at these levels?
**Method:** Direct read of the pricing/billing/plan code (`apps/web-app/src/lib/plans.ts`, `config.ts`, `stripe.ts`, `checkout/route.ts`), the product's own comparison/alternatives marketing copy (`compare.ts`, `alternatives.ts`, `industry.ts`), and four prior internal research/audit artifacts spanning 2026-04-20 through 2026-08-13 (`PRICING_AUDIT_001.md`, `docs/meta/PRICING_PAGE_REVIEW_001.md`, `docs/meta/MONETIZATION_FUNNEL_STRATEGY_001.md`, `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/market_analysis.md`). External competitor pricing is drawn from training-data recall, not a live web fetch — see the explicit confidence disclosure in §1 before using any number externally.

---

## Zero-th finding (read this first — it changes the whole plan)

**Team and Growth cannot be purchased today.** I read `apps/web-app/src/app/api/billing/checkout/route.ts` directly. For any plan other than Starter, the checkout route returns **HTTP 402** with the message *"Multi-user invites are launching Q3 2026. Please join the waitlist at hello@ledgerium.ai"* and a `waitlistMailto` field — it does not create a Stripe Checkout session. This matches three independent prior artifacts: `docs/meta/TEAM_WORKSPACE_QUALITY_REVIEW_001.md` (2026-05-19, verdict "NOT SHIP-READY," workspace flow "functionally broken in production today"), `docs/meta/TEAM_WORKSPACE_SYSTEMS_TEST_REVIEW_001.md` (2026-05-22, new P0 blockers found), and `docs/meta/MONETIZATION_FUNNEL_STRATEGY_001.md` (2026-06-20, verbatim: *"only **Starter** is self-serve today — Team/Growth are gated behind the unbuilt workspace UI (HTTP 402)"*). I found no later artifact showing this shipped. I did not find one confirming it's still broken as of today either — this is a **direct code read**, not a stale doc, so I'm confident it is accurate as of this pass, but the exact ship date for the fix is not visible to a research agent and should be confirmed with engineering before this plan is finalized.

**Why this matters more than anything else in this document:** the CEO's own $20k math (40 Starter / 60 Team / 5 Growth = 105 customers) puts **57% of the target customer count on a tier that cannot currently be bought.** No pricing-page copy change, no competitor-benchmarking exercise, and no ICP re-prioritization closes $20k MRR while the majority-weighted tier in the target mix is walled off behind a mailto waitlist. This is not a market-research finding — it's a production-readiness fact that upstream-blocks the market-research question. I'm flagging it because "is the pricing right" is unanswerable in isolation from "can the pricing tiers that answer requires be sold." Everything below assumes this gets resolved; where it changes the near-term plan, I say so explicitly.

---

## 1. Competitor pricing benchmarks

**Confidence disclosure — read before using any number in this table externally.** I do not have live web access in this environment. Every figure below is either (a) already vetted inside this codebase by a prior specialist-agent pass with a stated date, or (b) my own training-data recall, which is not tool-verified and may be stale by the time you read this. I've marked each row's confidence level. The product's own comparison pages (`compare.ts`, `alternatives.ts`) follow the same discipline — every FAQ that touches a competitor's price says *"verify current pricing on the vendor's own page, as plans change"* — and you should do the same before this table informs an external claim, a sales conversation, or a pricing decision.

| Tool | Free tier | Entry paid tier | Team/mid tier | Notes | Confidence | Source |
|---|---|---|---|---|---|---|
| **Scribe** | Yes — historically ~25 docs/month or capped basic capture | **~$23–29/user/month** (the $6 spread is very likely monthly-vs-annual billing, not disagreement) | ~$12–15/user/month at volume (5+ seats), cheaper per-seat than entry tier | Added "Scribe Optimize" AI agents (AI-inferred process maps + automation scoring) per this product's own `alternatives.ts` copy — meaningfully closes the gap Ledgerium claims on "process mapping," though Optimize output is AI-*inferred*, not deterministic, which is still a real differentiation point | **Medium** — two internal artifacts (`PRICING_AUDIT_001.md` 2026-04-20 cites $23/user; `docs/COMPETITIVE_ANALYSIS.md` 2026-04-13 cites ~$29/seat) triangulate to the same range but neither is a live-verified figure | Internal + training recall |
| **Tango** | Yes — "free forever" on basic guides per this product's own copy | ~$16–24/user/month (internal artifacts disagree: $16 in `MARKET_RESEARCH.md`, higher in my own recall) | Pricing reportedly folded into Datadog's ecosystem post-acquisition | Two internal docs (April 2026) assert Tango was **acquired by Datadog in 2024**. I cannot independently confirm this from training data with confidence — flagging as an *unverified internal claim*, not a fact, despite two docs agreeing (they may share a common unverified source) | **Low-Medium** on price; **Low** on the Datadog-acquisition claim specifically | Internal, unverified |
| **Guidde** | Yes, limited | Seat-based, roughly $15–30/user/month range | Similar zone, volume discount likely | Video/narrated-how-to output, not a direct structural competitor to Ledgerium's structured-data claim | **Low** — thin public footprint per this product's own SEO research (`SEO_AEO_EFFECTIVENESS_REVIEW/market_analysis.md`: "Guidde in particular has a thin public footprint") | Training recall only |
| **Whatfix / WalkMe** | No meaningful self-serve free tier | No public self-serve pricing — enterprise sales only | N/A | Enterprise contracts estimated **$50K–$500K/year** per `docs/COMPETITIVE_ANALYSIS.md` (2026-04-13) — heavier deployment, IT-led buying motion, not a pricing-tier comparable to Ledgerium's PLG tiers | **Low-Medium** | Internal (unverified underlying source) |
| **Trainual** | No | Banded by active-user count, **not simple per-seat** | Internal research (`PRICING_PAGE_REVIEW_001.md`, competitive-researcher, 2026-05-17) explicitly anchors a mid-tier band around **~$249/month** as a reference ceiling ("stay below Trainual $249") | Onboarding/training-delivery platform, not a documentation-capture tool — partial overlap only | **Medium** on the $249 anchor (independently corroborated by an internal specialist pass with a stated date); **Low** on exact band boundaries above/below it | Internal (dated) + training recall |
| **Whale** (usewhale.io) | Limited | Flat banded pricing by team size | Same internal artifact anchors a **~$99/month flat-rate "Team" floor** ("beat Whale $99 flat-rate Team floor") | SOP/knowledge-base tool, flat non-per-seat packaging — structurally the closest pricing-model analog to Ledgerium's own flat-tier approach | **Medium** on the $99 anchor (same corroboration basis as Trainual above) | Internal (dated) + training recall |
| **Process Street** | Limited | Historically ~$100/month flat for a small team band, or ~$25/member/month on a per-seat plan (I recall both models existing across Process Street's pricing history — genuinely uncertain which is current) | — | Checklist/workflow-execution tool, not a capture tool — Ledgerium's own `compare.ts` correctly frames it as adjacent, not substitutable | **Low** | Training recall only |
| **SweetProcess** | No | Banded flat-rate by active team-member count, roughly $99–$399/month zone (recalled, not verified) | — | Not referenced with a specific number by any internal artifact I found | **Low** | Training recall only |
| **Document360** | Yes, limited | Historically ~$199/month (Startup tier, annual billing), scaling to ~$399–$599/month at higher tiers | Per-project / per-author pricing model, not per-seat in the usual sense | Knowledge-base authoring platform — closest overlap is "hosting the SOP after it's produced," not producing it | **Low** | Training recall only |

**What this table is confident enough to support, and what it isn't:**

- **Confident:** Scribe and Tango are genuinely priced in the $16–29/user/month zone for their entry tiers, well below Ledgerium's $49 Starter. This is corroborated across two independently-dated internal passes (April 2026) plus my own recall, and it's the comparison every prospect who has looked at Scribe or Tango will make.
- **Confident:** Whale ($99 flat floor) and Trainual ($249 anchor) are the two most-recently-verified (2026-05-17, by a specialist competitive-researcher pass, not by me) reference points for **flat, non-per-seat team pricing** — which is the same packaging model Ledgerium uses. Ledgerium's $249 Team tier lands almost exactly at the Trainual anchor and well above the Whale floor.
- **Not confident enough to act on directly:** SweetProcess, Document360, Process Street exact current numbers, and the Tango/Datadog acquisition claim. If any of these needs to go into an external pricing deck or sales battlecard, verify it live first — do not cite this table as a primary source.

---

## 2. Is Ledgerium priced correctly?

### Starter ($49/mo, 1 user, 15 workflows/mo)

**Verdict: mispriced relative to what it delivers, well-documented internally, not yet fixed.**

Starter sits at ~1.7–3× Scribe's and Tango's entry price ($49 vs $16–29), but per `apps/web-app/src/lib/plans.ts`, Starter gets `cleanExports`, `healthScores`, and `personalWorkspace` — **and nothing from the intelligence layer** (`intelligenceLayer`, `bottleneckAnalysis`, `automationScoring`, `variantDetection` are all `team`-gated). That intelligence layer is Ledgerium's entire structural differentiation claim against Scribe and Tango (every comparison page in `compare.ts` and `alternatives.ts` leads with "structured interaction data, timing, diffing, automation scoring" as the reason to choose Ledgerium over a screenshot tool). A Starter buyer pays a 70–200% premium over Scribe/Tango for a product that, from inside the paywall, looks like a worse Scribe — clean exports and a health-score number, no bottleneck detection, no variant detection, no automation scoring. This is not my own inference; it is the **single highest-confidence, most-repeated finding across three independent audits over four months**:
- `PRICING_AUDIT_001.md` (2026-04-20), F-COH-02: *"Starter = 'clean exports' positions $49 as a ransom, not a tier."*
- `PRICING_PAGE_REVIEW_001.md` (2026-05-17): value-invisibility named as the top blocker to the 1,000-sub goal.
- `MONETIZATION_FUNNEL_STRATEGY_001.md` (2026-06-20), Q2.1: *"a $49 Starter user gets exports + health-score number but no process intelligence... so they 'see Ledgerium as an expensive Scribe.'"* — with an explicit unanimous recommendation from growth, market-research, and product-manager agents to move `variantDetection` (and ideally more of the intelligence layer) down to Starter.

Three specialist passes, four months apart, converging on the same defect with no contradicting evidence anywhere in the repo. This is about as close to a settled finding as market research produces. **It has not shipped as of this pass** (I found no changelog or backlog entry closing it).

### Team ($249/mo, up to 5 users / 3 recorders)

**Verdict: correctly positioned on price, currently unsellable, and the $49→$249 jump has a well-documented gap.**

$249 lands almost exactly at the internally-anchored Trainual reference point ($249) and well above the Whale flat-rate floor ($99) — for a **flat**, not per-seat, price. On pure price-anchoring grounds this is fine; Team is not underpriced or absurdly overpriced relative to comparable flat-rate SOP/knowledge tools, and it correctly reflects that Team is where the full intelligence layer, shared workspace, and unlimited workflows unlock (per `plans.ts`).

Two problems, both already documented, neither about the $249 number itself:

1. **It cannot be bought self-serve today** (Zero-th finding, above).
2. **The 5.1× jump from Starter ($49) to Team ($249) strands the solo power-user** who wants the intelligence layer but has no team to invite. This is the second most-repeated finding in the corpus, independently raised by:
   - `PRICING_AUDIT_001.md` F-COH-04: *"Missing 'Pro' tier... these users either downgrade to starter (churn within 30 days) or skip Ledgerium entirely."*
   - `PRICING_PAGE_REVIEW_001.md` competitive-researcher + product-manager: anchor prices proposed at Pro $39/Team $129/Growth $399 to close the gap (this specific price-cut proposal was **explicitly rejected by the CEO** — see §2's "prior CEO decision" note below).
   - `MONETIZATION_FUNNEL_STRATEGY_001.md` Q2.5: *"add a Solo/Pro tier ~$79–$99/mo... the highest-confidence structural conversion fix"* — recommended to ship **after launch, once Starter conversion data exists**, not before.

**Prior CEO decision, and why it matters for this plan.** On 2026-05-17 the CEO was presented with a specific pricing-reduction proposal (Pro $39/Team $129/Growth $399) and explicitly rejected it — *"keep current pricing models"* (`PRICING_PAGE_REVIEW_001.md` Appendix C). On 2026-06-20, `MONETIZATION_FUNNEL_STRATEGY_001.md` again logs *"Hold the price points ($49/$249/$799) for now (CEO directive; B2B price elasticity is low — a 20% cut yields ~5–8% volume, net-negative)"* as a standing instruction, not an open question. **I am not recommending a price cut in this document**, both because two prior rounds of specialist analysis reached the same conclusion the CEO already reached, and because the elasticity logic is sound: a 20% cut buying 5–8% more volume is a bad trade for MRR specifically (MRR = price × volume; a cut that shrinks price faster than it grows volume shrinks MRR, which is the opposite of this track's goal). The unresolved item is not "should Team be $129 instead of $249" — it's "should a *new, additive* tier exist between Starter and Team," which is a packaging question, not a price-cut question, and the CEO has not ruled on it.

### The flat-tier vs. per-seat question (explicitly asked)

Ledgerium's tiers are flat-per-tier-with-an-included-seat-count, not per-seat. This is a real, non-trivial packaging choice with a real trade-off at the $20k target:

- **Helps:** A flat $249 "Team" price is simple to sell, easy to put on a card, and doesn't require the buyer to think about seat math before saying yes. It also means expansion within a team (adding a 2nd, 3rd, 4th, 5th user) is free — a genuine wedge for adoption once a team is in.
- **Hurts:** The moment a prospect directly compares Ledgerium Team to a competitor's *per-seat* plan, the math can look bad for anyone who isn't near-maxing the included seats. A 2-person team pays $124.50 per effective seat on Ledgerium Team vs. roughly $24–30 per seat on Scribe Team (2 seats × ~$12–15) — a 4–5× gap that a prospect doing napkin math will notice, even though the products aren't delivering the same thing. Flat pricing is a strength *only* once a team is large enough to approach the included-seat ceiling; below that, it's a disadvantage versus every seat-priced competitor in this category.

**Net read for the $20k target specifically:** flat-tier packaging is not the thing wrong with this pricing — the missing self-serve path and the intelligence-gate/gap-tier issues above are much larger, better-evidenced problems. But if Team self-serve ships and the sales motion is smaller teams (2–3 people) rather than full 5-seat teams, expect the per-seat comparison objection to surface in real conversations, and have an answer ready (the answer is the intelligence layer, not the seat count — that's the whole differentiation thesis, and it needs to be *felt*, not just claimed, per §3 below).

---

## 3. Willingness to pay for this specific value

**Is "documentation from observed reality + AI-opportunity identification" a budgeted line item, or a nice-to-have?**

This splits cleanly by buyer, and the split is the single most useful thing in this section for prioritizing the $20k push:

**Nice-to-have today, for the buyer Ledgerium is currently priced and positioned to reach.** The primary ICP defined in `docs/ICP_DEFINITION.md` — Operations Manager / Process Lead / Team Lead, teams of 5–50, companies of 50–5,000 — buys documentation tools out of discretionary team/departmental budget with a 1–3 month buying cycle (`docs/MARKET_RESEARCH.md §3.1, §3.3`). At $49–249/month this sits below most companies' formal procurement threshold and is typically an individual-manager or team-lead purchase decision, not a budgeted line item with a named owner. It converts on "does the output look usable in the first session" and "is it worth it vs. the time saved" — a felt-value decision, not a compliance mandate. This is exactly why `PRICING_AUDIT_001.md`, `PRICING_PAGE_REVIEW_001.md`, and `MONETIZATION_FUNNEL_STRATEGY_001.md` all independently converge on the same fix: **the intelligence layer has to be visible and felt before the paywall**, because right now the product asks this buyer to pay for a differentiator they cannot see (the free tier and even Starter show no bottleneck/variant/automation output — `plans.ts`).

**Budgeted, non-discretionary, and specifically what "AI-opportunity identification" and "evidence-linked" language is built to sell — for a narrower, higher-WTP buyer.** `docs/MARKET_RESEARCH.md §4.1` and §7.3 name this explicitly: compliance, risk, and audit functions in regulated industries treat process-adherence evidence as a **non-discretionary, regulation-driven** line item, not a nice-to-have. The concrete triggers are dated and real, not speculative: **DORA** (EU Digital Operational Resilience Act, effective January 2025, requires financial firms to document ICT processes and demonstrate resilience), **SEC cybersecurity disclosure rules** (effective December 2023), and ongoing **SOX** control-documentation and **HIPAA** process-adherence requirements. `docs/MARKET_RESEARCH.md §7.3` puts a number on the alternative cost: "process documentation for a single audit engagement can cost $50K–$200K in consultant fees" — against which a $249–$799/month tool is a trivially obvious yes, *if the buyer with budget authority ever sees it*.

**Who holds the budget, and what triggers a purchase — by segment:**

| Buyer | Budget type | Trigger | Cycle |
|---|---|---|---|
| Ops team lead / manager (primary ICP) | Discretionary team budget, self-approved or 1-level approval | "The output was good enough to share with my team" (activation signal, per `ICP_DEFINITION.md`) | 1–3 months, self-serve-compatible |
| Compliance / risk / audit lead (financial services, healthcare admin, insurance) | Regulatory/compliance budget, non-discretionary | An active audit, a DORA/SOX/HIPAA deadline, or a specific "prove the process was followed, not just that it was documented" ask | Can be fast (weeks) once triggered by a live audit; slower (months) if proactive rather than reactive |
| IT / security review (any regulated buyer, once deal size grows) | Gatekeeper, not a spender | Vendor security review before any Team/Growth-scale deal closes | Adds 1–2+ months once triggered; not usually the entry point |

**Net assessment:** willingness to pay at $49–$249/month is real but *unproven and unfelt* for the primary self-serve ICP as currently packaged (the intelligence-gate problem in §2 is the direct cause), and **structurally strong but almost entirely un-targeted** for the compliance/financial-services buyer, whose budget is not discretionary and whose trigger event (DORA/SOX/audit) is dated and real, not a hypothetical. `MONETIZATION_FUNNEL_STRATEGY_001.md` reaches the same conclusion independently: *"Compliance/Audit is the highest-WTP, most-underexploited buyer ($299–$799+/seat budgets from compliance/risk, not software)."* Three specialist passes agree this is the biggest un-captured willingness-to-pay pool available to Ledgerium today. The next section explains why the marketing surface isn't reaching it.

---

## 4. Which ICP segment gets to $20k fastest — and was the vertical prioritization wrong?

**Short answer: yes, the prioritization was wrong, it's now independently documented by a market-research pass five days before this one, and fixing it is cheap relative to the value at stake.**

`docs/MARKET_RESEARCH.md §4` scores financial services #1 (pain 5/5, willingness-to-pay 5/5, net fit 4.0 — the highest of any vertical), explicitly ranks government #4 with the verbatim instruction *"not a viable early-stage market... defer until SOC 2 is in place,"* and ranks manufacturing #5 with *"the browser-based constraint limits Ledgerium's relevance... narrower than other verticals."* I checked what actually shipped in `apps/web-app/src/content/pages/industry.ts` against that ranking, and independently arrived at the same finding a peer market-research pass documented five days ago in `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/market_analysis.md` (2026-08-13):

- **`government` and `manufacturing` both shipped as full industry pages**, despite explicit, on-the-record recommendations to defer or narrow-scope them.
- **`education` shipped with zero basis in any research artifact** — it appears in no vertical ranking, no ICP document, no SEO roadmap. It was added to round out a page count, not because research supported it.
- **The #1-ranked vertical, financial services, has no dedicated page.** `banking` and `insurance` pages exist and are reasonably well-written, but neither owns the specific framing `MARKET_RESEARCH.md §5.4/§7.3` identifies as the single most concrete, dated, regulation-backed demand signal in the entire research corpus: DORA / SEC-cybersecurity-disclosure / audit-evidence. Nothing in the current page set targets "process documentation evidence for DORA compliance," "SOC 2 process evidence," or the audit-evidence query family by name — despite it being the highest-willingness-to-pay signal on record, per both `MARKET_RESEARCH.md` and the independent `MONETIZATION_FUNNEL_STRATEGY_001.md` finding in §3 above.

This isn't a matter of interpretation — it's a checkable fact against the company's own prior research, and it was checked by a different agent five days before this pass and found the same gap. **The prioritization was wrong**, and it's wrong specifically in the direction that matters most for a revenue target: the vertical with the highest documented willingness to pay is the one without dedicated content, while two verticals explicitly flagged as low-priority or premature consumed engineering/content effort instead.

**Where willingness to pay actually concentrates, ranked for the $20k goal specifically (not the same as "biggest long-run market"):**

1. **Financial services / compliance-adjacent ops (banking, insurance)** — highest WTP, budget is non-discretionary once triggered, but longest cycle once a deal requires security review, and currently under-targeted on the content surface. Best-fit for **Team/Growth deals closed via a founder-led motion** (see MONETIZATION_FUNNEL_STRATEGY_001's own recommendation to add a "Book a demo" Calendly CTA on Team/Growth cards) rather than pure self-serve — a small number of high-ACV wins ($249–$799/mo each) contribute disproportionately to $20k. The regulatory trigger (DORA, SEC, SOX) also means outbound to compliance/risk titles at mid-sized regulated firms is a warmer motion than generic cold outbound, because the pain has a deadline attached.
2. **Healthcare administration** — ranked #2 in `MARKET_RESEARCH.md`, similar WTP logic (Joint Commission/CMS accreditation, HIPAA), acquisition difficulty rated one point harder (4/5 vs 3/5) due to slower, more conservative procurement and HIPAA data-handling questions that need to be pre-answered, not discovered mid-sales-cycle.
3. **Technology/SaaS operations** — the easiest to acquire (per `MARKET_RESEARCH.md §4.4`, and consistent with this being the actual beta-launch vertical chosen), but lower per-account willingness to pay and the segment most exposed to the Starter intelligence-gate problem in §2, because these buyers are the most price-sensitive and most likely to directly compare Ledgerium to Scribe on cost.
4. **Government, manufacturing** — deprioritize further, not further invest. This is not new information — it's the original research's own conclusion, now doubly confirmed.

**Recommendation for the market-research lens specifically (not a build directive — PM/growth own execution):** the fastest realistic path to $20k is not "pick one segment" — it's a **blend**: Starter-tier self-serve volume from the easy-to-acquire tech/SaaS-ops audience (needed regardless, because it's the top of the funnel and the cheapest motion available), stacked with a small number of founder-led Team/Growth deals in financial services and healthcare admin, where the willingness to pay is highest and least discretionary. Pure reliance on Starter self-serve volume alone requires roughly 408 paying subscribers (see §5) from a 7-week-old domain with no independently-verified paying-customer base found in this pass — a slow, high-volume grind. Pure reliance on financial-services enterprise sales runs into the 6–18-month enterprise cycle risk `MARKET_RESEARCH.md §6.3` already flags for a team without SOC 2 or dedicated enterprise sales capacity. The blend reaches $20k faster than either pure strategy, and it's the one combination that doesn't require waiting on a single unresolved dependency (Team self-serve shipping, or SOC 2 landing) to start.

---

## 5. Realistic funnel benchmarks — the actual denominator for $20k

**This is the most decision-useful number in this document, and the good news is it's a much smaller ask than what the company has already sized for a different goal.**

On 2026-05-17, a 9-agent review (`PRICING_PAGE_REVIEW_001.md`) was commissioned specifically to answer "how do we get to 1,000 paid subscriptions," and it produced real, dated, sourced funnel-benchmark work I can build on rather than re-derive from scratch:

**Cited industry benchmarks (as logged by the market-research and analytics agents in that prior pass, sourced to OpenView 2023 PLG benchmarks, ProfitWell 2022 pricing-psychology research, Unbounce 2023 conversion benchmarks, and Reforge 2023 growth research — I have not independently re-verified these primary sources in this pass, but they were produced by the same research function for this same product one quarter ago and are the most directly-relevant available benchmark set):**

- Pricing-page view → trial-signup: **2–5%** industry typical for B2B SaaS at this price point.
- Trial → paid conversion: **15–25%** industry typical.
- Combined (pricing-page-view → paid): roughly **0.3%–1.25%**.
- Price elasticity: a 10% price cut yields only a **3–5% volume increase** — well below 1:1, meaning price cuts are usually MRR-negative at this stage (this is the same logic the CEO's "hold current pricing" decision rests on, and it independently supports not cutting price for this goal either).
- The analytics agent's own end-to-end estimate (visitor → paid, across the whole funnel, not just from the pricing page) for Ledgerium specifically: **0.63%** (~1 in 158 visitors).

**Scaling this to $20k / 105 customers (not 1,000):**

The prior analysis computed that **equilibrium at 1,000 paid subscribers requires ~12,000 pricing-page views/month** (at an assumed 3% monthly churn — i.e., ~30 new paid subs/month needed just to replace churned ones at steady state, worked back through the conversion-rate chain above). Scaling that linearly to a 105-customer steady state (105/1,000 × 12,000):

> **~1,260 pricing-page views/month** needed for steady-state replenishment at 105 paying customers — roughly **40–42 pricing-page views per day.**

Cross-checked against the direct industry-benchmark range (2–5% × 15–25% = 0.3%–1.25% pricing-page-view→paid), and against the churn-replacement math (105 customers × 3% monthly churn ≈ 3.2 new paid customers/month needed just to hold steady):

- At the **low end** of the benchmark range (0.3%): ~3.2 new paid/month ÷ 0.3% ≈ **1,050 pricing-page views/month**.
- At the **high end** (1.25%): ~3.2 new paid/month ÷ 1.25% ≈ **260 pricing-page views/month**.
- Both bracket the ~1,260/month figure derived by linear-scaling the prior internal analysis. The estimates agree with each other within roughly a factor of 4, which for this kind of funnel math is a reasonably tight cross-check.

**What this means, bluntly:** $20k MRR at 105 customers requires on the order of **250–1,300 pricing-page views per month** for steady-state replenishment — call it **~40 views/day at the higher, more conservative end**. That is an *extremely* low bar for a live B2B SaaS site, even a young one — this is not a traffic-acquisition problem the way the 1,000-subscriber goal legitimately was (the prior review's own honest sizing assessment called 1,000 subs "NOT achievable from pricing-page changes alone" specifically because it required ~12,000 monthly pricing-page views, which is a real content/SEO/paid-acquisition undertaking). **$20k MRR is roughly one-tenth the traffic problem.** The binding constraint for $20k is not top-of-funnel volume — it is (a) whether the 105-customer *mix the CEO specified* can actually be sold given the Zero-th finding above, and (b) whether the intelligence-gate problem in §2 converts the traffic that does arrive at anything close to the benchmark rate, since a Starter buyer who can't see the differentiator converts worse than the benchmark assumes.

**One caveat on the "ramp" vs. "steady state" distinction:** the numbers above are steady-state replenishment (holding 105 customers once you have them), not the traffic needed to *build up to* 105 from zero within a specific time window. Building up faster than the natural churn-driven replacement rate requires proportionally more traffic or a higher net conversion rate during the ramp period — the steady-state number is a floor, not a ramp-speed estimate. No internal artifact I found computes a specific ramp-timeline traffic requirement; that would need an assumed timeline (e.g., "$20k by month 9") which is a target/roadmap decision, not a market-research input.

---

## 6. Pricing/packaging changes that would materially improve the path

Ranked by leverage-to-effort for the $20k goal specifically, drawing on the converging recommendations across all three internal audits plus this pass's own findings:

1. **Ship Team/Growth self-serve (or a founder-manual bridge in the interim).** Not a pricing change, but the single highest-leverage unlock, because 57% of the CEO's target customer count is currently unsellable at any price. If the engineering fix is not imminent, the cheapest bridge is a manual, founder-run onboarding path for the first 10–20 Team/Growth accounts (create the workspace, invite users by hand) rather than waiting — this is exactly the "Book a demo" / founder-Calendly motion `MONETIZATION_FUNNEL_STRATEGY_001.md` already recommends for the compliance segment in §4, and it can absorb the handful of high-ACV deals that matter most for $20k without depending on the self-serve UI shipping first.
2. **Move the intelligence layer (at minimum `variantDetection`) down to Starter, or show a gated preview of it on Free/Starter.** Three independent audits converge on this as the top packaging fix. It directly targets the "$49 for an expensive Scribe" perception that suppresses both Starter conversion and the credibility of the $249 Team upsell (the upsell reads as more of the same thing you already have, not "now you get the differentiator").
3. **Add an additive Solo/Pro tier (~$79–$99/mo) between Starter and Team**, gated to full intelligence layer for a single user, no team features. This is not a price cut (it doesn't touch $49/$249/$799) — it's new packaging that closes the 5.1× gap without contradicting the CEO's "hold current pricing" decision. All three audits independently proposed this; the only disagreement is sequencing (ship now vs. ship after Starter-conversion data exists — `MONETIZATION_FUNNEL_STRATEGY_001.md` recommends waiting for data, which is a reasonable default given the CEO has already rejected one pricing-restructure proposal this year).
4. **Reposition the compliance/audit feature set as a landing zone below Enterprise**, either by moving `auditTrail`/`complianceExports` down to Growth or adding a **~$200/month compliance add-on**. This directly targets the highest-WTP, least-discretionary-budget segment identified in §3 and §4, and gives financial-services/healthcare-admin buyers a self-contained reason to land at Growth ($799) rather than needing a custom Enterprise conversation — each Growth deal in this segment is worth as much as 3.2 Starter deals toward the $20k target.
5. **A standalone one-time "Process Audit Report" (~$299–$599), as already scoped in `MONETIZATION_FUNNEL_STRATEGY_001.md`.** This does not count toward MRR directly (it's one-time, not recurring), but it's a low-friction foot-in-door for the compliance buyer who can expense a one-off purchase before committing to a subscription — worth noting for the revenue plan even though it's off-target for a strictly-recurring $20k goal, because it's a plausible conversion path *into* a Team/Growth subscription from exactly the highest-WTP segment this document identifies.
6. **Annual-plan dollar framing** ("Save $504/yr" on Team, "Save $1,608/yr" on Growth) instead of the current percentage framing, and consider defaulting to annual at signup. This is a pure-conversion lever, not a pricing-level change — annual mix directly improves realized MRR stability and reduces the churn assumption used throughout §5's math, so a higher annual mix makes the steady-state traffic requirement in §5 an overestimate, not an underestimate.
7. **Fix the industry-page targeting gap (§4)** — ship a dedicated financial-services/DORA-anchored page and deprioritize further investment in government/manufacturing/education. This is cheap (content, not engineering) relative to the willingness-to-pay concentration it's currently failing to capture, and it's the one recommendation in this list that's purely a market-research-lens fix rather than a product/pricing one.

**What I am explicitly not recommending:** a price cut anywhere in the $49/$249/$799 ladder. The CEO has ruled on this twice (2026-05-17, 2026-06-20), the elasticity data cited in both those prior passes supports the decision on pure MRR-math grounds (a cut that shrinks price faster than it grows volume is net-negative for a revenue target), and nothing in this pass's research changes that calculus. Every recommendation above is additive (new tier, new add-on, new content, new sales motion) or corrective (fix the gate, ship the blocked tier) rather than reductive.

---

## Summary — what actually determines whether $20k is reachable, in order

1. **Whether Team/Growth become sellable** (engineering/PM, not pricing) — this alone determines whether the CEO's stated 105-customer mix is even achievable, independent of any pricing question.
2. **Whether the intelligence-gate defect at Starter gets fixed** — three independent audits agree this is suppressing conversion at the exact tier and price point most reachable via self-serve.
3. **Whether the willingness-to-pay concentration in financial services/compliance gets a real content and sales-motion match** — it currently doesn't, the prioritization that shipped instead was checkably wrong against the company's own prior research, and this is the cheapest fix on this list.
4. **Traffic** — genuinely not the binding constraint at this scale (~40 pricing-page views/day at the conservative end), in sharp contrast to the 1,000-subscription goal this same research function sized four months ago, where traffic legitimately was the constraint.
5. **The $49/$249/$799 price points themselves** — not the problem. Two prior CEO-level reviews already tested and rejected lowering them, the elasticity math supports that decision, and this pass finds no new evidence to revisit it.

---

*Handoff notes for product-manager / growth-strategist: item 1 above is a build/ship decision outside this track's scope — flag for immediate PM triage given its blocking effect on the entire $20k plan. Items 2 and 3 are the highest-leverage market-research-informed scope inputs for the next PRD/growth cycle. Unresolved research risk: I could not verify current subscriber count, MRR, or traffic volume anywhere in the repo — this plan reasons from funnel *rates*, not from a known current baseline, and the actual gap-to-target in absolute terms should be confirmed against real Stripe/PostHog data before committing to a timeline.*
