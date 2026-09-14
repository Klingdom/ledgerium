# Trial Experience — UX Design (ux-designer contribution to TRIAL_REVIEW_001)

Analysis and design only. No source files were modified as part of producing this document.

## 0. The blocking finding (read this first)

Before any placement or copy decision matters, one fact governs everything else in this report:

**There is no `trialEndsAt` (or equivalent) field persisted anywhere in the database.** I grepped `apps/web-app/prisma/schema.prisma` for `trialEnd` — zero matches. Stripe's `subscription.trial_end` unix timestamp is read exactly once, inside the `customer.subscription.trial_will_end` webhook handler (`apps/web-app/src/app/api/billing/webhook/route.ts:1091`), used only to fire a `trackServer('trial_will_end', ...)` analytics call, and then discarded. It is never written to `User`.

This means: **none of the day-countdown UI in this report ("Trial · 6 days left") is buildable today.** Every screen that needs to know "how many days are left" — the chip, the escalating banners, the account page — has no data source. The `customer.subscription.updated` handler (`route.ts:422`) already loads the Stripe `subscription` object and already writes to `User` for the solo-subscriber path (`route.ts:579`) — that is the natural, minimal site to also persist `trialEndsAt: new Date(subscription.trial_end * 1000)` when `status === 'trialing'`, alongside a Prisma migration adding the column. This is an engineering task, not mine to spec in code, but it is Effort: XS and it is the literal precondition for item #1 in the roadmap below. I am flagging it here so it isn't discovered as a surprise mid-build.

Everything below assumes this field exists as `user.trialEndsAt: Date | null`.

## 1. Investigation summary (files read)

- `apps/web-app/src/components/dashboard-v2/DashboardV2Shell.tsx` — live v2 dashboard shell. Renders `CommandHeader`, `TopBand`, `InsightsStrip`, `UnifiedToolbar`, `WorkflowList`. `CommandHeader` currently renders title+subtitle (left) and time-range selector + portfolio health score (right) — no trial or quota surface anywhere.
- `apps/web-app/src/components/dashboard-v2/CommandHeader.tsx` — the dashboard's top landmark, seen on every dashboard load. Right-hand cluster has room for one more small element before it gets crowded.
- `apps/web-app/src/components/AppShell.tsx` — **the actual global chrome**, wrapping every `(app)` route (`dashboard`, `compare`, `analytics`, `recommendations`, `teams`, `upload`, `account`) via `apps/web-app/src/app/(app)/layout.tsx`. This is more important to this task than `DashboardV2Shell` because trial state and quota state matter on every page the user visits, not just the dashboard — and critically, the two pages where a user is most likely to *feel* the trial (`/account`, `/upload`) are siblings of `/dashboard` under this same shell, not children of it.
- `apps/web-app/src/components/UsageQuotaMeter.tsx` — well-built, unwired (per verified context). Pure, presentational, already handles the unlimited case, already has amber/red thresholds. Not architecturally tied to v1 — reusable as-is with the adjustments in §4.
- `apps/web-app/src/app/(app)/account/page.tsx` — a trialing user sees only a generic status pill (`statusLabels.trialing = { label: 'Trial', cls: 'bg-blue-50 text-blue-700 ...' }`, line 83) next to "Status," and a plain-text "Recordings: used/max" `dt`/`dd` row (line 552-562) with **zero urgency treatment even at 100% usage** — no bar, no color, no CTA. This is a second, independent instance of "the app shows nothing," on the one page where a user goes specifically to check their status.
- `apps/web-app/src/app/(app)/upload/page.tsx` — already has a well-built `UPGRADE_REQUIRED` state (line 101-213: amber-bordered card, lock icon, "Free plan limit reached," upgrade CTA, "See plan details" link). This is the pattern to reuse elsewhere, not reinvent.
- `apps/extension-app/src/sidepanel/screens/ProcessScreen.tsx` — the extension's post-recording sync path (`UploadBar`, line 23-33) only distinguishes `'uploading' | 'complete' | 'failed'`. A quota-403 and a network blip render identically: "Upload failed." This is the **primary** place a free user actually hits the wall (record → auto-sync fails), and it is currently silent about *why*.
- `apps/web-app/src/app/api/sync/route.ts:66-80` vs `apps/web-app/src/app/api/upload/route.ts:28-42` — both call `checkRecordingLimit`, but only the `upload` route's 403 response includes `code: 'UPGRADE_REQUIRED'`. The `sync` route's 403 (the one the extension actually hits on every normal recording) omits `code` entirely. This is a small but real inconsistency that blocks reusing the `/upload` page's error-handling pattern in the extension without a matching backend fix.
- `apps/web-app/src/app/(public)/pricing/page.tsx:42` — confirms the trial's own stated terms: "You enter a card up front, get full plan access immediately, and aren't charged until day 15." I use "day 15" as the anchor for the post-conversion moment throughout this report, since that's the number the product itself already promises.
- `apps/web-app/src/components/dashboard-v2/InsightsStrip.tsx` — confirms the established chip-severity language already in this codebase (red/amber/blue/green, color always paired with icon+text, never color-only) — I reuse this language rather than invent a new one.

---

## 2. Answer 1 — Where trial status should live

Two separate signals, two separate homes. Conflating them (one "status chip" trying to show both trial-days-left and recordings-used) reads as noise; splitting them lets each be small and honest about one fact.

### 2a. Trial days remaining → `AppShell.tsx`, global nav, not `CommandHeader`

Trial status is not a dashboard fact, it's an account fact. It needs to be visible whether the user is looking at their workflow library, on `/account` deciding whether to cancel, or on `/upload` retrying a failed sync. Putting it only in `CommandHeader` means it disappears the instant the user navigates anywhere else — including the two pages where trial-ending decisions actually get made.

**Exact placement:** `apps/web-app/src/components/AppShell.tsx`, inside the `<header>` `<div className="flex h-14 ... items-center justify-between ...">`, immediately after the `LogoFull` link (line 41-43) and before the `<nav>` block (line 45). Left-anchored, next to the logo — not jammed into the already-dense right-hand icon cluster (extension button, email, theme toggle, docs, sign out).

**Component:** a single new small presentational component, e.g. `TrialStatusChip.tsx`, rendered conditionally: only when `subscriptionStatus === 'trialing'` (chip) or `'past_due'` (a different, higher-severity chip — see §3d). Renders nothing for `active`, `canceled`, `none`, or `admin` accounts. It fetches from the same `/api/account` payload `AppShell` doesn't currently call — this requires either lifting an account fetch into `AppShell` or (simpler, less invasive) a tiny dedicated `GET /api/account/trial-status` returning `{ status, trialEndsAt }` only, so `AppShell` doesn't have to duplicate the full `/api/account` shape. Either is fine; the dedicated endpoint is cheaper to reason about and doesn't risk drifting from `/api/account`'s existing contract.

**Visual spec:**
- Pill, `text-ds-xs font-medium`, rounded-full, matches `InsightsStrip`'s existing chip anatomy (severity dot + text, never color alone).
- 14 → 4 days remaining: neutral. `bg-[var(--surface-secondary)] text-[var(--content-secondary)] border border-[var(--border-default)]`. Text: **"Trial · {n} days left"**.
- 3 → 1 days remaining: amber, matching the exact class family already used in `UsageQuotaMeter.tsx` (`text-amber-500` / `bg-amber-50`) so the color vocabulary is consistent app-wide, not invented twice. Text: **"Trial · 3 days left"** / **"Trial · 2 days left"** / **"Trial · 1 day left"**.
- Day of expiry: red, matching `UsageQuotaMeter`'s `isAtLimit` red. Text: **"Trial ends today"**.
- The whole pill is a `<Link href="/pricing">`, `aria-label="View trial and plan details"`.
- Never renders a clock or seconds-level countdown. Whole days only. (See §5 — this is the anti-coercion line, not a style preference.)

**Why not `CommandHeader`:** I considered it — it's true that the dashboard is where most session time is spent. But it fails the "every page" requirement, and duplicating the fetch + render logic into `DashboardV2Shell` *and* `account/page.tsx` *and* `upload/page.tsx` to compensate is worse engineering than putting it once in the shell every page already inherits. `CommandHeader` gets the *quota* signal instead (§2b), which genuinely is dashboard-scoped.

### 2b. Recording quota (free tier) → `CommandHeader.tsx` right cluster + `account/page.tsx`

This one *is* correctly dashboard-scoped — "how many of my 5 recordings have I used" is a workflow-library fact, and the dashboard is where a free user is actively deciding whether to record more.

**Exact placement:** `apps/web-app/src/components/dashboard-v2/CommandHeader.tsx`, inside the right-hand `<div className="flex items-center gap-ds-4 flex-shrink-0">` (line 161), as the **first** item — before the time-range `<select>` (line 163). Reads left-to-right as status → controls → score, and it's the smallest element in that row so it doesn't compete with the 16px verdict word or the health rail.

Render condition: **only for free-plan users** (paid/unlimited plans render nothing here — matches `UsageQuotaMeter`'s existing `isUnlimited` branch). This needs `userPlan` and a `recordingsUsed`/`recordingsMax` pair threaded into `DashboardV2Shell`'s existing `/api/workflows` response `stats` object (which already threads `userPlan`, per `MDR-P09 (b)` — a `recordingsUsed`/`recordingsMax` pair is a one-line addition to that same `stats` payload, reusing `checkRecordingLimit` server-side, the same function the sync/upload routes already call).

**Copy, by state:**
- 0-2 of 5 used: **"2 / 5 recordings this month"**, plain `text-[var(--content-tertiary)]`, not a link — pure orientation, zero call to action.
- 3-4 of 5 used (warning): **"4 / 5 recordings this month"**, amber, becomes a `<Link href="/pricing">`.
- 5 of 5 used (at limit): **"5 / 5 recordings this month"**, red, links to `/pricing`.

This mirrors `UsageQuotaMeter`'s existing threshold math exactly — see §4 for why I'm proposing to extract and reuse that math rather than re-derive it here.

**Second home, same data:** `account/page.tsx`'s existing plain-text "Recordings" row (line 552-562) gets upgraded in place from `<dd className="text-[var(--content-primary)] tabular-nums">{used}/{max}</dd>` to the full `UsageQuotaMeter` component (bar + CTA), which is already imported-ready shaped for exactly this slot. Today, a free user who has used all 5 recordings and goes to `/account` specifically to check their status sees plain black text with no color, no bar, and no upgrade button — on the billing page. That is the single easiest fix in this whole report (render an existing component in an existing slot) and it should not wait.

---

## 3. The trial-ending sequence, with no email

Because there is no email, **every one of these moments must survive the user simply not opening the app that day.** The design below does not try to notify anyone in real time — it tries to make sure that whenever the user *next* opens the app, the state they see is self-explanatory and never contradicts what actually happened to their card.

All copy below assumes the day-15 charge date convention from the pricing page (`pricing/page.tsx:42`).

### Day 10 (4 days remaining) — deliberately quiet

- Global chip (§2a) reads **"Trial · 4 days left."** Neutral color. That is the *entire* design for day 10.
- No banner, no modal, no dismiss-once card. This is intentional, not an oversight: introducing urgency language 10 days before anything happens trains users to ignore the signal by the time it actually matters (see §5). The only thing that happens at day 10 is the chip's number decrements.
- The one exception: if the account has recorded **zero workflows** by day 10, this is an activation problem, not a billing problem, and deserves its own nudge — see roadmap item #10 (P1, not P0). It should say something like **"4 days left in your trial — record your first workflow to see what Ledgerium measures."** and link to `/install`, never to `/pricing`. Conflating "you haven't used the product" with "you're about to be charged" in the same banner is a coercion tell (§5) — keep them structurally separate messages even if they might appear the same week.

### Day 13 (1 day remaining) — first real warning

- Chip flips to amber: **"Trial · 1 day left."**
- A dismissible, non-blocking banner appears **once per calendar day** (session/localStorage-keyed on the date, not on "has this user ever seen it" — it must be able to reappear tomorrow) at the top of whichever `(app)` page the user is on, i.e., rendered from `AppShell` above `<main>`, not per-page:

  > **Your trial ends tomorrow.** You'll be charged **$49** for Starter on **[date]** unless you cancel. [Manage billing →]

  (Amount and plan name are dynamic from the actual price the checkout session was for — never a guessed default.)
- `[Manage billing →]` links straight to the existing Stripe Billing Portal flow (`account/page.tsx`'s `handleManageBilling`, already wired) — not to `/account` generically. One click from warning to cancel, always (§5).
- This is the single highest-leverage banner in the whole sequence: it is very likely the *only* warning a silent-trial user will ever see before being charged, given there's no email. It should not be subtle.

### Day 14 (last day, still `trialing`) — final chance

- Chip goes red: **"Trial ends today."**
- The banner text updates to present tense and becomes slightly more prominent (still dismissible, still linking straight to the portal, still reappearing on next login if dismissed and the state hasn't changed):

  > **Your trial ends today.** You'll be charged **$49** for Starter today unless you cancel before then. [Manage billing →]

- No modal. No blocking interstitial. The user should be able to keep working normally the entire day — this is the line named in §5.

### The day after (day 15+) — the moment that currently doesn't exist at all

This is the most important addition in this report, because it's the one moment guaranteed to affect **every trial user who doesn't cancel**, and today the product says nothing about it whatsoever — the chip (once built) simply disappears and a charge appears on a bank statement with no acknowledgment in the product that connects the two. With no email as a backstop, this is a real chargeback/dispute risk, not just a polish gap.

**Two branches, both driven by `subscriptionStatus`:**

**(a) Charge succeeded → `subscriptionStatus === 'active'`.** First page load after the transition, one-time dismissible banner (from `AppShell`, day-bucketed like above so it survives a re-login before being seen, but self-clears once acknowledged or once `subscriptionStatus` moves on):

> **You're on Starter now.** Thanks for trying Ledgerium — your first charge of $49 went through on [date]. [Manage billing →]

Tone is a receipt, not an upsell — it exists purely to close the loop the silent charge just opened. No exclamation points, no "Welcome to the Starter family!" — matches the plain, declarative voice already used in `FirstRunTutorial.tsx` and the pricing FAQ.

**(b) Charge failed → `subscriptionStatus === 'past_due'`.** This is a **higher-priority** state than the trial-ending banner, and today it has *less* UI than the trial does — `account/page.tsx` shows only a generic red "Past Due" status pill (line 82-89) with no explanation and no CTA. (There is a separate, already-built banner for the SCA/3-D-Secure case — `pendingInvoiceUrl`, line 570-593 — but a plain card decline does not necessarily set that field; a decline can land the account in `past_due` with zero actionable UI.) I'm proposing:

- The global chip (§2a) shows a distinct, higher-severity state for `past_due`: red, **"Payment failed — update card"**, linking straight to the billing portal. This should visually outrank the trial-ending chip states, since at this point money has already changed hands and failed — it's not a countdown anymore, it's an active problem.
- `account/page.tsx` gets a banner in the same visual class as the existing `pendingInvoiceUrl` callout (line 570-593), for the plain `past_due` case:

  > **Your last payment didn't go through.** Update your card to keep your account active. [Update payment method →]

This closes a gap that exists independent of the trial work — it just becomes urgent *because of* the trial work, since day-15 conversion is the first moment most free-trial accounts will ever hit a real card charge.

---

## 4. Should `UsageQuotaMeter` be reused or rebuilt?

**Reused and lightly extended. Do not rebuild.**

Reasons:
1. It is genuinely well-built and has zero v1-specific coupling — no v1-only imports, no special context, pure props (`used`, `limit`, `plan`). It can be dropped into v2 call sites unmodified in terms of *logic*.
2. It already encodes the exact threshold language (`isWarning` at ≥80%, `isAtLimit` at 100%, amber/red) that I'm proposing to reuse verbatim for the `CommandHeader` chip in §2b — rebuilding would mean re-deriving thresholds that already exist and are already correct.
3. Per the CLAUDE.md iteration history for this component (iter-048), a `deriveQuotaState(used, limit)` helper was already written — but only as a **test-mirror** inside `UsageQuotaMeter.test.tsx`, not extracted into the component itself. That was flagged at the time as a divergence risk (the test's copy of the logic can silently drift from the component's real logic). Extending this component is the right moment to fix that flagged debt: extract `deriveQuotaState` into `UsageQuotaMeter.tsx` as an exported pure function, have the existing meter render consume it, and have the new compact `CommandHeader` chip consume the *same* exported function instead of re-implementing the 80%/100% math a third time. One source of truth for "what counts as warning/at-limit," used by the full meter, the compact chip, and any future surface.

What does need to change, regardless of reuse-vs-rebuild:
- **The copy is stale and wrong today.** `UsageQuotaMeter.tsx:53` reads *"Upgrade to Team for unlimited"* and `:62` reads *"Upgrade to record without limits."* Per verified context, the plan lineup is now Free → Starter ($49, 15/mo) → Solo ($89, unlimited) — there is no "Team" in this ladder anymore for an individual free user's natural upgrade path. If this component were wired up verbatim today it would tell a free user to upgrade to a plan that isn't the one that solves their problem. This needs fixing before (or as part of) wiring it up, independent of the trial work.
- **A compact variant is needed for the `CommandHeader` chip slot** (§2b) — the existing component is a stacked bar+label+pill shape suited to the roomy `account/page.tsx` billing card, not a single 24px header row. I'd add a `variant?: 'full' | 'compact'` prop rather than fork a second component — `compact` renders just the pill text (no bar, no plan badge), everything else (thresholds, copy, link behavior) shared.

Effort: **S** (extract pure function, fix two copy strings, add one prop + compact render branch, wire two call sites). This is meaningfully cheaper than a rebuild and inherits a component that already got the accessibility details right (`aria-label="Upgrade plan to increase recording limit"` on both existing links).

---

## 5. Where helpful becomes coercive — the line I will not cross

**The product will never make something look broken, missing, or about to disappear in order to manufacture urgency it hasn't earned yet.** Every trial-status signal has to be true *today*, not persuasive-through-exaggeration. Concretely, that rules out:

- **Countdown timers with ticking seconds/hours.** Whole-day counts only ("3 days left"), never "2d 14h 32m." A ticking clock is a pressure tactic dressed as information; a day count is information.
- **Degrading the product before the trial actually ends.** No soft-throttling, no hiding real data, no disabling features early to "remind" the user the trial is ending. The product runs at full fidelity for 100% of the 14 days — the *only* thing that changes is what the chip says.
- **Any modal or blocking interstitial mid-trial.** Every banner in §3 is dismissible and non-blocking, including on day 14. The one place I'd consider a very light non-dismissible treatment is the day-15 "you were charged" receipt (§3, branch a) — and even that is a passive banner, not a modal, because its job is disclosure, not a decision gate.
- **Escalating color/urgency before the countdown genuinely warrants it.** If amber appears at day 10, the user stops trusting amber to mean "3 days left" by the time it's actually true — false urgency early spends down the credibility the real warning on day 13 needs to work at all. Neutral through day 4, amber days 3–1, red on the day itself. No exceptions for "boosting conversion."
- **Guilt or loss-framed copy that isn't true.** No "Don't lose your workflows!" — nothing in this design deletes recorded workflows when a trial lapses or a payment fails; only the ability to record *new* ones is gated. Copy must never imply data loss that doesn't happen. (This is a copy-honesty assumption on my part, not a confirmed backend behavior — flag for `backend-engineer`/`product-manager` confirmation before the day-14/day-15 copy ships, since if downgrade-on-non-payment *does* restrict read access to existing workflows, all the copy above needs to say so honestly instead.)
- **Hiding or complicating the cancel path once a warning is shown.** Every warning banner in §3 links directly to the Stripe Billing Portal, one click, no interstitial "are you sure" screen inserted by us on top of Stripe's own confirmation. If a future design ever adds friction to the cancel flow *specifically because* a warning banner is visible, that is the line being crossed.
- **A day-15 "welcome" banner that reads as celebratory instead of a receipt.** Getting charged without warning and then getting cheered at afterward reads worse than getting charged and hearing nothing at all. The day-15 copy in §3 is deliberately flat and factual.

---

## 6. Ranked roadmap — impact, effort, now vs. later

Ranked by expected effect on trial→paid conversion and on preventing silent-charge disputes (which I'm treating as equally urgent to conversion, since an unexplained charge is a trust break that costs more than a missed upgrade).

### Needed now (P0)

| # | Item | Why it's P0 | Effort | Owner |
|---|---|---|---|---|
| 1 | Persist `trialEndsAt` on `User` at `customer.subscription.updated` (§0) | Every day-count UI below is unbuildable without this. | XS | backend-engineer |
| 2 | `sync/route.ts` 403 response includes `code: 'UPGRADE_REQUIRED'` to match `upload/route.ts` (§3, extension gap) | Without this, the extension cannot distinguish a quota-403 from a network error — the exact gap named in the task. | XS | backend-engineer |
| 3 | Day-13 / day-14 warning banner in `AppShell`, one-click to billing portal (§3) | The only warning most silent users will ever see before being charged. Highest single-item conversion/trust lever in this report. | S | frontend-engineer |
| 4 | Day-15 post-conversion receipt banner, both `active` and `past_due` branches (§3) | Closes the silent-charge gap entirely; `past_due` branch also fixes an existing, trial-independent gap (no banner for a plain declined card today). | S | frontend-engineer |
| 5 | Global trial-days chip in `AppShell` (§2a) | Ambient, always-visible status — the "seen but not nagging" baseline the rest of the sequence escalates from. | S | frontend-engineer |
| 6 | Extension `ProcessScreen`/`UploadBar`: distinguish quota-403, add upgrade CTA, confirm recording is retained locally + offer retry-sync (§3, primary limit-hit surface) | This is *the* moment named in the task — "currently they see nothing" — and it's the first place, not the last place, a free user hits the wall, since recording happens before any dashboard visit. | M | frontend-engineer (extension) |
| 7 | `UsageQuotaMeter`: fix stale "Upgrade to Team" copy, extract `deriveQuotaState`, add `compact` variant (§4) | Blocks #8/#9 below; also, shipping the stale copy as-is would actively mis-upsell any free user who does see it. | S | frontend-engineer |
| 8 | Wire quota chip into `CommandHeader` (§2b) | Preventive signal before the limit is hit — today there is none. | S | frontend-engineer |

### Near-term, not launch-blocking (P1)

| # | Item | Why it can wait a cycle | Effort |
|---|---|---|---|
| 9 | Replace plain-text Recordings row on `account/page.tsx` with the real `UsageQuotaMeter` (§2b) | Real gap, but lower traffic than the dashboard/extension paths, and trivial once #7 ships. | XS |
| 10 | Day-10 activation nudge for zero-workflow trialing accounts, separate from billing messaging (§3) | Improves activation, not conversion-of-the-already-activated; deliberately decoupled from the urgency sequence. | S |
| 11 | Chip treatment for canceled-during-trial edge case | Real but low-frequency path; current generic "Canceled" status pill is not actively misleading, just unpolished. | XS |

### Can wait / explicitly not recommended

- A "we don't have email yet, bookmark this page" in-product disclaimer was considered and **rejected** — it reads as the product admitting it's broken, which undermines the trust the rest of this design is trying to build. Better to just make the in-product signal good enough that email isn't missed (which is the entire point of §3), and revisit an actual email system as a separate, non-UX decision.
- Seat/team-specific trial variants — out of scope; the current trial is individual-subscriber-only per verified context (BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD gates Team/Growth checkout entirely today).

---

## 7. Handoff notes

- This report proposes well over 3 new user-visible copy strings (chip states ×4, two banners ×2 variants each, receipt banner, past_due banner, quota chip states ×3). Per this repo's own specialist-invocation gate, that clears the ≥3-string threshold and `growth-strategist` should get an adjacent ≤30-min consult on the exact copy before it ships — I've written functional/honest copy above, not final brand-voice-polished copy.
- Item #1 (persist `trialEndsAt`) and item #2 (sync route `code` field) are backend changes that gate everything else in the P0 list; recommend sequencing them first, as their own small iteration, before any frontend work in this list starts.
- `qa-engineer` should have explicit test cases for: chip disappearing entirely on `active`/`none`/`canceled`; the day-bucketed dismiss-and-reappear behavior (dismiss today, confirm it reappears tomorrow if still `trialing`); the `past_due` chip correctly outranking a stale `trialing` chip if both could theoretically be computed in the same render (they can't in practice, since status is a single enum, but worth an explicit regression test given how many trial-adjacent states this codebase already tracks); and the extension's local-recording-retained-after-403 guarantee named in item #6 — that one is a data-loss risk if it regresses, not just a copy risk.
