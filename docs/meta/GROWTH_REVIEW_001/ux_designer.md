# UX Audit — Signup, Onboarding & First-Run Experience

**Author:** ux-designer
**Scope:** `apps/web-app/src/app`, `apps/web-app/src/components`, `apps/extension-app/src/sidepanel`
**Context:** $0 revenue, checkout functional as of today, ~25 search clicks in 3 months. Every recommendation below is scored against that reality — low-traffic-tolerant fixes first, scale-dependent polish flagged separately.

**Method:** read the actual shipped code (not the design intent in comments), traced the real component tree that renders for a live user, and cross-referenced against dead/legacy branches that no longer run. Several findings below exist specifically *because* a well-built component was superseded and nobody re-wired its replacement.

---

## 0. Critical framing finding — you are auditing two dashboards, only one is live

`apps/web-app/src/app/(app)/dashboard/page.tsx:317-324` auto-redirects every user to `DashboardV2Shell` unless the URL has `?v2=0`. The ~1,300-line v1 branch below that check — including `EmptyDashboard`, `OnboardingChecklist`, and `UsageQuotaMeter` wiring — is dead for 100% of real traffic (confirmed dead by CLAUDE.md iter-022 note and by grep: `OnboardingChecklist` and `UsageQuotaMeter` are imported nowhere in `components/dashboard-v2/`).

This matters because **two of the best-built activation components in the codebase are currently unreachable**:
- `components/OnboardingChecklist.tsx` — a fully built, tested, localStorage-backed "Getting started" checklist with progress bar and step CTAs. Dead.
- `components/UsageQuotaMeter.tsx` — a fully built usage-vs-limit meter with amber/red upgrade CTAs (closed row #36 in the backlog specifically to add the 80%-warning upgrade nudge). Dead.

Everything downstream in this report treats `DashboardV2Shell` as the real product, because it is.

---

## 1. The user journey as it actually is

### Step 1 — Landing (`src/app/(public)/page.tsx`)
Hero: "Your SOP says 5 steps. Your team takes 17." + subhead + two CTAs (`Get Started Free` → `/signup`, `See the Product` → `/product`). Below the fold: social-proof strip, 3 value props, "how it works," a **live interactive demo embedded on the homepage** (`RealProductDemo`), a real SOP screenshot, competitive positioning, personas, trust strip, final CTA.

**Friction:** none structural. The hero requires the visitor to already have a mental model of "SOP vs. reality gap" — it's a strong hook for someone who already knows what process documentation is, but it does not say what Ledgerium *is* (a Chrome extension + web app) until 3 sections down ("How it works"). At near-zero traffic this doesn't matter much (see §4), but it's the first thing to sharpen once paid acquisition starts, because paid traffic skips the scroll-to-understand tax that organic/curious traffic tolerates.

### Step 2 — Signup (`src/app/(public)/signup/SignupPageClient.tsx`)
3 fields (name optional, email, password ≥8 chars), 1 step, no email confirmation step, no CAPTCHA, `router.push('/dashboard')` on success. **No social auth** — `next-auth` is configured with `credentials` only (`src/lib/auth.ts`), confirmed by grep across the codebase. This is genuinely low-friction as built: 2 required fields is close to the floor.

The page also does something better than most: it sets expectations up front ("No screenshots. No keystrokes." / "explore a sample workflow SOP immediately — no extension install required") and previews the 3-step post-signup path *before* the user commits. This is good practice and should be preserved.

**Friction:** minor. No social auth means every signup is a typed password — for a near-zero-traffic B2B tool this is a small tax, not a blocker (see §4).

### Step 3 — Immediately after signup
`router.push('/dashboard')` → `DashboardV2Shell`. Server-side, `POST /api/auth/signup` (`src/app/api/auth/signup/route.ts:81-85`) has already called `ensureSampleWorkflow`, `ensureSampleVariants`, and `ensureAdditionalSampleWorkflows` synchronously before the redirect. Net effect: **every new account lands with ~20 pre-seeded sample workflows already in the library** (1 "Create Purchase Order (Sample)" + 16 "Approve Expense Report (Sample)" variant recordings, per `src/lib/sample-variants.ts:8-23` + `RECORDINGS` array, + a few more from `ensureAdditionalSampleWorkflows`).

This is a deliberate and *good* decision — it means the signup page's promise ("explore a sample workflow instantly, no extension needed") is actually true, and it removes the classic empty-dashboard cold-start problem. Credit where due.

**Friction — the part that isn't handled:** the dashboard the user lands on is a fully-loaded analyst cockpit (KPI strip, health gauge, opportunity bar, weekly chart, workflow table with sort/filter/column-picker) with zero visual distinction pushing the user toward the actual activation goal: *install the extension and record something real*. `DashboardV2Shell.tsx` has no extension-connection check anywhere in the file (confirmed by grep — the string "extension" appears exactly once, in a code comment). The only extension nudge that exists is `FirstRunTutorial`, which only renders when `workflows.length === 0` — a state that, given the seeding above, **is essentially unreachable for a real user** (`DashboardV2Shell.tsx:1041,1055`, `viewState machine`). A user who explores the sample library (the encouraged first action) sees no CTA to go install the extension until they hunt for it in the top nav.

The KPI strip compounds this: `KpiTileStrip.tsx:192-194` renders `"+20 recorded this month"` under Total Workflows for a user who has recorded exactly zero real workflows. The sample rows are correctly labeled "(Sample)" in the table itself, but the aggregate KPI number is not honest-by-omission the way the rest of this codebase clearly tries to be (see the extensive "audit-honesty IFF invariant" pattern documented throughout `CLAUDE.md`) — it's a real gap in an otherwise carefully-guarded metrics surface.

### Step 4 — The extension install handoff (the riskiest step)
`/install` (`src/app/(public)/install/page.tsx`) is well-built: honest 4-step sideload walkthrough (download zip → unzip → enable Developer Mode → Load unpacked), a "this is safe" reassurance box, a what's-captured/not-captured trust section, browser-compatibility grid, and troubleshooting FAQ. This is good, thorough work.

**The install method itself is the friction.** `src/lib/install.ts` confirms the extension is **not yet on the Chrome Web Store** — `resolveInstallTarget()` returns `direct_download` (a `.zip` the user must sideload via `chrome://extensions` → Developer Mode → Load Unpacked) until `EXTENSION_CONFIG.chromeStoreUrl` stops containing `"placeholder"`. The code is well-engineered to flip automatically the moment the Web Store listing goes live (good architecture), but *today*, every single new user who wants to actually use the product must:
1. Download a `.zip` from a non-Chrome-Web-Store source
2. Manually unzip it to a permanent folder
3. Turn on Chrome Developer Mode (a setting most non-technical users have never touched and that Chrome itself displays warnings about)
4. Click "Load unpacked" and select the folder

For a $0-revenue, pre-Web-Store-listing product, this is expected and mostly unavoidable — flagging it here as context, not as something UX can fix without the Web Store listing landing. See §4 for what's actionable now vs. later.

**A duplicate page exists:** `src/app/(public)/install-extension/page.tsx` is a shorter, near-identical version of `/install` (same hero, same 4-step visual pattern minus the sideload detail, same FAQ minus one item). It's linked from `docs/page.tsx`, `demo/page.tsx`, and `lib/onboarding.ts` (the dead OnboardingChecklist's `install_extension` step href), while the homepage and pricing page link to `/install`. Two competing canonical install pages is confusing for SEO and for a user who bookmarks one, gets a different page from a teammate's link, and isn't sure which is current.

### Step 5 — The bridge back (recording → dashboard) — **the actual riskiest step**
This is the part the task brief anticipated and it's real. The extension **records and exports standalone with zero account connection** (confirmed by the install page's own FAQ: *"No. The extension records and exports standalone. To sync recordings to the web app... create a free account and configure Sync Settings."*). To get a recording into the web dashboard, the user must:

1. Go to the web app → `/account`
2. Scroll to "Extension Sync" card (`src/app/(app)/account/page.tsx:698-797`)
3. Click "New API Key," copy the generated key (shown once, never again) and the Sync URL
4. Switch to the extension's side panel → find and click **"Sync Settings"** — a collapsed, closed-by-default toggle at the very bottom of the Idle screen (`apps/extension-app/src/sidepanel/screens/IdleScreen.tsx:102-110`, default `isOpen = false`)
5. Paste both values into two plain text inputs, click Save

There is no deep link, no OAuth-style "Connect to Ledgerium" one-click flow, no QR/magic-link handoff, no cookie-based session sharing between the web app and the extension — confirmed by grep across `apps/extension-app/src` for any deep-link/postMessage/connect pattern (only one unrelated match). The two apps are bridged entirely by manual copy-paste of two strings between two different UI surfaces.

**Worse: this step is absent from the primary "4 steps, under 2 minutes" flow on `/install`.** Step 4 of that page ends with *"Done. Click the Ledgerium AI icon... Sign in or create a free account to start recording"* — which reads as if signing in inside the extension is sufficient. The sync/API-key requirement only appears buried in the Troubleshooting FAQ ("How do I sync recordings to the web app?"), which a user only reads if they already suspect something is wrong. A realistic outcome: a new user records a real workflow, expects to see it in their dashboard, doesn't — and has no idea why, because the step that would have prevented this was never surfaced to them as a step.

### Step 6 — Empty / low-data states
- **Genuinely empty dashboard** (`FirstRunTutorial.tsx`): well-designed when it fires — honest 3-step Record→Measure→Act copy, no fabricated stats, single primary CTA to `/install`, secondary to `/upload`. Good component. Just rarely seen (see Step 3).
- **Filtered-to-zero state**: handled (`FilteredEmptyState` in the dead v1 file; v2 has its own `no-results` state per the state machine comment at `DashboardV2Shell.tsx:22`).
- **Sparse state** (1–2 real workflows): the state machine has a distinct `sparse` branch (`DashboardV2Shell.tsx:24`), which is good practice — it's rare for a product this early to have a designed sparse state at all.

### Step 7 — Pricing (`src/components/PricingCards.tsx`, `src/app/(public)/pricing/page.tsx`)
Well-executed for what it is: per-plan "Best For" line, outcome microcopy, honest "Not available yet" state gated by a live `/api/billing/sku-availability` check (so a broken Stripe price can never render a dead buy button — good engineering), an explicit amber notice that Team/Growth are waitlist-only, a full comparison table, and an ROI calculator.

**Friction:** 6 tiers are rendered (`Free / Starter $49 / Solo $89 / Team $249 / Growth $799 / Enterprise`) on a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-6` layout — at desktop width every card is squeezed into a sixth of the row. Two of those six (Team, Growth) are not purchasable today (mailto waitlist only). For a user deciding between the three tiers that actually matter right now (Free / Starter / Solo — the exact three the CEO named as current focus), the page presents six choices of which two are dead ends and one (Enterprise) is "Custom" with no self-serve action. That's more decision surface than a $0-revenue product needs in front of its very first paying customers.

### Step 8 — Mobile
`PublicNav.tsx` is genuinely well-built for mobile: hamburger with a proper drawer, `aria-expanded`, Escape-to-close, scroll lock, pinned CTA at the bottom of the drawer. The homepage's hero, value-prop grid, and "how it works" sections all use responsive Tailwind breakpoints correctly (`grid-cols-1 sm:grid-cols-3`, etc.). Signup/login forms are naturally mobile-friendly (single centered card, no fixed-width traps).

**Friction:** the pricing comparison table (`pricing/page.tsx:253-254`, `min-w-[700px]` inside `overflow-x-auto`) forces horizontal scroll on any phone — an accepted pattern for data tables, but it means the highlighted "Team" column and the Growth/Enterprise columns are off-screen by default on mobile, so a mobile visitor evaluating plans sees Free and part of Starter first and has to discover the scroll affordance to see the rest. The 6-column `PricingCards` grid also has no `md:` breakpoint, so tablet widths (768–1023px) jump straight from 2 columns to 6 at `lg:` (1024px) with no intermediate step — workable, not broken.

---

## 2. Top 5 UX changes — ranked, with effort estimates

**1. Surface the extension→account sync step as an explicit, unmissable step — not a FAQ answer.** (Highest impact, Medium effort)
This is the step most likely to silently kill activation: a user records something real and it never appears anywhere, with no error, no explanation. Concretely:
- Add the API-key/sync step as **Step 5** on `/install` (`src/app/(public)/install/page.tsx`), not buried in Troubleshooting. Consider generating the API key server-side at signup (or on first extension detection) and surfacing it as a one-time copyable code directly on `/install` or `/account`, rather than requiring the user to know to go find "New API Key."
- In `apps/extension-app/src/sidepanel/screens/IdleScreen.tsx`, default `SyncSettings` `isOpen` to `true` for accounts that have never synced (currently hardcoded `false` at line 76), or better, replace the collapsed toggle with an inline "Connect your account" call-to-action state when no API key is stored yet, distinct from the settings-tweak affordance a returning user needs.
- Add a lightweight `ds-` styled banner to `DashboardV2Shell` (reusing the `ExtensionStatusToast` pattern, which already polls `/api/me/extension-status`) that shows *"Extension not connected yet — [reason]"* instead of only celebrating success after the fact.
Effort: touches 1 extension screen + 1 marketing page + 1 dashboard banner. No new backend surface — `/api/me/extension-status` already exists.

**2. Wire a real activation nudge into `DashboardV2Shell` — reconnect or rebuild the checklist.** (High impact, Medium effort)
`OnboardingChecklist.tsx` already does exactly this job (extension-installed / first-workflow / SOP-viewed / process-map-viewed, with a progress bar) and is fully built and tested — it's just plugged into the dead v1 dashboard only. Either (a) port it into `DashboardV2Shell` with a `hasExtensionKey` prop sourced from the same `/api/me/extension-status` call `ExtensionStatusToast` already makes, or (b) build the v2-native equivalent using the existing `FirstRunTutorial` visual language, but keep it visible even after sample workflows exist (i.e., trigger on "0 workflows with a real `sessionId`," not "0 workflows total"). Also fix the `install_extension` step's `actionHref` (`src/lib/onboarding.ts:51`) to point at whichever install page survives recommendation #4.
Effort: mostly wiring existing, tested components; the one new piece of logic is distinguishing "real" workflows from seeded samples for the activation-progress calculation (samples are all `sessionId: 'sample-session-001'` or similarly fixed IDs per `src/lib/sample-workflow.ts:25` — cheap to filter on).

**3. Restore a visible usage indicator on the live dashboard.** (Medium impact, Low effort)
`UsageQuotaMeter.tsx` is fully built, including the amber 80%-threshold upgrade nudge that was specifically shipped to close a pricing-audit gap — and it renders nowhere a real user will ever see it. Free-tier users currently get zero visibility into "you've used 2 of 5" until they hit the wall on `/upload` (which does have its own inline limit display, `src/app/(app)/upload/page.tsx:48-50`). Wire `UsageQuotaMeter` into `DashboardV2Shell`'s header using the `/api/account` `uploadCount`/`plan` fields the upload page already fetches — this is the correct source (it reflects actual `Upload` table usage, not the `Workflow`-table `recordedThisMonth` stat that includes sample rows).
Effort: one component import + one `/api/account` fetch already proven to work elsewhere. No new backend work.

**4. Consolidate `/install` and `/install-extension` into one canonical page.** (Medium impact, Low effort)
Two near-duplicate pages for the single most important non-signup action in the funnel is unnecessary confusion and split SEO equity. Keep `/install` (more complete — has the Guided Onboarding upsell, the fuller FAQ, the "already installed? sign in" escape hatch) and 301-redirect or replace `/install-extension` with a thin redirect. Update the 3 internal references (`docs/page.tsx`, `demo/page.tsx`, `lib/onboarding.ts`) to point at `/install`.
Effort: delete one page, add a redirect, fix 3 hrefs.

**5. Cut pricing-page decision surface for the current stage.** (Medium impact, Low-Medium effort)
De-emphasize Team ($249) and Growth ($799) relative to Free/Starter/Solo — the three tiers actually being sold right now — rather than presenting all six with equal visual weight in a cramped 6-column grid. Simplest version: collapse Team/Growth (and Enterprise) into a single "Need a team plan? Join the waitlist" strip below the three self-serve cards, matching what the amber notice above the grid already explains in words. This also directly improves the mobile comparison-table experience, since fewer columns means less forced horizontal scroll.
Effort: `PricingCards.tsx` layout change (grid restructure, not new logic — the waitlist/availability logic already exists and is correct); the comparison table can either follow suit or stay as an secondary "full comparison" disclosure.

---

## 3. Actively broken, confusing, or trust-damaging

- **Confusing, not broken:** `KpiTileStrip` reports `"+20 recorded this month"` (or similar) to a user who has recorded nothing, because seeded sample workflows are included in `recordedThisMonth` (`src/app/api/workflows/route.ts:616-624`, no exclusion for sample rows). The row-level labels correctly say "(Sample)," but the aggregate KPI doesn't distinguish — this is the one place I found where the codebase's otherwise strict "never show a number that isn't real" discipline (visible everywhere else, e.g. the extensive audit-honesty guards documented in `CLAUDE.md`) slips. Low severity today, but worth fixing before it's load-bearing in a paid-acquisition funnel where "look how much you've already done" numbers get scrutinized.
- **Confusing:** Two install pages (`/install`, `/install-extension`) with overlapping but non-identical content and no canonical redirect between them (§2 item 4).
- **Silent gap, not a rendering bug:** the extension→account sync step is real, required, and completely undocumented in the primary install flow (§1 Step 5, §2 item 1). This is the closest thing to "broken" in this audit — not because code fails, but because the product silently doesn't do what step 4 of `/install` implies it does ("sign in... to start recording" reads as sufficient; it isn't).
- **Dead code masquerading as shipped UX:** `OnboardingChecklist` and `UsageQuotaMeter` are fully built, tested components that render to nobody. Not trust-damaging to the end user (they never see the gap), but worth flagging because engineering effort already went into activation UX that's currently inert — the fix is wiring, not new design or new build work.
- **Not broken, worth a look:** the FAQ on `/pricing` says *"Every paid plan (Starter, Team, Growth) includes a 14-day free trial"* but Solo — a live, purchasable, self-serve $89/mo tier per `PricingCards.tsx` — is omitted from that sentence. Likely just a stale FAQ line from before Solo shipped; a prospective Solo buyer reading the FAQ carefully could reasonably wonder if Solo lacks a trial.

---

## 4. What matters now vs. what matters after traffic grows

**Matters now (near-zero traffic, every signup is precious, effort should go where it directly protects conversion of the few visitors you get):**
- #1 (sync-bridge visibility) — this is the step most likely to make a real, motivated early user quietly churn without you ever knowing why. At 25 clicks/3 months, you cannot afford to lose someone who got all the way to "recorded a real workflow" and then bounced silently.
- #2 (activation nudge on dashboard) and #3 (usage meter) — cheap, already-built, directly improve the handful of real sessions you're getting today. No reason to wait.
- #4 (duplicate install pages) — trivial cleanup, fixes SEO fragmentation now rather than compounding it.
- The trust-damaging KPI-count item in §3 — cheap fix, protects credibility with the specific handful of people currently evaluating the product closely enough to notice.

**Matters only after traffic grows (defer without cost today):**
- #5 (pricing tier decision-surface reduction) is real but lower-priority at near-zero traffic — with ~25 clicks/3 months, essentially nobody is currently being confused by a 6-column pricing grid because essentially nobody is reaching the pricing page in volume. Worth fixing before any paid acquisition push, not urgent this week.
- Mobile pricing-table horizontal scroll — same logic; fix before mobile-heavy paid traffic (e.g., social ads), not blocking now.
- Hero-copy legibility / "what is this in 5 seconds" sharpening (§1 Step 1) — matters most once you're paying for cold traffic that won't scroll to understand; organic/curious visitors at current volume are more tolerant.
- Chrome Web Store listing (referenced throughout as the real fix for the sideload friction in §1 Step 4) is already correctly engineered to flip automatically (`src/lib/install.ts`) — this is a launch/ops item, not a UX-code change, but it's the single highest-leverage fix for top-of-funnel drop-off once it ships, and everything upstream of it (marketing copy, CTAs) should be ready to reflect "Add to Chrome — one click" the day it lands.

---

## Files referenced

- `apps/web-app/src/app/(app)/dashboard/page.tsx`
- `apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx`
- `apps/web-app/src/components/dashboard-v2/FirstRunTutorial.tsx`
- `apps/web-app/src/components/dashboard-v2/band/KpiTileStrip.tsx`
- `apps/web-app/src/components/OnboardingChecklist.tsx`
- `apps/web-app/src/components/UsageQuotaMeter.tsx`
- `apps/web-app/src/components/ExtensionStatusToast.tsx`
- `apps/web-app/src/lib/onboarding.ts`
- `apps/web-app/src/lib/install.ts`
- `apps/web-app/src/lib/sample-workflow.ts`
- `apps/web-app/src/lib/sample-variants.ts`
- `apps/web-app/src/lib/feature-gating.ts`
- `apps/web-app/src/app/api/auth/signup/route.ts`
- `apps/web-app/src/app/api/workflows/route.ts`
- `apps/web-app/src/app/(public)/signup/SignupPageClient.tsx`
- `apps/web-app/src/app/(public)/login/LoginPageClient.tsx`
- `apps/web-app/src/app/(public)/page.tsx`
- `apps/web-app/src/app/(public)/install/page.tsx`
- `apps/web-app/src/app/(public)/install-extension/page.tsx`
- `apps/web-app/src/app/(public)/pricing/page.tsx`
- `apps/web-app/src/components/PricingCards.tsx`
- `apps/web-app/src/components/PublicNav.tsx`
- `apps/web-app/src/app/(app)/account/page.tsx`
- `apps/web-app/src/app/(app)/upload/page.tsx`
- `apps/extension-app/src/sidepanel/screens/IdleScreen.tsx`
