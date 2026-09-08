# Analytics Review — Can Ledgerium Measure Its Signup/Conversion Funnel?

**Author:** analytics agent
**Date:** 2026-09-02
**Scope:** apps/web-app instrumentation only (marketing site + app + billing + admin dashboard). Extension-side capture pipeline (recording behavior itself) is out of scope — this review is about the *business* funnel: landing → signup → install → first recording → SOP → pricing → checkout → paid.

## Verdict, up front

**No.** The event taxonomy is unusually well-built for a $0-revenue product (PII-conscious, versioned, admin-dashboarded, even self-diagnoses Stripe test-mode), but it was built to describe *product engagement*, not to answer the specific question the team is about to bet a growth decision on: **"is the funnel healthy, and would a Free-tier change move it?"** Three structural gaps make that question unanswerable today:

1. **The one funnel step that defines this product — "extension actually recorded something" — cannot be told apart from a manual JSON upload**, and the client-side activation milestone (`first_workflow_uploaded`) is *never fired at all* for extension-synced recordings (see §1, Extension install / first recording).
2. **Checkout failures are invisible.** The exact bug class described in the prompt — checkout silently broken site-wide — produces **zero analytics events of any kind**, and none of the 8 existing alert rules would have caught it. This is not a hypothetical; the code itself documents a real prior incident of this shape (`billing-mode.ts`, quoted in §2).
3. **Two dashboard metrics that look authoritative are structurally wrong** at the traffic levels this product currently has: `activationRatePct` and the raw workflow-volume counters are inflated by auto-seeded sample workflows created at every signup, independent of any real usage (§4).

None of this requires new tracking infrastructure — PostHog is configured PII-consciously and the first-party `AnalyticsEvent` table + admin dashboard already exist. The gaps are missing/duplicated *events* and one *query correctness bug*, not a missing system.

---

## 1. Funnel-stage table

| Stage | Measured today? | Event name | File reference |
|---|---|---|---|
| Landing (marketing page view) | **NOT INSTRUMENTED** in the system the team actually built dashboards against | none — homepage and `/pricing` are Server Components with zero `track()` calls | `apps/web-app/src/app/(public)/page.tsx` (no track calls); PostHog's own `capture_pageview: true` autocapture *may* fire independently if `NEXT_PUBLIC_POSTHOG_KEY` is set (`apps/web-app/src/lib/posthog.ts:43`), but that data never reaches the first-party `AnalyticsEvent` table or any dashboard the team reads |
| SEO/content landing pages (not homepage) | Instrumented | `seo_page_viewed`, `seo_hub_viewed` | `apps/web-app/src/lib/analytics.ts:533-567` |
| Signup completed | Instrumented | `signup_completed` | `apps/web-app/src/app/api/auth/signup/route.ts:94` (server-side `trackServer`, includes `visitorId` for attribution) |
| Extension install clicked (leaves site) | Instrumented, but measures **intent to leave**, not install | `extension_install_clicked { method, location }` | `apps/web-app/src/components/ExtensionInstallButton.tsx:42`, `apps/web-app/src/lib/install.ts:82` |
| Extension install **completed** | **NOT INSTRUMENTED — cannot be attributed at all** | none | No file anywhere in `apps/extension-app` calls home to the web app on install/first-launch (grepped for install/handshake/ping patterns — nothing found). The click event above is the last signal before the user leaves for the Chrome Web Store; nothing confirms they finished, or even that Chrome allowed the install. |
| Extension configured (API key generated) | Instrumented — best available proxy for "user is trying to connect the extension" | `extension_api_key_created { keyPrefix }` | `apps/web-app/src/app/api/keys/route.ts:44` — note this event is **not declared** in the `AnalyticsEvent` union in `analytics.ts` (only `trackServer`'s untyped string signature allows it), so it's invisible to anyone reading the taxonomy as documentation |
| First recording (extension-synced) | Instrumented but **conflated with manual upload, and the activation milestone doesn't fire for it at all** | `workflow_uploaded` fires; `first_workflow_uploaded` does **not** | `apps/web-app/src/app/api/sync/route.ts:260-268` |
| First recording (manual JSON upload) | Instrumented | `workflow_uploaded` + `first_workflow_uploaded` | `apps/web-app/src/app/(app)/upload/page.tsx:72-73` |
| SOP created / viewed | Instrumented, rich metadata | `sop_viewed`, `first_sop_viewed` | `apps/web-app/src/lib/analytics.ts:63-73`; first-view milestone via `trackActivation('first_sop', …)` at `apps/web-app/src/app/(app)/workflows/[id]/page.tsx:94` |
| Pricing page view | **NOT INSTRUMENTED** | none | `apps/web-app/src/app/(public)/pricing/page.tsx` — Server Component, zero `track()` calls anywhere in the file or in `PricingCards.tsx` except CTA *clicks* (line 231, 246) |
| In-app upgrade prompt shown (gate hit) | Instrumented — different from pricing-page view | `upgrade_prompt_viewed { location, plan }` | `apps/web-app/src/components/shared/UpgradeCTA.tsx:50` |
| Free-tier limit hit (5 recordings) | Instrumented, surfaced | `plan_limit_hit { limit, currentUsage, maxAllowed }` | `apps/web-app/src/app/api/upload/route.ts:30-35`, `apps/web-app/src/app/api/sync/route.ts:68-73` |
| Checkout started (session created) | Instrumented, but **double-fired** for every success and **silent on every failure** | `checkout_started` fires server-side *and* client-side for the same attempt | Server: `apps/web-app/src/app/api/billing/checkout/route.ts:215` (one-time), `:412` (subscription). Client: `apps/web-app/src/components/UpgradeButton.tsx:61` — only reached after `res.json()` returns a truthy `url`, i.e. only on success |
| Checkout failed | **NOT INSTRUMENTED for the failure modes that matter** | `upgrade_blocked` exists but is deliberately restricted to `admin_bypass` / `already_subscribed` only | `apps/web-app/src/components/UpgradeButton.tsx:73-79` — the comment explicitly excludes `plan_not_configured` / `checkout_session_failed` ("would misrepresent the funnel") with no replacement event added |
| Checkout complete / subscription created | Instrumented, but **entirely webhook-dependent** | `subscription_created { plan, status, visitorId }` | `apps/web-app/src/app/api/billing/webhook/route.ts:409-418` (fires inside `checkout.session.completed` handler) |
| One-time SKU purchase complete | **NOT INSTRUMENTED** | none | `createOneTimeCheckoutSession` (`checkout/route.ts:141-229`) tracks `checkout_started` only; there is no completion event on the `success_url` path or a webhook-driven event for one-time purchases |
| Return visit / re-engagement | Instrumented, but **narrowly defined as "uploaded again"** | Retention cohort table keyed on `workflow_uploaded` only | `apps/web-app/src/app/api/analytics/retention/route.ts:11,64-73` |
| Login (any return visit) | Instrumented but not surfaced as a return-funnel step | `login_completed` | `apps/web-app/src/app/(public)/login/LoginPageClient.tsx`; consumed only for engagement-score "recency," `apps/web-app/src/app/api/analytics/engagement/route.ts:146-150` |

**"Not instrumented" vs "instrumented but not surfaced," explicitly:**
- **Not instrumented:** landing page view, pricing page view, extension install completion, one-time-purchase completion, checkout failure (for config/outage codes).
- **Instrumented but not surfaced:** `extension_api_key_created` (fires, stored, but absent from the taxonomy union and every dashboard label map — `apps/web-app/src/app/(app)/analytics/product/page.tsx:106-151` has no entry for it); `dashboard_bounced` and most `dashboard_v2_*` / `report_*` / `variant_*` events (fire correctly, feed PostHog, but the first-party Product Analytics page only renders a fixed subset of event names — anything outside `activationEvents`/`engagementEvents`/`conversionEvents`/`collaborationEvents` at `page.tsx:330-333` only shows up in the generic "All Event Counts" table, not in any funnel or alert).

---

## 2. Blind spots that would prevent evaluating a Free-tier change

**"Can we tell how many free users hit the 5-recording limit?" — Yes, this one works.** `plan_limit_hit` fires server-side with exact usage/limit numbers on both upload paths (`upload/route.ts:30`, `sync/route.ts:68`), is persisted to `AnalyticsEvent`, and is already rendered in the Conversion category and Conversion Funnel on the Product Analytics page. This is the one piece of instrumentation you could trust today for a limit-based decision.

**"Can we tell how many return after signup?" — Only partially, and the definition is narrower than "returned."** The only retention signal is the cohort table at `apps/web-app/src/app/api/analytics/retention/route.ts`, which counts a user as "retained" in a given week **only if they uploaded a new workflow that week**. A user who logs back in, reads their SOP, checks the dashboard, or evaluates the product without recording something new reads as **churned** in this table even though they plainly returned. `login_completed` is captured but never rolled up into a login-based retention cohort — it's only a component of the engagement score, not a funnel/retention view.

Additional blind spots specific to a Free-tier-expiration decision:

- **You cannot separate "used the extension" from "used the manual upload page."** `workflow_uploaded` carries no `source`/`origin` property (`sync/route.ts:260-268` vs `upload/page.tsx:72`). If a Free-tier expiration policy is meant to push people toward the extension, you have no way to measure whether it worked, because you can't measure extension usage today.
- **The activation milestone the funnel is keyed on structurally cannot fire for the extension path.** `first_workflow_uploaded` is only emitted via `trackActivation()`, which is called exclusively from the client-side `/upload` page (`upload/page.tsx:73`) and dedupes via `localStorage` (`analytics.ts:879`). The extension-sync route (`api/sync/route.ts`) is a server-only path with no browser context — it never calls `trackActivation`. Since the product's actual primary loop is "record with the extension," the activation funnel's step 2 (`apps/web-app/src/app/api/analytics/events/route.ts:100-105`) is blind to the majority of real activations.
- **"Activated" is nearly meaningless as a churn/expiration signal.** Every new signup — including someone who never installs the extension and never returns — gets 3+ sample workflows auto-created directly via Prisma at signup (`signup/route.ts:83-85`, `sample-workflow.ts`), with no `isSample` flag on the `Workflow` model. `activationRatePct` counts "has ≥1 non-deleted Workflow row," so this reads near-100% regardless of real engagement (see §4). Any Free-tier-expiration policy targeting "inactive" accounts by this metric would misfire on nearly the entire base.
- **Pricing page view is invisible**, so you cannot build the denominator for "did more people look at pricing after we changed Free-tier messaging" — only the CTA click numerator exists.
- **Checkout failure is invisible**, so a flat or declining conversion rate during a pricing experiment cannot be distinguished from "checkout is broken" vs. "people don't want it" (see the actual prior incident, quoted below).
- **The Conversion Funnel is not sequenced.** `computeFunnel()` (`api/analytics/events/route.ts:161-184`) counts *distinct users who fired each event anywhere in the selected day window*, with no requirement that step N happened after step N−1 for that same user, and no time-bounding between steps. A user who hit `plan_limit_hit` two months ago and subscribed today is counted as a clean funnel pass in a 90-day window. At current near-zero volume this isn't just imprecise, it's actively unstable — one or two out-of-order users can swing the displayed "conversion rate" arbitrarily.

**The prior incident that makes this concrete** — the codebase itself documents why a broken checkout would go unnoticed under today's instrumentation:

> "a module-scope env read in this codebase is exactly what let Next.js freeze `/api/billing/sku-availability` at build time and take checkout offline site-wide."
> — `apps/web-app/src/lib/admin-operations/billing-mode.ts:29-30`

Trace what would have happened under current instrumentation: checkout throws before Stripe session creation succeeds → neither the server-side `checkout_started` (`checkout/route.ts:215/412`, only reached after `.create()` succeeds) nor the client-side one (`UpgradeButton.tsx:61`, only reached when `data.url` is truthy) fires → the failure branch only tracks two specific error codes, neither of which is the one this bug would have produced (`UpgradeButton.tsx:73-79`) → **zero events of any kind.** None of the 8 alert rules in `apps/web-app/src/lib/compute-alerts.ts` would catch this either: there is a `payment_failure_rate` alert (P2, fires on `payment_failed` count > 2/24h — a webhook-only event that never fires if Stripe is never reached) but no `zero_checkouts` / `checkout_error_rate` alert analogous to the existing `zero_uploads_24h` (`compute-alerts.ts:72-87`) or `no_signups_48h` (`:142-157`) patterns.

---

## 3. Minimum instrumentation needed before running any pricing/packaging experiment — ranked

All of these are additive to the existing taxonomy/dashboard; none require new infrastructure.

| # | Fix | Why it's required before an experiment | Effort |
|---|---|---|---|
| 1 | **Emit a checkout-failure event on every non-2xx response from `POST /api/billing/checkout`** (not just the 2 codes lumped into `upgrade_blocked` today) | Without this you cannot distinguish "the experiment reduced conversion" from "checkout was broken during the experiment" — this is the exact blind spot that let the real outage go unnoticed | **XS** (~1–2 hrs) — one new `AnalyticsEvent` variant + wire into the existing catch/error branches in `checkout/route.ts` and `UpgradeButton.tsx` |
| 2 | **Add a `zero_checkout_activity` / `checkout_error_rate` alert** to `compute-alerts.ts`, same shape as the existing `zero_uploads_24h` / `no_signups_48h` checks | This is the actual "nobody noticed" fix — an alert, not a dashboard, is what catches an outage in real time | **XS** (~1–2 hrs), mechanical copy of an existing pattern |
| 3 | **De-duplicate `checkout_started`** — fire it from exactly one layer, or rename the two so they're not silently summed (e.g. `checkout_session_created` server-side vs `checkout_redirect_initiated` client-side) | Any conversion-rate math using today's `checkout_started` count is off by ~2× | **XS** (~30 min) |
| 4 | **Fire a page-view event on `/pricing`** (thin client wrapper, mirrors the existing `page_viewed` pattern already used on `/dashboard`) | You need a denominator for "did the experiment get people to actually look at pricing," not just a numerator of clicks | **XS** (~30 min–1 hr) |
| 5 | **Tag `workflow_uploaded` / `first_workflow_uploaded` with a `source: 'extension_sync' \| 'manual_upload'` property, and move the `first_workflow_uploaded` dedup server-side** so it actually fires for extension-synced recordings | This is the single highest-leverage fix: it's the difference between measuring the product's real primary loop and not measuring it at all. Also directly enables "did the Free-tier change drive extension adoption" | **S** (~half day) — touches `sync/route.ts`, `upload/page.tsx`, `analytics.ts` taxonomy, and the dedup mechanism (currently `localStorage`, needs a server-side check e.g. on `user.uploadCount === 1`) |
| 6 | **Stop `activationRatePct` (and any other Workflow-row-count metric) from counting auto-seeded sample workflows** — either add an `isSample` column (small migration) or derive activation from a real `workflow_uploaded`/`uploadCount` signal instead of raw `Workflow` row existence in `admin-operations/queries.ts:186-194` | A Free-tier-expiration decision aimed at "inactive" users cannot use a metric that reads ~100% for everyone regardless of behavior | **S** (~half day with migration) / **XS** if just swapping the query's source to `uploadCount > 0` (no migration needed, since `uploadCount` is already clean — see §4) |
| 7 | **Make the Conversion/Activation funnels sequence-aware** — require step *i* to occur for a user strictly after step *i−1* (with a sane lookback window), instead of "fired anywhere in the selected day range" (`api/analytics/events/route.ts:161-184`) | Otherwise the "conversion rate %" displayed on the Product Analytics page is not measuring what it claims to, and any pricing-experiment readout built on it is unreliable | **M** (~1 day) — correctness rewrite of `computeFunnel`, plus tests |
| 8 | **Compose a single ordered funnel definition** spanning signup → extension attach (`extension_api_key_created` or first extension-sourced upload, from #5) → `first_workflow_uploaded` → `first_sop_viewed` → pricing view (from #4) → `checkout_started` → `subscription_created` | Ties #4/#5/#7 together into the actual funnel this review was asked to evaluate | **S**, once #4/#5/#7 land |
| 9 | **Add a "days from first `plan_limit_hit` to `subscription_created`" latency metric, and a count of "hit the limit, no `subscription_created` within 30 days"** | This is the metric a Free-tier-expiration decision is actually about — nothing new to instrument, just a new query against events that already exist, but it depends on #7's sequencing fix to be trustworthy | **S** — pure query work, no new events, but blocked on #7 |
| 10 | **Resolve PostHog autocapture posture** — either explicitly set `autocapture: false` or confirm/document what it captures, since `mask_all_text: false` (`posthog.ts:47`) means PostHog's default click/pageview autocapture (not the manual `track()` taxonomy, which is carefully PII-free) could be sending raw element text to a third party. Do this before deliberately driving more traffic via a growth experiment | Privacy risk scales with the traffic the experiment is designed to generate | **XS** (config-only) |

Do #1–#4 (all together under half a day) before making *any* change to Free-tier behavior. Do #5–#8 before trusting a conversion-rate readout from that change.

---

## 4. Metrics currently displayed that could mislead

| Metric | Where displayed | Why it's misleading | Evidence |
|---|---|---|---|
| **Activation rate %** | Admin Operations Dashboard, `UserVolumeSection.activationRatePct` | Counts users with ≥1 non-deleted `Workflow` row. Every signup gets 3+ sample workflows auto-created at signup, independent of any real usage, and there is no `isSample` flag to exclude them. Will read near-100% regardless of actual product engagement. | `apps/web-app/src/lib/admin-operations/queries.ts:185-194`; sample seeding at `apps/web-app/src/app/api/auth/signup/route.ts:83-85`; confirmed zero `isSample` field anywhere in `prisma/schema.prisma`; confirmed `sample-workflow.ts` contains zero `track`/`trackServer` calls (so this contamination is specific to the *Workflow-row-count* metrics, not the `workflow_uploaded` event-count metrics — see contrast below) |
| **Total Workflows / workflow-volume time series** | Admin Operations Dashboard, Section 3 (`getWorkflowVolume`) | Same contamination as above — every signup adds 3+ rows to this count with zero real usage behind them. At current traffic (25 search clicks / 3 months) sample rows could plausibly be the majority of the table. | `apps/web-app/src/lib/admin-operations/queries.ts:290-363` |
| **"Checkouts Started" count** | Product Analytics page, `EVENT_LABELS.checkout_started`, KPI/event tables | Fired twice for every single successful attempt — once server-side on session creation (`checkout/route.ts:215,412`), once client-side on receiving the redirect URL (`UpgradeButton.tsx:61`). The displayed number is roughly 2× the real count of distinct checkout attempts, with no label indicating this. | `apps/web-app/src/app/(app)/analytics/product/page.tsx:124` (label), the two firing sites above |
| **Conversion Funnel "rate %" between steps** | Product Analytics page, Conversion Funnel chart | Computed as (distinct users who fired event B anywhere in the day-window) ÷ (distinct users who fired event A anywhere in the day-window) — no ordering constraint, no time-bounding. Looks like a rigorous step-by-step conversion percentage; is actually an unordered co-occurrence ratio. At near-zero volume this is unstable and can be swung by 1–2 users. | `apps/web-app/src/app/api/analytics/events/route.ts:161-184` |
| **Retention Cohort % ("Week 1/2/3/4")** | Product Analytics page, Retention Cohorts table | Reads as general retention but is retention-*by-new-upload-only*. A user who returns and engages (logs in, reads SOPs, browses dashboard) without uploading a new recording shows as 0% retained that week — could be read as "losing users" when they're simply not recording that week. | `apps/web-app/src/app/api/analytics/retention/route.ts:11,120-134` |
| **Est. MRR** | Admin Operations Dashboard, KPI tile | This one is a **positive callout, not a misleading one** — the codebase already self-diagnoses whether Stripe is in test mode and surfaces an explicit warning ("Revenue figures on this page are not real") next to the number when it's not collecting real payments. Given revenue is currently $0 and checkout only became functional today, **confirm `billingMode.canCollectRealPayments === true` and the mode banner is checked before trusting this figure during any experiment** — the mechanism to catch a stale test-mode key already exists, just make sure someone looks at it. | `apps/web-app/src/lib/admin-operations/billing-mode.ts:89-135` |

**Contrast worth noting explicitly:** not everything upload-related is contaminated. `uploadCount` (the `User` field driving `topUploaders`, the engagement-score table's "Workflows" column, and the leaderboard) increments **only** on real uploads via `/api/upload:240` and `/api/sync:257` — sample seeding never touches it. So "Workflows Uploaded" (event-count-based, `eventCounts['workflow_uploaded']`) and `uploadCount`-based displays are accurate; it is specifically the **raw `Workflow`-table-row-count metrics** (`activationRatePct`, `totalWorkflows`) that are contaminated.

---

## Files referenced

- `apps/web-app/src/lib/analytics.ts` — client event taxonomy, `track()`, visitor-ID attribution
- `apps/web-app/src/lib/analytics-server.ts` — server-side `trackServer()`
- `apps/web-app/src/app/api/analytics/events/route.ts` — event persistence + funnel computation (`computeFunnel`)
- `apps/web-app/src/app/api/analytics/retention/route.ts`, `.../engagement/route.ts` — retention/engagement queries
- `apps/web-app/src/lib/compute-alerts.ts` — the 8 existing alert rules (no checkout-failure alert)
- `apps/web-app/src/app/(app)/analytics/product/page.tsx` — the Product Analytics dashboard (funnels, alerts, retention, engagement, cleanup)
- `apps/web-app/src/lib/admin-operations/queries.ts`, `types.ts`, `billing-mode.ts` — Admin Operations Dashboard (MRR, subscription breakdown, activation rate, Stripe-mode self-diagnosis)
- `apps/web-app/src/lib/attribution.ts` — first-touch acquisition join (`visitorId` → paying customer)
- `apps/web-app/src/app/api/billing/checkout/route.ts`, `.../webhook/route.ts` — checkout + subscription lifecycle events
- `apps/web-app/src/components/UpgradeButton.tsx`, `ExtensionInstallButton.tsx`, `src/lib/install.ts` — client-side funnel-entry components
- `apps/web-app/src/lib/posthog.ts` — PostHog client config (privacy posture)
- `apps/web-app/src/app/api/auth/signup/route.ts`, `src/lib/sample-workflow.ts` — signup + sample-workflow seeding (source of the activation-rate contamination)
