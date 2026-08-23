# Subscription Readiness Audit + Plan 001

**Date:** 2026-08-23
**Scope:** the two purchasable subscription tiers — **Starter ($49)** and **Solo ($89)**
**Why:** these are the primary monetization mechanism. Team ($249) and Growth ($799) remain deliberately unsellable pending the team data layer (`docs/meta/REVENUE_PLAN_20K/team_workspace_status.md`).
**Method:** traced the full chain in source and against the live site. Every claim below was verified, not inferred.

---

## 1. Verdict

**The code is completely connected. The configuration is not.**

| Link in the chain | Starter | Solo |
|---|---|---|
| Plan definition (`plans.ts`) | ✅ | ✅ |
| Price + annual config (`config.ts`) | ✅ $49 / $41-eq | ✅ $89 / $74-eq |
| Pricing page, self-serve | ✅ | ✅ |
| `VALID_PLANS` in checkout | ✅ | ✅ |
| Stripe price IDs (monthly + annual) | ✅ **configured** | ❌ **MISSING** |
| Price→plan reverse map | ✅ auto-derived | ✅ auto-derived (once IDs exist) |
| Webhook provisioning | ✅ | ✅ (solo correctly excluded from Team creation) |
| Entitlement / feature gates | ✅ | ✅ intelligence layer granted; team features correctly withheld |
| MRR accounting | ✅ | ✅ monthly + annual-equivalent |
| Billing portal | ✅ | ✅ |

**Starter is sellable today. Solo is not — for one reason only.**

---

## 2. The blocking defect

`gh secret list` confirms these exist: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STARTER_{MONTHLY,ANNUAL}_PRICE_ID`, `STRIPE_TEAM_*`, `STRIPE_GROWTH_*`, `STRIPE_PRO_PRICE_ID`.

**`STRIPE_SOLO_MONTHLY_PRICE_ID` and `STRIPE_SOLO_ANNUAL_PRICE_ID` do not exist.**

Consequence, verified against the live site: `/pricing` renders Solo at $89 with a live self-serve button. Clicking it calls checkout, `getPriceId('solo', …)` returns null, and the route returns **HTTP 503**.

`UpgradeButton` does handle this — it surfaces `data.error` in a `role="alert"` — so it is not a silent dead-end. But the message shown to a paying customer is:

> **"Billing not configured for this plan"**

That is an internal diagnostic, not customer copy. A prospect who clicks Buy on your differentiated tier is told the product is misconfigured.

**Fix:** `pnpm --filter @ledgerium/web-app stripe:setup-solo -- --apply --live`, then the two `gh secret set` commands it prints, then redeploy. The script is idempotent, refuses live mode without an explicit flag, and warns if an existing price disagrees with config. **Annual is $888/year, not $74** — $74 is the monthly-equivalent used for display and MRR.

---

## 3. Gaps beyond the missing IDs

Ordered by expected revenue impact.

### G1 — Subscriptions have no availability pre-check (P0)
The service SKUs got `GET /api/billing/sku-availability`, so a purchase surface can ask "is this configured?" before rendering a live button. **Subscriptions never got the equivalent.** The tier renders as buyable regardless of whether Stripe can actually charge for it.

This is why the Solo button is live today with no backing price. The same would happen for any future tier.

*Fix:* extend the availability endpoint to cover subscription plans, and have `PricingCards` render an honest "not yet available" state instead of a button that 503s. ~half a day.

### G2 — Customer-facing copy is internal diagnostic (P0, trivial)
"Billing not configured for this plan" should never reach a customer. Even with G1, the failure path needs human copy.

*Fix:* map billing error codes to customer language at the UI boundary, same pattern as `mapCreateTeamError` and `dashboardActionError`. ~1 hour.

### G3 — Portal plan switching is off by default (P0, no code)
Stripe's Customer Portal **does not offer plan switching unless enabled in the Dashboard.** `checkout/route.ts` deliberately redirects existing subscribers to the Portal for plan management — so until that setting is on, **a Starter customer cannot upgrade to Solo at all**, and the upsell path from the cheap tier to the differentiated one does not exist.

This is `STRIPE_SETUP.md` Step 3b. It is the single highest-value configuration item after the Solo price IDs, because Starter→Solo is the natural expansion path.

### G4 — No end-to-end transaction has ever been completed (P1)
Every layer is unit- and integration-tested, and the webhook is hardened (idempotency, SCA, disputes, double-billing gate). **But no real Stripe Checkout has ever been completed against this system, in test mode or live.** Unit tests cannot catch a wrong price ID, a mis-scoped webhook subscription, or a Portal misconfiguration.

This is the same class of gap as the extension's: unit tests green, real runtime broken (iter 097/099).

*Fix:* one test-mode purchase per tier per interval — 4 transactions — verifying: checkout completes, webhook provisions the right plan, entitlement flips, MRR tile counts it, Portal can cancel. **This should be a gate before any paid traffic.** ~2 hours.

### G5 — Trial eligibility is untested against Solo (P1)
`TRIAL_PERIOD_DAYS` is 14 and gated to first-time subscribers. The eligibility check was written when Starter was the only purchasable tier. Its behaviour for a Solo purchase — and for a Starter customer who later buys Solo — is asserted in unit tests but never observed.

Covered by G4 if the test matrix includes a trialing purchase.

### G6 — No proration/upgrade semantics decision (P2)
When Starter→Solo becomes possible via G3, Stripe's proration behaviour is whatever the Portal is configured to do. Nobody has decided whether mid-cycle upgrades should prorate immediately or at period end. Not blocking, but it will surface as a support question the first time someone upgrades.

### G7 — `stripePriceId` in `PRICING_CONFIG` is dead code (P3)
Flagged during the Solo build. Unused everywhere, reads as a stale second source of truth next to `ONE_TIME_PRICES`/`STRIPE_PRICES`. Harmless but misleading; delete or wire it.

---

## 4. Plan

**Phase 0 — unblock Solo (today, ~30 min, mostly CEO)**
1. Run `stripe:setup-solo -- --apply --live`; set the two secrets; redeploy.
2. Enable plan switching in the Stripe Customer Portal (Step 3b).
3. **Gate:** `/pricing` Solo button reaches Stripe Checkout rather than a 503.

**Phase 1 — prove it works (~half a day)**
4. G4: four test-mode transactions (Starter/Solo × monthly/annual). Verify provisioning, entitlement, MRR, cancellation.
5. **Gate:** a real subscription exists end-to-end and the MRR tile shows the correct figure.

**Phase 2 — stop shipping dead buttons (~1 day, engineering)**
6. G1: subscription availability pre-check.
7. G2: customer-facing billing error copy.
8. **Gate:** with Stripe env deliberately unset in a test run, no tier renders a live buy button, and no internal diagnostic string is reachable by a customer.

**Phase 3 — expansion path (~half a day)**
9. G6: decide and document proration behaviour.
10. G5: confirm trial semantics observed, not just asserted.
11. G7: remove or wire the dead field.

---

## 5. What is deliberately not in this plan

- **Team and Growth.** They stay unsellable until the team data layer exists. Enabling them is a one-day mechanical change and would be the wrong thing to ship — a paid workspace currently confers no team capability.
- **Pricing changes.** $49 and $89 are current; the $79–99 band for Solo was a proposal and remains a one-line change.
- **New tiers or SKUs.** The constraint is that nothing has ever been bought, not that there is too little to buy.

---

## 6. The honest summary

The subscription machinery is in good shape: correct provisioning, hardened webhooks, trustworthy MRR, working entitlement, real tests behind all of it.

**Two configuration steps stand between that machinery and revenue** — the Solo price IDs, and Portal plan switching. Both are Stripe Dashboard work measured in minutes.

The engineering gaps that remain (G1, G2) are about *not showing customers buttons that cannot work* — real, but secondary to the fact that the tier is currently unbuyable at all.
