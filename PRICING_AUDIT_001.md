# Pricing & Subscription Audit 001

**Date:** 2026-04-20
**Trigger:** CEO directive — "Can you have the team closely inspect the pricing and subscription models and make sure they make sense and that they are functional."
**Status:** Read-only audit. No code changes. Findings only.
**Lenses applied:** product-manager (strategic coherence), backend-engineer (technical correctness), qa-engineer (functional verification), growth-strategist (conversion & positioning).
**Surface mapped by:** Explore agent (very thorough — 11 sections, 10 preliminary red flags).

---

## Executive Summary

**Does the pricing "make sense"?** Structurally yes, with two targeted coherence problems and one missing tier. The free → starter → team ladder is sound; the team → growth jump is weak; a "Pro" tier between starter and team is a real conversion gap.

**Is the pricing "functional"?** Not production-safe. The checkout session creation works, but the critical post-payment activation path (webhook → plan resolution → DB write) has:
- **zero automated test coverage** across 16 lifecycle transitions
- **a silent failure mode** that permanently under-provisions paid users with no alert, no retry, no recovery
- **no idempotency guard** on webhook handling
- **two user-visible silent no-ops** (admin upgrade, already-subscribed upgrade)

**If one thing is fixed first:** remove the silent `'starter'` fallback in `planFromPriceId` (`apps/web-app/src/lib/stripe.ts:79`) and the catch-block fallback in the webhook handler (`apps/web-app/src/app/api/billing/webhook/route.ts:52-55`). This converts a silent permanent data-corruption class of bug into a noisy transient failure that self-heals via Stripe's retry.

**Single highest-leverage growth change:** add a 14-day Team trial triggered at first-recording upload. The entire intelligence-layer differentiator is invisible to free users today, so every prospect pays $249 blind.

---

## Cross-Specialist Consensus Findings

Findings that ≥2 specialists independently flagged (highest confidence):

| Finding | PM | Backend | QA | Growth | Severity |
|---|:-:|:-:|:-:|:-:|:-:|
| Silent 'starter' fallback on plan resolution failure | · | ✅ | ✅ | · | **P0** |
| Zero webhook idempotency / no event deduplication | · | ✅ | ✅ | · | **P0** |
| Admin / already-subscribed upgrade shows no user-visible error | · | · | ✅ | · | **P0** |
| STRIPE_WEBHOOK_SECRET unset → total silent pipeline failure | · | ✅ | ✅ | · | **P0** |
| Zero automated tests on checkout / webhook / portal routes | · | ✅ | ✅ | · | **P0** |
| healthScores copy contradiction (Starter feature vs FAQ "intelligence layer = Team+") | ✅ | · | · | · | **P0** |
| Starter value story is "clean exports" = feature, not outcome | ✅ | · | · | ✅ | **P0** |
| No free trial to Team — intelligence layer invisible to free users | · | · | · | ✅ | **P0** |
| 80% quota warning has no upgrade link | · | · | · | ✅ | **P0** |
| Customer creation TOCTOU race (duplicate Stripe customers) | · | ✅ | · | · | **P1** |
| Quota check not atomic — concurrent uploads at limit can exceed | · | ✅ | ✅ | · | **P1** |
| `subscriptionStatus` defaults to `'trialing'` for new free users (schema bug) | · | ✅ | · | · | **P1** |
| No index on `stripeSubscriptionId` — full table scan on `invoice.payment_failed` | · | ✅ | · | · | **P1** |
| "No credit card required" label shown on paid cards (factually wrong) | · | · | · | ✅ | **P1** |
| Pricing drift risk — prices hardcoded across 4+ files | · | ✅ | · | ✅ | **P1** |
| Environment variable name mismatch between `config.ts` and `stripe.ts` | · | ✅ | · | · | **P1** |
| "Growth" tier name does not communicate the AI/automation differentiator | ✅ | · | · | ✅ | **P1** |
| Feature comparison table buries intelligence layer at row 8–10 | · | · | · | ✅ | **P1** |
| No observability: silent plan mismatch has no log / alert / query | · | ✅ | ✅ | · | **P1** |

---

## Part 1 — Strategic Coherence (Product-Manager Lens)

### What makes sense
- **free → starter → team ladder** is sound in skeleton; competitive differentiation in FAQs ("structured data, diffs, confidence scores") is the strongest copy in the codebase.
- **Team at $249** is well-designed: 3 recorders + 5 viewers + unlimited + full intelligence layer = coherent "process improvement team" ICP with justifiable per-seat math (~$31/user).
- **Intelligence layer gating to Team+** is the right strategic decision — it is the differentiator and monetization anchor.

### What does not make sense

**F-COH-01 (P0) — healthScores copy contradiction**
`config.ts:72` puts healthScores in the Starter feature set, but `pricing/page.tsx:26` (FAQ) defines health scores as part of the "full intelligence layer" gated to Team+. Same page, direct contradiction. Prospects reading the FAQ after the comparison table see that Ledgerium contradicts itself. Fix: relabel Starter feature as "basic process health indicators" OR move healthScores behind the Team paywall.

**F-COH-02 (P0) — Starter = "clean exports" positions $49 as a ransom, not a tier**
`pricing/page.tsx:145` plan guidance strip reads "Starter · Clean exports." This is a feature, not an outcome. It positions $49/mo as "pay to remove the watermark." Fix: change to "Document professionally" or "Build your process library."

**F-COH-03 (P1) — "Growth" tier name does not communicate the differentiator**
The Growth tier adds agentComposition, integrationRisk, advancedAnalytics — an AI-automation layer. But the name "Growth" implies scale (more seats), and the description targets "AI implementation leads" — a different persona from who bought Team. Fix: rename display label to "Automate" or "Pro" (slug can stay `growth` internally via `toPlanType` compat layer at `plans.ts:171`).

**F-COH-04 (P1) — Missing "Pro" tier between $49 Starter and $249 Team**
The 5.1× jump skips the solo power-user persona who needs bottleneckAnalysis + automationScoring but has no team. These users either downgrade to starter (churn within 30 days) or skip Ledgerium entirely. Fix: add Pro at ~$99/mo — 1 recorder, unlimited recordings, intelligence layer, no team features.

**F-COH-05 (P2) — Seat caps not communicated in plan names**
"Team" implies any-size team. Prospects hit the 8-user cap mid-trial and feel deceived. Fix: add "(up to 8 users)" and "(up to 25 users)" subtitles in `config.ts:88,109`.

**F-COH-06 (P2) — Team → Growth = 3.2× for seats + bundled AI features feels like a junk drawer**
Growth adds 5 features plus more seats. If the AI features (agentComposition, integrationRisk) were the headline, Growth would be a real tier. As packaged, it reads as "Team with extras." This is addressed by F-COH-03 (rename) plus explicit per-feature positioning.

---

## Part 2 — Technical Correctness (Backend-Engineer Lens)

### BUG-01 (P0) — Silent plan under-provisioning on webhook fallback
**Files:** `apps/web-app/src/lib/stripe.ts:78-80`, `apps/web-app/src/app/api/billing/webhook/route.ts:42-55`
**Evidence:** `planFromPriceId` defaults to `'starter'` for any unmapped price ID. The webhook's `checkout.session.completed` branch also falls back to `'starter'` in its catch block. Combined, a misconfigured env var + a Stripe API hiccup can permanently under-provision a paying Team/Growth subscriber with zero observability.
**Observable symptom:** CEO receives a support ticket "I paid for Team but can't access team features." No log line, no alert, no retry.
**Fix shape:** return `null` from `planFromPriceId` for unmapped IDs. In webhook handler, if plan resolution fails, re-throw (return HTTP 500) so Stripe retries. Convert silent permanent failure into noisy transient failure.
**Effort:** S.

### BUG-02 (P0) — Zero webhook idempotency
**File:** `apps/web-app/src/app/api/billing/webhook/route.ts` (entire handler)
**Evidence:** No check against `event.id`. Stripe delivers at-least-once; retries after transient 500s double-fire analytics and re-run DB updates (mostly idempotent but not guaranteed).
**Observable symptom:** analytics events double-count in production; any future non-idempotent DB write will double-apply.
**Fix shape:** create `WebhookEvent` table with `event_id UNIQUE` constraint; check before processing; return 200 immediately on duplicate. Also add structured log for every event with `event.id`.
**Effort:** M.

### BUG-03 (P0) — Admin & already-subscribed users see silent button failure
**Files:** `apps/web-app/src/components/UpgradeButton.tsx:46-52`, `apps/web-app/src/app/api/billing/checkout/route.ts:38-42,79-83`
**Evidence:** Checkout returns 400 with an `error` string (and sometimes `redirect`). `UpgradeButton` only navigates if `data.url` or `data.redirect` is present — never surfaces the error string. Admin user: button resets from loading, nothing happens. Already-subscribed user: silent redirect to `/account` with no explanation.
**Observable symptom:** user concludes the upgrade flow is broken.
**Fix shape:** display `data.error` in UpgradeButton error state UI; tighten the contract so the API always returns one of `{url}` | `{redirect, message}` | `{error}`.
**Effort:** S.

### BUG-04 (P0) — Missing WEBHOOK_SECRET = total silent billing pipeline failure
**File:** `apps/web-app/src/lib/stripe.ts:93`, `apps/web-app/src/app/api/billing/webhook/route.ts:22-32`
**Evidence:** `WEBHOOK_SECRET` defaults to `''` when env var is unset. Every webhook returns 400. Stripe retries for 72h then gives up and flags the endpoint. No application alert. Every user who completes checkout during the outage is billed but stays on free indefinitely.
**Fix shape:** throw at module load if `STRIPE_WEBHOOK_SECRET` is absent in production; add a health endpoint that verifies all billing env vars resolve.
**Effort:** S.

### BUG-05 (P1) — Customer creation TOCTOU race
**File:** `apps/web-app/src/app/api/billing/checkout/route.ts:87-102`
**Evidence:** Two concurrent requests both read `stripeCustomerId: null`, both call `customers.create`, the second write orphans the first customer record.
**Observable symptom:** user has duplicate Stripe customer records; future billing shows on one, UI reads the other; support has to manually merge.
**Fix shape:** make `stripeCustomerId` unique at DB level; use conditional update with `where: { id, stripeCustomerId: null }`; on conflict, retry the read.
**Effort:** M.

### BUG-06 (P1) — Quota check is not atomic
**File:** `apps/web-app/src/lib/feature-gating.ts:97-113`
**Evidence:** read-then-check pattern with no transaction. Two concurrent uploads at `used = limit − 1` both pass.
**Observable symptom:** free user uploads 6+ recordings in a month.
**Fix shape:** wrap count + insert in a serializable transaction or enforce via DB-level constraint.
**Effort:** M.

### BUG-07 (P1) — `subscriptionStatus` defaults to `'trialing'` for new free users
**File:** `apps/web-app/prisma/schema.prisma:16`
**Evidence:** `@default("trialing")` on a field representing Stripe subscription status. New users have no Stripe subscription. UI displaying "trial" messaging based on this field will mislead.
**Fix shape:** change default to `'none'`; migration.
**Effort:** S.

### BUG-08 (P1) — No index on `stripeSubscriptionId`
**File:** `apps/web-app/prisma/schema.prisma:18`
**Evidence:** `invoice.payment_failed` handler does `findFirst({ where: { stripeSubscriptionId } })` on an unindexed nullable column. Full table scan per event.
**Fix shape:** `@@index([stripeSubscriptionId])` + `@@unique` after dedup audit.
**Effort:** S.

### BUG-09 (P1) — Environment variable name mismatch
**Files:** `apps/web-app/src/lib/config.ts:67,92,117` vs `apps/web-app/src/lib/stripe.ts:39-46`
**Evidence:** `config.ts` reads `STRIPE_STARTER_PRICE_ID` (singular). `stripe.ts` reads `STRIPE_STARTER_MONTHLY_PRICE_ID`. Two different env var names for what appears to be the same concept.
**Fix shape:** audit whether `config.ts.stripePriceId` is consumed anywhere; if not, delete; if yes, consolidate env var names.
**Effort:** S.

### BUG-10 (P2) — Stripe API version not pinned
**File:** `apps/web-app/src/lib/stripe.ts:27`
**Fix shape:** `new Stripe(key, { apiVersion: '2024-06-20' })`.
**Effort:** S.

### BUG-11 (P2) — No rate limiting on billing routes
**Files:** `apps/web-app/src/app/api/billing/{checkout,portal,webhook}/route.ts`
**Observable symptom:** authenticated attacker spams checkout, creates hundreds of Stripe customer objects.
**Fix shape:** per-user rate limiter (Upstash or in-process).
**Effort:** M.

### Missing (not a bug, but a data-model gap)
- **No `Subscription` / `Invoice` / `WebhookEvent` tables.** Historical plan transitions are unreconstructable from the local DB. Every audit requires a Stripe API call. This blocks support tooling and billing analytics.
- **No observability infrastructure** for plan mismatches. No log query answers "which users have DB plan X but Stripe sub for plan Y."

---

## Part 3 — Functional Verification (QA-Engineer Lens)

### Current coverage inventory

| Surface | Tests |
|---|---|
| `POST /api/billing/checkout` | **0** |
| `POST /api/billing/webhook` | **0** |
| `POST /api/billing/portal` | **0** |
| `planFromPriceId` / `getPriceId` / `toPlanType` | **0** unit tests |
| `checkRecordingLimit` (quota boundary) | **0** |
| `isAdminUnlimited` | **0** |
| Non-free plan test seed | **0** (seed creates `growth` but `account.spec.ts` asserts `free` — contradiction) |
| Feature gating (analytics/teams 403, workflows 200) | **3** tests, free tier only |
| Pricing page DOM presence | **3** tests, no checkout interaction |

### Lifecycle transitions — untested
0 of 16 transitions have passing tests. 13 of 16 involve the checkout or webhook paths (both entirely untested). This includes: first purchase, upgrade via portal, downgrade, cancel, reactivate, trial → active, active → past_due, past_due → active, past_due → canceled, admin override, proration.

### Highest-risk untested edge cases
- **Stripe retries webhook after partial DB update** → analytics double-fire (BUG-02)
- **User has two Stripe subscriptions** (possible via the past_due loophole at checkout/route.ts:78-83)
- **PST user uploads at 11:59 PM local on Jan 31** → counted in February due to UTC boundary
- **Unknown price ID in env** → user silently granted starter (BUG-01 compound)
- **Admin user clicks upgrade** → button silently does nothing (BUG-03)
- **Network failure mid-checkout** → fallback routes to `/signup` even when already signed in

### Minimum test set before shipping ANY pricing change
| Type | Target | Rationale |
|---|---|---|
| Unit | `toPlanType`, `planFromPriceId`, `getPriceId` boundary cases | Catches legacy 'pro' coercion, unknown price ID fallback, empty env |
| Unit | `checkRecordingLimit` at `used = limit-1, limit, limit+1` | Catches off-by-one and boundary-condition regressions |
| Integration (Stripe mock) | Webhook `checkout.session.completed` → correct plan activation from price ID | Catches BUG-01 class of failure |
| Integration | Webhook duplicate event delivery is idempotent | Catches BUG-02 |
| Integration | Webhook `customer.subscription.deleted` reverts to free | Catches cancel-retained-access |
| Integration | Webhook `invoice.payment_failed` marks user past_due | Catches dunning failure |
| Integration | Webhook returns 400 when WEBHOOK_SECRET unset | Catches BUG-04 |
| Integration | Checkout returns error in parseable shape for admin & already-subscribed | Catches BUG-03 |
| E2E (Playwright + Stripe test mode) | Free → Starter happy path | Catches entire funnel regression |

### QA verdict
**Release risk: HIGH.** Probability a real user hits a silently-broken state this week is high. Blast radius of a webhook outage is platform-wide: every new subscriber is billed but stays on free. Four items meet blocker criteria: BUG-01, BUG-02, BUG-03, BUG-04.

---

## Part 4 — Growth & Positioning (Growth-Strategist Lens)

### Single highest-leverage change
**G-01 (P0) — Add a 14-day Team trial triggered at first recording upload.**
Today, free users only experience the SOP-capture use case (where Scribe competes directly at $23/user). They never see the intelligence layer before paying $249. Every prospect takes a blind leap across the paywall. A 14-day trial to Team gated via `trial_end_at` lets users experience bottleneckAnalysis, variantDetection, and automationScoring before committing. This is the single change that converts Ledgerium's positioning into a felt experience. All other growth recommendations improve a funnel built around an invisible differentiator.

### Critical in-product conversion gaps
- **G-02 (P0) — 80% quota warning has no upgrade link.** `UsageQuotaMeter` fires amber at 80% but the first upgrade CTA appears only at 100%. The highest-intent moment (approaching the cap) is wasted.
- **G-03 (P0) — No intelligence-layer preview for free users.** `FeatureGate` renders a lock icon with no teaser of what is behind it. Free users do not know what they are missing.
- **G-04 (P1) — "No credit card required" label appears on paid cards.** `PricingCards.tsx` shows this on every card where `price !== null`. Factually wrong for $49 / $249 / $799. Trust erosion.

### Pricing-page conversion friction
- **Trial length never stated.** All paid CTAs say "Start Trial" but the trial length appears nowhere on the page.
- **Feature comparison table buries the differentiator.** Intelligence-layer rows (bottleneck, automation, variants) sit at rows 8–10, below table-stakes rows that every competitor also has. Reorder to rows 3–5.
- **Annual discount invisible until toggle.** "~17% off" badge only appears after the user enables the toggle. The `${annualPrice}/mo billed annually` passive text is `text-xs text-tertiary` — effectively invisible.
- **Enterprise mailto CTA is weak.** `mailto:hello@ledgerium.ai` has no tracking, no qualification, no scheduling. Replace with `/contact?plan=enterprise` form.

### Churn / retention gaps
- **No downgrade flow.** Cancellation goes entirely through the Stripe portal. No in-product interstitial, no "stay on a lighter plan" offer, no loss-framing. Industry benchmark: offboarding modal reduces voluntary churn 10–20%.
- **No win-back for canceled/past_due users.** Account page shows status correctly, but there is no re-activation prompt or discount offer.

### Analytics instrumentation gaps
- **`upgrade_clicked` fires only from the pricing page path.** The in-app conversion path (`FeatureGate` → `UpgradeCTA` → `/pricing`) has no tracking. The in-app funnel is invisible.
- **No observability for silent plan mismatch** (compounds BUG-01).

### Competitive positioning
- **Scribe $23/user vs Ledgerium $49 Starter = 2.1× premium.** Justified only if the intelligence differentiator is loud. Pricing page alone does not carry that weight — depends on the Scribe comparison page which is strong but not linked from pricing page.
- **Tango (free forever) and Guidde ($15/user) have no comparison pages.** Direct objections go unaddressed on the marketing surface.

---

## Consolidated Prioritized Recommendations

### P0 — Release blockers / Mode 3 debugging
| ID | Title | Type | File | Effort | Owner |
|---|---|---|---|---|---|
| BUG-01 | Remove silent `'starter'` fallback — re-throw on plan resolution failure | bug-fix | `stripe.ts:79`, `webhook/route.ts:42-55` | S | backend-engineer |
| BUG-04 | Fail fast on missing STRIPE_WEBHOOK_SECRET; add billing-env health check | bug-fix | `stripe.ts:93`, new `/api/health/billing` | S | backend-engineer |
| BUG-03 | Surface error state in UpgradeButton when API returns `error` string | bug-fix | `UpgradeButton.tsx:46-52` | S | frontend-engineer |
| QA-01 | Minimum test suite: unit for plans/stripe, integration for webhook events, integration for checkout | test | `apps/web-app/e2e/` + new `src/**/*.test.ts` | M | qa-engineer |
| F-COH-01 | Fix healthScores copy contradiction (Starter feature vs FAQ intelligence-layer definition) | copy | `config.ts:72`, `pricing/page.tsx:26` | S | product-manager → frontend-engineer |
| F-COH-02 | Reframe Starter value story from "clean exports" to outcome | copy | `pricing/page.tsx:145` | S | product-manager → frontend-engineer |
| G-02 | Add upgrade link to UsageQuotaMeter at 80% threshold | UX | `UsageQuotaMeter.tsx` | S | frontend-engineer |

### P1 — Ship within next 2-3 iterations
| ID | Title | Type | Effort |
|---|---|---|---|
| BUG-02 | Add `WebhookEvent` table + idempotency guard | bug-fix | M |
| BUG-05 | Customer-creation TOCTOU fix (unique constraint + conditional update) | bug-fix | M |
| BUG-06 | Atomic quota check (serializable transaction) | bug-fix | M |
| BUG-07 | Change `subscriptionStatus` default from `'trialing'` to `'none'` + migration | bug-fix | S |
| BUG-08 | Add `@@index` + `@@unique` on `stripeSubscriptionId`, `stripeCustomerId` | bug-fix | S |
| BUG-09 | Audit `config.ts.stripePriceId` usage; consolidate or delete | hygiene | S |
| G-01 | **14-day Team trial triggered at first recording upload** | feature | L |
| G-04 | Remove "No credit card required" from paid-plan cards | copy | S |
| F-COH-03 | Rename "Growth" display label → "Automate" or "Pro" | copy | M |
| G-05 | State trial length explicitly on pricing page ("14-day free trial") | copy | S |
| G-06 | Reorder feature comparison table — lead with intelligence layer | UX | S |
| G-07 | Surface annual savings ("Save $504/yr") before toggle click | UX | S |
| G-08 | Fire `upgrade_clicked` from in-app `UpgradeCTA` | instrumentation | S |

### P2 — Next iteration cycle
| ID | Title | Type | Effort |
|---|---|---|---|
| BUG-10 | Pin Stripe API version | hygiene | S |
| BUG-11 | Rate limit billing routes | security | M |
| F-COH-04 | Add "Pro" tier at ~$99 between Starter and Team | strategic | L |
| F-COH-05 | Add seat-cap subtitles to Team ("up to 8") and Growth ("up to 25") | copy | S |
| G-09 | Cancel-prevention interstitial before Stripe portal | UX | M |
| G-10 | Extract hardcoded prices from docs + ROICalculator into `config.ts` | hygiene | S |
| F-COH-06 | Annual discount label: lead with "2 months free" not "~17% off" | copy | S |
| OBS-01 | `WebhookEvent` table + admin view for subscription-DB sync verification | observability | M |

### P3 — Backlog
| ID | Title | Type |
|---|---|---|
| F-COH-07 | Intelligence-layer preview (blurred card) in Starter dashboard | UX |
| F-COH-08 | Replace Enterprise `mailto:` with `/contact?plan=enterprise` form | UX |
| G-11 | Build `/compare/tango` and `/compare/guidde` comparison pages | content |
| DATA-01 | `Subscription`, `Invoice`, `WebhookEvent` dedicated tables for auditability | data-model |

---

## Mode Routing & Next Iteration Recommendations

Per CLAUDE.md operating modes:

**Mode 3 (Debugging, out of cadence) — recommended for immediate action:**
- BUG-01 (silent plan under-provisioning) — **ship this first, this week**
- BUG-04 (missing WEBHOOK_SECRET silent failure) — **ship with BUG-01**
- BUG-03 (UpgradeButton silent error) — **ship with BUG-01**

These are active revenue-integrity bugs and should not wait for bounded iteration scheduling. Recommend one combined Mode 3 commit: "fix(billing): remove silent plan fallback, add secret-check, surface upgrade errors."

**Backlog additions (new items) — recommended to add to IMPROVEMENT_BACKLOG.md:**
- All P0 items not in the Mode 3 block above
- All P1 items
- All P2 items
- P3 items flagged as "consider"

**Strategic direction to confirm with user before backlogging:**
- **F-COH-04 (Pro tier $99)** — requires Stripe product creation + pricing-page redesign + DB gating changes. This is a pricing strategy decision, not an engineering task. Needs explicit CEO sign-off before any code work.
- **G-01 (14-day Team trial)** — same: requires trial_end_at field, onboarding trigger, upgrade-on-expiry flow, email sequence. Strategic decision first, then PRD, then build.
- **F-COH-03 (rename Growth → Automate/Pro)** — requires cross-file copy change + coordinated announcement. Marketing decision.

---

## Governance Notes for Coordinator

- **Cadence impact:** this audit is read-only and does not consume an iteration slot. No Mode 5 directed sequence was started.
- **Backlog pool:** pre-audit size was 15. Adding P0-P2 findings will push pool to ~30+ items. This exceeds the MR-002 Change C pool-size ceiling (>8) — **every bounded iteration after audit intake will be a forced burn-down pick**, except where portfolio overrides apply (release-blocker cadence, saturation rule).
- **Follow-up closure ratio target:** ≥0.25 by iter 018 (MR-003 KPI). Adding 30+ items will collapse this ratio unless intake is paced.
- **Intake pacing recommendation:** add only the P0 items as real backlog rows (7 items). Hold P1/P2/P3 in this audit document as a "cold pool" and pull into the live backlog one at a time as iterations consume the P0s. This preserves pool-size ceiling behavior and follow-up closure ratio.
- **Meta-review trigger risk:** adding 30+ follow-up items in one intake could misleadingly fire "follow-up accumulation >10" early trigger. Classify audit-derived items as `audit-intake` to distinguish from iteration-generated follow-ups.

---

## Files Inspected (Evidence Trail)

**Surface map (Explore agent):** `apps/web-app/src/lib/plans.ts`, `apps/web-app/src/lib/config.ts`, `apps/web-app/src/lib/stripe.ts`, `apps/web-app/src/lib/feature-gating.ts`, `apps/web-app/src/lib/admin-allowlist.ts`, `apps/web-app/prisma/schema.prisma`, `apps/web-app/src/app/api/billing/checkout/route.ts`, `apps/web-app/src/app/api/billing/webhook/route.ts`, `apps/web-app/src/app/api/billing/portal/route.ts`, `apps/web-app/src/app/(public)/pricing/page.tsx`, `apps/web-app/src/components/PricingCards.tsx`, `apps/web-app/src/components/UpgradeButton.tsx`, `apps/web-app/src/components/UsageQuotaMeter.tsx`, `apps/web-app/src/app/(public)/pricing/ROICalculator.tsx`, `apps/web-app/src/app/(public)/compare/scribe/page.tsx`, `apps/web-app/src/app/(public)/docs/page.tsx`, `apps/web-app/e2e/api/feature-gating.spec.ts`, `apps/web-app/e2e/api/account.spec.ts`, `apps/web-app/e2e/public/pricing.spec.ts`, `apps/web-app/e2e/app/upload.spec.ts`, `apps/web-app/e2e/seed-test-db.js`.

**Specialist artifacts:** product-manager (strategic coherence), backend-engineer (technical correctness, 11 enumerated bugs), qa-engineer (coverage inventory + 16 lifecycle transitions + 15-step manual smoke checklist), growth-strategist (conversion funnel + positioning + 10 prioritized recommendations).

---

## CEO Decision Points

1. **Approve immediate Mode 3 fix for BUG-01 + BUG-04 + BUG-03?** (recommended: yes, one combined commit this iteration; revenue-integrity severity)
2. **Approve audit-intake of P0–P2 items into backlog with `audit-intake` tag?** (recommended: yes, but phased — P0 immediately, P1/P2 released as P0 burns down)
3. **Approve exploration of Pro tier ($99) as Phase 2 pricing work?** (strategic; needs PRD delta; recommend product-manager scope the PRD in a future bounded iter)
4. **Approve 14-day Team trial as a growth initiative?** (G-01; highest-leverage; needs product-manager PRD + engineering scoping; recommend dedicated iteration after BUG-01 ships)
5. **Approve the "Growth → Automate" rename?** (marketing/positioning decision; recommend deferring until Pro tier strategy is settled)

End of audit. Awaiting direction.
