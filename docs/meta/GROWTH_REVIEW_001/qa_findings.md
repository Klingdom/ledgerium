# QA Findings — Signup-to-Payment Funnel Defect Hunt

**Date:** 2026-09 (session date)
**Scope:** `apps/web-app` — signup, login, quota/upgrade prompts, checkout, webhook.
**Method:** static read of every file in the funnel, `git log`/`grep` for corroborating evidence, `pnpm --filter @ledgerium/web-app build` / `typecheck` / `test` run as instructed. No production code modified. No live Stripe charges attempted.

**Trigger context:** `/api/billing/sku-availability` was statically prerendered at build time, freezing "no plan purchasable" into production. Build succeeded, typecheck passed, 4500+ tests passed, nothing caught it. This report hunts for more failures of that shape (config-dependent, test-invisible) plus general funnel breaks.

---

## 1. Defects found, ordered by revenue impact

### 1.1 [HIGH] Free-tier upgrade CTA recommends a plan that cannot be bought

**File:** `apps/web-app/src/components/UsageQuotaMeter.tsx:47-64`, specifically line 53.

At 80–99% of monthly quota, every free user sees on `/dashboard` (the app's primary daily surface, header-level, `UsageQuotaMeter` at `dashboard/page.tsx:833-837`):

> **"Upgrade to Team for unlimited"**

Team is explicitly *not* self-serve purchasable — `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD = new Set(['team', 'growth'])` in `checkout/route.ts:65`. Clicking through to `/pricing` shows Team's CTA as `Join Waitlist` (a `mailto:` link, `PricingCards.tsx:218-238`), not a Checkout button. The plan that is actually unlimited *and* purchasable today is **Solo** ($89/mo — `plans.ts:114-128`, `config.ts` PRICING_CONFIG). The copy should say "Upgrade to Solo," or fall back to "Upgrade to Starter" for the 15/mo tier.

**How a user hits it:** any free user who records their 4th–5th workflow in a month, on the page they land on by default.

**Evidence the bug is locked in, not just an oversight:** `UsageQuotaMeter.test.tsx:81` (a pure state-derivation mirror test, no jsdom) explicitly asserts:
```
expect(state.upgradeLinkCopy).toBe('Upgrade to Team for unlimited');
```
The test encodes the bug as expected behavior — a future fix to the component would also have to know to update this assertion, and today the test actively certifies the wrong copy as correct.

---

### 1.2 [HIGH] Plan-purchase intent from the pricing page is silently dropped at signup

**Files:** `apps/web-app/src/components/PricingCards.tsx`, `apps/web-app/src/lib/config.ts`, `apps/web-app/src/app/(public)/signup/SignupPageClient.tsx`.

Every paid-plan card's CTA on `/pricing` carries a `plan` query param for logged-out visitors:
- Starter: `ctaHref: '/signup?plan=starter'` (`config.ts:83`)
- Solo: `ctaHref: '/signup?plan=solo'` (`config.ts:115`)

`UpgradeButton.tsx:36-42` renders exactly this `fallbackHref` as a plain `<Link>` for any visitor without a session — i.e. every first-time visitor who clicks "Start 14-Day Trial" or "Start Trial — Full intelligence included" *before* creating an account, which is the normal cold-visitor path.

`SignupPageClient.tsx` never reads `useSearchParams()` or any `plan` value at all (confirmed by `grep -n "searchParams\|plan="` across the file — zero matches). The new account is created with no plan preference, `signIn` runs, and the user is routed straight to `/dashboard` (line 80). The purchase intent that caused them to click a paid CTA in the first place is discarded; they must independently rediscover "Upgrade" on `/account` or `/dashboard` and click through **a second time**, after the friction of filling out a signup form, to actually reach Stripe Checkout.

**How a user hits it:** any cold visitor who compares plans on `/pricing` and picks Starter or Solo before having an account — i.e. the highest-intent visitors, at the exact page whose entire purpose is conversion.

**Impact:** this is a silent drop of the single strongest purchase-intent signal in the funnel, for a $0-revenue product where every one of these is precious.

---

### 1.3 [HIGH] `/upload` — the most-linked in-app action — shows a fabricated price and a dead usage counter

**File:** `apps/web-app/src/app/(app)/upload/page.tsx`. `/upload` is a persistent top-nav item (`AppShell.tsx:28`) and is linked from the dashboard empty state, first-run tutorial, analytics empty state, workflow detail page, and time-sink ranking (10 `href="/upload"` sites across the app) — this is not a stale/orphaned page, it is core navigation.

**(a) Usage counter and lockout UI never render, for anyone, ever.**

Lines 38-46:
```js
fetch('/api/account').then(async res => {
  if (res.ok) {
    const data = await res.json();
    setAccount({ plan: data.plan, uploadCount: data.uploadCount });
  }
});
```
`GET /api/account` actually returns `{ data: { user: { plan, ... }, features, limits: { recordings: { used, max }, ... } } }` (`api/account/route.ts:38-58`) — confirmed against the *correctly*-wired `useAccount.ts` hook (`hooks/useAccount.ts:46-52`, which explicitly comments `// API returns { data: { user, features, limits } }`) used by `account/page.tsx` and `dashboard/page.tsx`. `/upload`'s `data.plan` and `data.uploadCount` therefore resolve to `undefined`.

Effect: `account?.plan === 'free'` (line 49, line 134) is always `false` → the "Uploads: X / 5" banner and "N remaining" warning never render. `isAtLimit` (line 49) is always `false` → the client-side lockout card (lines 170-186) never renders. A free user gets **zero proactive warning** before they try to upload — they only find out at the moment of rejection.

Because `res.json()` is untyped (`Promise<any>`), `pnpm typecheck` passes clean on this file — same shape of invisibility as the original sku-availability bug (compiles fine, wrong at runtime).

**(b) The upgrade CTA a free user sees when they *do* hit the wall shows the wrong plan and the wrong price.**

Lines 154, 181, 263: `"Upgrade to Pro"` / `"Upgrade to Pro — $29/mo"`. Confirmed against the live `PRICING_CONFIG` (`config.ts`) that there is no "Pro" plan and no $29 price anywhere in the current model (Free $0 / Starter $49 / Solo $89 / Team $249 / Growth $799). `PRO_PRICE_ID` is explicitly `@deprecated` in `stripe.ts:34-37`, kept only for legacy backward-compat mapping. `git log --oneline -- "apps/web-app/src/app/(app)/upload/page.tsx"` shows this file was created in the same commit (`41eabd5`) that introduced the current 5-tier model and the `/api/account` envelope shape — it was written against a plan name that doesn't exist in the same commit that removed it, and has never been touched since except for an unrelated docs-page addition.

The button (`handleUpgrade`, lines 101-112) calls `POST /api/billing/checkout` with **no body**. The server defaults an empty/unparseable body to `plan: 'starter', interval: 'monthly'` (`checkout/route.ts:266-291`), so clicking "Upgrade to Pro — $29/mo" redirects to a real Stripe Checkout Session for **$49/mo**. A customer who reads $29 on the button and is charged $49 one click later is a trust and potential chargeback problem, not just a copy bug.

**Test coverage gap:** `e2e/app/upload.spec.ts:17-22`, `'shows recording limit info'`, asserts only `getByText(/recording|upload/i).first()).toBeVisible()`. This is satisfied by the page's own `<h1>Upload Workflow</h1>` heading and would pass identically whether the quota banner renders or not. It did not, and structurally cannot, catch this.

---

### 1.4 [HIGH] Unrecoverable dead-end on network failure during signup and login

**Files:** `apps/web-app/src/app/(public)/signup/SignupPageClient.tsx:18-82`, `apps/web-app/src/app/(public)/login/LoginPageClient.tsx:20-47`.

Neither `handleSubmit` function has a `try`/`catch` anywhere in its body.

`SignupPageClient`: `const res = await fetch('/api/auth/signup', {...})` (line 28) is a raw, unguarded fetch. `next-auth`'s client `signIn()` (line 47) was also inspected directly in `node_modules/next-auth/react.js:126-165` and `lib/client.js:19-42`: the two calls it makes *before* the actual credentials POST (`getProviders`/`getCsrfToken`) are internally wrapped and degrade to `null` on failure, but the credentials POST itself (`react.js:153-164`) is not wrapped in next-auth's own code, and is therefore also unguarded from the caller's side.

On any network interruption mid-request (dropped Wi-Fi, mobile network handoff, corporate proxy reset, or the app server restarting mid-deploy):
- `isLoading` was already set `true` and is **never reset** — the submit button (`disabled={isLoading}`) is permanently stuck on "Creating account…" / "Signing in…".
- No `error` state is ever set — nothing is shown to the user.
- The only recovery is an unprompted manual page reload.
- Worst case for signup: if `POST /api/auth/signup` succeeded (account created) but the connection drops before `signIn()` resolves, the account exists but the user is staring at a frozen button with no indication they should just log in.
- `app/error.tsx` / `app/global-error.tsx` do **not** catch this — React error boundaries only catch render-phase errors, not rejections inside an async event-handler callback.

**Contrast — this pattern is already fixed elsewhere in the codebase:** `UpgradeButton.tsx:94-97` and `ServiceCheckoutButton.tsx:114-116` (both newer, billing-hardening-era code) wrap their fetches in try/catch with a graceful fallback. The fix pattern exists; it was never back-ported to the two oldest, most fundamental funnel pages.

**How a user hits it:** any transient network condition during the two highest-value single moments in the entire funnel — creating an account, or logging back in to buy.

---

### 1.5 [MEDIUM] Duplicate-email race condition surfaces a raw 500 instead of the friendly 409

**File:** `apps/web-app/src/app/api/auth/signup/route.ts:56-102`.

`db.user.findUnique({ where: { email } })` (line 56) is checked, then `db.user.create(...)` (line 66) runs later. `email` is `@unique` at the DB level (`prisma/schema.prisma:12`). Two near-simultaneous signup requests for the same email (a double-click, or a client retry after the network-failure bug in 1.4) can both pass the `findUnique` check; the losing `create` throws a Prisma `P2002` unique-constraint violation, which is caught only by the outer generic `catch` (line 97-102) and returns `{ error: 'Internal server error' }` / HTTP 500 instead of the intended `{ error: 'An account with this email already exists' }` / HTTP 409. `route.test.ts` (296 lines) has no assertion for this path — confirmed via `grep -n "P2002\|race\|concurrent"` → no matches.

Lower frequency than 1.1–1.4 (requires a genuine race), but a real, reachable defect, and it degrades exactly the error message that was clearly written to be customer-friendly for the sequential case.

---

### 1.6 [MEDIUM, config-dependent — same shape as the sku-availability bug] Auth rate limiter can lock out *all* signups if the reverse proxy doesn't forward `X-Forwarded-For`

**File:** `apps/web-app/src/lib/rate-limit/auth-buckets.ts`, consumed by `signup/route.ts:47-54` (and identically by `login`/`forgot-password`/`admin/bootstrap`).

```js
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
const rl = checkAuthRateLimit(`signup:${ip}`, Date.now(), AUTH_RATE_LIMITS.signup); // max 10 / hour
```

If the deployment's reverse proxy / load balancer does not set `X-Forwarded-For` (or something upstream strips it), **every visitor** collapses onto the single bucket key `signup:unknown`. Once 10 unrelated visitors sign up within any rolling hour, every subsequent real signup site-wide gets HTTP 429 "Too many requests" until the window rolls over — and this gets *worse*, not better, as traffic grows, which is the opposite of the intended abuse protection.

I could not confirm from this repository whether the actual production reverse proxy sets `X-Forwarded-For` correctly (no `docker-compose.yml` or nginx/proxy config is present in this repo to inspect) — flagging this as a **verified code-level risk, contingent on infrastructure configuration I cannot see from here**, which is exactly the shape of bug the sku-availability incident was: correct in dev/test, silently wrong under a specific runtime condition unit tests can't observe. It is invisible to `pnpm test` by construction — `checkAuthRateLimit` short-circuits to `{ allowed: true }` whenever `NODE_ENV === 'test'` (`auth-buckets.ts:53-55`).

**Recommend:** verify the production proxy config actually sets `X-Forwarded-For` (or switch to the platform's own client-IP header if on Railway/Render/Vercel-style infra), and/or add a startup/health check that fails loudly if `x-forwarded-for` is absent on a real request.

---

### 1.7 [LOW-MEDIUM] No feedback after subscription checkout redirect — the one thing done right for one-time purchases was never applied to subscriptions

**Files:** `checkout/route.ts:400` (`success_url: ${APP_URL}/account?billing=success`), `apps/web-app/src/app/(app)/account/page.tsx`.

`grep -n "billing" account/page.tsx` finds no handling of the `billing` query param at all — no success banner, no "confirming your upgrade…" state, no polling. `/api/account` is fetched exactly once on mount (lines 351-364). The Stripe webhook that actually flips `User.plan` runs asynchronously relative to the redirect (idempotency-claim DB insert + `subscriptions.retrieve` + DB write, per `webhook/route.ts`) — a real race. If it hasn't landed yet, the user returns from paying Stripe directly to a page that still says "Free," with nothing telling them their payment is still being confirmed.

This is not a hard block — the state is correct after a manual refresh a few seconds later — but it is exactly the "did my payment actually work?" anxiety moment that generates support email and cart-abandonment-shaped doubt, and the codebase already has the right fix pattern built for the one-time-purchase flow (`account/purchase-success/page.tsx`, `MAX_POLL_ATTEMPTS`/`POLL_INTERVAL_MS` poll-then-honest-fallback), it just was never extended to the subscription success path.

---

### 1.8 [LOW] Dead/misleading Stripe env var names in `PRICING_CONFIG`

**File:** `apps/web-app/src/lib/config.ts:85,124,151,178`.

`stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? null` (and `STRIPE_SOLO_PRICE_ID` / `STRIPE_TEAM_PRICE_ID` / `STRIPE_GROWTH_PRICE_ID`) — these env var names do not match what checkout actually reads (`STRIPE_STARTER_MONTHLY_PRICE_ID` / `STRIPE_STARTER_ANNUAL_PRICE_ID`, etc. in `stripe.ts:41-52`), and `grep -rn "stripePriceId" apps/web-app/src` shows the field is defined but **never read anywhere**. Not a live bug today — it's inert — but it is a documentation hazard: an operator who configures Stripe by reading this file instead of `docs/runbooks/STRIPE_SETUP.md` would set the wrong-named env var, see no effect, and get no error — the same "silently wrong, nothing tells you" shape as the original incident, just currently dormant because nothing consumes it.

---

## 2. Other build-time-frozen or config-dependent failures of the sku-availability class

- Ran a full production build: `pnpm --filter @ledgerium/web-app build`. The new `scripts/assert-dynamic-api-routes.mjs` gate passed: **`[assert-dynamic-api-routes] OK — no API route is prerendered.`** Every route under `.next/server/app/api/**` compiled to `ƒ (Dynamic)` in the build output — manually confirmed in the printed route table (checkout, sku-availability, webhook, portal, one-time-purchase, account, me, streaks, all workflows/teams/tags routes, etc. all `ƒ`).
- I manually reviewed every one of the 65 `route.ts` files that lack an explicit `export const dynamic = 'force-dynamic'` (only `sku-availability`, `webhook`, `teams`, `admin/normalize-emails`, `auth/forgot-password`, `admin/email-test`, `health`, `admin/password-reset-link`, `teams/[id]/invite`, `admin/bootstrap`, `admin/alerts/check` declare it explicitly). Every remaining route either takes a `NextRequest` param it actually reads, or calls `auth()` — which internally reads cookies and forces dynamic rendering — so the auto-detection Next.js relies on is doing its job today. This class of bug is **structurally closed for `/api/*` routes** as long as `assert-dynamic-api-routes.mjs` keeps running on every build. (I confirmed it's wired into `apps/web-app/package.json`'s `build` script; I did not check whether CI invokes `pnpm build` for web-app specifically vs. some other build path — worth a quick confirmation outside this repo.)
- Checked every Server Component in the public funnel (`/pricing/page.tsx`, `/signup/page.tsx`, `/login/page.tsx`) for `process.env` reads at module or render scope: **none found**. `PricingCards.tsx` is the actual fix that closed the original incident — it fetches `/api/billing/sku-availability` client-side inside `useEffect` rather than trusting anything computed server/build-side, and fails closed (`'unavailable'`) on both a `null`/loading state and a fetch rejection. This pattern generalizes correctly and is now also used by `account/page.tsx`'s plan switcher.
- Section 1.6 (rate-limiter `X-Forwarded-For` fallback) and 1.8 (dead `stripePriceId` env names) are the two things I found that share the *spirit* of the original bug — "correct under test/dev conditions, silently wrong under a specific untested runtime condition" — even though neither is a literal build-time freeze. I did not find a second literal instance of a route/page getting frozen at build time; the guardrail appears to be a genuine structural fix, not a narrow patch.

---

## 3. Gaps in test coverage where a funnel break would go unnoticed

- **No jsdom/testing-library in `apps/web-app`.** Confirmed (`grep -n "testing-library\|jsdom" package.json vitest.config.*` → no matches). UI-binding-layer defects — a component reading the wrong field off an API response (1.3a), a hardcoded string that no longer matches the plan catalog (1.1, 1.3b) — are structurally invisible to `pnpm test`, which is why 2790/2790 unit tests pass green with all of the above present.
- **`e2e/app/upload.spec.ts` "shows recording limit info"** is a false-confidence test (section 1.3) — its assertion is satisfied by unrelated page chrome and would pass whether or not the actual quota banner renders.
- **`UsageQuotaMeter.test.tsx` asserts the wrong copy as correct** (section 1.1) — a genuine regression test that locks in a bug rather than catching one. Any future contributor fixing the copy has to know to also fix the test, or CI will flag the *correct* change as a failure.
- **No test anywhere cross-checks "which plans does the UI recommend for upgrade" against "which plans does `checkout/route.ts` actually allow to purchase self-serve."** `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD` is the single source of truth for what's purchasable; nothing asserts that every upgrade CTA in the app (`UsageQuotaMeter`, `/upload`, `PricingCards`, account page) only ever points at a plan outside that set. A single shared assertion here would have caught 1.1 and half of 1.3b.
- **Zero test exercises a `fetch()`/`signIn()` rejection in `SignupPageClient` or `LoginPageClient`.** There's no jsdom to render these components, but there also isn't a pure-logic extraction of the submit-and-handle-response flow (the pattern used everywhere else in this codebase for exactly this reason — `mapCheckoutError`, `derivePlanAvailability`, `dashboardActionError`, `insightActions`) that could be unit-tested without rendering. This class of failure currently has no unit-testable surface at all.
- **No test exercises the `db.user.create` unique-constraint race in signup** (section 1.5).
- **No test asserts `/signup?plan=X` is read** (section 1.2) — because it isn't read, and nothing documents that it's supposed to be, there's no test that would flag this as either "intentional dead param" or "regression."
- By contrast: the Stripe webhook (`webhook/route.test.ts`, 3941 lines) and `checkout-error.ts` (`checkout-error.test.ts`, 141 lines) and `plan-availability.ts` (`plan-availability.test.ts`, 46 lines) are extremely well covered — all three are pure-module extractions with zero DOM dependency, which is exactly why they're solid while the client components wrapping them aren't.

---

## 4. What I verified as working (scope of what was checked)

- Full production build succeeds; `assert-dynamic-api-routes.mjs` passes; all `/api` routes confirmed dynamic (`ƒ`) in build output.
- `pnpm --filter @ledgerium/web-app typecheck` — clean, no errors.
- `pnpm --filter @ledgerium/web-app test` — **2790/2790 tests passing across 160 files.**
- `POST /api/billing/checkout` (subscription path): every error code it can emit — `unauthorized` (401), `admin_bypass` (400), `awaiting_workspace_build` (402), `plan_not_configured` (503), `already_subscribed` (400, with redirect), `checkout_session_failed` (500) — is mapped through `mapCheckoutError()` in both `UpgradeButton.tsx` and the account page's plan switcher, never rendering the raw server `error` string, per the `SUBSCRIPTION_READINESS_001 §G2` hardening. Verified by reading the full `COPY` table in `checkout-error.ts` against every `code` the route actually returns.
- `POST /api/billing/checkout` (one-time path): `missing_sku` (400), `sku_not_configured` (503), `audit_not_eligible` (403, with dynamic `minRunsRequired`-specific copy), `checkout_session_failed` (500) — all mapped identically; `ServiceCheckoutButton.tsx` correctly wraps its fetch in try/catch (unlike the signup/login pages).
- `derivePlanAvailability()` / `PricingCards.tsx` fail-closed logic: `null` (loading) never renders a live buy button, a fetch failure resolves to `{}` → `'unavailable'`, and only an explicit `true` from the server renders a working Checkout button. This is the actual correct fix for the original incident and it generalizes to the account page too.
- Stripe webhook handler (`webhook/route.ts`): idempotency via unique-constraint claim-before-provisioning (with the claim released on processing failure so Stripe's retry isn't swallowed), out-of-order-delivery guards on `customer.subscription.updated`/`.deleted` keyed off the event's own `created` timestamp, hard-fail-and-retry (not silent-downgrade-to-free) on any unmapped Stripe price ID for provisioning events, SCA/3-D-Secure `pendingInvoiceUrl` capture and clearance on successful payment, and dispute recording for admin visibility. Backed by a 3941-line test file. **I did not find a "customer paid but wasn't entitled" or "customer entitled but blocked" path in this handler** — it is the most defensively-written file in the funnel.
- `account/purchase-success/page.tsx` (one-time SKU purchases): correct pending/poll(5×1.5s)/timeout UX for the webhook-lag race, with an honest fallback pointing to a support email after retries are exhausted.
- Server-side recording-limit enforcement (`checkRecordingLimit` in `feature-gating.ts`, shared by `/api/upload` and `/api/sync`): correctly uses a monthly-reset DB query (`getMonthlyUploadCount`, filtered by calendar month), not the stale cumulative `user.uploadCount` field, and is plan-aware across all 6 tiers including `solo`'s unlimited case. This is the real source of truth and it is correct even though `/upload`'s client-side mirror of it is broken (1.3a).
- Signup server-side validation (`auth/signup/route.ts`): email format + password ≥8 chars via Zod, duplicate-email pre-check returns a friendly 409 (in the non-race case), per-IP rate limiting is wired in (see 1.6 for the config-dependent caveat), `visitorId`/attribution capture is optional and non-blocking, sample-workflow provisioning is wrapped so it can never fail the signup response.
- No production code was modified. No live Stripe charges were attempted. All findings above are reproducible from source (file:line citations given) plus `git log`, `grep`, and the three commands the brief authorized.
