# $20,000 MRR Plan — Product Manager Analysis

**Type:** Read-only strategic analysis (NON-counting; zero product code changed).
**Date:** 2026-08-18.
**Directive (CEO):** a concrete plan for ledgerium.ai to reach $20,000/month recurring revenue via content, apps, and subscriptions.
**Grounding treated as fact per task instruction (not re-derived):** current pricing (`apps/web-app/src/lib/plans.ts`), $20k arithmetic, GSC 3-month data (`docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW_001.md`), Chrome Web Store blocker status (`docs/runbooks/CHROME_STORE_SUBMISSION.md`), Stripe operationalization status (`docs/runbooks/STRIPE_SETUP.md`), and the product/capture differentiation claim.
**Additional artifacts read for this analysis (not previously cited in the grounding):** `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/{pm,growth,competitive}_analysis.md`, `docs/meta/FUNNEL_AND_SOP_REVIEW_001.md`, `apps/web-app/src/app/(public)/pricing/page.tsx`, `packages/agent-intelligence/src/opportunity-detector.ts`, `packages/api-client/` (directory contents), `apps/web-app/src/app/api/teams/**`, `apps/web-app/src/app/api/agent-intelligence/**`.

---

## 0. Executive verdict

**$20k MRR is reachable, but not on the current motion, and not in 6 months.** The evidence says three things at once, and all three have to be true simultaneously for any timeline to be credible:

1. **The top of the funnel produces nothing to convert.** 25 clicks in 3 months, 22 to the homepage. There is no acquisition rate to project a growth curve from — there is noise.
2. **The funnel has no bottom for the tiers most worth selling.** The Chrome extension is a developer-mode sideload, and — a fact not in the original grounding, found while reading the repo for this analysis — **Team ($249) and Growth ($799) are not self-serve today.** `apps/web-app/src/app/(public)/pricing/page.tsx:28,184,194` explicitly routes both to a waitlist ("Team and Growth tiers route to a waitlist... until our multi-user invite flow ships"), pending "underlying workspace infrastructure." Only Free and Starter ($49) currently accept a self-serve payment.
3. **The product's most defensible, hardest-to-copy capability (the AI-opportunity / process-intelligence engine) is already built and already gated to Team and above** — it is not a new "app" to build. But it is currently locked behind the one purchase path that doesn't work self-serve.

Read together: the CEO's instinct to anchor on Team-tier value is directionally right, but the plan cannot rely on volume (SEO-driven Starter signups) because there is no volume, and it cannot rely on the differentiated tier (Team) converting itself because Team cannot be bought without a waitlist reply today. The near-term plan is therefore **not a marketing plan — it is an unblocking plan followed by a founder-led sales motion**, with content/SEO demoted from "growth engine" to "long-lead trust asset that is currently making things worse, not better, and should stop shipping net-new pages."

---

## 1. Timeline: is $20k MRR a 6, 12, or 24-month goal?

**Verdict: 12 months is the defensible target, with a 6-month checkpoint that determines whether 12 or 24 is the realistic outcome. 6 months as a target, on its own, is not credible given the evidence. It would require either an acquisition channel that does not currently exist (paid spend, of unknown budget) or converting a volume of inbound leads that the data shows do not exist (25 clicks/quarter, from brand search).**

### Why not 6 months

A 6-month plan requires a customer acquisition *rate* to build a ramp from. There isn't one to measure:

- Zero of the 25 GSC clicks in the trailing 3 months came from a non-brand query with an actual click recorded (`SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §1: "Zero queries in the 260-row Queries export recorded a click; all 25 clicks came from privacy-anonymized [brand] queries").
- Even where content *is* good, it converts zero visitors, because two of the three purchasable-in-theory tiers aren't purchasable, and the one that is has an 18-step activation path through a browser security warning (`FUNNEL_AND_SOP_REVIEW_001.md` C-1).
- Off-page authority — the only lever the evidence says can move position 44 — has a multi-month lead time by its own nature (outreach, editorial review cycles at third-party sites, analyst relationships). It cannot compress into a 6-month window and *also* leave time for that authority to convert into rankings, clicks, and paying customers behind it.

A 6-month "yes" answer would only be honest if the plan were: bypass content/SEO entirely and run a pure founder-led outbound motion against a short list of known-warm prospects, sized to ~68-105 deals. Nothing in the grounding indicates that pipeline exists yet either. Absent evidence of a warm list, 6 months is not a plan, it is a hope.

### Why 12 months, not 24

12 months is achievable **if and only if** the sequencing in §3 happens roughly in order, starting now, in parallel where possible:
- Weeks 1-4: revenue mechanics unblocked (Stripe live, Team/Growth self-serve status resolved, Chrome Web Store submitted).
- Weeks 1-8 (parallel, long-lead): off-page authority outreach begins immediately — it is the critical path item with the longest lead time, so it cannot wait for the other blockers to clear.
- Months 2-4: SOP-quality-gate wired into production (trust), funnel-connection fixes shipped, first sales-assisted Team conversations start the moment Team is actually purchasable.
- Months 4-12: the founder-led Team motion is the primary revenue driver (see §2); content/SEO's contribution in this window is limited to whatever off-page authority has started to compound, not to page volume.

This is consistent with the product's own moat: it is real, and it is currently invisible everywhere a buyer would find it (zero third-party citations, zero press, zero G2/Capterra presence — `competitive_analysis.md` §4). Fixing invisibility is a relationship-and-time problem, not a code problem, and 12 months is a realistic window for a first cohort of that work to land.

### Why not 24 months as the *plan*, only as a fallback reading

24 months is the credible outcome **only if** the near-term unblocking work in §3 is deprioritized again the way it already has been once (`FUNNEL_AND_SOP_REVIEW_001.md`, 2026-07-19, produced this exact 8-step sequence and none of it had been executed 3.5 weeks later per the SEO review's own finding). If Team/Growth self-serve status stays unresolved, if the Store listing keeps slipping behind more SEO pages, and if off-page outreach doesn't start now, 24 months (or never) is the honest projection — not because $20k is unreachable, but because nothing is currently pointed at reaching it.

### What I am explicitly not doing

I am not fabricating a month-by-month customer-count ramp. There is no observed conversion rate anywhere in the grounding to build one from (zero non-brand clicks, zero third-party citations, no stated CAC, no stated ad budget, no pipeline data for a founder-led motion). Any such curve would be invented. The stage gates in §5 exist specifically so that a real ramp can be built once real numbers exist — the first job of this plan is to produce the numbers that make forecasting possible, not to forecast without them.

---

## 2. Tier mix: aim at Team, not Starter volume

The CEO's own arithmetic frames three single-tier paths (408 Starter / 80 Team / 25 Growth) plus a blended "≈105 customers" mix. These are very different companies to build toward. Given the actual product and the actual distribution reality, **anchor on Team ($249), with Growth as upside and Starter as a secondary, lower-priority path.**

### Why Team, not Starter volume

1. **The differentiated product only exists at Team and above.** Per `plans.ts`: Starter ($49) includes `cleanExports`, `healthScores`, `personalWorkspace` only. `intelligenceLayer`, `bottleneckAnalysis`, `automationScoring`, `variantDetection`, `sharedLibrary`, and `teamWorkspace` all activate at Team. This is not a minor upsell gap — it is the entire process-intelligence / AI-opportunity engine (`packages/agent-intelligence`, wired into `apps/web-app/src/app/api/workflows/[id]/agent-intelligence/route.ts` and `apps/web-app/src/app/api/agent-intelligence/portfolio/route.ts`). A Starter customer buys "SOP + process map from a recording" — a capable but commodity capability that Scribe, Tango, Guidde, and a dozen screenshot tools already sell, with far more brand equity, funding, and third-party presence (`competitive_analysis.md` §3: Scribe alone is $1.3B-valued with ~80,000 paying enterprise customers). Chasing 408 Starter customers means competing head-on, at zero brand equity, on the one axis where Ledgerium has no advantage.
2. **The moat only shows up at Team.** The reviewed differentiator — deterministic, evidence-linked, no-screenshot capture with millisecond timing that supports diffable runs and automation scoring — is confirmed as genuine, unclaimed whitespace by the competitive review (`competitive_analysis.md` §3: "none lead with 'no screenshots, structured interaction data, deterministic/reproducible output'"). That claim is sharpest, per the growth review, in bottom-funnel comparison content, not the free/Starter experience. Selling Starter volume sells the part of the product that looks like everyone else's.
3. **Volume (408 accounts) requires a acquisition channel that does not exist.** Section 1 already established there is no measurable inbound rate. A Team-anchored target needs an order of magnitude fewer relationships (illustrated below), which is achievable through a founder-led motion that does not depend on solving SEO/paid acquisition first.
4. **ICP match:** the SEO content's own strongest, most differentiated pages target process-improvement and operations buyers (department/persona/finance content, per `growth_analysis.md` §3) — exactly the Team-tier buyer (`sharedLibrary`, `teamWorkspace`, multi-recorder support: `maxSeats: 5`, `maxRecorders: 3`). The content strategy and the tier-mix recommendation are already aligned in principle; they are just not aligned in the CTA and purchase path (see §3, §6).

### Illustrative mix — explicitly a model, not a forecast

Using the CEO's own per-tier arithmetic and round numbers, one blended target that reaches $20k with far fewer total relationships than the Starter-volume path:

| Tier | Count | Monthly revenue |
|---|---|---|
| Team ($249) | 60 | $14,940 |
| Growth ($799) | 8 | $6,392 |
| **Total** | **68 accounts** | **$21,332** |

**Explicit assumptions in this model:** monthly pricing only (annual-discount mix would lower blended ACV and is not modeled); zero Starter/Free contribution counted (Starter can still be sold opportunistically as a lower-commitment landing spot, it is just not the target); the existing legacy Pro tier's current subscriber count and price are **unknown to this analysis** (not disclosed in any grounding artifact read) and are excluded — this is a real gap the CEO should close (see Gate 0 in §5), because the true starting-point MRR could already be non-zero. 68 relationships over a 12-month window is ~5-6 net-new paying accounts per month — a plausible cadence for a founder-led sales motion, not a plausible cadence for an SEO program currently producing zero non-brand clicks.

**What this mix requires that does not exist today:** Team must actually be purchasable. That is Gate 0 (§5) and the first hard blocker in §3.

### Growth ($799) and Enterprise: treat as upside, not the plan

Growth adds `advancedAnalytics`, `crossWorkflowComparison`, `agentComposition`, `integrationRisk` — real capability, but likely too much to lead with against a company with zero case studies and zero third-party validation. Model it as an upsell path from an established Team base, not a primary acquisition target. Enterprise is self-managed/contact-sales and structurally unpredictable (one deal could materially change the timeline in either direction) — do not plan on it, but do not decline it either.

---

## 3. Sequencing: what must ship, in what order

Two categories, and they are not the same list. **Hard blockers** make revenue *possible*. **Growth levers** make it *scale*. Conflating them is how the SEO program ended up 164 pages deep on a problem page volume cannot fix.

### Hard blockers (sequence matters; do these first, several can run in parallel)

| # | Blocker | Engineering? | Effort (per existing runbooks) | Why it blocks revenue |
|---|---|---|---|---|
| 1 | **Operationalize Stripe** — Dashboard products/prices + 6-8 prod env vars, per `docs/runbooks/STRIPE_SETUP.md` | No — ops/config task | ~30-45 min Test Mode + ~15 min Live Mode | Checkout code is complete; nothing collects a dollar today because the Dashboard side was never done. Cheapest, fastest fix available. |
| 2 | **Resolve the Team/Growth self-serve-vs-waitlist status** | Verification first, possibly small engineering second | Unknown — needs a repo-truth check | This directly gates the tier-mix in §2. Code for team invites (`/api/teams/[id]/invite`, `/api/invites/accept`, `/app/teams/join`) exists with tests, yet the live pricing page states the underlying workspace infrastructure isn't ready and routes to a waitlist. One of these two facts is stale. Until this is resolved, nobody can say with confidence whether Team is sellable self-serve or requires manual account provisioning per deal (which is fine for a founder-led motion at ~68 accounts, but must be a *decision*, not an unexamined default). |
| 3 | **Chrome Web Store submission** | Mostly non-engineering | 7 of 8 blockers already closed (`docs/runbooks/CHROME_STORE_SUBMISSION.md`); only BLOCKER-8 (screenshots) remains, plus the store's own 3-7 business day review | Every acquisition channel — content, outbound, word of mouth — currently dead-ends in an 18-step developer-mode sideload, independently named by two separate reviews as the single largest activation-funnel risk in the system. This is upstream of every other growth lever; fixing it doesn't require new code, it requires screenshots and a submission. |
| 4 | **Wire the SOP quality gate into production ingestion** (`ingestion.ts` bypasses `processSessionFull`; all 6 validation rules are currently unreachable) | Yes — small, `backend-engineer` | Per `FUNNEL_AND_SOP_REVIEW_001.md` §8 step 2, no new capture or schema work | Not a checkout blocker, but a **trust** blocker for a Team-anchored, sales-assisted motion. The entire sales pitch to a $249-799/mo buyer is "evidence-linked, deterministic, audit-ready." The mechanism that enforces that claim in production is currently bypassed. Ship this before serious outbound starts, not necessarily before Stripe/Store. |

### Growth levers (sequence after / in parallel with blockers; these make the number scale)

| # | Lever | Engineering? | Why it's a lever, not a blocker |
|---|---|---|---|
| 5 | **Off-page authority: backlinks, PR, third-party "best-of" listicle inclusion (Waybook, Glitter AI, TheDigitalProjectManager, G2/Capterra, analyst coverage)** | No — outreach/BD work | The only evidenced lever that can move position 44 (90-95% of AI citations and the dominant share of ranking authority come from third-party domains, not first-party content — `competitive_analysis.md` §1, §5). Longest lead time of anything in this plan — **start now, in parallel with the blockers above**, not after. |
| 6 | **Funnel-connection fixes**: link `/demo` from SEO pages, add one honest pricing/trial sentence + `/pricing` link to commercial-intent page types, segment CTA by `searchIntent`, fix the `/answers` 404 and missing canonicals | Yes — small, mostly template-level (`frontend-engineer`) | Each fix is cheap and raises the conversion ceiling on whatever traffic exists — but note the base rate is currently near zero, so this is "stop leaking the few real visitors," not "grow." Do it because it's cheap, not because it's a growth strategy on its own. |
| 7 | **Founder-led / sales-assisted outbound for Team tier** | No — go-to-market, not engineering | Given zero brand equity, zero third-party presence, and no working self-serve funnel for the tier that matters, this is realistically the primary near-term revenue driver, not content. Nothing currently in the plan produces this motion; it needs to be started explicitly, in parallel with blocker #2 resolving. |

**What "engineering" vs "not engineering" means for prioritization:** three of the four hard blockers (Stripe, Store screenshots, off-page outreach) are *not* engineering work — they are the CEO's or a growth/ops hire's time, and they are also the fastest items on this entire list. The one blocker that genuinely needs product engineering time (S-1, the quality gate) is small and already scoped. **The critical path to $20k MRR is not gated on engineering capacity.** It is gated on operational and go-to-market execution that has evidently stalled once already (`FUNNEL_AND_SOP_REVIEW_001.md`'s own 8-step sequence, unexecuted 3.5 weeks after being written).

---

## 4. "Apps" — what's real, what's fantasy

The CEO's ask names "content, apps and subscriptions." Reading the actual repo, not the aspiration, "apps" resolves to four candidate interpretations. Two are real (and one of the two is already built), two are fantasy relative to this goal and this timeline.

### Real: the Chrome extension as a Store listing — but it is not a new revenue SKU

The extension is close to Store-ready (§3, blocker #3). It is worth being precise about what shipping it does and does not do: **it removes the activation blocker, it does not create a new product to sell.** Nothing in the codebase supports paid Chrome Web Store listings, in-extension purchases, or any monetization surface independent of the web-app subscription (no `chrome.payments`-style integration found anywhere). The extension is, and should remain, the free capture client that feeds the paid web-app subscription. Treat this as blocker #3, already covered — do not double-count it as a separate revenue stream.

### Real, and already built: the AI-opportunity engine — needs repackaging, not construction

`packages/agent-intelligence/src/opportunity-detector.ts` is a complete, deterministic, evidence-backed opportunity-scoring engine (7 detection categories — repetition, deterministic logic, data movement, content generation, multi-system orchestration, friction reduction, decision support — each scored from real recorded step data, each carrying cited evidence). It is already wired into the product at `apps/web-app/src/app/api/workflows/[id]/agent-intelligence/route.ts` and a portfolio-level route, and it is already gated to Team/Growth via `automationScoring`, `bottleneckAnalysis`, `variantDetection` (Team+) and `agentComposition`, `integrationRisk` (Growth+) in `plans.ts`.

**This means "build a distinct AI-opportunity product" is the wrong framing — it exists.** The actual work is (a) making sure the Team-mix in §2 can actually buy it (blocker #2), and (b) considering whether to *surface* it earlier in the funnel as a lead magnet — e.g., "record one workflow, get a free AI-opportunity report" — which is a marketing/packaging decision, not an engineering build. This is the highest-leverage "apps" interpretation, and it requires close to zero new code.

### Fantasy for this goal, this timeline: a public API/integration surface

`packages/api-client/src/` contains a single `.gitkeep` file — no code. There is no documented external API, no third-party API-key issuance flow (the existing `apps/web-app/src/lib/api-keys.ts` is scoped to the extension's own upload authentication, not a sellable integration surface), and no evidence anywhere in the reviewed artifacts of customer demand for one. Building a monetizable API/integration product is a genuinely new, multi-week-to-multi-month engineering program with no demand signal behind it. It would compete for the same scarce engineering time as blocker #4 (the quality gate) for a payoff that isn't on the $20k critical path. **Do not scope this now.**

### Fantasy, and actively counter to the product's positioning: templates/SOP packs as a separate SKU

`sop-template.ts` SEO content pages exist (marketing/informational pages targeting search queries like "vendor setup SOP template"), but there is no product code path that generates, stores, or sells generic, pre-written SOP "packs." Every SOP in the system is produced from an actual recorded session (`processSessionFull` → `renderSOP`) — that is the entire basis of the "deterministic, evidence-linked, not-inferred" claim that the competitive review confirms is Ledgerium's one piece of genuine, uncontested whitespace. A generic template-pack SKU would require either (a) authoring generic content by hand — which is exactly the "screenshot-tool-with-extra-steps" positioning the product is trying to differentiate away from, or (b) fabricating "recordings" that didn't happen — which would falsify the core product claim. **Do not build this. It actively damages the moat rather than extending it.**

---

## 5. Stage gates — falsifiable milestones from here to $20k

Each gate is a checkable state, not a vibe. Where an existing metric or artifact already covers it, that is cited so nothing new needs to be invented to measure it.

**Gate 0 — Baseline established (before anything else can be measured against $20k).**
- Current MRR and active paying-customer count published, including legacy Pro subscribers (currently unknown to this analysis — not disclosed anywhere in the reviewed grounding).
- Team/Growth self-serve-vs-waitlist status resolved and documented as a conscious decision (§3 blocker #2), not left as an unexamined discrepancy between the pricing page and the invite-flow code.

**Gate 1 — Revenue mechanics live.**
- Stripe Dashboard configured, all price IDs set, one real end-to-end paid checkout completes in Live Mode (`STRIPE_SETUP.md` Step 6).
- If Team/Growth remain waitlist-gated by decision (not by accident), a manual provisioning path is documented and used at least once.

**Gate 2 — Funnel has a bottom.**
- Chrome Web Store listing is live; `EXTENSION_CONFIG.chromeStoreUrl` no longer contains `'placeholder'`; `/install` renders the one-click path.
- `IS_CHROME_STORE_PUBLISHED` is actually consumed to gate sideload copy site-wide (currently exported but never consumed, per `FUNNEL_AND_SOP_REVIEW_001.md` C-1 / `install.ts:51`).

**Gate 3 — The product's core claim is enforced, not just marketed.**
- `validateRenderedSOP` (via `processSessionFull`) running on 100% of production ingestion; rejection rate reported (reusing the metric already proposed in `FUNNEL_AND_SOP_REVIEW_001.md` §8 step 2).
- `signup_completed` delivers `visitorId` on ≥95% of persisted rows (reusing the metric already proposed at §8 step 5) — needed so any future acquisition spend can be attributed at all.

**Gate 4 — Off-page authority exists** (reusing the SEO review's own re-entry criteria verbatim, since they are already correctly scoped):
- Average position for target query clusters improves below 20.
- Referring domains > 0 from relevant third-party sources (a KPI that does not currently exist anywhere in the measurement plan and must be added).
- At least one non-brand query records a click in GSC.

**Gate 5 — First conversions in the target tier.**
- First paid Team/Growth account closed through whichever path Gate 0 resolved (self-serve or manual).
- Cumulative account count tracked against the illustrative model in §2 (68 accounts at the modeled mix, or a re-derived count if the mix changes).

**Gate 6 — Repeatable motion.**
- Net-new paying accounts sustained at a rate consistent with the 12-month model (§1) for 3 consecutive months. This is the gate that actually validates whether 12 months (vs. 24) is the real trajectory — it should not be assumed before it is observed.

**Gate 7 — $20,000 MRR.** Final target, decomposed by whatever tier mix is actually shipped, not the illustrative model alone.

---

## 6. What to stop

1. **Stop publishing net-new SEO pages.** This is not a new recommendation — it is the SEO review's own STOP-AND-REDIRECT verdict (`SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §8), and the evidence for it is unambiguous: impressions grew ~27× while clicks went to zero; the 164-page programmatic program produced 3 clicks total; average position is 44 (page 5-9), not "page 2" as the internal narrative claimed. More pages at position 44 produce more impressions at position 44 and no more clicks. In $20k-MRR terms: every hour spent on page #165 is an hour not spent on the two things that could actually move revenue (off-page authority, and the Team/Growth purchase-path fix) — and it now also carries live Google policy risk from the March/May 2026 scaled-content-abuse and AI-Overview-eligibility enforcement named in the competitive review.
2. **Stop treating SEO as "basically working, just needs to be measured."** It needs a structurally different motion — earned third-party mentions — not more first-party content. Zero of the 25 clicks came from a query where the content is competing on its own merits; the constraint is domain authority, and no volume of additional pages fixes that.
3. **Stop scoping new "apps"** (a public API surface, a template-pack SKU) **before the existing product's purchase and distribution mechanics are fixed.** Both candidate new SKUs add engineering surface area competing for attention against Store submission and the Team self-serve question, for a payoff with no demand evidence behind it, and one of them (template packs) actively undercuts the product's only clean competitive differentiation.
4. **Stop the 5,625-page ambition specifically**, independent of the freeze above. The program's own architecture and market-research agents already found this target ~7-8× oversized relative to reasoned per-cluster demand ceilings (~650-750 pages), with the #1-priority ICP vertical (financial services) unaddressed while lower-priority verticals shipped anyway. If and when the content freeze lifts per the re-entry criteria in Gate 4, resume against the reasoned ceiling, not the original number.
5. **Stop shipping growth work outside the same iteration-log/CHANGELOG discipline the rest of the codebase uses.** This is a process failure, not a marketing one, but it is why the CEO is asking this question now instead of reading it off a dashboard: `CHANGELOG.md` has exactly one entry for the entire SEO program despite roughly ten subsequent commits, and a diagnosis-with-a-named-fix-sequence sat unexecuted for 3.5 weeks with no artifact trail forcing a revisit. Without this discipline, progress toward $20k cannot be checked any more easily than the SEO program's effectiveness could be — which is precisely the problem this analysis was asked to solve.

---

## 7. Open items requiring verification (explicitly not resolved by this analysis)

- **Current MRR / active paying-customer count**, including legacy Pro subscribers and their price — not disclosed in any artifact read for this analysis. This is Gate 0 and should be the literal first fact-finding step, since it may mean the starting point is not $0.
- **Whether the Team/Growth "waitlist" pricing-page copy or the existing `/api/teams/*` invite-flow code is the accurate current state.** Both exist; they contradict each other. This gates the entire tier-mix recommendation in §2 and is flagged, not resolved, here.
- **Whether any paid-acquisition budget exists or is planned.** Nothing in the grounding evidences one; this analysis assumes none and builds the 12-month case on off-page authority + founder-led sales instead. If a paid budget exists, the timeline in §1 should be re-run against it.
- **Whether a warm outbound/sales pipeline already exists** for the founder-led Team motion assumed to be the primary near-term revenue driver in §2 and §3. If it does not exist yet, building it is itself a stage-gate item that should be made explicit and is not currently named anywhere in the reviewed roadmap artifacts.
