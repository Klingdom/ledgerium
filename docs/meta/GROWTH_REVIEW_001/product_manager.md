# Activation Chain Analysis — Product Manager

**Type:** Mode 3-adjacent single-agent analysis (product-manager), part of GROWTH_REVIEW_001.
**Question:** What stops a new signup from becoming a paying customer?
**Method:** Direct repo inspection of the signup → extension → recording → SOP → payment chain. Every claim below is cited to a file. Where I could not verify something from the repo (live usage numbers), I say so explicitly instead of guessing.

---

## 0. Correction to a starting assumption

The brief asks me to check "whether a user can experience value WITHOUT installing the extension." They can, and it already works well: **every new signup is server-side seeded with 5 sample workflows** (`apps/web-app/src/app/api/auth/signup/route.ts:83-85`, calling `ensureSampleWorkflow` / `ensureSampleVariants` / `ensureAdditionalSampleWorkflows` in `apps/web-app/src/lib/sample-workflow.ts`). These render as real, fully-formed SOPs, process maps, and reports, titled `"... (Sample)"` so they're never confused with real data. Time-to-first-SOP for anyone who signs up is **zero recording steps** — it's already on screen at `/dashboard` the moment signup completes.

This is good and should not be touched. It also means the actual constraint is not "does the user see value" — it's "does the user's *own* work ever reach a place where the product can charge them for it." That's the chain this report traces.

---

## 1. The activation chain as it actually exists

| # | Step | File(s) | What happens | Drop-off risk |
|---|---|---|---|---|
| 1 | Arrival | — | 25 search clicks / 3 months (CEO-provided). | Not a product problem — see §4. |
| 2 | Signup | `apps/web-app/src/app/(public)/signup/SignupPageClient.tsx` | Name/email/password form, auto sign-in, redirect to `/dashboard`. Copy promises "explore a sample workflow SOP immediately — no extension install required" and previews a 3-step "After you sign up" list (sample → install → record). | Low risk. Form is short, no credit card. |
| 3 | Land on dashboard | `apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx` | 5 sample workflows already populate the library (§0). `viewState` machine (`DashboardV2Shell.tsx` ~line 1041) computes `empty` only when `filteredWorkflows.length === 0` — **this is never true for a normal signup**, so the dedicated activation surface, `FirstRunTutorial` (`apps/web-app/src/components/dashboard-v2/FirstRunTutorial.tsx`), never renders for a real new user. It renders only if a user deletes every workflow including the samples. | **High.** The one component in the codebase explicitly built to walk a new user through "install → record → measure" (see its own doc comment, "the empty page becomes the activation surface") is unreachable by the population it exists for. This exact gap was independently flagged in `docs/meta/FUNNEL_AND_SOP_REVIEW_001.md` §4 finding C-2 on 2026-07-19 and is still true today — the component was renamed (`OnboardingChecklist` → `FirstRunTutorial`) but the suppression condition was not fixed. |
| 4 | Discover the extension | `apps/web-app/src/components/AppShell.tsx:64-72` | A persistent "Get Extension" button lives in the app-shell top nav, visible on every page including the populated dashboard. | Low-moderate. It exists and is always visible, but it explains nothing about what happens after download — no "then connect it to your account" framing anywhere near it. |
| 5 | Install the extension | `apps/web-app/src/lib/install.ts`, `apps/web-app/src/lib/config.ts:16` | `chromeStoreUrl` is still the literal string `'.../placeholder'`. `isChromeStorePublished()` returns false, so `resolveInstallTarget()` always returns the `direct_download` path — a `.zip` download. `apps/web-app/src/app/(public)/install-extension/page.tsx:52-54` instructs: "Chrome → Extensions → Enable Developer Mode → Load Unpacked → Select the extracted folder." | **High.** The extension is not on the Chrome Web Store. Every install today is a developer-mode sideload — the single highest-friction, most trust-eroding step available for a non-technical ops/admin buyer, and it also shows Chrome's "not verified" warnings. Already scoped for remediation in `docs/meta/CHROME_STORE_REVIEW_002.md` (submission-readiness plan exists; not yet shipped). |
| 6 | Record a workflow | `apps/extension-app/src/sidepanel/screens/IdleScreen.tsx` | Sidepanel: type activity name, "Start Recording," do the work, stop. This works standalone — no Ledgerium account or web-app connection required (`apps/extension-app/src/background/index.ts:314-315`: `uploadUrl` defaults to `''`, and the sync POST is skipped entirely if it's unset). | Low. This part of the product is genuinely fine on its own. |
| 7 | See value in the extension | `apps/extension-app/src/sidepanel/screens/ProcessScreen.tsx` | After stopping, the extension renders its own SOP/process-map/report tabs locally, before anything touches the web app. | Low — this is a real, working "wow" moment, but it's trapped inside the extension. |
| 8 | Get the recording into the paid product | Two paths, both manual: **(a)** `apps/extension-app/src/sidepanel/screens/IdleScreen.tsx` `SyncSettings` — a collapsed, gray, 12px "Sync Settings" link at the bottom of the idle screen. Requires the user to already have gone to `apps/web-app/src/app/(app)/account/page.tsx:707-716`, clicked "New API Key," copied a key + Sync URL, and pasted both into the extension. **(b)** `apps/extension-app/src/sidepanel/screens/ProcessScreen.tsx:466-539` — the primary post-recording button, "Open in Ledgerium AI Website." If no sync is configured (the default), this opens `/upload` **with no data attached** (line 482-486); the user must separately go to the Export tab, click "Export Raw Session JSON," save the file, then drag it into `apps/web-app/src/app/(app)/upload/page.tsx`. | **Critical — see §2.** Nothing in the product ever instructs a user to do (a) before recording. The only place the pairing step is explained at all is a troubleshooting FAQ entry buried at the bottom of `/install-extension` (`apps/web-app/src/app/(public)/install-extension/page.tsx` lines ~207-210: "How do I sync recordings to the web app?"). There is no in-app banner, checklist, or nudge — only a passive one-time *success* toast after the fact (`apps/web-app/src/components/ExtensionStatusToast.tsx`, driven by `apps/web-app/src/app/api/me/extension-status/route.ts`), which fires only once the user has already succeeded. There is nothing for the state "installed, recorded, never connected." |
| 9 | Real workflow lands in the web app | `apps/web-app/src/app/(app)/upload/page.tsx:226-249` (or `/api/sync`) | "Workflow created" success state, "View Workflow" link. **This is the actual "obviously worth paying for" moment** — the user's own process, documented automatically, in their real dashboard. | This is where the funnel should convert. Steps 4-8 above are what prevent most users from ever reaching it. |
| 10 | Quota / upgrade pressure | `apps/web-app/src/lib/feature-gating.ts:158-190` (`checkRecordingLimit`, counts `Upload` rows this UTC month) + `apps/web-app/src/components/UsageQuotaMeter.tsx` | Only starts counting once step 9 has happened at least once. Free = 5/mo (`apps/web-app/src/lib/plans.ts:77`). | Confirmed: quota is enforced correctly on both ingestion routes (`/api/upload`, `/api/sync`) and is **not** prematurely consumed by the sample-workflow seeding (samples are written directly via `db.workflow.create`, not through either quota-checked route). No bug there. |
| 11 | Upgrade | `apps/web-app/src/app/(app)/account/page.tsx` → `/api/billing/checkout` | Stripe checkout, functional as of today per CEO context. | Two copy defects found (not blocking, but wrong): `UsageQuotaMeter.tsx:53` says "Upgrade to Team for unlimited" at 80% quota — Team is not sellable (CEO context) and the actual unlimited, sellable tier is **Solo**. `apps/web-app/src/app/(app)/upload/page.tsx:154,181` still says "Upgrade to Pro — $29/mo," a dead plan name/price that predates the Starter($49)/Solo($89) restructure in `apps/web-app/src/lib/config.ts`. |

**Rough step count from signup to a real, paid-eligible SOP:** ~10-13 discrete user actions once you include the sideload sub-steps (download → extract → open chrome://extensions → enable dev mode → load unpacked → pin) and the manual sync/export sub-steps. This independently corroborates `docs/meta/FUNNEL_AND_SOP_REVIEW_001.md` C-1's "18 discrete actions" count (that review counts at finer granularity but reaches the same structural conclusion) — and confirms that review's finding is still true today, roughly six weeks later.

---

## 2. The single biggest product reason someone would not pay

**A user's real recording almost never reaches the web app, because connecting the extension to the account is a hidden, manual, undocumented-in-onboarding step, and there is no in-app nudge for the "installed but not connected" state.**

The extension and the web app function as two separately-shippable products joined by a step (API-key copy/paste into a collapsed settings panel) that:
- is never mentioned during signup or on the dashboard,
- is never mentioned on the `/install-extension` page except in troubleshooting FAQ text,
- has no failure-state UI in the product (recording without a synced account produces no error, no warning — it just silently never appears in the web app),
- and whose only success signal is a toast that appears *after* the user has already, by luck or persistence, gotten it right.

Concretely: a real prospective customer can sign up, install the extension (assuming they survive the developer-mode sideload), record several real workflows, see genuine local value in the extension's own SOP view, and never once see their own work in the paid product, never hit a quota, never see an upgrade prompt tied to real usage — and never have a reason, rooted in their own pain, to pay. Revenue $0 is consistent with this: even if arrival were 10x higher, this gap caps how many of those arrivals could ever become paying customers, because most of them never get past step 8.

The extension-distribution problem (no Chrome Web Store listing, §1 step 5) is a close second and compounds this — it reduces how many people even attempt step 6-8 at all — but it is a distribution/trust problem that blocks people from *reaching* the activation decision. The sync-pairing gap is the reason people who *did* reach it still don't convert.

---

## 3. Ranked recommendations

| # | Recommendation | Effort | Expected effect |
|---|---|---|---|
| **R1** | **Make "connect your extension" a visible, persistent, unmissable state in the web app** — not just a one-time success toast. Minimum version: reuse the existing `/api/me/extension-status` check (`ExtensionStatusToast.tsx` already calls it) to render a standing dashboard banner/callout for any signed-in user with zero `lastUsedAt` API keys: "Not connected yet — get your Sync key in one click," linking directly into the Account → Extension Sync flow. Full version: auto-generate an API key at signup and have the extension pull it automatically on first launch via a one-time deep link (e.g. `/install-extension?token=...` that the extension reads on load, or an extension-triggered auth handshake), eliminating the copy/paste entirely. | **Lightweight banner: 0.5-1 day.** **Full auto-pairing: 3-5 days** across web-app + extension-app, plus mandatory real-extension harness validation per the Extension Reliability Invariant (any change touching `apps/extension-app/src/background/`, content scripts, or manifest is release-gated). | **Highest leverage in this list.** Directly closes the gap identified in §2 — the reason recorded-but-never-synced work exists at all. |
| **R2** | **Submit to the Chrome Web Store.** Scoping already exists in `docs/meta/CHROME_STORE_REVIEW_002.md` (Scenario (c): ~30 LOC of cleanup, projected 3-7 days to live post-submission, plus Google's own review turnaround). | **Small (code) + external (review queue), ~1-2 weeks wall-clock total.** | Removes the developer-mode sideload barrier and Chrome's "unverified extension" warning — raises the fraction of install-attempts that complete. Does **not** fix R1 on its own; both are needed. |
| **R3** | **Fix the broken fallback in `ProcessScreen.tsx`'s "Open in Ledgerium AI Website" button.** Today, if sync isn't configured, it opens a bare `/upload` tab with no data (`ProcessScreen.tsx:482-486`) — a dead click that looks like it did something. Either auto-trigger the JSON export and prompt the user to drop it on the tab that just opened, or (better) fold this into R1's auto-pairing so this branch stops being the common case. | 1-2 days, extension + web-app, real-extension harness required. | Converts a currently-silent dead end into a working (if still multi-step) recovery path for users who never set up Sync Settings. |
| **R4** | **Fix the two stale upgrade-CTA copy defects.** `UsageQuotaMeter.tsx:53` "Upgrade to Team for unlimited" → should read Solo (Team is not sellable per CEO context). `upload/page.tsx:154,181` "Upgrade to Pro — $29/mo" → dead plan name and price; should reflect Starter $49 / Solo $89. | **<1 hour.** Trivial string + link fixes. | Small in isolation, but this is literally the CTA copy the *one* user segment that reached real quota pressure (i.e., the users R1 is trying to create more of) will see. Ship in the same batch as R1 since it's nearly free. |
| **R5** | **Restore an activation nudge that survives sample-seeding.** The correct fix is not to remove sample seeding (§0 — it's good) but to stop conflating "0 total workflows" with "0 real, self-recorded workflows." Add a distinct, persistent (non-empty-state) prompt driven by a real-vs-sample workflow count (samples are identifiable by session ID prefix / title suffix per `apps/web-app/src/lib/sample-workflow.ts`), so a user who has only sample data still sees a "record your first real workflow" nudge instead of the current silence. | 1-2 days (new lightweight component + one query). | Restores the intent of `FirstRunTutorial` without breaking the fast sample-based first impression. |
| **R6** *(lower priority)* | Team/Growth plan cards on `/account` and `/pricing` render an identical "Upgrade to Team" button to Starter/Solo, but silently resolve to a waitlist response server-side (comment in `account/page.tsx` confirms this by design). Either hide these tiers from the live pricing grid or label the button "Join waitlist" explicitly. | A few hours. | Avoids a confusing dead-end for the (likely small, given current traffic) segment interested in multi-seat plans. |

---

## 4. Verdict: 30-day free-account expiry

**Recommendation: do not implement this now.** No expiry mechanism exists in the codebase today (verified — no `expire`/`freeTrialEndsAt`/account-lifecycle logic found), so this would be new build effort, and it would be solving for the wrong constraint given the evidence above.

**Is the constraint free-user conversion, or arrival volume? Both — but the activation-chain evidence points at a third, prior constraint that neither expiry nor more traffic fixes: most free signups never get their own real work into the product at all.**

- Free is already metered correctly (§1 step 10) — 5 recordings/month, monthly reset, enforced on both ingestion routes, not gameable by the sample-seeding. There is no evidence in the repo of free accounts freely consuming unlimited value forever; the more defensible read of "Revenue $0" plus the chain in §1 is that **most free accounts never complete even one synced recording**, because doing so requires surviving a developer-mode extension sideload and then discovering and correctly executing an undocumented API-key pairing step.
- **What breaks if free expires:** it deletes the accounts of exactly the population this report identifies as *failed by the product*, not people who succeeded and are freeloading. It also directly contradicts current, explicit marketing copy: `apps/web-app/src/app/(public)/signup/page.tsx` metadata states "Free plan includes 5 recordings per month, no credit card required" with no time bound, and the product's own stated positioning is honesty-first (`FirstRunTutorial.tsx` doc comment: *"Honesty (CEO mandate — HONESTY is the moat)"*). Retroactively time-limiting an account type marketed as open-ended is a trust cost the product can't currently afford to spend, given it has zero paying customers to reassure with a track record.
- **Arrival volume (25 clicks/3 months) makes the expiry lever nearly irrelevant even if it worked as intended** — there are too few accounts in the funnel for a lifecycle policy to move revenue on its own.

**Sequencing recommendation:** ship R1-R4 first (roughly a one-week batch), let a cohort of signups complete the full loop end-to-end at least once, and only then evaluate any conversion-pressure lever — with real usage data instead of assumption. At that point a softer, evidence-backed lever (e.g., a day-14 "you haven't connected yet" nudge, or tightening the free quota's *messaging* rather than adding a hard clock) is lower-risk than an account-deletion policy and targets the actual failure mode this report found.

---

## Files cited (for downstream agents)

- `apps/web-app/src/app/(public)/signup/SignupPageClient.tsx`
- `apps/web-app/src/app/api/auth/signup/route.ts`
- `apps/web-app/src/lib/sample-workflow.ts`
- `apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx`
- `apps/web-app/src/components/dashboard-v2/FirstRunTutorial.tsx`
- `apps/web-app/src/components/AppShell.tsx`
- `apps/web-app/src/lib/install.ts`, `apps/web-app/src/lib/config.ts`
- `apps/web-app/src/app/(public)/install-extension/page.tsx`
- `apps/extension-app/src/sidepanel/screens/IdleScreen.tsx`
- `apps/extension-app/src/sidepanel/screens/ProcessScreen.tsx`
- `apps/extension-app/src/background/index.ts`
- `apps/web-app/src/app/(app)/account/page.tsx`
- `apps/web-app/src/components/ExtensionStatusToast.tsx`, `apps/web-app/src/app/api/me/extension-status/route.ts`
- `apps/web-app/src/app/(app)/upload/page.tsx`
- `apps/web-app/src/components/UsageQuotaMeter.tsx`
- `apps/web-app/src/lib/feature-gating.ts`
- `apps/web-app/src/lib/plans.ts`, `apps/web-app/src/lib/config.ts`
- Prior corroborating audit: `docs/meta/FUNNEL_AND_SOP_REVIEW_001.md` (§4, findings C-1, C-2)
- Prior corroborating audit: `docs/meta/CHROME_STORE_REVIEW_002.md`
