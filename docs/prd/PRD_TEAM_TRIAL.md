# PRD — 14-Day Team Trial

**Status:** Approved — 2026-04-20 (coordinator-delegated per CEO directive "move forward with your suggestions")
**Owner:** product-manager
**Approved by:** coordinator (CEO delegation)
**Created:** 2026-04-20
**Approved:** 2026-04-20
**Mode 3 origin:** PRICING_AUDIT_001.md decision point 4 (G-01 / CEO-approved)
**Phase:** Define → ready for Design (UX + system-architect handoff)
**Blocker:** BUG-07 — **promoted from cold pool to live backlog on approval**; must close before this feature enters Build phase. See §6 and §12 for corrected BUG-07 characterization.
**Open questions:** 0 (all 5 resolved — see §12 Decisions Locked)

---

## 1. Problem Statement

Free users of Ledgerium AI never experience the intelligence layer before paying $249/month for Team. The features that differentiate Ledgerium from Scribe ($23/user) — `bottleneckAnalysis`, `variantDetection`, `automationScoring`, `intelligenceLayer` — are gated behind Team, making every prospective Team buyer pay blind.

Evidence from `PRICING_AUDIT_001.md` (Part 4, G-01, P0):

> "Today, free users only experience the SOP-capture use case... Every prospect takes a blind leap across the paywall."

The audit's cross-specialist consensus table (Part 1) flags "No free trial to Team — intelligence layer invisible to free users" as a P0 finding, flagged independently by the growth-strategist lens.

The result: a structurally sound pricing ladder with an activation gap that makes conversion a leap of faith rather than an earned decision.

**Who has this problem:** Prospective Team buyers — typically process improvement leads or team leads at 5–25 person organizations — who cannot justify $249/month without experiencing the intelligence layer first.

**Job to be done:** Evaluate whether Ledgerium's intelligence layer is worth a team subscription, using real workflow data, before committing.

**Why now:** The pricing audit (2026-04-20) has surfaced this as the single highest-leverage growth change available. The P0 billing bugs (BUG-01, BUG-03, BUG-04) are now addressed (Mode 3, iter 016-17), which means the activation path is safe to build on.

---

## 2. Goals / Non-Goals

### Goals

- Give prospective Team buyers a time-bounded, full-fidelity experience of Team features before their first payment.
- Increase trial-to-paid conversion rate from 0% (no trial exists) to a measurable target.
- Make the intelligence layer a felt experience, not a feature checklist.

### Non-Goals

- This is NOT a feature gate bypass. Trial users receive the same entitlements as paying Team subscribers during the trial period — and exactly none beyond that on expiry.
- This is NOT a refund policy. Refunds remain governed by existing Stripe and business policies.
- This is NOT a product-led growth strategy rewrite. No changes to the Free tier, no freemium expansion, no changes to Starter.
- This is NOT a trial for any other tier (Starter, Growth, Enterprise). Scope is Team only.
- This does NOT address the Pro tier question (F-COH-04 in audit; separate PRD pending).

---

## 3. Trial Eligibility Rules

| Rule | Decision | Rationale |
|---|---|---|
| Who can start a trial | **Users on the Free plan ONLY** — all paid tiers (Starter, Pro, Team, Growth, Enterprise) are ineligible | Collapses trial state machine to one path: Free → Trial → {Converted-to-Team \| Expired-to-Free}. Prevents Pro→trial→downgrade churn paths (see `PRD_PRO_TIER.md` §12 D5 for cross-PRD coordination). Paid users who want Team upgrade via the standard path. |
| One trial per user | Yes — one lifetime trial per `user.id` | Prevents serial trial abuse; enforced by a `trial_used_at` timestamp field on the user record |
| One trial per organization / email domain | No domain restriction at MVP | Domain-level restriction adds complexity; email verification (locked as required — see below) is the sufficient abuse guard for v1 |
| Credit card required | **No** (locked, §12 D1) | Removing friction at trial entry is the primary activation goal; Phase-1 Ledgerium growth needs trial volume > trial quality at this stage; CC is collected at conversion |
| Email verification required | **Yes** (locked, §12 D3) | Email IS the product for Team collaboration (team invites go by email); verification is not conversion friction, it is identity-gate validation. Doubles as abuse guard. |
| Trial length | 14 calendar days from start trigger | Audit recommendation G-01; long enough for meaningful team workflow evaluation |
| Eligibility re-check | Eligibility is evaluated at trial-start time, not at each session | Simpler state machine; one gate |

**Trial-start event sequence** (per D3 email-verification decision):

1. User clicks "Try Team free for 14 days" CTA.
2. Server checks eligibility: `plan === 'free'` AND `trial_used_at === null` AND `email_verified_at !== null`.
3. If `email_verified_at === null`: send verification email inline and display "Verify your email to start your trial" state. User clicks link → `email_verified_at` is set → trial CTA becomes `Start trial` (one click).
4. If all three conditions pass: create Stripe Subscription with `trial_period_days: 14`, set `trial_used_at = now()`, `trial_end_at = now() + 14d`, `subscriptionStatus = 'trialing'`, `plan = 'team'`.

Email verification gates trial start but does NOT gate signup. Free-tier usage is available immediately after signup as today.

---

## 4. Trial Mechanics

### State Diagram

```
                        [User on Free plan]
                               │
                    clicks "Start free trial" CTA
                               │
                               ▼
                    ┌─────────────────────┐
                    │    TRIAL ACTIVE      │
                    │  (14 calendar days)  │
                    │  Full Team features  │
                    └──────────┬──────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
         User converts                   Trial expires
         (enters payment                 (day 14 23:59 UTC)
          before day 14)                       │
               │                               ▼
               ▼                    ┌─────────────────────┐
    ┌─────────────────────┐         │      EXPIRED         │
    │  ACTIVE TEAM        │         │  Grace period: none  │
    │  (paying subscriber)│         │  Immediate downgrade │
    └─────────────────────┘         └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  DOWNGRADED TO FREE  │
                                    │  Data retained;      │
                                    │  Team features gated │
                                    └─────────────────────┘
```

**Cancellation during trial:** User may cancel at any time. Cancellation ends the trial immediately; user is downgraded to Free. The `trial_used_at` field is already set, so the user cannot start a new trial. No refund applies (no charge was made).

**Conversion flow:** User clicks "Upgrade to Team" during trial. Standard Stripe checkout opens; CC collected; subscription created in Stripe; `customer.subscription.updated` webhook fires with `status: active`; DB plan set to `team`; trial state cleared.

**Grace period at expiry:** None (locked, §12 D2). Trial ends at day 14 23:59 UTC; user is immediately downgraded to Free. Rationale: clean state machine, deterministic transitions (Ledgerium principle); the accidental-churn risk that would motivate a grace period is addressed via the email reminder sequence (days 11 / 13 / 14, locked as required — see Dependencies §11f).

**Data at expiry:** All workflows and data created during trial are retained. Access to intelligence-layer outputs is gated; the underlying data remains. This is the standard downgrade behavior.

---

## 5. Entitlements During Trial

Trialing users receive the **full Team feature set** as defined in `apps/web-app/src/lib/plans.ts` (the single source of truth for all gating decisions):

| Feature key | Trial access |
|---|---|
| `cleanExports` | Yes |
| `healthScores` | Yes |
| `personalWorkspace` | Yes |
| `intelligenceLayer` | Yes |
| `bottleneckAnalysis` | Yes |
| `automationScoring` | Yes |
| `variantDetection` | Yes |
| `sharedLibrary` | Yes |
| `teamWorkspace` | Yes |
| Limits | `maxRecordingsPerMonth: unlimited`, `maxSeats: 5`, `maxRecorders: 3` |

Enterprise-only features (`sso`, `rbac`, `auditTrail`, `complianceExports`, `customRetention`) remain gated. Growth-only features (`advancedAnalytics`, `crossWorkflowComparison`, `agentComposition`, `integrationRisk`, `priorityExports`) remain gated. The trial is Team, not Growth.

Entitlement enforcement mechanism: the existing `hasFeature()` and `getPlanConfig()` functions in `plans.ts` already handle plan-based gating. The implementation needs to resolve the effective plan as `team` when `subscriptionStatus === 'trialing'` and `trial_end_at > now`. This is currently broken — see BUG-07 dependency below.

---

## 6. Stripe Integration Requirements

### Stripe configuration

- Use `trial_period_days: 14` on the Stripe Subscription object at creation.
- The Stripe Price/Product for Team must have a trial configuration. This requires a Stripe dashboard configuration step (see Dependencies §11b).
- No payment method collected at trial start (consistent with CC-not-required decision in §3).

### Webhook events to handle (new or extended)

The current webhook handler is at `apps/web-app/src/app/api/billing/webhook/route.ts`.

| Stripe event | Current handling | Required change |
|---|---|---|
| `customer.subscription.created` (with `status: trialing`) | Not handled | New: write `plan: 'team'`, `subscriptionStatus: 'trialing'`, `trial_end_at` to DB |
| `customer.subscription.updated` (trial → active) | Partially handled — `trialing` maps to planStatus `'trialing'` at line 104, but the plan is set from the price ID. This path works for plan resolution but does not currently grant entitlements. | Confirm that when `status === 'trialing'`, plan is set to `team` (not `free`) and feature gating treats it as Team |
| `customer.subscription.trial_will_end` | Not handled | New: fire `trial_expiring_soon` analytics event; trigger Day 11 email |
| `customer.subscription.deleted` (trial canceled) | Handled — reverts to free | No change required |
| `invoice.payment_failed` (post-trial conversion attempt) | Handled — marks `past_due` | No change required; existing path handles this |

### BUG-07 — Blocking dependency (severity corrected 2026-04-20)

**BUG-07 must be resolved before this feature ships.**

`PRICING_AUDIT_001.md` Part 2, BUG-07:

> `subscriptionStatus` defaults to `'trialing'` for new free users (`apps/web-app/prisma/schema.prisma:16`). New users have no Stripe subscription. UI displaying "trial" messaging based on this field will mislead.

#### Severity correction (coordinator verification, 2026-04-20)

An earlier draft of this PRD claimed BUG-07 silently over-provisions Team entitlements to all new free users. **This claim is incorrect and has been corrected.** The verification evidence:

- Entitlement gating is driven by the `plan` field, not `subscriptionStatus`. Verified in `apps/web-app/src/lib/feature-gating.ts` (lines 43, 102, 169: `const plan = toPlanType(user.plan)`), `apps/web-app/src/hooks/useFeatureGate.ts` line 64, `apps/web-app/src/app/api/workflows/route.ts` line 349.
- The `plan` field defaults to `'free'` in the schema (`schema.prisma:15`), which correctly gates new users to Free entitlements.
- The `subscriptionStatus` field is read by: (a) account-page display (`account/page.tsx:456`), (b) the "already subscribed" check in checkout (`checkout/route.ts:78` — which gates an upgrade attempt, not an entitlement grant). No feature-gating code reads `subscriptionStatus`.
- The webhook handler at `webhook/route.ts:111` correctly treats Stripe's `'trialing'` status as entitlement-granting for real Stripe subscriptions (`isActive = status === 'active' || status === 'past_due' || status === 'trialing'`), which is correct and already supports the trial feature.

**Therefore:** BUG-07 is **not** a current revenue leak. New free users get Free entitlements correctly.

#### Why BUG-07 is still a blocking dependency for this feature

The Team Trial feature introduces new UI logic and analytics events that key on `subscriptionStatus === 'trialing'`:

- Trial countdown badge in navigation (§7 surface 5) — would show for every free user who has not yet started a trial.
- `trial_expiring_soon` analytics event (§8) — would misfire for non-trialing users.
- Day-11 email trigger (§11f) — would misfire for non-trialing users.
- `customer.subscription.trial_will_end` reconciliation logic — cannot reliably distinguish "genuine Stripe trial" from "brand-new free account" if the schema default is `'trialing'`.

Because *this PRD* introduces these `subscriptionStatus`-keyed surfaces, BUG-07 becomes a hard blocker for *this feature*, even though it is not a current revenue leak. Shipping the Team Trial before BUG-07 closes would cause UX misfires and instrumentation noise, not entitlement over-grants.

#### Required fix

Change `subscriptionStatus @default("trialing")` to `@default("none")` in `apps/web-app/prisma/schema.prisma:16`. Also: update `apps/web-app/src/app/api/auth/signup/route.ts:43` (which explicitly sets `subscriptionStatus: 'trialing'` on signup — matching the broken default) to write `'none'` for new Free-tier signups. Generate and apply Prisma migration.

#### Promotion note

Per the audit-intake pattern, BUG-07 was held in `PRICING_AUDIT_001.md` cold pool pending approval of a feature that would block on it. This PRD's approval triggers promotion of BUG-07 to the live backlog as a prerequisite item. The promotion is handled by coordinator as part of this approval pass — see `IMPROVEMENT_BACKLOG.md` updates in the same governance snapshot.

---

## 7. UX Surfaces (Scope Only)

The UX specialist will design these surfaces. This section identifies where the trial experience must exist — not how it looks.

**Trial entry points (where "Start free trial" CTA must appear):**

1. Pricing page — Team card CTA (currently reads "Start Trial" with no duration stated; audit G-05 notes the trial length appears nowhere)
2. In-app `FeatureGate` component — when a Free user hits a Team-gated feature lock
3. `UsageQuotaMeter` at 80% threshold — audit G-02 flags this as the highest-intent moment; the upgrade link added by G-02 should surface a trial option
4. Onboarding flow — after first recording upload is the trigger moment per audit G-01

**Trial status display (active trial):**

5. Navigation bar — trial badge showing days remaining (e.g., "Trial: 8 days left")
6. Account page — countdown to trial end + conversion CTA

**Trial expiry experience:**

7. In-app modal or banner on session entry after expiry — must show what was lost and provide a direct upgrade path
8. Account page — post-expiry state with "Upgrade to keep access" CTA

**Transactional email surfaces (listed here for completeness; owned by email/backend):**

9. Trial started (Day 0)
10. Trial ending soon (Day 11)
11. Trial expired (Day 14 + 1 hour)
12. Trial converted (confirmation)

---

## 8. Analytics Events

All events follow the existing `analytics.ts` convention: `snake_case`, action-oriented, `{ event, ...properties }` shape. Server-side events use `trackServer()` from `analytics-server.ts`.

The following events must be added to the `AnalyticsEvent` union type in `apps/web-app/src/lib/analytics.ts`:

```
trial_started          — server-side, on Stripe subscription creation with trialing status
  userId: string
  plan: 'team'
  source: 'pricing_page' | 'feature_gate' | 'usage_meter' | 'onboarding'
  trialEndsAt: string  // ISO timestamp

trial_expiring_soon    — server-side, on customer.subscription.trial_will_end (day 11)
  userId: string
  plan: 'team'
  daysRemaining: number

trial_converted        — server-side, on subscription status transition trialing → active
  userId: string
  plan: 'team'
  trialDurationDays: number   // days from trial_started to conversion
  source: 'in_app_cta' | 'email' | 'pricing_page'

trial_expired          — server-side, on trial end without conversion
  userId: string
  plan: 'team'
  activatedFeatures: string[] // which Team features the user actually used during trial
  trialDurationDays: number

trial_canceled         — server-side, on user-initiated cancellation before expiry
  userId: string
  plan: 'team'
  daysCanceled: number        // days elapsed at cancellation
```

These events align with the existing billing event group in `analytics.ts` (lines 95–103) and the `trackServer()` pattern already used in `webhook/route.ts` (lines 90, 133).

---

## 9. Success Metrics

All metrics have a "Before" baseline of 0 — the trial feature does not exist today.

| Metric | Definition | Before | Target (90-day post-launch) | Measurement method |
|---|---|---|---|---|
| **Trial start rate** | % of free users who start a trial within 30 days of signup | 0% | 15% | `trial_started` / `signup_completed` events, same cohort |
| **Trial-to-paid conversion rate** | % of trials that convert to a paid Team subscription before expiry | 0% | 25% | `trial_converted` / `trial_started` per cohort |
| **Time to activation during trial** | Days from `trial_started` to first intelligence-layer feature use (bottleneck/variant/automation) | N/A | Median ≤ 3 days | Days between `trial_started` and first `tab_switched` or `insights_viewed` on an intelligence-layer tab |
| **Trial abandonment day** | Day distribution of `trial_expired` (non-converting) events — identifies where users disengage | N/A | Median abandonment day > 7 (indicating real engagement before drop-off, not day-1 bounce) | Distribution of `trialDurationDays` in `trial_expired` events |
| **30-day Team retention (converted)** | % of converted Team subscribers still active 30 days after conversion | TBD — needs baseline from general subscription data | ≥ 70% | Active subscription status at T+30 days post `trial_converted` |

**Leading indicators to watch in first 30 days:**

- `trial_started` event volume (absolute count — confirms CTA surfaces are working)
- `trial_expiring_soon` → `trial_converted` same-session rate (measures email + day-11 urgency effectiveness)
- `activatedFeatures` distribution in `trial_expired` events (which features were used by churning users — informs onboarding targeting)

**Incomplete metric note:** "Trial start rate by traffic source" requires UTM attribution on `trial_started`. The `getFirstTouchUTM()` helper exists in `analytics.ts` (line 242) and should be included in the `trial_started` payload. Without it, this sub-metric cannot be measured.

---

## 10. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Trial abuse — multiple trials per user** | Medium | Low-medium (cost of entitlements, not cash) | `trial_used_at` timestamp enforced at server side; once set, trial CTA is suppressed and the field is immutable |
| **Cannibalization — existing Team subscriber cancels, re-trials** | Low | Medium | Trial eligibility gated on `plan === 'free'` at trial-start time. Current Team subscribers on `plan: 'team'` are ineligible. Assumption: this is enforceable — validate after 30 days of data |
| **Payment failure at conversion** | Medium | Medium | Existing `invoice.payment_failed` → `past_due` path handles this. Trial users who fail to pay at conversion day 14 are downgraded to free; re-subscription is available via standard upgrade path. No unique risk |
| **BUG-07 dependency not closed before ship** | High (if not tracked) | Medium — UX misfire + analytics noise (NOT entitlement over-grant; see §6 severity correction) | BUG-07 is a **hard blocker for this feature specifically** (§6). Promoted from cold pool to live backlog on this PRD's approval; see `IMPROVEMENT_BACKLOG.md` |
| **CC-not-required increases non-converting volume** | Medium | Low (no revenue impact; some analytics noise) | Acceptable at MVP per §12 D1; re-evaluate at 90-day retrospective alongside trial-conversion-rate data |
| **Trial status UI shown to non-trialing free users** | High (pre-BUG-07 fix) | Medium (UX confusion, instrumentation noise) | BUG-07 fix removes the `@default("trialing")` and corresponding explicit assignment in signup route. Blocked until then |
| **Accidental churn at trial end (no grace period)** | Medium | Low-medium | Mitigated via email reminder sequence at days 11 / 13 / 14 (Dependency §11f). Grace period rejected (§12 D2) in favor of communication-layer mitigation that preserves state-machine determinism |

---

## 11. Dependencies (Ordered)

Dependencies are ordered by blocking relationship. Each must be complete before the next begins unless noted.

**a. BUG-07 fix — BLOCKER** (severity corrected; see §6)
Change `subscriptionStatus @default("trialing")` to `@default("none")` in `apps/web-app/prisma/schema.prisma:16`. Update `apps/web-app/src/app/api/auth/signup/route.ts:43` to write `'none'` rather than `'trialing'` on new Free-tier signup. Generate and apply Prisma migration. Without this, trial-keyed UI surfaces and analytics events introduced by this PRD will misfire on non-trialing free users. **NOT** a revenue leak today (verified — entitlements flow through `plan` field, which defaults correctly to `'free'`), but a hard blocker for this feature because this feature introduces the surfaces that misfire. Promoted from audit cold pool to live backlog on this PRD's approval.

**b. Stripe Product/Price configuration**
The Team Stripe Price must be configured with `trial_period_days: 14` in the Stripe dashboard (or via Stripe API at subscription creation). No code dependency — operational step — but must be done before any checkout test can complete the trial flow. Assumption to validate: whether to configure trial at the Price level (applies globally) or pass `trial_period_days` per-checkout-session (more flexible). CEO or backend lead must decide; affects §c scope.

**c. Backend changes**
- Webhook handler: add `customer.subscription.created` handling for `status: trialing` (write `plan: team`, `subscriptionStatus: trialing`, `trial_end_at`).
- Webhook handler: add `customer.subscription.trial_will_end` handler (fire `trial_expiring_soon` event; trigger Day 11 email queue entry).
- Feature gating: confirm `subscriptionStatus === 'trialing'` grants Team entitlements (after BUG-07 closes).
- DB schema: add `trial_used_at DateTime?` and `trial_end_at DateTime?` fields to User model; migration required.
- Checkout route (`apps/web-app/src/app/api/billing/checkout/route.ts`): add trial eligibility check before session creation; return structured error if user has already used trial.

**d. Frontend changes**
- Add `trial_started` source-tracking to checkout initiation.
- Add trial-status surfaces identified in §7 (trial badge, countdown, expiry modal).
- Update `UpgradeButton` / `FeatureGate` to surface "Start free trial" CTA for eligible Free users.
- Post-expiry downgrade experience (§7 items 7–8).

**e. Analytics instrumentation**
Add five new event types to `AnalyticsEvent` union in `apps/web-app/src/lib/analytics.ts` (see §8). Wire `trackServer()` calls in webhook handler for server-side events. Wire `track()` calls in frontend components for source attribution.

**f. Transactional emails — required (locked per §12 D2)**
Five emails, not four. §12 D2 replaces the rejected grace-period mitigation with an email reminder sequence:

1. **Day 0** — trial started (onboarding-style; "here's how to get value in 3 days")
2. **Day 11** — trial ending in 3 days (soft nudge, primary CTA: convert)
3. **Day 13** — trial ending tomorrow (urgency nudge, primary CTA: convert)
4. **Day 14** — trial expired (downgrade confirmation, secondary CTA: upgrade)
5. **Any day** — trial converted (confirmation, success framing)

Email infrastructure not surveyed in this PRD; flag as a dependency with unknown current state. Backend-engineer audit of email delivery system is a prerequisite for Build phase. If email infrastructure does not currently support scheduled day-N sends, that capability is a sub-dependency of this item (not separately tracked here, but must be surfaced by the architect during Design phase).

Additionally (locked per §12 D1 for Pro launch coordination): one-time "Pro is available" announcement email fires for existing Starter subscribers on Pro launch day. This is a Pro-tier concern but shares the transactional-email infrastructure gate; coordinating the two audits reduces duplicate work.

**g. QA integration tests**
At minimum: trial start happy path, trial-used block (attempt second trial), trial expiry → downgrade, trial → conversion webhook path, BUG-07 regression (new free user does not get trialing entitlements). Likely overlaps with QA-01 (audit-intake item for minimum billing test suite). Recommend coordinating with QA-01 scope when that item is selected.

---

## 12. Decisions Locked

The 5 open questions have been resolved by coordinator delegation per CEO directive ("move forward with your suggestions or assumptions on pro tier and team trial"). All decisions are reversible and tuned to preserve Ledgerium's determinism and evidence-linked principles.

### D1 — Credit card NOT required at trial start.

**Decision:** No CC collected at trial start. CC is collected at the moment of conversion (day 14 or earlier, via the standard Stripe checkout flow).

**Rationale:**

- Ledgerium is in Phase 1; activation volume matters more than trial quality at this stage.
- The audit's G-01 finding recommends removing every possible friction point from the "prospect → felt intelligence-layer experience" path; CC collection is the largest friction item remaining after email verification.
- The volume-vs-quality tradeoff is measurable: if non-conversion rates are unacceptable at 90 days, flip to CC-required as a single-variable A/B test.

**Commitment:** 90-day retrospective evaluates trial-to-paid conversion rate (§9 target: 25%). If observed rate is <10%, trigger a CC-required A/B test as a follow-up iteration. If observed rate is 10–25%, hold the decision. If >25%, celebrate.

**Confirms PM default.**

### D2 — NO grace period at trial expiry. Email reminder sequence on days 11 / 13 / 14 (required).

**Decision:** Trial ends cleanly at day 14 23:59 UTC. User is immediately downgraded to Free. No grace period; no soft downgrade; no "extend my trial" CTA.

**Accidental-churn risk mitigation:** required email sequence on days 11, 13, and 14 (see Dependencies §11f, extended to 5 emails in this approval pass).

**Rationale:**

- State-machine determinism (Ledgerium principle). Grace periods add state transitions that complicate billing, entitlement, and UI code paths. A 48-hour grace period means 5 days (11 + 13 + 14 + grace-start + grace-end) of state-transition surface; determinism prefers 3 (11 + 13 + 14).
- Communication-layer mitigation handles the accidental-churn risk without state-machine complexity. Users who miss day-14 get day-11 AND day-13 warnings; missing all three is not an accidental-churn pattern but a deliberate-disengagement pattern.
- 90-day retrospective can re-evaluate: if the `trial_expired` distribution (§9 "Trial abandonment day") shows a spike at day 15–17 representing "users who would have converted with more time," add a grace period in a follow-up iteration. Reversible.

**Confirms PM default; adds email-sequence requirement.**

### D3 — Email verification REQUIRED before trial start.

**Decision:** User must have `email_verified_at !== null` to start a Team trial. Email verification is not required for Free-tier signup or Free-tier usage; it is only gated at the moment of trial initiation.

**Rationale:**

- Email IS the product for Team collaboration. Team invites go by email (see `PRICING_AUDIT_001.md` §Part 3 — invite flow). An unverified user cannot complete the Team workflow anyway; verification is not friction, it is feature-gate validation.
- Abuse guard: throwaway-email trial abuse is measurably reduced by verification requirement (industry-standard SaaS pattern). Combined with `trial_used_at` one-lifetime-trial-per-user enforcement, this is sufficient abuse protection for MVP; no domain-level restrictions needed.
- UX is minimal: one verification email, one click. The trial-start CTA surfaces this gate in a single inline state transition (see §3 trial-start event sequence).

**Dependency addition:** §11c backend changes now include `email_verified_at DateTime?` field on the User model (if not already present) plus a signup verification email flow (Day-0 verification email, click → sets `email_verified_at`). If this already exists in the codebase, this decision is a no-op for schema; if not, it is a sub-dependency of §11c.

**Overturns PM default** ("Not required in this PRD's eligibility rules") with explicit rationale: email verification is not friction, it is feature validation.

### D4 — CTA copy: "Try Team free for 14 days" (explicit duration, low-pressure).

**Decision:** Primary CTA copy on pricing page, in-app feature-gate surfaces, and onboarding is:

> **Try Team free for 14 days**

Secondary line (for surfaces with space): *No credit card required*.

**Rationale:**

- Ledgerium's brand voice is evidence-linked and low-pressure. Urgency framing ("Start free trial — only 500 left!" or time-limited offer language) contradicts the positioning.
- Explicit duration reduces buyer anxiety: users know exactly what they're committing to.
- "Try" signals evaluation, not purchase — reinforces the trial-as-activation-mechanism framing in §2 Non-Goals.
- UX specialist may modify micro-copy for specific surfaces (e.g., shorter text for a nav-bar badge) but the "14 days" duration must be visible at the primary CTA per audit G-05 (trial length currently appears nowhere on pricing page — this fix addresses that gap simultaneously).

**Confirms PM option 2 (of three PM-listed options).**

### D5 — Trial window: Fixed 14 days regardless of billing frequency.

**Decision:** Every trial is 14 calendar days. If Ledgerium introduces annual Team billing in the future, the trial window does NOT extend to match the billing cycle. The trial evaluates the product; billing frequency evaluates the purchase.

**Rationale:**

- Separation of concerns: trial length is an activation-velocity variable; billing frequency is a cash-flow variable. They should not be coupled.
- Schema future-proofing: `trial_end_at DateTime?` already supports arbitrary durations, so the decision is configuration-level (trial-length constant = 14), not schema-level. No forward compatibility required.
- If product signals a specific need for a longer annual-only trial in the future (e.g., enterprise procurement cycles), that is a separate PRD.

**Confirms PM intent (CEO flagged as out-of-scope for PRD but asked for future-proofing signal).**

---

**All 5 decisions take effect as of approval date (2026-04-20).** Team Trial feature is unblocked for Design phase entry. Dependency §11a (BUG-07 fix) is promoted from audit cold pool to live backlog as a prerequisite; see `IMPROVEMENT_BACKLOG.md` in the same governance snapshot.

---

*End of PRD — 14-Day Team Trial*
*Status: Approved 2026-04-20. Ready for Design phase handoff (UX + system-architect).*
