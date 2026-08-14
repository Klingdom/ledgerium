# SEO/AEO Effectiveness Review — Growth Analysis

**Author:** growth-strategist (read-only review; zero product code changed)
**Date:** 2026-08-13
**Scope:** `apps/web-app/src/content/pages/*.ts` (page content), `apps/web-app/src/components/seo/*.tsx` (page templates), `apps/web-app/src/lib/seo/*.ts` (metadata/JSON-LD/related-page engine), `apps/web-app/src/app/(public)/**` (signup/install/pricing/demo routes), `apps/web-app/src/lib/analytics.ts` (instrumentation taxonomy).

**Grounding provided by requester (verified live crawl, 2026-08-13):** 164 published pages across 12 types, live sitemap with 194 URLs, shipped 2026-06-26 → 2026-07-19, median 1127 rendered words/page, nothing published in the last 4 weeks (~7 weeks of stasis after a ~4-week build sprint).

**What I did not do:** I did not fabricate any traffic, ranking, CTR, or conversion numbers. No analytics export was provided and none is available to me from a read-only repo crawl. Every claim below is either (a) a structural fact verifiable in the code, or (b) an inference labeled as an inference.

---

## 0. Executive summary

The SEO/AEO engine is **structurally well-built and editorially honest** — better than most programmatic SEO builds. It has a real per-page unique fact (`originalDataPoint`), genuine competitive honesty (`competitorStrength`, `whenCompetitorFits`), deterministic internal linking, and above-average technical AEO (Speakable, DefinedTerm, llms.txt, AI-referrer classification). That is the good news, and it is worth stating plainly because the rest of this review is critical.

The bad news is that **the funnel this content feeds into has friction and gaps that will suppress conversion regardless of how good the content is**, and the **positioning discipline that is sharp in bottom-funnel content (compare/alternatives) is diluted in the highest-AEO-value content (answer/glossary pages)** — which is backwards, because glossary pages are exactly the ones most likely to be summarized by an AI assistant with zero click-through.

Concretely, three findings dominate everything else:

1. **The only install path is a 4-step manual Chrome Developer Mode sideload** (`chromeStoreUrl` in `apps/web-app/src/lib/config.ts:16` is still the literal string `'.../placeholder'`). Every page's ultimate ask — "record your first workflow" — routes through a technical, mildly alarming process ("Chrome is showing a warning about Developer mode extensions... This is expected behavior") that is a poor match for the non-technical personas (AP clerks, HR coordinators, ops managers) these pages target.
2. **Zero SEO pages mention pricing, tiers, or the trial mechanic.** Across 186 authored page records, the words "pricing" / "$49" / "$249" / "$799" / "14-day" appear **zero times** in `apps/web-app/src/components/seo/` and effectively zero times in `apps/web-app/src/content/pages/` (one file mentions Tango pricing in passing, spelled out as "49 dollars per month"). Every CTA on every page type — regardless of search intent — points to the same destination with the same implicit offer: the free tier.
3. **The interactive, no-login, no-extension demo (`/demo`) is never linked from any of the 164 SEO pages.** The lowest-friction way to show product value sits one step outside a funnel that badly needs a low-friction step, given finding #1.

None of these are content problems. They are conversion-architecture problems, and per the task's framing ("prioritize what works WITHOUT needing more traffic, since traffic may be near zero"), they are also the **highest-leverage fixes available today**, because they act on every future visitor without requiring a single additional page or backlink.

---

## 1. Conversion architecture

### 1.1 The path, traced from the code

Every one of the 12 page types (`apps/web-app/src/content/registry.ts:82-95`) renders through a `*PageView.tsx` component that composes shared blocks from `apps/web-app/src/components/seo/Blocks.tsx`. The CTA architecture is **identical in shape across every page type**, which is a genuine strength — there is one destination, not a diffuse set of competing asks:

- **Hero CTA** (`SeoHero`, `Blocks.tsx:46-104`): a `TrackedLink` to `/signup` styled `btn-primary`, plus a secondary `Link` to `/product` styled `btn-secondary`.
- **Mid-page CTA** (`MidCta`, `Blocks.tsx:222-238`): "See this in a real workflow recording" → `/signup`.
- **Final CTA** (`FinalCta`, `Blocks.tsx:278-300`): a page-type-specific heading + "Start free" (or similar) → `/signup`, plus a `/product` secondary link, plus the fine print "Free plan includes 5 documented workflows per month. No screenshots ever captured."

`const SIGNUP = '/signup';` (`Blocks.tsx:13`) is the single hard-coded destination constant for every primary CTA on every SEO page. That is a deliberate, disciplined choice — full credit for it.

Post-click, the actual path is:

```
SEO page → /signup (email/password form, auto sign-in) → /dashboard
  → dashboard empty state → "install" CTA (dashboard_empty_state_cta_clicked)
  → /install (4-step manual Chrome sideload) → record first workflow
```

`SignupPageClient.tsx:95-98` sets expectations honestly: *"Sign up free, and explore a sample workflow SOP immediately — no extension install required."* This is a smart sequencing decision — new users see product value (a pre-seeded sample) before being asked to do anything technical. The "What happens next" preview on the signup page (`SignupPageClient.tsx:163-208`) is also honest and well-sequenced: (1) explore sample instantly, (2) install extension "under 2 minutes," (3) record first workflow "under 5 minutes."

### 1.2 Where the path leaks

**Leak 1 — the install step is the opposite of "under 2 minutes" for the target audience.** `apps/web-app/src/app/(public)/install/page.tsx` documents the real mechanism: download a `.zip`, right-click → Extract All, navigate to `chrome://extensions`, **enable Developer Mode**, click "Load unpacked," pick the extracted folder containing `manifest.json`, then find the puzzle-piece icon and pin it. The page itself acknowledges the friction with reassurance copy: *"This is safe. Developer mode is a standard Chrome setting..."* and a troubleshooting FAQ entry: *"Chrome is showing a warning about Developer mode extensions... This is expected behavior. Click 'Dismiss' or 'Keep' — the extension is safe to use."* (`install/page.tsx:437-439`).

This is confirmed structurally, not just from copy: `apps/web-app/src/lib/install.ts:44-51` — `isChromeStorePublished()` checks whether `EXTENSION_CONFIG.chromeStoreUrl` still contains the string `'placeholder'`. In `apps/web-app/src/lib/config.ts:16`, it does:
```
chromeStoreUrl: 'https://chrome.google.com/webstore/detail/ledgerium-ai/placeholder',
```
So today, `resolveInstallTarget()` (`install.ts:57-76`) always returns the `direct_download` sideload path, never the one-click Web Store path. The code is well-architected for the day the extension ships to the Web Store (a single boolean flip changes every button on the site), but as of this review that day has not arrived. This single fact is arguably the largest activation-funnel risk in the entire system: a self-serve SaaS whose primary conversion action requires the visitor to turn on "Developer mode" in their browser and dismiss a security warning. For an AP clerk or HR coordinator who searched "invoice approval workflow" and does not self-identify as technical, this step is a plausible full stop.

**Leak 2 — the "See how it works" secondary CTA on every SEO page competes with, rather than reinforces, the primary CTA**, and there is no A/B or sequencing logic: both buttons render at equal visual weight in `SeoHero` (`Blocks.tsx:86-99`, `flex flex-col sm:flex-row gap-3`) and again in `FinalCta` (`Blocks.tsx:284-295`). This is a minor, defensible pattern (dual-CTA is common), but combined with Leak 1, a visitor who is hesitant about a "sign up" ask has a socially-easy escape hatch (`/product`) that does not itself contain a comparably strong CTA back into the funnel — I did not find `/product`'s CTA copy to diverge meaningfully from the SEO pages' own CTA, so this is a soft leak, not a hard one.

**Leak 3 — the low-friction, no-login demo is orphaned.** `apps/web-app/src/app/(public)/demo/page.tsx:130` renders "Live interactive process map — the real product component, no login." This is the single best pre-signup proof of the product's core claim, and it requires zero extension install and zero account creation. I grepped every file in `apps/web-app/src/components/seo/` for a link to `/demo` and found none — only two files (`WorkflowPageView.tsx`, `SoftwarePageView.tsx`) contain the string `/demo`, and both instances are `<img src="/img/demo/report-view.png">` — a static screenshot path, not a link to the interactive page. **164 pages of traffic, zero of them route to the one page that lets a skeptical visitor touch the real product before committing to signup + a sideload install.**

**Leak 4 — pricing is invisible on commercial-intent pages.** `compare.ts`, `alternatives.ts`, `competitors.ts`, and `software.ts` are explicitly commercial/bottom-funnel content (`searchIntent: 'commercial'` on nearly every record I sampled). A visitor reading "Tango Alternative: Ledgerium vs Tango Compared" who wants to know what this costs before signing up has no in-content answer and no in-content link to `/pricing` (see §5). Pricing is reachable via the global nav (`apps/web-app/src/components/nav/navConfig.ts`) and footer, so it is not fully hidden — but it requires the visitor to abandon the content and go hunting, on a page whose entire CTA architecture is built to funnel them to `/signup` instead.

### 1.3 What is genuinely not diffuse

To be fair to the build: the destination discipline (always `/signup`, never a grab-bag of newsletter/demo-request/contact-sales/download-a-PDF asks) is a real strength relative to typical programmatic SEO builds, which often scatter 4-5 competing CTAs per page. The activation funnel described in the code (`SignupPageClient.tsx`, `install/page.tsx`, the `dashboard_empty_state_cta_clicked` event comment at `analytics.ts:345-348`: *"the terminal click of the activation funnel (land → install)"*) shows the team has explicitly modeled land → signup → install → record as the funnel, which is the right mental model. The problem is not diffuseness — it is that the second-to-last mile (install) is disproportionately hard relative to everything upstream of it being disproportionately easy.

---

## 2. Message-match

Message-match is generally **strong** at the page-content level and **weak** at the CTA-offer level.

**Content-to-query match is good.** Sampled pages answer the query they target directly in the first 100 words (`shortAnswer`), which both search engines and AI assistants reward. Example, `invoice-approval-workflow` (`apps/web-app/src/content/pages/workflow.ts:13-14`):
> "To document an invoice approval workflow, record someone actually approving an invoice from receipt to payment, then turn that recording into a step-by-step SOP and a process map, and review it with the approver... Ledgerium records the real approval in the browser and generates the SOP, process map, and a workflow intelligence report that shows where approvals wait and stall."

This is not generic filler — it names the actual steps (PO match, coding/approval-limit check, routing, posting) and the actual insight (wait time vs. work time), which matches what someone searching that query wants.

**The message-to-offer handoff is where match breaks down.** The content promises measurement, evidence, and audit-readiness ("evidence-linked, audit-ready procedures traceable to the recorded steps" — `department.ts:53`); the CTA that follows offers **"Start free"** with no qualification of what "free" delivers relative to that promise. The Free tier (per `pricing/page.tsx:70,75-79`) does **not** include process health scores, the intelligence layer, bottleneck/friction analysis, automation-opportunity scoring, or variation analysis — i.e., **the Free tier does not include the specific capabilities the content just spent 1,100 words selling**. A visitor converted by a `compare/tango` or `finance` department page and who signs up for Free will get an SOP and a process map, but not the "workflow intelligence report" and audit-evidence framing that pulled them in. This is not dishonest (the content never claims Free includes it), but it is an unstated mismatch that will read as a bait-and-switch at the moment of truth, and nothing in the funnel corrects the expectation before that moment.

**Search-intent segmentation is not reflected in CTA design.** `SearchIntent` is a real, authored field (`'informational' | 'commercial' | 'transactional'`, `content/types.ts:33`) and it is populated per page — but it has **zero effect on which CTA renders**. An `informational`-intent answer page like "what is process intelligence" (top-of-funnel, someone doing category research) gets the exact same "Start free" hero CTA, mid-CTA, and final CTA as a `commercial`-intent page like "invoice approval workflow" (someone who already knows they have a documentation problem). Best-practice funnel design would soften the ask for informational intent (e.g., "See how it works" as primary, or a lower-commitment path like the orphaned `/demo`) and harden it for commercial/transactional intent. Today the funnel treats every visitor as equally sales-ready, which likely under-converts commercial-intent traffic (too soft a value story before the ask) while over-asking informational-intent traffic (too hard an ask too early) — this specific claim is a structural inference, not a measured fact, but it follows directly from the `searchIntent` field being authored and then unused by every `*PageView.tsx` template.

---

## 3. Positioning consistency — is the moat visible?

This is genuinely mixed, and the split is not random — it tracks funnel stage.

**Bottom-funnel content (compare/alternatives) is sharp and specific.** The `scribe` alternatives page is the strongest positioning copy in the corpus. Meta title: **"Scribe Alternatives in 2026: Deterministic vs AI-Inferred"** (`alternatives.ts:13`). Body copy:
> "Scribe's core product auto-generates annotated screenshot guides, and its newer Optimize agents add AI-based process mapping and automation scoring — but that output is AI-inferred, not deterministic. If you want process data computed the same way every time, evidence-linked to source events, Ledgerium fits." (`alternatives.ts:19`)

> "Ledgerium is the option in this list that computes process metrics deterministically from structured interaction data with millisecond timing, so the same workflow can be diffed, measured, and reproduced identically rather than only viewed or AI-inferred." (`alternatives.ts:26`)

> "...every number traced back to the source event that produced it." (`alternatives.ts:49`)

This is precisely the moat the task asked me to check for, stated in specific, falsifiable, competitor-contrasted terms — not "we're the best SOP tool," but a mechanism claim (deterministic computation, millisecond timing, diffable runs, traceability to source events) that a competitor genuinely cannot copy-paste without changing their architecture. The `tango` compare page is similarly sharp: *"Ledgerium records millisecond-level timing on every captured step, so two recordings of the same process can be diffed to show exactly where cycle time changed. A screenshot guide carries no timing, so the same comparison is not possible."* (`compare.ts:26`).

**Mid-funnel content (department/persona/software) is specific but softer on the determinism claim.** The `finance` department page uses "evidence-linked" once (`department.ts:53`) but otherwise leans on honest specificity about the domain ("most cycle time is wait time, not work time," "close and approval steps live in one person's head") rather than the deterministic-computation claim itself. The `salesforce` software page never uses "deterministic" or "evidence-linked" at all — its differentiation is entirely "we capture your actual customized org, not a generic screenshot" (`software.ts:19,26,32`), which is a real and honest differentiator, but a different (weaker, easier-to-copy) one than the determinism claim. A screenshot competitor could make the identical "we capture your actual org" claim; only Ledgerium can make the "diffable, millisecond-timed, source-traceable" claim.

**Top-of-funnel AEO content (answer/glossary — the largest single bucket at 30 pages, and the type most exposed to AI-summarization-without-click, per §4) is where the moat is thinnest.** I grepped `answer.ts` for "deterministic" or "evidence-linked" and found **one occurrence across all 30 pages** — inside the "How process intelligence works" in-depth section of a single page:
> "Because the output is derived deterministically from the recorded events, the same run always produces the same map — which is what makes the result trustworthy enough to act on." (`answer.ts:45`)

That is a good sentence. It just does not repeat. The other 29 answer pages (what is process mining, what is task mining, process mining vs task mining, what is cycle time, flowchart vs process map, etc.) rely on the shared, generic `HowLedgeriumCaptures` block for their only mention of mechanism — three fixed sentences that appear verbatim on every page type:
> "Add the Ledgerium recorder to Chrome. No screenshots and no keystrokes are ever captured." / "Perform the process once. Ledgerium captures the structured steps, timing, and system context." / "Receive an SOP, a process map, and a workflow intelligence report generated from the real work." (`Blocks.tsx:149-151`)

"Structured steps, timing, and system context" is accurate but is not the same claim as "deterministic," "diffable," or "evidence-linked to source events." It reads as competent process-capture software, which any capture tool — including a screenshot tool with a timestamp column — could also claim. **The category-defining pages (what IS process intelligence, what IS process mining, process mining vs. task mining) are exactly the pages a competitor's own content, or a neutral AI-generated answer, would also rank for and get cited for — and they are the pages where Ledgerium's specific mechanism claim is least reinforced.** If the goal is for an AI assistant answering "what is process intelligence" to associate Ledgerium specifically with the deterministic/evidence-linked mechanism (rather than as one interchangeable vendor example among several), the current content does not consistently plant that association at the definitional layer where it would do the most good.

**Verdict:** the moat is real and well-articulated where the team clearly thought hardest about it (compare/alternatives — the pages an already-comparison-shopping buyer reads). It is present but diluted in the pages a stranger encountering the category for the first time would read, which is a mismatch between where the distinctive claim is strongest and where first-impression positioning actually happens.

---

## 4. The AEO bet

**What exists.** The technical AEO layer is more mature than most teams building this kind of engine:
- `Speakable` schema on every page targeting `.seo-answer` (the hero direct-answer paragraph) and `.seo-datapoint` (the original-data-point callout) — `apps/web-app/src/lib/seo/jsonLd.ts:51`.
- `DefinedTerm` schema on all 30 answer pages, anchored to a `DefinedTermSet` named "Ledgerium Process Glossary" (`jsonLd.ts:98-112`) — a real attempt at owning definitional authority for the category vocabulary.
- `FAQPage` and `HowTo` JSON-LD, with an unusually self-aware code comment acknowledging their actual SEO value has declined: *"FAQPage and HowTo no longer produce Google rich results (HowTo removed Sept 2023, FAQPage removed May 2026). They are emitted for LLM / answer-engine semantic parsing only — never claim rich-result CTR from them."* (`jsonLd.ts:139-141`). This is a correct, non-self-deceiving read of the current SEO landscape.
- `/llms.txt` (`apps/web-app/src/app/llms.txt/route.ts`) — a curated, machine-readable index generated from the same published-page registry, explicitly for LLM crawlers, correctly including the pricing summary ("Free (5 workflows/mo), Starter $49, Team $249, Growth $799") in its entry-points block.
- Referrer classification distinguishing `ai` traffic from `organic`/`direct`/`other`, checked against a 10-domain allowlist (`chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`, `gemini.google.com`, `grok.com`, `you.com`, `phind.com`, `meta.ai`, `poe.com` — `referrerClassification.ts:16-27`), fired on every page view (`seo_page_viewed.referrerClass`).

**What this measures, and what it cannot measure.** The referrer classification is genuinely useful — it will tell the team, once there is traffic, what share of visits that *do* click through originate from an AI assistant versus organic search. That is real signal. But by construction it can only measure the clicks that happen. **It captures nothing about the answer being surfaced and read without a click at all** — the scenario the task specifically asked about. There is no brand-mention tracking, no citation-monitoring integration, and nothing in this repo could detect that outcome; that is a fundamentally external-tool problem (rank-tracking-for-AI-answers services), not something the codebase is missing. I flag it not as a code gap but as a strategic gap worth naming: **if the AI-summarization-without-click scenario is common (plausible, given the content is written in exactly the extractable, hedge-free, first-30%-answer style that AI Overviews and assistants prefer to lift), the team currently has no way to know it is happening, and the content itself does the minimum necessary to make that lifted answer carry the brand's distinctive claim** (see §3 — the answer-page moat dilution means a lifted, no-click summary of "what is process intelligence" is more likely to read as generic category description than as a Ledgerium-specific claim).

**Is there a citation/brand strategy beyond the mechanics?** Partially. The `Organization` JSON-LD (`jsonLd.ts:8-19`) declares `knowsAbout: ['process intelligence', 'workflow automation', 'SOP documentation', 'process mining']` and links a LinkedIn `sameAs`. The `DefinedTermSet` naming ("Ledgerium Process Glossary") is a genuine attempt at entity ownership. But there is no author-entity buildout beyond a single shared "Ledgerium Research Team" `PageAuthor` used on every page (`author: { name: 'Ledgerium Research Team', sameAs: [...] }` — repeated verbatim in every sampled record), no distinct named authors or bios, and — per §3 — the actual differentiating claim is not reliably present in the content most likely to be quoted verbatim. The honest read: **the AEO plumbing (schema, llms.txt, referrer split) is ahead of the AEO positioning discipline (making every extractable answer carry the moat).** The bet on clicks-may-be-absorbed is only half-hedged — the technical half is built, the "make the no-click impression still work for the brand" half is not fully executed.

---

## 5. Free→paid coherence

This is the weakest link in the whole system, and it is almost entirely a content-authoring gap rather than a pricing-model or product gap — the pricing model itself (`pricing/page.tsx`) is coherent, specific, and well-documented.

**Fact: zero SEO pages mention pricing tiers or the trial.** I grepped `apps/web-app/src/content/pages/` for `$49|$249|$799|14-day|14 day` and got **zero matches**. I grepped for "dollars per month" and got **2 matches in 1 file** (`compare.ts`, the Tango page FAQ, spelled out rather than using a `$` figure). I grepped `apps/web-app/src/components/seo/` (the shared templates every page renders through) for the case-insensitive string "pricing" and got **zero matches** — not one `<Link href="/pricing">` exists anywhere in the shared SEO component library.

**Fact: every CTA on every page implies the same offer — the Free tier.** The only pricing-adjacent copy any SEO page visitor sees is the `FinalCta` fine print: *"Free plan includes 5 documented workflows per month. No screenshots ever captured."* (`Blocks.tsx:296`). Nothing on any of the 164 pages tells a `commercial`- or `transactional`-intent visitor (someone already comparing tools, per `searchIntent` on the `compare`/`alternatives`/`software` page types) that a 14-day trial of paid tiers exists, what it costs, or what capability jump it buys (intelligence layer, bottleneck detection, automation scoring — the exact things §2 shows the content is selling).

**Fact: the pricing model itself is structurally sound but has an operational gap the SEO funnel would otherwise walk straight into.** Per `pricing/page.tsx:26-31`, Team ($249) and Growth ($799) currently **route to a waitlist**, not self-serve checkout: *"Multi-user invites are launching Q3 2026. Until then, Free and Starter plans are fully self-serve, and Team and Growth tiers route to a waitlist."* This is disclosed honestly on the pricing page itself, and is arguably the right call — but it means that even if the SEO funnel were fixed to route commercial-intent traffic toward paid tiers, two of the three paid tiers cannot currently convert self-serve. This narrows the immediate, achievable monetization outcome of the current SEO investment to **Free-tier signups and Starter ($49) self-serve trials only** — worth stating plainly so the team doesn't over-invest in driving Team/Growth-intent traffic before that self-serve path exists.

**Net assessment.** The SEO engine, as built today, is optimized almost entirely to produce **free-tier signups**, not revenue. That is a legitimate top-of-funnel strategy on its own terms (free users are a real asset — activation data, word of mouth, eventual upgrade), but nothing in the current architecture nudges a free signup toward the trial, and nothing in the content sets up the trial as a thing that exists. Given the product's own stated tiers include real, differentiated, sellable capability (intelligence layer, automation scoring, variation analysis — Team-and-above only), and given the content already sells those exact capabilities rhetorically (§2), the absence of any pricing/trial mention anywhere in 186 authored pages is a coherence gap between "what the content promises" and "what the funnel asks for."

---

## 6. Highest-leverage fixes (ranked, "works without more traffic")

These are ranked by **conversion-per-existing-visitor impact**, not effort, per the task's explicit framing that traffic may be near zero and every visitor counts. All are changes to existing pages/flows — none require new content or new traffic acquisition.

1. **Ship the extension to the Chrome Web Store, or at minimum radically de-risk the sideload path.** This is the single highest-leverage fix in the system: it sits at the exact point where every visitor who got through signup currently has to decide whether "enable Developer Mode and dismiss a Chrome security warning" is something they're willing to do. The code is already built for this (`resolveInstallTarget()` flips automatically once `chromeStoreUrl` stops containing `'placeholder'`) — this is a distribution/publishing task, not an engineering rebuild. If Web Store publishing is genuinely blocked (review queue, policy issue, etc.), the interim mitigation is to move the "why this is safe" reassurance copy (currently buried at install step 3, `install/page.tsx:209-217`) up to the point of first ask, and to add a visible trust signal (e.g., "X workflows recorded safely this month") near the Developer Mode warning framing.

2. **Link `/demo` from every SEO page.** One line of code per template (or one shared block change in `Blocks.tsx`) turns the orphaned, no-login, no-install interactive proof into a standard part of the funnel. Because it requires nothing from the visitor and already exists, this is close to a zero-cost, zero-risk fix. Best placement: as (or alongside) the `/product` secondary CTA in `SeoHero`, and/or inserted between the `DataPointCallout`/`KeyTakeaways` block and the first prose section, so skeptical readers can verify the claim before being asked to sign up.

3. **Segment the CTA by `searchIntent`.** The field is already authored on every page record and currently unused by every template. For `informational`-intent pages (the 30 answer pages plus similarly-framed problem/persona content), soften the primary hero CTA to "See it in action" (→ `/demo`, per fix #2) with "Start free" as secondary; for `commercial`/`transactional`-intent pages (compare/alternatives/software/workflow), keep "Start free" primary but add a visible trial/paid-tier signal per fix #4. This is a template change, not a content rewrite — the existing `shortAnswer`/`keyTakeaways`/FAQ copy does not need to change.

4. **Add one honest sentence about the paid tiers to commercial-intent page types, and link `/pricing`.** Specifically: `compare.ts`, `alternatives.ts`, `competitors.ts`, and `software.ts` (the four types with `searchIntent: 'commercial'` populated on essentially every record). A single sentence near the `FinalCta` — something like "Free includes SOPs and process maps for 5 workflows/month; the intelligence layer (bottleneck detection, automation scoring, variation analysis) is on Team and above, with a 14-day trial" — closes the promise/offer gap identified in §2 and §5, and gives a `/pricing` link a natural home. This directly targets the highest-intent segment of existing traffic without touching a single word of the informational/glossary content.

5. **Re-inject the deterministic/evidence-linked claim into the answer-page definitional layer, not just the shared mechanism block.** Per §3, this is the cheapest positioning fix available: it is a content edit to `content/pages/answer.ts` (30 records), not a new page type or new infrastructure. The `inDepth` sections and `definition` fields for `what-is-process-mining`, `what-is-task-mining`, `process-mining-vs-task-mining`, and similar category-defining pages should each carry one sentence anchoring Ledgerium's specific mechanism, mirroring the sentence already present on `what-is-process-intelligence` (`answer.ts:45`). This is precisely the fix that improves outcomes under the AEO-absorption scenario in §4, because it raises the odds that a no-click AI summary still carries the distinctive claim rather than reading as generic category description.

6. **Decide, deliberately, whether the free→paid story should be "grow the free base" or "convert commercial intent to trial" — and then make the CTA architecture match.** This is not a code fix so much as a strategy call the current build has made implicitly (free-base growth, by default, since that's the only offer visible anywhere in content). If the intended strategy actually is trial/paid conversion for commercial-intent traffic, fixes #3 and #4 are prerequisites; if the intended strategy genuinely is free-base growth first, then the current CTA uniformity is correct and should be left alone — but that should be a stated decision, not an artifact of every page sharing one `Blocks.tsx` file.

Not included above but worth a brief mention: the ~4-week publishing silence noted in the grounding is outside this review's scope (I was asked to analyze conversion architecture and positioning, not content-ops cadence), but it is worth flagging to the coordinator that a pSEO program with zero net-new pages for a month, while conversion-architecture gaps of this size remain unaddressed, is investing acquisition effort on top of an unfixed leaky funnel — the ranked fixes above should plausibly be sequenced before resuming page production, since they compound the value of every page already live and every page yet to ship.

---

## Appendix A — Page-type CTA label inventory (verbatim, from `apps/web-app/src/components/seo/*PageView.tsx`)

| Page type | Hero CTA label | Hero location tag | Final CTA heading | Final CTA label |
|---|---|---|---|---|
| workflow | "Capture this workflow once" | `workflow_hero` | "Capture this workflow once" | "Start free" |
| sopTemplate | "Generate the SOP from real work" | `sop_hero` | "Generate this SOP from real work" | "Start free" |
| compare | "Start free" | `compare_hero` | "Try Ledgerium free, 5 workflows, no credit card" | "Start free" |
| competitors | "Start free" | `competitors_hero` | "Try the structured-capture approach" | "Start free" |
| problem | "Generate an SOP from a real workflow" | `problem_hero` | "Document the real process, not the remembered one" | "Start free" |
| software | "Start free" | `software_hero` | "Document a {vendor} workflow from real work" | "Start free" |
| alternatives | "Start free" | `alternatives_hero` | "See the structured-data difference for yourself" | "Start free" |
| answer | "Start free" | `answer_hero` | "See this in a real workflow recording" | "Start free" |
| industry | "Document your workflows" | `industry_hero` | "Document your industry's workflows" | "Start free" |
| persona | "Record your first workflow" | `persona_hero` | "Document your team's real workflows" | "Start free" |
| department | "Document your workflows" | `department_hero` | "Document your department's workflows" | "Start free" |
| aiOpportunity | "Find your AI opportunities" | `ai_hero` | "Find where AI can actually help" | "Start free" |

Every row's destination, hero secondary link, and mid-page CTA are identical: `/signup`, `/product`, "See this in a real workflow recording" → `/signup`. The variation is purely in label copy, which is well-tailored per type — the destination and offer are uniform.

## Appendix B — Files read for this review

- `apps/web-app/src/content/types.ts`, `apps/web-app/src/content/registry.ts`
- `apps/web-app/src/content/pages/{workflow,software,compare,alternatives,answer,department}.ts`
- `apps/web-app/src/components/seo/{Blocks,SeoPageView,WorkflowPageView,AnswerPageView,FaqBlock,referrerClassification}.tsx|ts`
- `apps/web-app/src/lib/seo/{jsonLd,metadata,related}.ts`
- `apps/web-app/src/app/llms.txt/route.ts`
- `apps/web-app/src/app/(public)/{signup/SignupPageClient,install,pricing,demo,product,page}.tsx`
- `apps/web-app/src/lib/{install,config}.ts`
- `apps/web-app/src/lib/analytics.ts` (event taxonomy only, not event volumes)
- `apps/web-app/src/components/{PublicNav,nav/navConfig,Footer}.tsx` (existence check only)
