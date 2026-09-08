# SEO / AEO Review — Growth Review 001

**Author:** seo-aeo agent
**Date:** 2026-09-02
**Question posed:** how should Ledgerium acquire traffic, given that the existing SEO program has largely failed?
**Evidence base:** CEO-supplied GSC export (3 months, 2026-05-12 → 2026-08-11); direct source read of `apps/web-app/src`; `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW_001.md` (2026-08-13); `docs/meta/SEO_AEO_EXPANSION_001.md` (2026-07-14); `docs/meta/REVENUE_PLAN_20K_001.md` (2026-08-18); sibling artifacts in this review.

---

## 0. The answer, before the analysis

**SEO will not produce customers within six months. It is not the channel to bet the next two quarters on.**

Two independent arguments both land there, and they compound:

- **Latency.** The binding constraint is off-page authority. Referring domains accrue over 6–12 months. Even a perfectly executed authority program started today shows ranking movement in months 4–8, and revenue after that.
- **Ceiling.** Even if the authority program worked perfectly, the addressable query volume Ledgerium is currently targeting does not appear large enough to reach the traffic requirement. Modelled in §3.3.

That does not mean "do no SEO." It means SEO is a **12-month compounding asset, not a Q4 revenue channel**, and it should be resourced accordingly — a few hours a week of the right work, not a content program.

The channels that can plausibly produce customers inside six months are in §5. The single largest one is **not on ledgerium.ai at all: it is the Chrome Web Store**, a search surface with its own ranking system that does not depend on domain authority — and Ledgerium is not listed on it. As of today the store URL in `src/lib/config.ts:16` is still `.../placeholder`.

---

## 1. Why the SEO program failed — the specific diagnosis

`SEO_AEO_EFFECTIVENESS_REVIEW_001` established the top-line cause correctly: **position, not content**. 164 pages at average position 44 produced 3 clicks. When the site does rank, it converts — `/sop-templates/vendor-setup-sop-template` sat at position 5.0 with 100% CTR. That review's diagnosis stands and is not re-litigated here.

What follows is what that review did **not** name. Four failures, each independently sufficient to produce this outcome.

### 1.1 The program chose the query classes a zero-authority domain cannot win

This is the sharpest and most actionable finding, and it is visible directly in the corpus:

| `searchIntent` declared | Pages | Share |
|---|---|---|
| `commercial` | 134 | **82%** |
| `informational` | 30 | 18% |
| `transactional` | **0** | 0% |

*(Source: `grep -ho "searchIntent: '[a-z]*'" src/content/pages/*.ts`.)*

82% of the corpus targets **competitor-comparison and alternatives queries** — `scribe alternative`, `walkme alternatives`, `guidde alternatives`, `iorad alternative`. These are the single most authority-gated query class on the open web. They are dominated by aggregators, review sites (G2, Capterra), and incumbent vendors with years of accumulated links. A domain with zero referring domains has no realistic path onto page 1 for `scribe alternative` in any timeframe that matters. The GSC data confirms it exactly: `walkme alternatives` position 72.3, `scribe alternative` position 74.4.

Now compare against what actually worked. Of the 3 non-homepage clicks in three months, **2 came from the `sopTemplate` cluster** — long-tail, specific, low-competition queries:

| Page | Position | Impr. | Clicks | CTR |
|---|---|---|---|---|
| `/sop-templates/vendor-setup-sop-template` | **5.0** | 1 | 1 | 100% |
| `/sop-templates/system-access-request` | **12.3** | 3 | 1 | 33% |
| `/industries/healthcare` | 54.6 | 17 | 1 | 6% |

**Caveat stated plainly: n=1 and n=3 impressions. This is a signal, not a proof.** But it is the only page-1 organic position the site has earned outside the homepage, and it came from the cluster that is 10% of the corpus, not the 82%.

**The failure is not just "we lack authority." It is that the program spent 82% of its output on the query class where authority is most decisive, and 10% on the class where authority matters least — which is the only class that produced a page-1 result.** Had the ratio been inverted, the same 164 pages would have performed materially better at the same domain authority.

### 1.2 There was never an off-page workstream — and there still isn't

The SEO/AEO document series contains no backlink, PR, digital-PR, or earned-mention workstream anywhere. The program had a content plan, a quality gate, a validator, an architecture, an analytics taxonomy — and **no plan for the one input that determines position**. It optimized every lever except the binding one.

This is not hindsight. `SEO_AEO_EFFECTIVENESS_REVIEW_001` §8 ranked off-page authority as recommendation #1 on 2026-08-13. **Twenty days later there is still no referring-domains KPI, no target list in the repo, and no owner.** Items 3, 4, 5 and 6 of that review (all engineering) were executed within 72 hours. Item 1 (not engineering) was not started. That is a resourcing pattern, not an oversight: the organization executes what can be committed to git.

### 1.3 The July intervention was built on a factual error, and it made things worse

`SEO_AEO_EXPANSION_001` (2026-07-14) states pages are *"parked on page 2 (impressions, 0 clicks)"* and prescribed CTR title rewrites. The pages were at **position 44–95**, i.e. page 5 to page 9. CTR optimization at position 74 is inert — nobody sees the title to not-click it. The intervention then recommended **100+ additional pages**, which shipped.

The measured result: impressions rose 27× (48 → 1,295 monthly) while clicks fell to **zero** in the most recent period. More pages at position 44 produce more position-44 impressions. That is the treadmill, and it is now empirically closed.

### 1.4 The quality gate could not see the failure mode

`validateContent` is a pure function over the 164 leaf records. It enforces word floors, near-duplicate distance, `verifiedAsOf` freshness, and distinct data points — and it passes 164/164. It has no visibility into position, referring domains, or clicks. **A program can pass every gate it built for itself while being invisible**, because the gates measured production quality, not outcome. The health gate that *would* have caught it (iter 098: ≥80% indexed AND <30% zero-impression before scaling) was written down, assigned an ID, and scaled past — a fact `FUNNEL_AND_SOP_REVIEW_001` already recorded on 2026-07-19.

---

## 2. Technical foundations: genuinely good, and not the problem

This is worth stating clearly so no effort is misdirected here. Verified by source read today:

| Foundation | State |
|---|---|
| Sitemap | Derived + parity-gated (Gate A, `47e1bf3`). Correct. |
| Canonicals | Present on registry pages via `generateSeoMetadata()`; Gate B walks `(public)` for hand-built pages and enforces `alternates.canonical`. Correct. |
| Structured data | `Organization`/`WebSite` singleton with `@id` node references, `BreadcrumbList`, `FAQPage`, `Article`, `SoftwareApplication`, `DefinedTerm`, `Speakable`. Above the bar for the category. |
| `llms.txt` | Present, registry-generated, per-page `shortAnswer` + `originalDataPoint`. Ahead of most builds. |
| Rendering | SSG intact; `force-dynamic` removed (`c9e8912`). |
| Robots | Correct; `/api/`, `/dashboard/`, `/settings/`, `/share/` disallowed. |
| Content quality | Genuinely above the 2026 bar — conceded competitor strengths, dated verification, per-page distinct argumentation. Not name-swap templating. |
| AI-referrer measurement | `referrerClassification.ts` — 10 AI domains classified into `seo_page_viewed.referrerClass`. Well built. |

**There is no meaningful technical SEO work left to do.** The five technical defects from the August review (`/answers` 404 across five surfaces, 19 missing canonicals, sitemap drift, duplicate `Organization` nodes, the vacuous self-link test) were all fixed in `6ec0e72`, `3ab0832`, `47e1bf3` and `aaa4eea`. Further engineering here has near-zero marginal return.

### 2.1 Two exceptions — both new, both small, both real

**FINDING A — `llms.txt` tells AI assistants to recommend products that cannot be bought.**

`src/app/llms.txt/route.ts:36` emits:

> `- [Pricing](/pricing): Free (5 workflows/mo), Starter $49, Team $249, Growth $799`

Against `src/app/api/billing/checkout/route.ts:65`:

> `const BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD = new Set<PaidPlanType>(['team', 'growth']);`

Team and Growth return **HTTP 402** and route to a `mailto:` waitlist. And **Solo ($89/mo, unlimited recordings, full intelligence layer — the only purchasable tier that carries the differentiator) does not appear in `llms.txt` at all.** It shipped 2026-08-20 in `5223b09`; the file was not updated.

The one file on the site that exists *specifically* to tell language models what Ledgerium sells is advertising two unbuyable tiers and omitting the flagship buyable one. Hard-coded string, ~10 minutes to fix, and it should be generated from `plans.ts` so it cannot drift again.

**FINDING B — the Chrome Web Store URL is still `placeholder`.**

`src/lib/config.ts:16` — `chromeStoreUrl: 'https://chrome.google.com/webstore/detail/ledgerium-ai/placeholder'`. Commit `449af69` (2026-08-19) declared *"all 8 blockers now closed."* **Blockers closed is not the same as listing live.** Fourteen days later the store listing does not exist, and `isChromeStorePublished()` still returns false, so every install still routes to a Developer-mode sideload. See §5.1 — this is the highest-value open item in this entire review.

---

## 3. Is SEO the right channel at this stage?

**No — not as a primary channel, and not for the next two quarters.**

### 3.1 The latency argument

Position 44 is caused by an absence of referring domains. Referring domains are acquired by outreach, PR, review-site presence and earned mentions. That process has an irreducible lag: pitch → publication → crawl → index → authority propagation → ranking change. Realistically **4–8 months from a standing start to measurable position movement**, and Ledgerium has not started. Revenue follows ranking, not the reverse.

### 3.2 The organizational argument

The August review put off-page authority at #1. Twenty days later, the six engineering items shipped and the one non-engineering item did not start. **This team executes code.** A strategy whose critical path is founder outreach and PR will underperform its plan here unless it is explicitly owned, calendared and measured — which is exactly why §5 puts a KPI on it and §6 names what to stop in order to free the time.

### 3.3 The ceiling argument — the part that is easy to miss

Assume the authority program succeeds beyond expectation and the entire 164-page corpus moves from position 44 to page 1. What does that yield?

- Current: 1,979 impressions / quarter ≈ **22/day** across 164 pages.
- Page-1 placement raises impressions substantially (positions 44–90 are heavily impression-suppressed — Google shows the page rarely). Assume a generous **10× impression lift** → ~220/day.
- Page-1 average CTR across a mixed head/long-tail portfolio: **~4%** → **~9 clicks/day**.

`REVENUE_PLAN_20K_001.md` §4 models the requirement at **~40 qualified pricing-page views/day**.

**A wildly successful SEO turnaround lands at roughly a quarter of the requirement.**

*Assumptions stated: the 10× impression multiplier and 4% blended CTR are modelled, not measured; no keyword-volume tooling is available and no volumes were fabricated. The multiplier could be conservative — impressions at position 74 understate true query demand. But the conclusion is not sensitive to the multiplier: it would need to be ~45× for SEO alone to hit the target, and even then the timeline in §3.1 is unchanged.*

The honest reading: **the query space Ledgerium is targeting is too small to carry the revenue goal by itself, at any position.** SEO can be a meaningful *contributing* channel at 12 months. It cannot be the plan.

### 3.4 What SEO *is* worth keeping

Two things, both cheap:

- **The 164 pages already published are a sunk asset.** They cost nothing to keep, they are high quality, and they will convert if authority ever arrives. Keep them, keep them fresh (`verifiedAsOf` SLA), do not delete, do not expand.
- **The `sopTemplate` long-tail cluster is the one class with evidence of working** (§1.1). If any net-new page is ever authored again, it should be from this class — specific, long-tail, low-competition, transactional-adjacent — not another competitor-alternatives page. This is a constraint on future work, not a licence to resume publishing now.

---

## 4. AEO: is Ledgerium citable by LLM assistants?

The premise in the prompt is that AEO "does not depend on domain authority the same way." **That is half true, and the half that is false is the important half.**

### 4.1 The honest mechanics

Modern assistants answer product-comparison questions ("what's a good Scribe alternative?") in two ways:

1. **From training data / model priors** — which encode the open web as it was, heavily weighted toward well-linked, frequently-cited sources. Ledgerium, with ~zero third-party mentions, is effectively absent.
2. **From live retrieval** — the assistant runs a search and synthesizes the top results. Those top results are the same roundups, G2 pages and comparison articles that rank in Google. **If you are at position 74, you are not in the retrieval set.**

`competitive_analysis.md` (cited in `SEO_AEO_EFFECTIVENESS_REVIEW_001` §2.2) found with converging 2026 sources that **90–95% of AI citations come from third-party domains, not first-party content.** Across 8 independent searches of the target query space, Ledgerium appeared in **zero** third-party roundups while every competitor — including small players (Glitter AI, Dubble, Supademo, Guidejar) — appeared repeatedly.

**Conclusion: AEO is not a domain-authority bypass. It is the same authority problem wearing a different hat.** The excellent on-page AEO plumbing (Speakable, DefinedTerm, `llms.txt`, answer-first ledes) optimizes the part that isn't the constraint — precisely the same failure mode as the SEO program, one layer up.

Where AEO *is* genuinely different: the corpora assistants over-weight are not the same as Google's ranking set. **Reddit, YouTube transcripts, G2/Capterra, GitHub and Product Hunt are disproportionately represented in AI answers relative to their PageRank.** That is a real, exploitable asymmetry — and it is a *presence-on-other-platforms* play, not an on-site play. It is in §5.

### 4.2 Entity resolution: Ledgerium is not yet an entity

For an assistant to cite you, it must first resolve you as a distinct real-world entity. Two verified problems:

**FINDING C — one `sameAs` link, sitewide.** `src/lib/seo/organization.ts` ships exactly one: `linkedin.com/company/ledgerium-ai`. The file's own comments document why nothing else could be added — GitHub `/ledgerium` resolves to an unrelated company, Crunchbase/G2/ProductHunt returned 403, X/Twitter handles 404'd. That work was done carefully and honestly. But the outcome stands: **entity corroboration requires independent sources, and one self-declared profile is not corroboration.**

Worse, the namesake collision runs against Ledgerium: the 2018 Ethereum ICO "Ledgerium" (token LGUM) is indexed on Etherscan, CoinCarp and Crunchbase. **The crypto project has more corroborating entity references than the company does.** `alternateName` and a disambiguating `description` were added (`aaa4eea`) — correct, and insufficient. Entity disambiguation is won with third-party references, not self-declaration.

**FINDING D — all 164 pages have the same non-human author.** Every page carries `author: { name: 'Ledgerium Research Team', sameAs: ['linkedin.com/company/ledgerium-ai'] }`, emitted as schema.org `Person`. A `Person` whose `sameAs` is a company page is a type error, and "Research Team" is not an entity any system can resolve. There is **no named human with a verifiable footprint** anywhere in the corpus. For a category built on a methodological claim (deterministic capture), the absence of an attributable expert is a direct E-E-A-T and citability cost.

### 4.3 AEO is currently unmeasurable, and will read as a false zero

`referrerClassification.ts` captures clicks arriving *from* an AI domain. But **the dominant AEO outcome is a citation with no click** — the user reads the synthesized answer and never visits. So the instrument systematically undercounts, and at Ledgerium's current volume it will read zero and be indistinguishable from "never cited."

**Do not measure AEO with referrer data at this stage.** Measure it by running the target prompts directly against ChatGPT, Claude, Perplexity and Gemini on a fixed schedule and recording whether Ledgerium is named. A ten-prompt monthly panel, results logged. That is a 20-minute-per-month manual process and it is the only honest measurement available until volume exists.

---

## 5. Highest-leverage acquisition moves, ranked

Ranked by expected customers within six months, not by traffic.

### 5.1 — Ship the Chrome Web Store listing

**Why it is #1:** the Chrome Web Store is a **search engine with its own ranking system that owes nothing to domain authority.** Ranking there is driven by install velocity, ratings, listing relevance and category — a ladder Ledgerium can actually climb from zero. Competitors in this exact category (Scribe, Loom) derive substantial acquisition from it. Ledgerium has **no listing at all**, so this is not an optimization, it is an absent channel.

It is also the funnel's floor. Every visitor from every channel currently terminates in a Developer-mode sideload: download a `.zip`, extract, enable Developer Mode, "Load unpacked," locate the manifest. For the ops/compliance persona the homepage targets, that is close to a total loss. **This one item improves conversion for every other channel in this list simultaneously.**

- **Effort:** days. All 8 store blockers closed 2026-08-19 (`449af69`); screenshots exist. Remaining work is the submission itself plus Google review (typically 1–3 weeks). Then set `config.ts:16` to the real URL — `resolveInstallTarget()` flips the whole site over automatically.
- **First result:** first organic Store installs within **4–6 weeks**.
- **Blocker:** none technical. It has been ready for two weeks and unsubmitted.

### 5.2 — Founder-led direct outreach

**Why:** the only channel that produces paying customers in under 90 days at zero brand. It is also the only way to obtain the two assets everything else depends on — **testimonials and case studies** — of which the site currently has none (grep: no testimonial, customer-logo or case-study surface anywhere in `(public)`).

Target the ICP with budget and acute pain: ops leaders, compliance managers, shared-services teams — and specifically **financial services**, which `REVENUE_PLAN_20K_001.md` identifies as the #1 ICP vertical and which still has no landing page while two deprioritized verticals shipped.

- **Effort:** 5–10 founder hours/week, sustained. Not engineering.
- **First result:** first conversations week 1; **first paying customer realistically 4–8 weeks.**
- **Precondition:** §5.1 (do not demo a product that requires Developer Mode) and a verified end-to-end Stripe purchase.

### 5.3 — Third-party review-site presence (G2, Capterra, Product Hunt)

**Why this is one move, not three:** a G2 listing is simultaneously (a) a referring domain, (b) a top-3 organic result for every `X alternative` query Ledgerium currently loses at position 74, (c) one of the highest-weighted sources in AI-assistant retrieval, and (d) a direct acquisition channel with its own buyer traffic. **It is the single highest-leverage action that serves SEO, AEO and direct acquisition at once**, and it needs a `sameAs` entry the moment it exists (Finding C).

- **Effort:** hours to create listings; the real work is soliciting 5–10 genuine reviews from early users. Requires §5.2 to have produced users first.
- **First result:** listings live in days; meaningful AI-citation and referral effect **2–4 months.**

### 5.4 — Presence in the corpora assistants over-weight

The AEO asymmetry from §4.1, made concrete: participate honestly where the target buyer already asks these questions and where assistants disproportionately retrieve — **Reddit** (r/ops, r/sysadmin, r/BusinessIntelligence, r/msp), plus **YouTube**. YouTube deserves separate emphasis: it is the second-largest search engine, has no domain-authority gate, and this product is inherently visual — "record a workflow, get an SOP" demonstrates itself in 90 seconds.

- **Effort:** 2–4 hours/week, ongoing, genuine participation only. Astroturfing gets detected and is off the table.
- **First result:** direct clicks **immediately**; AI-citation effect **1–6 months.**

### 5.5 — Roundup and earned-mention outreach

The classic backlink play: pitch inclusion in the "best Scribe alternatives / best SOP tools" roundups where every competitor appears and Ledgerium appears in zero. Correctly ranked #1 by the August review *for the purpose of moving position 44* — ranked fifth here because its payoff sits outside the six-month window.

- **Effort:** 3–5 hours/week outreach, founder or contractor.
- **First result:** first placements **4–12 weeks**; ranking effect **4–8 months.**
- **KPI (currently missing entirely): referring domains.** Target ≥8–10 by day 90 from ~0. Without this number on a dashboard, this workstream will be dropped again exactly as it was on 2026-08-13.

### 5.6 — Fix `llms.txt` pricing (Finding A)

Ten minutes. Generate from `plans.ts` so it cannot drift. Include Solo; drop or mark the waitlisted tiers. Zero traffic impact, but every assistant that *does* read it is currently being told to recommend products the user cannot purchase.

### 5.7 — Establish a named human author (Finding D)

Replace `Ledgerium Research Team` with a real, named person with a real LinkedIn `sameAs` — presumably the founder — and fix the `Person`/company `sameAs` type error. Compounds with §5.4: a person who posts on Reddit and YouTube under the same name that appears in the site's author schema is a resolvable entity. "Research Team" never will be.

- **Effort:** ~1 hour (registry field is centralized).

---

## 6. What to STOP doing

**1. Stop publishing programmatic SEO pages.** 164 pages → 3 clicks. 136 pages added since June produced 27× impressions and a decline to zero clicks. The mechanism is understood and closed: marginal pages produce marginal position-44 impressions, and position-44 impressions produce nothing. This is the third independent review to reach this conclusion.

**2. Abandon the 5,625-page ambition permanently.** Demand analysis caps real ceiling at ~650–750; architecture analysis recommends capping at 1,500 and gating at 750. The observed conversion rate of pages-to-clicks makes all three numbers academic.

**3. Stop CTR and title optimization.** It cannot work below roughly position 20. It was attempted in July at positions 44–95 and is the direct cause of the impressions-up-clicks-down pattern.

**4. Stop treating on-page AEO as an authority substitute.** Speakable, DefinedTerm and `llms.txt` are done and done well. Further on-page AEO investment optimizes a non-constraint. Exceptions: the two 10-minute fixes in §5.6 and §5.7.

**5. Stop shipping SEO engineering.** The technical foundation is complete and gated. Every remaining hour of SEO engineering has near-zero marginal return, and — per §3.2 — it is actively harmful as a substitute for the outreach work that is the actual constraint. **Every hour spent on SEO code right now is an hour not spent on §5.1 and §5.2.**

**6. Do not start paid acquisition.** Not until the Store listing is live, a real purchase has completed end-to-end, and there is at least one testimonial. CAC against zero brand recognition and no social proof will be punishing.

**7. Do not resume any publishing until the August re-entry criteria are met** — average position for target clusters below 20, **and** referring domains > 0, **and** at least one non-brand query recording clicks. None is met today.

---

## 7. What success looks like at 90 days

Not traffic. Traffic is a lagging indicator here and will barely move.

| Metric | Today | Day 90 target |
|---|---|---|
| Chrome Web Store listing | **absent** | live, with installs accruing |
| Referring domains | ~0 | **≥8–10** |
| G2 / Capterra listings with ≥5 reviews | 0 | ≥1 |
| Named-entity `sameAs` links | 1 | ≥4 |
| Paying customers | 0 | **≥1** — the only milestone that matters |
| Avg. organic position | 44 | 44 (**do not expect movement, and do not act on its absence**) |
| AI-assistant prompt panel (10 prompts, 4 assistants) | not run | run monthly; ≥1 Ledgerium mention |

Setting the organic-position expectation explicitly at "no change" is deliberate. The most likely way this plan fails is that position 44 does not move by day 90, someone reads that as failure, and the team returns to publishing pages — which is the one action already proven not to work.

---

## 8. Evidence status

| Claim | Status |
|---|---|
| GSC: 25 clicks / 1,979 impressions / position 44 | **VERIFIED** — CEO export |
| 164 pages; 134 commercial / 30 informational / 0 transactional | **VERIFIED** — source count today |
| 2 of 3 non-homepage clicks came from `sopTemplate` cluster | **VERIFIED** — GSC page table; **n is tiny (1 and 3 impressions)** |
| `llms.txt` omits Solo, advertises blocked Team/Growth (Finding A) | **VERIFIED** — `llms.txt/route.ts:36` vs `checkout/route.ts:65` |
| Chrome Store URL still `placeholder` (Finding B) | **VERIFIED** — `config.ts:16`, today |
| One sitewide `sameAs` (Finding C) | **VERIFIED** — `organization.ts` |
| All 164 pages authored by `Ledgerium Research Team` (Finding D) | **VERIFIED** — `grep`, 164/164 |
| Technical foundations complete (sitemap/canonical/schema/gates) | **VERIFIED** — source read + commits `6ec0e72`, `3ab0832`, `47e1bf3`, `aaa4eea` |
| 90–95% of AI citations from third-party domains | **REPORTED** — `competitive_analysis.md`, converging 2026 sources; not independently re-verified here |
| Zero third-party roundup presence | **REPORTED** — 8 agent searches, 2026-08-13; re-check before acting |
| Brand collision with 2018 LGUM ICO | **REPORTED** — independent verification recommended |
| §3.3 SEO ceiling model (~9 clicks/day at page 1) | **MODELLED** — assumptions stated inline; no keyword tooling available; no volumes fabricated |
| 4–8 month authority latency | **REASONED** — industry-standard lag, not measured on this domain |

**Not measurable today:** AEO citation rate (citation-without-click is invisible to referrer instrumentation — §4.3); SEO-page → signup attribution at any useful volume.
