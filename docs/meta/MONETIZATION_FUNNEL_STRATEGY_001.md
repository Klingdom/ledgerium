# MONETIZATION + FUNNEL STRATEGY (STRATEGY_001)

**Type:** CEO-directed Mode 3-adjacent multi-agent monetization + GTM review (NON-counting; no product code).
**Date:** 2026-06-20
**Panel (7):** growth-strategist (lead; +pricing-economist) · market-research (WTP/segment pricing) · competitive-researcher (sourced pricing/GTM) · analytics (funnel/metrics/experiments) · product-manager (+customer-success/beta) · ux-designer (conversion UX) · backend-engineer (billing-stack feasibility).
**Grounded in real state:** Free (5 rec/mo, 1 seat) · Starter **$49/mo** (15 rec) · Team **$249/mo** (∞, 5 seats/3 recorders) · Growth **$799/mo** (∞, 15 seats/10 recorders) · Enterprise; ~17% annual; 14-day trial. Stripe 4-tier stack code-complete. **Critical reality:** only **Starter** is self-serve today — Team/Growth are gated behind the unbuilt workspace UI (HTTP 402); webhook idempotency is unguarded (billing-blocker). Existing docs read: GROWTH_STRATEGY, BETA_LAUNCH_PLAN, PRICING_PAGE_REVIEW_001, EXTENSION_MONETIZATION_REVIEW_001, SHAREABLE_SOP_LAUNCH_PLAN, CURRENT_STATE_LAUNCH_READINESS.

---

## Q1 — Pricing model: subscriptions vs one-time? → **Subscription-only. (Unanimous.)**

**Monthly + annual SaaS subscription is the only correct primary model.** Ledgerium's value *compounds over time* (a library of 50 evolving, evidence-linked workflows is a strategic asset; a one-off snapshot is not), it has ongoing serving costs, and *every comparable tool* (Scribe, Tango, Loom, Trainual, Process Street) is subscription. One-time fees cap LTV and cannibalize margin as data accumulates.

- **No lifetime/AppSumo deals.** They attract the highest-churn, lowest-WTP, highest-support segment — the opposite of the mid-market ops ICP — and permanently anchor "discount tool." (competitive + market-research + growth all converged.)
- **The ONE narrow one-time fit (all 3 agents agreed):** a standalone **"Process Audit Report" deliverable, ~$299–$599 one-time** — an evidence-linked, timestamped, traceable report of how one process actually runs, for compliance officers/consultants who can expense a purchase but not a subscription. It's a *conversion mechanism* (links to "this covers one process; a subscription covers all of them") more than a revenue line. **Defer** until 50+ subscribers or 3+ inbound requests.
- **Future:** when the AI execute-vision ships, **usage credits on top of subscription** (Zapier-style) for execution, which has real marginal cost.

**Extension stays free, permanently** (EXTENSION_MONETIZATION_REVIEW_001 — settled; CWS removed paid-extension infra in 2021 anyway).

---

## Q2 — Best pricing & income methods / packaging

**Hold the price points ($49/$249/$799) for now** (CEO directive; B2B price elasticity is low — a 20% cut yields ~5–8% volume, net-negative). **Feature-gate rebalancing + framing beats price changes.** The high-leverage moves:

**1. Fix the intelligence gate (highest-leverage packaging change — growth + market + PM unanimous).** Today a $49 Starter user gets exports + health-score *number* but **no process intelligence** (variant detection, intelligence layer, automation scoring are all Team-only) — so they "see Ledgerium as an expensive Scribe." Move **`variantDetection` (and ideally the intelligence layer + automation scoring) down to Starter**; on **Free**, show the health-score *number* and automation-score *number* on the card with the *breakdown* gated (a curiosity hook, not a blank). This reshapes *why a solo user pays $49* and sharpens the Team upsell to **collaboration**, not "more recordings for one person."

**2. Reframe the value metric & kill the punishment-cap.** Price on **recorded workflows** as the legible Free fence + **seats** as the collaboration axis (Team+). **Remove the monthly recording cap at Starter and above** (cap only at Free). Reframe "5 recordings/month" → **"your 5 most important workflows, free"** (earned-unlock, not a wall); fire the upgrade prompt at the **3rd** recording (peak intent), in-context at the moment of value, not at the wall. Collapse the confusing **maxSeats vs maxRecorders** split (5 seats should mean 5 can record).

**3. Annual = dollars, not percent (zero Stripe work).** Replace "Save 17%" with **"Save $498/yr"** (Team) / **"$1,598/yr"** (Growth), 2-months-free framing, adjacent to the toggle; consider defaulting to annual at launch (PLG tools see 30–40% annual uptake when defaulted vs 10–15%). Annual ≈ 2× LTV + far lower involuntary churn.

**4. Capture the premium segment.** Compliance/Audit is the **highest-WTP, most-underexploited** buyer ($299–$799+/seat budgets from compliance/risk, not software). **Move `auditTrail` + `complianceExports` down to Growth** (or a **+$200/mo compliance add-on**) so the highest-WTP segment has a landing zone below Enterprise. Internal-consultant/COO is the second anchor (deliverables justify $249–$799 vs days of consultant time).

**5. The $49→$249 gap (5×) strands the solo power-user** (market-research + competitive). **Decision for CEO:** add a **Solo/Pro tier ~$79–$99/mo** (1 seat, unlimited, full intelligence incl. bottlenecks/variants) to bridge — the highest-confidence structural conversion fix — OR accept the gap and rely on #1/#2 to hold solo users. *(Recommended: add it after launch once Starter conversion data exists.)*

**6. Free viewers always free** (category standard — Scribe/Tango/Loom charge only *creators*). This is the viral unlock: every shared SOP is a free product impression.

**7. Add-ons:** $39/seat overage at Team; **promo codes** for launch (one Stripe flag); **API access** as a first-class feature key gated to Growth+ (automation/IT will ask).

---

## Q3 — Beta best-practices + preparing for full launch

**Recruit 10–15 DESIGN PARTNERS, not 50 beta users.** A relationship with obligations beats a list of tourists. **Obligations:** record ≥3 real workflows in 2 weeks; week-2 + week-5 calls; written feedback. **Benefits:** free Team access 6–12 mo; founder access/roadmap influence; first-mover 20% discount for 12 mo; "Founding" recognition. **3 cohorts:** process-documenters (8, the wedge), compliance-adjacent ops (4 — observe if compliance angle emerges *unprompted*), automation-builders (3 — validates the AI-vision "measure before you automate").

**Pricing during beta:** design partners free (NOT a 14-day trial — that's eval mode); open beta = **extended 30-day trial**, **never a discounted price** (don't train discount expectations); no lifetime deals.

**Feedback loops (ranked):** (1) **activation telemetry connected BEFORE inviting anyone** — non-negotiable; you can't fix an invisible funnel; (2) week-1/2 structured calls (3 questions: did the SOP match reality? what blocks team use? who would you share it with?); (3) in-product NPS at first **own**-SOP view ("Usable as-is for your team?").

**Beta success / exit criteria (sharpened):** activation ≥**40%** (signup→own real SOP viewed) · SOP-usefulness ≥**60%** "usable as-is/minor edits" · 2nd-workflow-in-10-days ≥**35%** · **share-behavior ≥25%** (*the single most important PLG-viability signal — if below, the motion is outbound-sales, not PLG*) · upgrade-intent ≥**40%** at price in exit calls · ≥1 real viral signup event · ≥3 outcome-anchored testimonials · **zero P0 activation-path bugs**.

**Launch-readiness gates (must be GREEN):**
- **Product:** activation path zero-friction (signup→sample-in-60s→install→record→SOP, tested on Chrome/Win+Mac); **shareable public SOP link live** (the viral engine — ship *before* beta, not after); don't ship Ask-This-Process if it can answer wrong (trust risk > absence).
- **Billing (backend reality):** Starter checkout tested end-to-end; **webhook idempotency guard (~30 LOC — BILLING-BLOCKING)**; **PostgreSQL in prod** (not SQLite); **Stripe Dashboard config** (6 price IDs + webhook secret — the CEO operational dep); **receipt emails verified ON** in Stripe; document the manual refund path. *(Team/Growth self-serve stays blocked until the workspace invite UI ships — that gates Team-tier monetization.)*
- **Trust:** privacy policy substantiating "browser events only — no screenshots/video/keystroke-content"; ToS (user owns their data); data-deletion path.
- **Support:** FAQ (install / what's captured / why SOP didn't generate / cancel / export); contact on every page; 3-email onboarding (welcome+install / day-2 not-installed / day-5 no-recording).
- **Measurement:** PostHog connected; activation funnel visible; admin growth dashboard (already shipped) live.

---

## Q4 — Increase the funnel during launch (ranked by leverage)

**Acquisition:** (1) **Chrome Web Store organic listing** — #1 zero-cost compounding channel; benefit-led copy, 10+ five-star reviews from design partners *before* public launch. (2) **Shareable-SOP viral attribution** — launch-day requirement; "from a real recording, not memory" + one-click signup; the highest-quality, pre-validated conversion. (3) **Targeted community seeding** (LinkedIn/Slack/Reddit) with *process-data insight* content — the moat as content ("we analyzed 200 recorded workflows; 67% of SOP steps are never followed as written"). (4) **Product Hunt** 3–4 weeks post-launch with design-partner upvotes. (5) **Process-benchmark SEO content** (uniquely possible — 6–12 mo compounding).

**Activation (fix the #1 blocker "what do I record?"):** named first-workflow suggestions (3 tiles: expense report / vendor onboarding / new-hire setup) + pre-named recording + **sample SOP visible on signup within 60s** + pre-signup demo; make the **first own-SOP view a reveal destination**, not a list row.

**Conversion:** intelligence-gate clearly labeled at the value moment; **upgrade prompt at 3rd recording** (PRICING-R01 — highest-ROI conversion lever at current traffic); **"Book a demo" Calendly on Team/Growth cards** (10 lines; ~40% lower churn with sales-assist at $249 ARPU); annual dollar-framing; shared-SOP → dedicated upgrade landing page.

**Expansion:** library-size triggers ("your team documented 10 processes — here are the top 3 automation candidates"); **$39/seat before forcing a tier-jump**; cross-workflow comparison hook at Growth.

**Referral:** the shareable SOP **is** the referral mechanism — make it frictionless, polished, attributed; insight-sharing to LinkedIn; an explicit referral program only if organic **K < 0.1 by month 3**.

**The moat as a felt buying reason (put on every upgrade/share/pricing surface):** *"This came from what actually happened — not what someone remembered."* This is what justifies pricing above Scribe and converts the compliance/IT approver.

**Measurement to add before launch (analytics):** the true activation count = `first_sop_viewed` where source = **own_recording** (not sample) — instrument this first; plus `extension_installed`/`recording_started/stopped`, the **trial lifecycle** (trial_started/day-7-milestone/converted/expired), **paywall_shown→clicked** by trigger/location, the **share-loop K** (share→view→signup), and `billingInterval` on `subscription_created`.

---

## Prioritized action plan (sequenced; mostly low-effort, high-leverage)

**Now (pre-beta, blocking):**
1. Connect PostHog + build the activation funnel; instrument **own-recording activation**, extension-install, trial lifecycle, paywall, share-K. *(without this, every other call is a guess)*
2. **Webhook idempotency guard** + PostgreSQL prod + **Stripe Dashboard config** + verify receipt emails. *(billing-blocking)*
3. **Shareable public SOP link live** with attribution ("from a real recording…") + signup CTA. *(the viral engine)*
4. Fix **"what do I record?"** — 3 named suggestions + sample-on-signup + pre-named recording.

**Beta:**
5. Recruit 10–15 design partners (3 cohorts); free Team; structured feedback; watch **share-behavior** above all.
6. Packaging rebalance: move **`variantDetection`(+intelligence/automation) to Starter**; show Free health/automation *numbers* with gated breakdown; **upgrade prompt at 3rd recording**; reframe quota copy to earned-unlock.
7. Annual **dollar-framing** + (test) annual-default.

**Launch:**
8. Chrome Web Store listing (benefit-led, 10+ reviews) → public launch → Product Hunt (+3–4 wks).
9. Pricing-page conversions: live product embed, prominent annual toggle, "Book a demo" on Team/Growth, IT/security trust section, concrete plan taglines.
10. Move **compliance features to Growth / add a compliance add-on**; decide on the **$79–$99 Solo tier**; unblock **Team self-serve** by shipping the workspace invite UI.

**Defer:** one-time "Process Audit Report" (post-50-subs); usage metering / AI-execution credits (with AI vision); referral program (only if organic K<0.1).

---

## Open decisions for CEO
1. **Add a Solo/Pro tier (~$79–$99)** to bridge the $49→$249 gap? *(recommended, post-launch)*
2. **Move compliance (audit trail/exports) to Growth** or a **+$200 add-on**? *(recommended — unlocks the highest-WTP segment)*
3. **Move intelligence/variant features down to Starter?** *(strongly recommended — top conversion lever)*
4. **Annual default** at launch (vs monthly default)? *(test)*
5. **Reverse-trial vs current 14-day forward trial?** *(UX says keep forward trial given high activation cost; analytics says A/B it post-launch once trial events exist)*
6. **Prioritize the Team self-serve / workspace UI** so Team/Growth become purchasable (currently HTTP 402)?
7. Approve the **one-time "Process Audit Report"** as a future conversion add-on (not now)?

---

## Anti-scope (don't do)
Lifetime/AppSumo deals · template packs (signals "docs tool," not intelligence) · price cuts before 60–90d conversion data · usage-metered recordings (the punishment mechanic) · charging for viewers · benchmark/estimated metrics (destroys the "measured, not estimated" moat).

---

*Mode 3-adjacent diagnostic. No iteration counter incremented. No product code changed. Consolidated from 7 specialist analyses (full outputs retained in session). Recommendations proposed; CEO reviews and prioritizes.*
