# Site State Review 002 — Product Manager Analysis (Mode 3-adjacent, NON-counting)

**Date:** 2026-07-07
**Scope:** Public surface (`apps/web-app/src/app/(public)/`) + app surface (`apps/web-app/src/app/(app)/`)
**Method:** Read-only review of homepage, product page, pricing page, install/install-extension pages, demo page, ai-opportunities hub, ai-implementation use-case page, recommendations (app), dashboard page, onboarding logic, nav config, signup flow. No code modified.

---

## 1. Does the site tell one coherent product story from landing → signup → install → activation?

**Mostly yes, with one real discontinuity.** The narrative core is consistent and repeated verbatim across `page.tsx`, `product/page.tsx`, and `demo/page.tsx`: *record → process → get SOP/process map/AI-readiness report*. Hero, "how it works," "built different," and footer CTAs all point at the same 3-output promise. This is a well-unified single-workflow story.

Post-signup, `SignupPageClient.tsx` routes directly to `/dashboard` (no forced extension-install interstitial), and `dashboard/page.tsx` renders `OnboardingChecklist` with 4 explicit steps (`apps/web-app/src/lib/onboarding.ts`): install extension → record/upload first workflow → view SOP → view process map. This is a coherent, well-sequenced activation ladder and is a **strength**, not a gap.

**The discontinuity:** the extension is distributed as a manual sideload (`install/page.tsx`, `install-extension/page.tsx`): download a `.zip`, extract it, open `chrome://extensions`, enable **Developer Mode**, click **Load unpacked**, select the folder. This is 4 non-trivial steps requiring the user to change a browser security setting, framed reassuringly ("this is safe... does not reduce your browser's security") but still a meaningful trust/friction barrier for a paid B2B SaaS funnel, and it directly contradicts `CLAUDE.md`'s stated goal that the extension "is being submitted to the Chrome Web Store." There is also a duplicate, near-byte-identical `/install` and `/install-extension` page (marketing CTAs point to `/install`; the onboarding checklist points to `/install-extension`) — a minor maintenance/SEO redundancy riding on top of the bigger sideload problem.

## 2. Positioning gap vs. observe → recommend → execute vision

**The AI-integration vision is absent from the public site and largely absent from the app.** Evidence:

- Homepage, product page, and demo page describe only "AI Opportunity Scoring" (a readiness score derived from step count/duration/systems-touched) — this is the **observe** stage only.
- `pricing/page.tsx` comparison table lists **"AI agent composition"** and **"Integration risk assessment"** as Growth/Enterprise line items (lines 89–90) with **zero explanation anywhere on the site** — no dedicated page, no callout, no tooltip, no product screenshot. These read as placeholder/aspirational bullets bolted onto a table that otherwise enumerates real, demonstrated capabilities.
- `use-cases/ai-implementation/page.tsx` gets closest to the vision language ("observe before you automate") but positions Ledgerium purely as an **evidence-generation layer for external automation platforms** ("ready to feed into n8n, Zapier, or custom agent frameworks") — i.e., hand off to someone else's execution engine, not Ledgerium's own recommend→execute loop.
- In the app, `/recommendations` (`apps/web-app/src/app/(app)/recommendations/page.tsx`, labeled "Actions" in `AppShell.tsx` nav) is a **process-improvement recommendation feed** (standardize_variant, update_sop, automate_step, reduce_rework, etc.) sourced from `ProcessDefinition.intelligence.recommendations` — this is process-optimization guidance, not AI-provider connection/execution.
- Grep across the app for BYOK / provider keys / "connect your AI" / OpenAI / Anthropic / Azure OpenAI returns nothing except the existing evidence-grounded **"ask a question" (RAG-style)** feature on `/api/workflows/[id]/ask` — a real, shipped, narrow AI capability that is under-marketed (one sentence buried in tour step 4) and is not connected to the recommend/execute narrative at all.

**Net:** per `docs/meta/AI_INTEGRATION_PLATFORM_VISION_REVIEW_001.md`, this is a first-mover window (18–24 months) the company is explicitly trying to claim — but a visitor reading the site today has no way to discover this direction exists. The pricing table's unexplained "AI agent composition" bullet is actively risky: it over-promises a capability with zero product backing, which is exactly the "AI-washing" risk the vision review's own Growth section flagged as a reason to sequence trust signals before any AI-integration launch messaging.

## 3. Four-tier pricing + trial funnel coherence

Structurally sound (Free $0 / Starter $49 / Team $249 / Growth $799 / Enterprise custom, 14-day trial, 17% annual discount), but **two tiers are not actually self-serve**: the pricing page's own amber banner (lines 188–196) states Team and Growth "route to a waitlist" pending Q3 2026 multi-user infrastructure, while the FAQ two paragraphs later says "every paid plan (Starter, Team, Growth) includes a 14-day free trial... enter a card up front." These two statements are in unresolved tension on the same page — a prospect evaluating Team/Growth cannot tell whether they get instant trial access or a waitlist email. The comparison table also lists "AI agent composition" (Growth) and "Integration risk assessment" (Growth) with no product page to substantiate them (see #2), further weakening trust in the upper tiers specifically where the biggest checks are being asked for.

## 4. Activation-path gaps

Largely good (see #1) — the onboarding checklist is explicit and sequenced correctly. Two residual gaps: (a) the sideload-install friction is the single biggest drop-off risk between "created account" and "recorded first workflow"; (b) the in-app "Actions" nav label for `/recommendations` doesn't signal to a new user that this is where AI-flagged process improvements live — a small discoverability tax on an otherwise-good activation flow.

---

## Top 5 Findings, Ranked

**P0-1 — AI-integration vision (observe→recommend→execute) has zero public-site presence and zero in-app execution surface.**
Evidence: no dedicated page; pricing table's unexplained "AI agent composition"/"Integration risk assessment" bullets; `/recommendations` is process-optimization only; no BYOK/provider-connect UI anywhere. Expected benefit of fixing: unlocks the stated 18–24 month competitive window (per AI_INTEGRATION_PLATFORM_VISION_REVIEW_001) and gives Growth/Enterprise buyers a reason the top tiers cost 3–16x Starter; today those tiers are priced ahead of any demonstrable AI-integration value.

**P0-2 — Extension activation requires manual Developer Mode sideload, not a Chrome Web Store install.**
Evidence: `install/page.tsx` + `install-extension/page.tsx`, 4-step zip/extract/dev-mode/load-unpacked flow. Expected benefit of fixing: removing this friction is likely the single highest-leverage activation-funnel improvement available — sideloading with a "change your browser security setting" instruction is an unusual and trust-eroding ask for a paid B2B product, especially post-signup when intent is highest.

**P1-1 — Pricing page contains unsubstantiated feature promises ("AI agent composition," "Integration risk assessment") with no supporting product surface.**
Expected benefit of fixing: either build a minimal explainer (even a roadmap/"coming soon" framing) or remove the line items — closing this gap reduces AI-washing risk and pricing-page trust erosion for exactly the tiers where the CEO's stated growth vision needs credibility.

**P1-2 — Team ($249) and Growth ($799) tiers are not self-serve (waitlist) while FAQ copy implies instant 14-day trial access for all paid plans — direct contradiction on the same page.**
Expected benefit of fixing: reconciling the FAQ language with the waitlist banner (or shipping self-serve checkout for these tiers) removes a same-page contradiction that actively confuses the highest-value part of the funnel.

**P2-1 — Duplicate `/install` and `/install-extension` pages, and the shipped evidence-grounded "ask a question" AI feature is under-marketed / disconnected from the AI-integration narrative.**
Expected benefit of fixing: consolidating the install pages removes SEO/UX redundancy; promoting the "ask" feature as a first proof-point of "AI grounded in your evidence" gives the company a safe, already-shipped bridge to start telling the bigger AI-integration story without over-promising.

---

## Summary (≤250 words)

**P0** — Two severe gaps. (1) The observe→recommend→execute AI-integration vision (CLAUDE.md / AI_INTEGRATION_PLATFORM_VISION_REVIEW_001) has no public-site presence and no in-app execution surface — pricing sells "AI agent composition"/"Integration risk assessment" on Growth/Enterprise with zero explanation anywhere; `/recommendations` in-app is process-optimization only, not AI-provider connect/execute. This leaves the stated 18–24-month competitive window unclaimed and prices top tiers ahead of demonstrable value. (2) Extension activation requires manual Chrome Developer Mode sideload (zip → extract → enable dev mode → load unpacked) rather than a Web Store install — a serious self-serve funnel drop-off risk at the highest-intent moment (right after signup).

**P1** — Pricing page's unexplained AI-tier bullets create AI-washing risk; Team/Growth tiers are waitlist-only while FAQ copy on the same page claims instant 14-day-trial access for "every paid plan" — an unresolved same-page contradiction in the funnel's highest-value tiers.

**P2** — `/install` and `/install-extension` are near-duplicate pages (marketing CTAs vs. onboarding checklist point to different ones); the shipped evidence-grounded "ask a question" AI feature is real but buried in one sentence — an under-used bridge toward the bigger AI story.

**Strength worth preserving:** the core record→SOP/map/report narrative is coherent end-to-end, and the post-signup `OnboardingChecklist` (install → record → view SOP → view map) is a well-sequenced, genuinely helpful activation ladder.
