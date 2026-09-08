# Growth Review 001 — Signup/Conversion Funnel + 30-Day Free Expiry Evaluation

**Author:** growth-strategist
**Date:** 2026-09-02
**Evidence base:** direct source read of `apps/web-app/src`, `docs/meta/REVENUE_PLAN_20K_001.md`, `docs/meta/SEO_AEO_EXPANSION_001.md`, `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW_001.md`, plus CEO-supplied GSC figures. No number below is invented; every claim cites a file or an existing artifact.

---

## 0. The one fact that governs this whole review

**~25 visitors arrived in three months. 22 went to the homepage.** Whatever is wrong with conversion mechanics downstream of that number is a rounding error next to the number itself. Any recommendation that spends effort optimizing the *rate* at which 25 people convert, instead of the *count* of people arriving, is optimizing the wrong variable. That governs the ranking in §3 and the verdict in §2.

---

## 1. Funnel leak, stage by stage

### Stage 1 — Visit → Signup: **this is where ~100% of the loss happens, and it's not a UX problem**

- GSC trailing 3 months: 25 clicks / 1,979 impressions / position 44 average (`REVENUE_PLAN_20K_001.md` §10; corroborated in more granular form by `SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §1 — impressions grew 27× June→August while clicks fell to **zero** in the most recent period).
- The counter-evidence that this is a visibility problem, not a content or landing-page problem: one page at position 5.0 converts at 100% CTR (`SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §2, `/sop-templates/vendor-setup-sop-template`). When Ledgerium ranks, people click. It essentially never ranks.
- The signup page itself (`apps/web-app/src/app/(public)/signup/SignupPageClient.tsx`) is low-friction: email + password + optional name, expectation-setting copy ("Sign up free, and explore a sample workflow SOP immediately — no extension install required," lines 104-107), a 3-step "what happens next" preview. This is not the leak. There is nothing here worth spending engineering time on right now.
- The homepage (`apps/web-app/src/app/(public)/page.tsx`) leads with a real, specific hook ("Your SOP says 5 steps. Your team takes 17.") and puts "Free to start. No credit card required" directly under the primary CTA (line 114-116). This is competent landing-page work. It is currently being shown to essentially nobody.

**Conclusion: Stage 1 is not a conversion-rate problem. It is an arrivals problem**, and it is caused by off-page authority (zero third-party citations — `SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §2.2), not by anything fixable in `apps/web-app`.

### Stage 2 — Signup → Extension install: **the single worst UX step in the product, confirmed leak**

- `apps/web-app/src/app/(public)/install/page.tsx` — the only install path is a 4-step Chrome Developer Mode sideload: download a `.zip`, extract it to a permanent folder, enable Developer Mode, "Load unpacked," find the manifest, pin the icon.
- `apps/web-app/src/lib/install.ts:16` — `chromeStoreUrl: 'https://chrome.google.com/webstore/detail/ledgerium-ai/placeholder'`. The Web Store listing does not exist. `resolveInstallTarget()` (line 57) confirms the direct-download/sideload path is still the only live one — `isChromeStorePublished()` returns false as long as the URL contains `placeholder`.
- Independently flagged by `SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §3: *"The terminal step is a Developer-mode sideload... Blockers 2/3/7 are closed; BLOCKER-4 was closed 2026-08-13. Remaining: BLOCKER-1 (likely already satisfied), BLOCKER-5 (uploader.ts has zero tests), BLOCKER-8 (screenshots)."* — i.e., this is close to shippable, not a large remaining lift.
- There is a tracked `extension_install_clicked` event (`analytics.ts:515`) but no corresponding install-*completion* event anywhere in the analytics taxonomy I could find. **There is no instrumentation to even measure this leak's size.** That is itself a gap.

**This is a real, confirmed, high-severity leak** — asking a non-engineer (ops/compliance persona, per the homepage's own "Who it's for" section) to enable Developer Mode and load an unpacked extension is a drop-off point for a large fraction of people who otherwise would have installed. It affects every visitor regardless of channel, which is why it ranks high in §3 even though traffic is tiny.

### Stage 3 — Install → First recording: **reasonably well built, not the leak**

- `apps/web-app/src/app/(app)/dashboard/page.tsx` auto-seeds a sample workflow on first load when the user has no workflows (line 497 comment, `EmptyDashboard` at line 2076) and renders `OnboardingChecklist` (imported line 51).
- `apps/web-app/src/components/OnboardingChecklist.tsx` is a real, working progressive-disclosure checklist (localStorage-persisted state, dismissible, step-completion tracking against `hasExtensionKey` / `workflowCount`).
- No evidence in any prior review names this stage as a defect. I did not find one either. **Not a priority.**

### Stage 4 — First recording → SOP created: no evidence of a leak here

Nothing in the reviewed reports or code suggests a manual or blocking step between a completed recording and a generated SOP. This is presented as automatic. Not investigated further — no signal it's broken.

### Stage 5 — SOP created → Paid: **one confirmed bug, one confirmed-fixed blocker, one open verification item**

- **Confirmed bug:** `apps/web-app/src/components/UsageQuotaMeter.tsx` lines 47-63. When a Free or Starter user hits 80% or 100% of their monthly recording quota, the upgrade nudge reads *"Upgrade to Team for unlimited"* / *"Upgrade to record without limits"* and links to `/pricing`. **Team is not purchasable** — `apps/web-app/src/app/api/billing/checkout/route.ts:65` (`BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD`) rejects it server-side with HTTP 402, and `PricingCards.tsx:214-239` routes it to a `mailto:` waitlist. This copy predates the Solo tier (`plans.ts:114-128`, unlimited recordings, $89) and was never updated. **The one upgrade nudge that fires when a user has hit a real, felt constraint (quota) points at a tier they cannot buy**, when a purchasable unlimited tier (Solo) exists one step away. This is a direct, provable, cheap-to-fix leak on the exact users who are most primed to convert (they've used the product enough to hit a limit).
- **Was a real blocker until "today," now resolved (per the prompt) — verify in prod:** `checkout/route.ts` shows a fully-built Stripe flow (trial eligibility, `TRIAL_PERIOD_DAYS`, promo codes, tax, one-time SKUs) and `PricingCards.tsx:23-38` fails closed on an availability check (`/api/billing/sku-availability`) before ever rendering a live Checkout button — meaning if Stripe env vars are still misconfigured in production, the buttons render as "Not available yet" rather than a broken checkout. Good defensive engineering. **Action item, not a code leak:** confirm a real test-mode subscription completes end-to-end in production now that Stripe is live, per `REVENUE_PLAN_20K_001.md` §7 Phase 0 gate.
- **No email/drip/win-back sequence found anywhere in `apps/web-app/src/lib`.** A user who signs up, doesn't install, or hits quota and doesn't upgrade, receives no follow-up. This is a real gap but a build item, not a "leak" I can point to a broken line for.

---

## 2. Verdict on the 30-day Free-account-expiry proposal

**Don't do it.**

### The reasoning, directly against the CEO's own framing questions:

**Is the binding constraint conversion rate, or arrivals?** Arrivals, decisively. 25 visitors/quarter, 22 to the homepage. Even a mechanism that doubled free→paid conversion among whatever tiny number of free signups exist would move revenue by a handful of dollars a month. The math in `REVENUE_PLAN_20K_001.md` §1 says 105 customers are needed; there is no visible population of free users anywhere near large enough for a forcing function to matter yet. This proposal optimizes a stage of the funnel that isn't the bottleneck.

**What does a free tier do for word-of-mouth, SEO, and social proof with no brand?** It is the *entire* mechanism you currently have for both:
- The only viral/word-of-mouth surface in the product today is the shared-SOP link (`apps/web-app/src/app/(public)/share/[token]/page.tsx`) — a recipient views a real SOP with no login, then gets a "Record your first workflow" CTA back to signup (line 128-143), with `localStorage`-based attribution (`ledgerium_signup_ref`) back to the shared-SOP source. This loop depends on the original recorder's content staying live and them staying enrolled long enough to actually share it, revisit it, and have colleagues click through. A 30-day account expiry puts a countdown clock on the one growth loop that exists.
- `SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §8 identifies **off-page authority — third-party roundups, reviews, analyst/press mentions — as the single highest-leverage fix available**, because it's the only thing that moves position 44. Reviewers and bloggers who write "best Scribe alternatives" posts need to actually use a product, often intermittently, over weeks, to review it. A hard 30-day cutoff actively works against acquiring exactly the kind of external citation this review says is the #1 unlock.
- Social proof on the site today is thin — no customer logos, no testimonials, no case studies observed in the pages read. Free users using the product *are* the closest thing to a proof signal available. Cutting them off after 30 days doesn't create proof; it removes users.

**What is the realistic downside?**
1. **Near-zero revenue upside at current volume** — there aren't enough free users for a forcing function to move the $20k target.
2. **It directly undercuts the "Free to start. No credit card required" trust signal** that's on the homepage hero (`page.tsx:114-116`) and repeated in the trust strip (`page.tsx:487`, "Free to start — No credit card needed"). Removing that promise mid-flight, for a company with zero brand recognition trying to win first-time trust from strangers, is a real cost to the thing you're trying to build (trust), not just a policy tweak.
3. **It conflicts with an existing, deliberately-designed retention floor.** `apps/web-app/src/lib/process-graph/adapters/retention-policy.ts` already codifies a 90-day evidence-retention floor for Free/Starter tiers (`REVIEWED_EVIDENCE_RETENTION_DAYS` for free/starter, lines 43-48). A 30-day *account* expiry would sit inside that 90-day *evidence* retention window, creating two competing, undocumented deletion clocks on the same data — a genuine architecture conflict, not just a product decision, and would need real engineering design (grace period, reactivation, data-export-before-deletion, warning emails) to do safely. That's real effort spent on the wrong stage of the funnel.
4. **It punishes users for not converting to tiers that, until today, could not be bought at all** (Team/Growth routed to a waitlist; Solo/Starter checkout only went live today per the prompt). There is zero data yet on how free users behave against a product they can actually purchase. Acting on a conversion assumption before the sellable product has even had a week of exposure is acting ahead of the evidence the CEO's own Revenue Plan says to wait for (`REVENUE_PLAN_20K_001.md` §7 Phase 1 gate: "first paying customer... the single most important milestone in this document — everything before it is theory").

### Modified version, if a time-based mechanic is wanted

Don't expire the account or its data. If you want a lighter nudge:
- An **inactivity-triggered** (not signup-age-triggered) reminder email at ~30 days for users who signed up but never completed a recording — this targets genuinely dead accounts, not active evaluators, and doesn't touch the share-link/SEO/word-of-mouth value of accounts that *are* being used.
- This is still a Stage-5-adjacent build item, not a Stage-1 fix, and should be sequenced behind the items in §3 that touch every visitor rather than a self-selected subset.

**This is a "don't do it" with a much smaller and non-punitive substitute available if a time-based lever is wanted later, once there's a free-user base large enough for the question to be worth asking at all.**

---

## 3. Ranked recommendations (highest expected value first)

| # | Recommendation | Expected effect | Effort | Evidence |
|---|---|---|---|---|
| 1 | **Fix the `UsageQuotaMeter` upgrade CTA** — stop pointing quota-limited users at the unpurchasable "Team" tier; point at Starter/Solo or generic `/pricing`. | Small in absolute terms (tiny user base) but likely **~100% of currently-broken paid conversions on the one nudge that fires at a real moment of intent.** Free. | **~30 minutes.** 2-line copy + href change in `UsageQuotaMeter.tsx:53,62`. | Direct code read, cited above. Not speculative — this is a live bug. |
| 2 | **Ship the extension to the Chrome Web Store.** | Removes the worst single friction point in the entire funnel (Stage 2), for every visitor regardless of channel — including 1:1 founder-led demos and any future outreach, so it pays off even before traffic grows. | **Days, not weeks.** 7/8 blockers already closed per `SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §8 item 2; remaining items are a permission check (likely already fine), test coverage on `uploader.ts`, and screenshots. | `install.ts:16` still shows the placeholder store URL; independently flagged as top-3 priority in two separate reviews. |
| 3 | **Confirm production Stripe end-to-end** (a real test-mode subscription completes; `DEMO_MODE_DISABLE_TEAMS` repo variable isn't leaking into prod and 404-ing team endpoints unrelated to this but worth a 5-minute check while in there). | Necessary precondition for recommendation #1 and #4 to mean anything — if checkout is silently misconfigured, none of the funnel below the pricing page matters. | **~45 minutes**, per `REVENUE_PLAN_20K_001.md` §3 row 2 (was CEO's own estimate; per the prompt this happened "today" — this is a verification, not new work). | `REVENUE_PLAN_20K_001.md` §3, §7 Phase 0. |
| 4 | **Link `/demo` from the SEO pages, and more prominently from the homepage/pricing flow.** | Zero-cost conversion lift on whatever traffic does arrive — a working, no-login interactive demo currently gets essentially no internal links. | **Hours.** Add links in existing page templates; no new build. | `SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §3, §8 item 3: *"A no-login interactive demo exists at /demo and is linked from zero of the 164 SEO pages... Free conversion, no traffic required."* |
| 5 | **Off-page authority — outreach to get into the third-party "best-of" roundups where every competitor already appears and Ledgerium appears in zero.** | This is the only lever that moves position 44 and therefore the only lever that grows Stage 1 arrivals, which is the actual binding constraint (§0). Everything else in this table optimizes a funnel almost nobody is currently in. | **Weeks to months**, founder/BD time, not engineering. | `SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §2.2, §8 item 1 (ranked #1 in that review too, independently). |
| 6 | **Stop publishing new programmatic SEO pages.** | Not a positive action — a "stop doing" that redirects effort toward #5. 136 pages published since June produced 27× more impressions and a **net decline to zero clicks**, because position ~44-70 cannot be CTR-optimized out of. | N/A — this frees up effort rather than costing it. | `SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §1, §8; `REVENUE_PLAN_20K_001.md` §8. Two independent reviews reach this conclusion. |
| 7 | **Build a minimal win-back/reminder email** for signed-up-but-never-recorded and quota-hit-but-never-upgraded users. | Modest — recovers some fraction of a currently tiny population, same caveat as the 30-day proposal: low absolute value until there's real volume. | **1-2 days** for a bare version (2 triggered emails). | No such mechanism found anywhere in `apps/web-app/src/lib`; confirmed absence, not measured underperformance. |

**Explicitly NOT recommended, and why:**
- **The 30-day free expiry** (§2) — negative-to-zero expected value at current scale, real architecture conflict with existing 90-day evidence retention, and directly undercuts the two channels (word-of-mouth via shared SOPs, and third-party reviews) that this review and the SEO effectiveness review both independently identify as the highest-leverage fixes available.
- **Any further landing-page/signup-flow copy optimization.** `SignupPageClient.tsx` and the homepage are already competent. Optimizing a 25-visitor/quarter funnel's copy is not where the next dollar of effort should go.
- **Paid acquisition.** Explicitly recommended against in `REVENUE_PLAN_20K_001.md` §8 until the funnel has a bottom (Chrome Web Store) and a sellable tier (as of today, arguably now true) — but even so, CAC on a domain-authority score this low will likely be poor until off-page authority (#5) has had time to work. Revisit after #2 and #5 show traction, not before.

---

## 4. Fixes that matter now vs. fixes that only matter once traffic exists

**Matter now, at ~25 visitors/quarter (do these regardless of when traffic grows):**
- #1 UsageQuotaMeter CTA bug — fixes a broken conversion path that exists today, independent of volume.
- #2 Chrome Web Store listing — reduces friction for every visitor, every demo, every cold outreach email sent by a human, not just organic search traffic. This is infrastructure that pays off at any volume, including zero.
- #3 Stripe production verification — a precondition, not a growth lever, but blocks everything downstream if skipped.
- #4 Link `/demo` — free, immediate, doesn't depend on more visitors arriving to matter.
- **Rejecting the 30-day expiry now** — the cost of doing it (killing word-of-mouth/review-loop value, retention-policy conflict, engineering time) is front-loaded and real; the benefit is back-loaded and currently near-zero. The asymmetry argues for not building it at this stage regardless of what's decided later.

**Only matter once real traffic exists:**
- #5 Off-page authority outreach — this is the thing that *creates* traffic, so strictly it should start now, but its *payoff* (rankings moving, referring domains accumulating) is inherently a multi-month process; measure it against the re-entry criteria the SEO review already defined (`SEO_AEO_EFFECTIVENESS_REVIEW_001.md` §8: average position < 20, referring domains > 0, at least one non-brand query with clicks) rather than expecting near-term signal.
- #7 Win-back emails — real but low-value until there's a meaningful weekly signup count to recover a meaningful fraction of.
- Any further Stage-5 (quota → paid) conversion-rate tuning beyond the one confirmed bug in #1 — A/B testing pricing-page copy, upgrade-nudge timing, trial-length experiments. None of this is worth instrumenting rigor around until there's enough weekly signal to read a result. Revisit this list once weekly signups are consistently in the double digits.
- Paid acquisition (explicitly deferred, see §3).

**What will NOT work, stated directly:** more SEO pages at position 44-70 will not produce clicks — this was already tried at 27× scale and produced zero. CTR/title optimization below position ~20 will not work — this was also already tried and is documented as the cause of the impressions-up-clicks-down pattern. A 30-day free-tier expiry will not move revenue at current scale — there aren't enough free users for it to bite, and the users it would remove are disproportionately the ones capable of generating the word-of-mouth and reviews the product actually needs right now.
