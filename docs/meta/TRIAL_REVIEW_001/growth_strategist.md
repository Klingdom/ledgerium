# Trial Design Review — Growth Strategist

**Date:** 2026-09-14
**Scope:** Analysis only. No source files modified. All file paths below are read-only citations.
**Constraint honored:** zero customers, zero measured results. No copy below claims a benchmark, a percentage, a "customers say," or a number this product has not earned.

---

## 0. What the code actually does today (ground truth)

Read directly, not assumed:

- `apps/web-app/src/lib/stripe.ts:171-176` — `TRIAL_PERIOD_DAYS` defaults to 14, configurable via `STRIPE_TRIAL_DAYS`.
- `apps/web-app/src/app/api/billing/checkout/route.ts:371-388` — trial is applied only `isTrialEligible` (never held a Stripe subscription before) AND only inside `subscription_data.trial_period_days` on a Checkout Session the user has already navigated to by clicking "Start Trial." Stripe Checkout collects a card before the trial clock starts. There is no free, cardless trial path anywhere in this codebase.
- `apps/web-app/src/app/api/billing/webhook/route.ts:1073-1117` — `customer.subscription.trial_will_end` handler is annotated "NOTIFICATION event... does NOT update the user record," calls `trackServer('trial_will_end', ...)` and nothing else. No email is sent because **no email system exists in this codebase** (confirmed: no mailer, no transactional-email provider, no queued-email table).
- `apps/web-app/src/components/UsageQuotaMeter.tsx` — a complete, tested, amber/red two-threshold quota meter with upgrade links (`isWarning` at 80%, `isAtLimit` at 100%, lines 47-64) — but it is only imported in `apps/web-app/src/app/(app)/dashboard/page.tsx:52,833`, which is the **v1 dashboard branch**, gated behind `?v2=0` (line 314-321: `// ALL users now see v2 by default... DEPRECATED... this ~1300-LOC v1 branch is dead for all`). It is not reachable by any real user today.
- `apps/web-app/src/components/dashboard-v2/` has no equivalent quota meter. The only live upgrade surfaces in v2 are: the gated `HealthTooltip` ("Upgrade to see breakdown" → `/pricing`, `WorkflowRow.tsx:334-341`), a gated `PortfolioTimestudyBand` string ("Upgrade to see health scores"), and plan-gated preset chips in `PresetChipRail.tsx`. All three are feature-gates for Free-tier users, not trial-ending or quota-approaching signals.
- `prisma/schema.prisma` has no `trialEndsAt` (or equivalent) column on `User`. Stripe knows the trial end date (`subscription.trial_end`); Ledgerium's own database does not persist it anywhere. This matters for §3 below — it is the first thing that has to be built before any in-app trial-countdown UI is possible.
- `apps/web-app/src/lib/config.ts:82,121` + `apps/web-app/src/components/PricingCards.tsx:264-267` — Starter and Solo CTAs read "Start 14-Day Trial" / "Start Trial — Full intelligence included," and because `plan.price !== null` is true for both, the card renders **"No credit card required"** directly beneath the button. This is false for both tiers — Stripe Checkout requires a card to start the trial. This is a live, user-facing accuracy defect, not a hypothetical one.

That last point is not a trial-design question, it's a trust defect discovered while answering the trial-design question, so it goes into the ranked plan as item #1 — it is the cheapest, highest-confidence fix in this entire review.

---

## 1. Card-up-front checkout trial vs. reverse trial at signup

**Recommendation: replace the card-up-front Checkout trial with a reverse trial granted automatically at signup — full Solo-tier features for a fixed window, rolling down to permanent Free (not to a demand-a-card wall) at expiry.**

Reasoning, weighed against this specific product and this specific traffic level:

- **The competitive evidence and the product shape agree, unusually cleanly.** Loom, Scribe, Tango, Guidde all converged on perpetual-free-capped-by-usage because their entire funnel depends on a user experiencing the "aha" (a rendered artifact — a video, a guide, an SOP) before any purchase decision. Ledgerium's aha moment is structurally identical: record a workflow → get an SOP → see process-intelligence metrics. A card wall placed *before* checkout is placed *before* the funnel's own value moment can fire, because right now Free tier (5 recordings/mo, `plans.ts:76-83`) does let a user reach the SOP, but never reaches `intelligenceLayer`/`bottleneckAnalysis`/`automationScoring`/`variantDetection` (`plans.ts:114-127`) — those are Solo-exclusive. The single most differentiated part of the product (the "measure whether the standard is holding," per Team's own `outcomeMicrocopy` in `config.ts:147`) is invisible to a Free user and only visible to someone who has already put a card down. That is backwards for a product whose entire pitch is "see what we found" — you cannot ask someone to pay before they have seen the thing that would make them want to pay.
- **The 680k-user null result on trial duration is decisive evidence against optimizing the *length* dial, but it does not by itself argue for reverse trial over card-up-front.** The reverse-trial argument stands on a different, stronger foundation specific to Ledgerium: the intelligence layer is exactly the kind of feature that is worthless described and compelling demonstrated (bottleneck detection, variant counts, automation scoring on *your own* recorded workflow — not a generic screenshot). A reverse trial is the only structure that puts that demonstration before the ask.
- **At near-zero traffic (~25 search clicks/quarter), the friction cost of a card wall is proportionally larger, not smaller.** Every visitor is expensive to acquire right now. A card-up-front trial converts "curious visitor" → "committed prospect who typed in a card number" in one step, and that step is exactly where most curious-but-not-yet-convinced visitors bounce. At this traffic volume, losing 80% of visitors at the card wall isn't a statistical rounding error, it's losing 4 of 5 people who would otherwise have gotten far enough to see the product work.
- **Reverse trial is not free of risk, and it should not be sold as a strict improvement without caveats.** The mechanism requires: (a) a signup flow that provisions Solo-tier features automatically (today, `plans.ts` has no such provisioning path — new users land on `free`), (b) a scheduled downgrade job (today there is no scheduler for anything plan-related — everything plan-related is Stripe-webhook-driven), and (c) in-app communication of the rolldown, which collides directly with the "no email system" constraint in §3. This is real build work, not a config flip. It should not be attempted as a one-shot rewrite; it is a sequenced build (see ranked plan).
- **Card-up-front is not wrong forever — it is wrong as the *first* trial a visitor encounters.** Once a user has already experienced the reverse trial and hit the Free rolldown, a card-up-front "resubscribe to get it back" ask at that specific moment (loss-aversion, not cold-ask) is a legitimate and well-evidenced second-stage motion. Keep the Stripe Checkout trial-eligibility code (`checkout/route.ts:371-388`) — it does not need to be deleted, it needs to stop being the *only* trial mechanism and become the fallback for direct-to-checkout traffic (e.g., someone arriving from a comparison article already sold on Solo) and the resubscribe path for lapsed reverse-trial users.

**What this means concretely:** two coexisting mechanisms, not a replacement of one by the other. New signups get Solo features for N days automatically, no card, rolling down to Free at expiry. A visitor who lands directly on `/pricing` and clicks "Start Trial" still gets the existing card-up-front Stripe Checkout trial — that motion is fine for someone who already decided.

---

## 2. The single moment of highest purchase intent

Ranking the three candidates against what the product actually gates:

1. **Hitting the recording limit** (Free tier, 5/mo, `plans.ts:77`) is a *quantity* wall. It signals "I want to do more of what I'm already doing," which converts to Starter (more recordings) — the smallest, cheapest upgrade, not the one that demonstrates the product's real differentiation.
2. **Generating a first SOP** is the core "aha," but it is aha for the *recording* half of the product (capture → structured document). It proves the extension works. It does not yet prove the *intelligence* half — nothing about variant detection, bottlenecks, or automation scoring has been shown yet.
3. **Seeing process-intelligence metrics for the first time** is the moment the product's actual moat becomes visible — a computed signal, tied to the user's own recorded behavior, that a generic screen-recorder (Loom) or a step-by-step guide tool (Scribe, Tango, Guidde) cannot produce, because none of them ingest behavior into a deterministic metrics engine (`ARCHITECTURE_METRICS_ENGINE.md` — 32 Tier-A / 44 Tier-B computed metrics, per `CLAUDE.md` history). This is the moment a user learns something about their own process that they did not already know. That is the highest-intent moment: not "I want more of this," but "this told me something."

**Recommendation: the upgrade ask belongs at the first process-intelligence reveal — the first time a workflow's health score, bottleneck flag, variant count, or automation-opportunity tag renders for that user** — not at the quota wall, not at SOP generation.

Where, concretely, in the current codebase:

- The natural anchor is `WorkflowRow.tsx`'s existing `HealthTooltip` gate (`WorkflowRow.tsx:334-341`) — it already fires `upgrade_clicked` with `location: 'dashboard_v2_health_gate'` and already routes to `/pricing`. That proves the wiring pattern exists and works; it is currently reactive (user has to click a locked tooltip to see it). The recommendation is to make the *first occurrence* of this moment proactive: the first time a Free-tier user's workflow crosses the threshold where a health score or bottleneck signal *would* be computed (i.e., the underlying `computeWorkflowMetrics` output exists but is gated), surface it inline in the row — not buried in a tooltip the user has to discover by clicking a locked icon.
- Under the reverse-trial model recommended in §1, this moment is even sharper: the user is *not* gated at this point (they have full Solo access during the trial), so the first intelligence reveal is a demonstration, not a paywall. The ask is deferred to the *rolldown* — "you had this, here's what you're about to lose" — which is a fundamentally stronger position than "here's what you could have" (loss aversion outperforms gain-framing in every trial-conversion study that isn't the null-result one cited in this brief, and that null result was about *duration*, not about *what happens at the boundary*).
- Do **not** put the primary ask at the recording-limit wall. That wall should stay quiet and functional (it already is — `UsageQuotaMeter.tsx` handles it correctly, it's just unreachable — see §5 and ranked-plan item #1). The recording-limit ask is a legitimate secondary/tertiary prompt for users who are high-volume-but-single-workflow (Starter's actual ICP per `config.ts:80` "Solo ops professionals who need clean, shareable exports") — it should exist, but it is not the primary lever, because it doesn't sell the thing that makes Ledgerium different from a screen recorder.

---

## 3. In-app mechanisms for trial-ending communication (no email system exists)

Given constraint: no mailer, no queued-email table, nothing. Every mechanism below has to be either (a) rendered synchronously when the user is already in the app, or (b) triggered by a webhook write that a subsequent page-load can read.

**Buildable now, no new infrastructure beyond one DB column and one webhook write:**

1. **Persist `trialEndsAt` on `User`.** `subscription.trial_end` (unix timestamp) is already present on every Stripe subscription object the webhook already reads (`webhook/route.ts:1082,1091`). One migration (`User.trialEndsAt DateTime?`), one write at `checkout.session.completed` and `customer.subscription.updated` where status is `trialing`. Without this, nothing else in this section is buildable — it's the load-bearing prerequisite.
2. **A persistent in-app banner while `subscriptionStatus === 'trialing'`.** Rendered at the dashboard shell (`DashboardV2Shell.tsx` already conditionally renders header content) whenever `trialEndsAt` is within, say, 5 days. This is the direct in-app analogue of what `trial_will_end` currently only logs to analytics — the webhook already fires 3 days out; the banner condition should be driven by the persisted date, not the webhook event, so it's visible on *every* session in the window, not just the one where the webhook happened to have fired recently.
3. **A dedicated account-page trial state card.** The account page already reads `user.subscriptionStatus` for billing display; extending it to show "Trial ends in N days" with a direct "Keep your plan" CTA to the billing portal is a small, contained addition to an existing page, not a new surface.
4. **Extension-side notification is out of scope for this review** but worth flagging: the Chrome extension is the thing the user opens most often (it's the *recording* surface), and it currently has zero visibility into billing state. A minimal badge/banner in the sidepanel reading a cached trial-status value (fetched on extension open, same pattern as any other background-fetched state) would reach the user in the product surface they touch most, independent of whether they remember to open the web dashboard. This is a larger lift (crosses `apps/extension-app/` and requires new background messaging) and should not be attempted before items 1-3 land — but it is buildable without email.
5. **A one-time "last day" dashboard interstitial**, not a recurring nag, shown once on the calendar day the trial actually ends (or the reverse-trial rolldown fires) — this is the single highest-leverage moment to show the actual before/after (what the user had access to vs. what Free restores), because it's the moment loss aversion is strongest and the user is already in-product to see it.

**Not buildable without more infrastructure, listed so it's explicit they were considered and deliberately deferred:**

- Email digests / reminder sequences — require a transactional email provider (Postmark/Resend/SES) and a scheduled job runner. Neither exists. This is real infrastructure work, not a copy change.
- Push notifications — no service-worker push infrastructure in the extension today beyond capture; out of scope.
- SMS — no phone collection anywhere in the signup flow; not worth building for this traffic volume.

The email system is a legitimate future build (it unlocks receipts, the trial-reminder sequence a reverse trial genuinely benefits from, and dunning emails for `past_due` — which also doesn't exist today per the webhook comment at `webhook/route.ts:778-800`), but at ~25 clicks/quarter, building a full email pipeline before the in-app mechanisms above is solving the wrong order of problems. In-app first; email is a "once traffic exists" investment (see ranked plan).

---

## 4. Actual copy

Voice constraints followed: no invented statistics, no "customers love," no percentage that doesn't exist, no comparison to a competitor by name in the product UI. Every claim below is either a computed fact about the user's own data, a statement of what the product does, or a plain statement of what will happen — nothing is a marketing superlative.

### A. Reverse-trial welcome (immediately after signup, before first recording)
> **You're on the full Solo plan for 14 days.**
> Record a workflow and Ledgerium will show you cycle time, variant count, and where automation might fit — no card, no setup. After day 14, your account moves to the Free plan automatically. You can keep everything by adding a payment method any time before then.

*(Rationale: states the mechanism plainly — no ambiguity about what happens or when — and names the actual metrics the product computes, not a generic "unlock powerful features" line.)*

### B. First process-intelligence reveal (the moment identified in §2)
> **This is what Ledgerium found in your workflow.**
> [Health score / bottleneck flag / variant count — rendered inline, the actual computed value]
> This is computed from what you recorded — not a guess. Every number here traces back to the steps in your session.

*(No CTA button needed on this exact card during the trial window — the point is demonstration, not ask. If shown to a Free-tier user post-rolldown as a gated preview: "Upgrade to see this for your other workflows" with a `/pricing` link — reusing the existing `HealthTooltip` copy pattern already in `WorkflowRow.tsx:334`.)*

### C. Trial-ending banner (5 days out, per §3.2)
> **Your trial ends in 5 days.** After that, your account moves to the Free plan and the intelligence layer — bottleneck detection, automation scoring, variant comparison — won't be visible on new recordings. Add a payment method to keep it.
> [Keep my plan →] [See what changes →]

*(The second link should go to a plain, honest comparison — not a sales page dressed as one.)*

### D. Rolldown-day interstitial (§3.5)
> **Your trial has ended. You're on the Free plan now.**
> Your recorded workflows and SOPs are still here. What's gated now: bottleneck flags, automation scoring, and variant detection on new recordings. Your existing analysis isn't deleted — it's just not being recalculated on anything new until you upgrade.
> [Continue on Free] [Restore Solo →]

*(Explicitly reassures nothing is deleted — this matters: a user who fears data loss will bounce permanently rather than stay to consider upgrading later.)*

### E. Quota-approaching (Free tier, secondary ask per §2 — this copy already exists and is correct, it just needs to ship to the live surface, see ranked plan #1)
Current `UsageQuotaMeter.tsx:53` copy: *"Upgrade to Team for unlimited"* — this is **wrong on two counts** and should not ship as-is even once wired to v2: (1) Team is not self-serve (`checkout/route.ts:305-318` blocks it — routes to a waitlist mailto), so this CTA leads to a dead end today; (2) the recommended primary upgrade at this trigger is Starter (matches quota-relief intent) or Solo (matches "you're clearly using this seriously" intent), not Team. Corrected:
> **15/15 recordings this month.** Starter removes the monthly cap. [See plans →]

### F. Pricing-page CTA fix (ranked plan #1 — the false claim)
Replace the blanket *"No credit card required"* under Starter/Solo (`PricingCards.tsx:264-267`) with tier-accurate copy. Free:
> No credit card required
Starter/Solo (once the reverse trial exists, this button becomes secondary — see §1 — but while it's still live):
> Starts with a 14-day trial. Card required at signup.

*(Never let a checkout page say something the checkout flow contradicts thirty seconds later — that is the single fastest way to burn trust with the ~25 people who bother to click through per quarter.)*

---

## 5. What should NOT be done

- **Do not tune trial length.** The 680k-user null result is specific and directly on-point — moving from 14 to 7 or 14 to 30 days is very unlikely to move conversion and would consume a build cycle for a change with no evidence behind it.
- **Do not ship a reverse trial that deletes or hides existing user data at rolldown.** Gating *new* computation is legitimate; making previously-visible SOPs or recordings disappear is not a pricing lever, it's a reason to never trust the product with real work again. Copy in §4.D exists specifically to preempt this fear — the engineering behind it must match the promise.
- **Do not add a second card-up-front gate in front of the reverse trial.** The entire point of §1 is removing the card wall from the first-touch moment. A "verify your card to start your free trial" step defeats the purpose and is a well-documented net-negative pattern (it converts a 0-friction offer into a friction offer while keeping the "free" label, which reads as bait-and-switch).
- **Do not build the trial-reminder email sequence before the in-app mechanisms in §3.** It is tempting because "just add an email" feels like the standard SaaS playbook, but there is no email infrastructure in this codebase at all — building it is a multi-day investment that, at ~25 clicks/quarter, will very likely sit unused while the far cheaper in-app banner sits unbuilt. Sequence matters.
- **Do not fabricate proof elements.** No "trusted by X companies," no fake testimonial, no invented benchmark comparison against Scribe/Loom/Tango by name with numbers Ledgerium does not have. The evidence-led anti-hype voice is a real asset for a product whose whole pitch is "we measure, we don't guess" — undermining it with marketing-standard-issue fake social proof would be self-defeating in a way that's specific to this product's positioning, not generic advice.
- **Do not put the primary upgrade ask at the recording-limit wall.** Tempting because it's the easiest signal to build a prompt around (a simple counter check) and `UsageQuotaMeter.tsx` already exists for it — but as argued in §2, it sells the wrong half of the product (capacity, not intelligence) and undersells the tier that differentiates Ledgerium from a screen recorder.
- **Do not treat Team's "Upgrade to Team for unlimited" CTA (currently live in the dead v1 branch, `UsageQuotaMeter.tsx:53`) as fine to ship unchanged.** It routes to a plan that is not purchasable self-serve (`checkout/route.ts:305-318`) — shipping a live upgrade button that dead-ends at a waitlist mailto is worse than shipping no button, because it actively wastes the intent of the ~25 people who click through per quarter.

---

## Ranked plan

Each item: expected effect / effort / confidence basis / traffic dependency.

| # | Item | Expected effect | Effort | Confidence basis | Traffic dependency |
|---|------|------------------|--------|-------------------|---------------------|
| 1 | **Fix the false "No credit card required" claim on Starter/Solo pricing cards** (`PricingCards.tsx:264-267`) — tier-accurate copy per §4.F | Removes an active trust-breaking contradiction between the pricing page and the checkout flow. Not a growth lever by itself, but every other conversion effort is undermined if the page lies about the very next step. | **~1 hour** | Direct code read, not inference — `plan.price !== null` is true for Starter (49) and Solo (89), the copy renders unconditionally for both. This is a certainty, not a hypothesis. | **Works at current near-zero traffic** — in fact matters *more* at low traffic, because every one of the ~25 clicks is expensive and a broken-promise moment on a low-volume page is proportionally more costly. |
| 2 | **Wire `UsageQuotaMeter` into the live v2 dashboard**, with the Team-CTA bug fixed per §4.E | Restores a quota-warning + upgrade-CTA surface that is fully built and tested but currently unreachable by any real user (`page.tsx:314-321` — v1-only). Converts "component exists" into "component is live." | **~1 day** (mostly plumbing `used`/`limit`/`plan` props into `DashboardV2Shell`; the component and its tests already exist) | Read directly — the component is complete, tested (`UsageQuotaMeter.test.tsx`), and simply not imported anywhere reachable. This is the single highest-ratio (impact ÷ effort) item in the whole plan. | **Works at current near-zero traffic.** |
| 3 | **Persist `trialEndsAt` on `User` + webhook write** (§3.1) | Prerequisite for every in-app trial-communication mechanism. Zero direct conversion effect on its own — it's infrastructure — but nothing in items 4-6 is buildable without it. | **~2-4 hours** (one migration, two webhook write sites already touched by existing handlers) | The webhook already reads `subscription.trial_end`, it just discards it (`webhook/route.ts:1091`, used only for a log line). Adding a DB write to an already-executing code path is low-risk. | **Works at current near-zero traffic.** |
| 4 | **In-app trial-ending banner + account-page trial state card** (§3.2, §3.3, copy §4.C) | Directly closes the "trial ends in silence" gap named in the prompt. This is the mechanism most likely to move the needle on trial→paid conversion given the product currently tells trial users nothing. | **~1-2 days** | Follows an existing, working pattern in this codebase (`UsageQuotaMeter`'s own warning/at-limit banding is the template; `DashboardV2Shell` already conditionally renders header state). Confidence is moderate-high on mechanism, low on exact copy performance (no data exists yet to test against). | **Works at current near-zero traffic** — arguably matters *most* at low traffic, because every trialing user is one of a handful and losing any of them to silent expiry is a large relative loss. |
| 5 | **Design and build the reverse-trial mechanism** (auto-provision Solo at signup, scheduled rolldown job, welcome + rolldown-day copy per §4.A/§4.D) | The structural fix argued in §1 — moves the first-touch offer from card-up-front to experience-first, matching every scaled self-serve competitor in the category and removing the card wall from in front of the product's actual differentiator. | **~1-2 weeks** (new provisioning path in signup flow, a scheduled/cron rolldown job — no scheduler exists today — new DB fields for trial-start tracking, careful interaction with the existing Stripe-driven plan logic in `plans.ts`/`feature-gating.ts` so the two systems don't fight over source-of-truth) | High confidence in the *direction* (strong, consistent competitive pattern across 4 independent scaled companies + the specific structural fit argued in §1), moderate confidence in exact parameters (trial length, exact rolldown UX) since the null-duration-result evidence only rules out over-optimizing length, it doesn't validate any particular number. This is the largest, highest-risk, highest-expected-value item in the plan — sequence it after 1-4, not before. | **Works at current near-zero traffic** in the sense that it should be built now while volume is low (cheap to get wrong quietly), but its *payoff* compounds — it matters far more once real acquisition volume exists, because it removes a hard drop-off step from the top of a funnel that currently barely has any visitors to lose. |
| 6 | **First-intelligence-reveal proactive surfacing** (§2, moving the health/bottleneck/variant signal from a click-to-discover tooltip to an inline first-occurrence moment) | Sharpens the moment identified as highest-intent from a passive/discoverable gate into an active demonstration — most valuable *after* item 5 ships, because under the reverse trial this becomes a genuine "look what we found" moment rather than a paywall tease. | **~2-3 days** | Builds directly on existing, shipped instrumentation (`WorkflowRow.tsx:334-341`'s `HealthTooltip` + `upgrade_clicked` event already prove the pattern works end-to-end); the change is presentation timing, not new computation. | **Only matters once traffic exists** — with ~25 clicks/quarter, very few sessions will ever reach a "second, third, fourth workflow recorded" state where a *proactive* (vs. reactive/discoverable) surfacing meaningfully outperforms what's already there. Sequence last. |
| 7 | **Extension-side trial/plan-status badge** (§3.4) | Reaches users in the surface they open most (the recorder itself), independent of dashboard visits. | **~3-5 days** (new background messaging path, cached-state fetch, UI in the sidepanel — crosses the Extension Reliability Invariant in `CLAUDE.md`, which mandates real-extension validation, not just unit tests, for anything touching `content/`/`background/`) | Moderate — the mechanism is sound, but this is the riskiest build in the plan against `CLAUDE.md`'s explicit extension-reliability history (two prior regressions from seemingly-safe extension changes). Must go through the real-extension harness, not be shipped on unit-test confidence alone. | **Only matters once traffic exists.** At current volume, almost nobody will be mid-trial in the extension at the exact moment this would matter; build it once there's a user base large enough for "which surface do they check" to be a real optimization question. |
| 8 | **Full transactional email system + reminder sequence** | Standard SaaS trial-conversion lever, well-evidenced in general but not specific to Ledgerium's stated constraints. | **~1-2 weeks** (provider integration, template system, scheduled sending, unsubscribe/compliance handling) | High confidence the *pattern* works elsewhere; zero Ledgerium-specific evidence yet, and it duplicates most of what item 4 already delivers in-app for a fraction of the cost. | **Only matters once traffic exists.** Explicitly do not build this before items 1-4 — at ~25 clicks/quarter it is very likely to be infrastructure built for an audience that hasn't arrived yet. |

**Sequencing summary:** 1 → 2 → 3 → 4 can all ship now, cheaply, and are each independently justified even if reverse trial (item 5) never ships. Item 5 is the structural bet and should be built next, deliberately, while traffic is low enough that mistakes are cheap to catch and fix. Items 6-8 are explicitly deferred until there is enough traffic for their marginal value to be measurable at all — building them now would be optimizing a funnel stage almost nobody currently reaches.

---

## Handoff

**Launch objective:** convert more of a very small, expensive-to-acquire visitor pool by removing a card wall in front of the product's actual differentiator, and by telling trial users, in-product, that their trial exists and is ending — neither of which happens today.

**Target audience:** the ~25/quarter search-click visitor, self-serve, solo ops/automation professional (per existing `bestFor` copy in `config.ts`) — not a team buyer, not an enterprise buyer, at current volume.

**Core message:** *Ledgerium shows you what's actually happening in your process, not what you assume is happening — and you can see that on your own recorded workflow before you pay for it.*

**Activation motion:** signup → first recording → first SOP → first process-intelligence reveal (the highest-intent moment, §2) → reverse-trial rolldown as the primary paid-conversion ask (§1, §4.D), with the existing card-up-front Stripe Checkout trial retained as the fallback for direct-intent `/pricing` traffic.

**Measurable experiment ideas** (once instrumentation from items 3-4 exists): trial-banner-seen → billing-portal-click rate; rolldown-day-interstitial-seen → resubscribe rate within 7 days; first-intelligence-reveal-seen → upgrade_clicked rate, split by whether the user was in reverse-trial (full access, demonstration framing) vs. Free tier (gated, discovery framing) — this specific comparison directly tests the core hypothesis in §1 once both paths exist.

Recommended downstream recipients: `coordinator` (sequencing items 1-2 as near-term Mode 1/2 picks — both are small, contained, and match existing code patterns), `product-manager` (item 5's PRD — reverse trial touches signup flow, plan provisioning, and a new scheduled job, all of which need a written spec before build per this repo's Required Artifacts policy), `analytics` (instrumentation plan for the measurable experiments above before item 4 ships, so the banner/interstitial land with tracking already wired rather than retrofitted).
