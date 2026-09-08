# SEO/AEO Content Program — Measurement Design

**Author:** analytics agent
**Date:** 2026-09-08
**Evidence base:** `docs/meta/GROWTH_REVIEW_001/seo_aeo.md` (2026-09-02), `docs/meta/GROWTH_REVIEW_001/analytics.md` (2026-09-02), source read of `apps/web-app/src/components/seo/referrerClassification.ts`, `apps/web-app/src/lib/analytics.ts`, `apps/web-app/src/lib/seo/validate.ts`, `apps/web-app/src/content/types.ts`, `apps/web-app/src/content/registry.ts`, `apps/web-app/src/lib/attribution.ts`. CEO-supplied GSC export (3 months, 2026-05-12 → 2026-08-11) as cited in the seo_aeo review.

**Labels used throughout:** VERIFIED (I read the source/data directly), REPORTED (stated in a prior artifact, not independently re-verified here), REASONED (inference from verified facts, no new data pulled), MODELLED (assumption-driven estimate, assumptions stated inline).

**Framing constraint carried over from the seo_aeo review, not re-litigated:** SEO is a 12-month compounding asset, not a Q4 revenue channel. Nothing below is designed to prove otherwise. It is designed so that if the CEO expands content across use case / role / department / industry, the team knows within weeks — not months — whether that specific bet is behaving differently than the 164-page corpus did, instead of finding out at the next audit.

---

## 0. What the four axes actually are in this codebase (VERIFIED)

The CEO's stated axes map cleanly onto four of the twelve `PageType` values in `apps/web-app/src/content/types.ts`, confirmed by page count (`grep -c "type: '<x>'"` across `src/content/pages/*.ts`, 164 total, matches the review):

| CEO axis | `PageType` | Path prefix (`PARENT_HUB`) | Pages today |
|---|---|---|---|
| Use case | `problem` | `/use-cases/problems` | 22 |
| Role | `persona` | `/use-cases/personas` | 16 |
| Department | `department` | `/departments` | 9 |
| Industry | `industry` | `/industries` | 9 |
| **Axis subtotal** | | | **56 (34% of 164)** |
| *Other clusters, not one of the requested axes* | `workflow` (24) · `sopTemplate` (17) · `software` (16) · `alternatives` (15) · `compare` (10) · `competitors` (10) · `answer` (8) · `aiOpportunity` (8) | — | 108 |

This matters for everything below: `pageType` **is** the axis field for these four types. There is no separate "axis" property to add — the gap, where one exists, is in *joining* GSC data and conversion data back to this field, not in declaring it.

---

## 1. Leading indicators

Honest split of what can move in weeks vs. what is structurally a 4–8 month lag (per seo_aeo §3.1, REASONED/industry-standard, not re-derived here).

| Indicator | Predicts | Leading or lagging | Earliest read | Data source | Honesty note |
|---|---|---|---|---|---|
| **Indexation rate** (published pages actually in Google's index) | Whether the content is even in the race | Leading | 1–2 weeks post-publish | GSC Coverage/Pages report (manual today) | Cheap, real, automatable later. Does not predict ranking, only eligibility. |
| **Query-count breadth** (distinct queries surfacing ≥1 impression per page, GSC Queries tab) | Topical relevance / whether the page resolves to real search demand at all | Leading | 2–4 weeks | GSC Performance → Queries, per-URL filter | A page with 0 distinct queries after a month is not a slow-burn asset, it's miscategorized or duplicative — this is visible far before position moves. |
| **Referring domains (count, sitewide + per outreach target)** | The one input that actually moves position | Leading | Days–weeks once outreach lands a placement | Manual outreach log + GSC "Links" report or Ahrefs/Moz if licensed (VERIFIED: no such tool wired into this repo) | This is the single most honest leading indicator for the *authority* problem, because a placement going live is measurable immediately — you do not have to wait for the resulting position change to know the input happened. |
| **AI-citation panel mention rate** (§3) | Whether AEO/off-site presence plays are working | Leading | Monthly, first read this cycle | Manual prompt panel, stored in-repo | The only honest AEO signal at current volume — see §1.1 below for why referrer data cannot do this job. |
| **`seo_hub_viewed` browse depth per axis hub** (`pageCount` at view time, event volume per `hubType`) | Whether *visitors who do arrive* find a given axis's hub worth exploring | Leading | Immediately (already instrumented) | First-party `AnalyticsEvent` table, `seo_hub_viewed` | Does not require GSC or authority — it's on-site behavior of whatever traffic already exists (organic, direct, referral). Low volume today, but it is a real, already-built signal that isn't citation-without-click-blind. |
| **`seo_related_page_clicked` cross-axis matrix** (`fromType`→`toType`) | Whether users who land on one axis (e.g. an industry page) self-select into another (e.g. a role page) before converting | Leading | Immediately (already instrumented) | Same table | Useful for axis-expansion sequencing decisions even at low N — it's a *behavioral* signal, not a *ranking* one, so it doesn't require authority to exist. |
| **Position for pages that crack <30** (rare today, `/sop-templates/vendor-setup-sop-template` at 5.0 is the existing example) | Whether a specific page/cluster is winnable | Leading, but only below ~position 20–30 | As soon as it happens | GSC Performance, Pages tab | Per the review's own finding: CTR/title work is *inert* above ~position 20. A leading indicator only exists once a page is below that line — above it, position "movement" from 91→84 is noise, not signal. |
| Sitewide impressions | — | **Not a leading indicator of anything at this stage** | — | GSC | More impressions at position 44–90 (the July 2026 case) is a symptom of publishing more pages, not of the program working. Do not read a rising impression count as progress. |
| Position at sitewide/cluster average, page-level clicks/CTR for any page or cluster with <30 impressions | — | **Unmeasurable / will read as false zero or false signal** | — | GSC | See §5 for the exact sample-size math. Below the threshold, "it moved" and "it didn't" are statistically indistinguishable from noise. |
| SEO-page → signup/paid attribution, per page or per axis | — | **Unmeasurable at any useful volume today** | — | `attribution.ts` join | 25 clicks in 3 months sitewide; even a generous 100% of those converting to signup would not support a per-axis breakdown. Confirmed REPORTED gap from the seo_aeo review, carried forward. |

### 1.1 Why referrer-based AEO measurement will read a false zero (REASONED, confirms the review's §4.3 finding by source read)

`classifyReferrer()` (`referrerClassification.ts`, read directly) checks `document.referrer` against a 10-domain AI allowlist and correctly tags `seo_page_viewed.referrerClass = 'ai'` **only when the browser actually navigated from an AI assistant's domain to the page.** The dominant AEO outcome — an assistant reads Ledgerium's content via retrieval, synthesizes an answer, and the user never clicks through — produces **no navigation event at all**, so there is nothing for this classifier to see. This is not a bug in the code (the code does exactly what it says); it is a structural blind spot in *any* referrer-based instrument for this outcome type. Do not add more AI domains to the allowlist expecting it to close this gap — it cannot, by construction. The AI-citation panel (§3) is the only instrument that measures the actual outcome.

---

## 2. The outcome-aware content gate

Goal: replace "164/164 passed" with a gate that would have actually stopped the July 2026 expansion (100+ pages added into the `alternatives`/`compare` cluster while it sat at position 44–95, per seo_aeo §1.3, VERIFIED via GSC page table cited there).

### 2.1 Metrics, thresholds, sources, cadence

| Metric | Definition | Threshold | Data source | Automatable today? | Cadence |
|---|---|---|---|---|---|
| **Indexation rate** | % of *published* pages (per axis/cluster cohort) that GSC reports as indexed, measured 30 days after `verifiedAsOf`/publish | **≥ 80%** per cohort | GSC Coverage report (UI) or `URL Inspection API` (`urlInspection.index.inspect`) | **Manual only.** No GSC API credentials/integration exist in this repo (VERIFIED — no matches for `searchconsole`/`webmasters` anywhere in `apps/web-app`). Automating this requires a service account added to the Search Console property plus a small script; that is real, buildable future work, not built here. | Monthly, or once per publishing cohort at day 30 |
| **Zero-impression share** | % of published pages (per cohort) with **0** impressions trailing 60 days | **< 30%** per cohort | GSC Performance report (Pages tab), exported and anti-joined against the full page-URL list (sitemap.xml or a registry export) — a page with genuinely zero impressions does not appear as a row in the GSC export at all, so "zero-impression" = "in the inventory, absent from the export," not "present with a 0 value." This is a real subtlety; get it wrong and you undercount. | **Manual.** Same API gap as above. | Monthly, or once per cohort at day 60 |
| **Position distribution per cluster** | Median position, per `pageType`×`searchIntent` cohort, trailing 60 days | **A cluster may not receive additional pages if its trailing-60-day median position is ≥ 50 AND its zero-impression share is ≥ 50%.** This is a formalization, applied at the cluster level rather than sitewide, of the re-entry bar the seo_aeo review already set in §6.7 (avg position < 20, referring domains > 0, ≥1 non-brand click). | GSC Performance, Pages tab, joined to a URL→(`pageType`,`searchIntent`) crosswalk. The crosswalk is mechanical (fixed path prefixes per `PARENT_HUB`, e.g. `/industries/*` → `industry`) but does not exist as a file today — it is a one-time spreadsheet join, or a short follow-up script an engineering agent could build from `ALL_PAGES` (not built here per task scope). | **Manual** until the crosswalk is built. | Monthly |
| **Click-per-page / cluster CTR** | Clicks ÷ impressions, computed **only** for pages with position < 30 (above that, CTR is not interpretable — see §1) | No hard threshold; **directional only** below the §5 sample floor. Used to catch a *falling* CTR on a page that has already cracked position <30 (the actual, interpretable case) — not to compare clusters at position 44–90. | Same GSC export + crosswalk | Manual | Monthly |

### 2.2 Retrospective test: would this have caught the 164-page failure?

- **Indexation** would very likely have passed (Google indexes almost everything behind a working, parity-gated sitemap — confirmed sitemap/canonical hygiene in the seo_aeo review §2). Indexation was never the failure mode here. Its purpose in this gate is to catch a *different* future failure class (a bad `robots`/canonical regression, a sitemap drift) that hasn't happened yet but would be invisible without this check.
- **Zero-impression share and the cluster-position rule are the ones that would have caught it.** The `alternatives`/`compare` cluster (134 of 164 pages, 82% of the corpus, per seo_aeo §1.1 VERIFIED) had example positions of 72.3 (`walkme alternatives`) and 74.4 (`scribe alternative`). A cluster-level median position ≥ 50 for that cohort is not a hypothetical — it is close to certain given those two data points, though the exact 2026-08 zero-impression-share figure for that specific cluster is **not computed anywhere in the existing artifacts** and is flagged below as the first concrete action this document produces.
- **The exact percentage is currently unknown and must be computed, not assumed.** State this plainly rather than inventing a number: *"apply the crosswalk in §2.1 to the CEO's existing GSC export and compute zero-impression share for the `alternatives`/`compare` cohort before the next publishing decision."* This is a 30–60 minute spreadsheet exercise against data already in hand — it does not require a new export.

### 2.3 What is automatable vs. manual today (explicit answer to the ask)

**Automatable today: nothing, in the sense of "runs without a human."** No Search Console API integration exists in this codebase (VERIFIED). Every metric in §2.1 is a manual GSC-UI export + spreadsheet join today, same as the CEO's existing 3-month export process.

**Automatable with modest future engineering (not built in this task, scope excludes product code):** GSC Search Console API v1 (`searchanalytics.query` for clicks/impressions/position per URL, `urlInspection.index.inspect` for per-URL indexation, rate-limited to ~2,000 inspections/day) could replace the manual export with a scheduled script once a service account is granted read access to the property. That would also make the URL→axis crosswalk a one-time artifact instead of a recurring manual join. Flagging this as a discrete, scoped follow-up for an engineering agent — not undertaken here.

---

## 3. AI-citation panel

Design goal from the seo_aeo review: a manual, ≤30-min/month prompt panel across ChatGPT, Claude, Perplexity, and Gemini, because referrer-based measurement cannot see the dominant AEO outcome (§1.1).

### 3.1 The prompt set — 14 prompts across 4 axes + 2 control prompts

Use identical wording every month (verbatim, no paraphrasing) so results are longitudinally comparable. Open a **fresh, logged-out or new conversation** per prompt per assistant each month to avoid personalization/memory bias.

**Use case (3 prompts — maps to `problem` type):**
1. "What's the best way to document a repetitive business process so anyone on the team can follow it?"
2. "How can I create a standard operating procedure without spending hours writing it manually?"
3. "What tool can automatically turn screen recordings into step-by-step documentation?"

**Role (3 prompts — maps to `persona` type):**
4. "What software helps operations managers document team workflows for compliance?"
5. "What's a good tool for IT admins to record and document onboarding procedures?"
6. "As a compliance manager, how do I create audit-ready process documentation quickly?"

**Department (3 prompts — maps to `department` type):**
7. "What tools do HR teams use to document repetitive onboarding workflows?"
8. "How can a finance team create SOPs for month-end close processes?"
9. "What's a good way for a customer support team to document their ticket-handling process?"

**Industry (3 prompts — maps to `industry` type):**
10. "What documentation tools are used by healthcare operations teams for compliance-ready SOPs?"
11. "What's a recommended process-documentation tool for financial services companies?"
12. "What software do SaaS companies use to document internal operational workflows?"

**Control / brand prompts (2 — track the review's Finding A–D competitive and entity-resolution defects directly):**
13. "What are the best alternatives to Scribe for process documentation?" (the exact query class the corpus is 82% built around — tracks whether third-party-mention work in §5.3/§5.4 of the seo_aeo review is landing)
14. "Have you heard of Ledgerium AI? What do they do?" (direct entity-resolution probe — tracks whether the `sameAs`/named-author fixes, seo_aeo Findings C/D, are taking hold)

### 3.2 Assistants and time budget

**Assistants:** ChatGPT (consumer, web search enabled), Claude (web search enabled), Perplexity (default — always retrieves), Gemini (with grounding). Four assistants, matching the review's recommendation exactly; do not add a fifth (e.g. Copilot) without also extending the time budget — 14 prompts × 4 assistants = 56 queries. At ~25–30 seconds each to paste, read, and log, that is **~25–28 minutes**, inside the ≤30-min target with no slack for interruptions — budget the full 30.

### 3.3 What is recorded, per (prompt, assistant) cell

| Field | Values |
|---|---|
| Ledgerium mentioned? | Y / N |
| Position in the answer (if Y) | 1st named / 2nd / 3rd+ / mentioned only in a list without ranking |
| Description accuracy (if Y) | accurate / partially accurate / wrong |
| Source cited (if the assistant shows one) | domain name, or "not shown" |
| Competitors named | free-text list (tracks whether Ledgerium is conspicuously the one absent, per the review's zero-third-party-roundup finding) |
| Note | free text, optional |

### 3.4 Storage — in-repo, diffable

Create `docs/meta/ai-citation-panel/YYYY-MM.md` each month, one fixed-schema Markdown table (56 rows: 14 prompts × 4 assistants). Markdown, not a spreadsheet, so `git diff` between two months' files is directly readable and the history is part of the repo's audit trail like every other governance artifact in this codebase. Maintain a single running `docs/meta/ai-citation-panel/SCOREBOARD.md` with one row per month: total mentions / 56, mentions by axis, entity-resolution prompt (#14) status, and a one-line summary — this is the file the CEO actually opens; the per-month files are the backing evidence.

### 3.5 What triggers action

- **0 mentions across all 56 cells, 2+ consecutive months:** expected at this stage — no action, confirms current on-page AEO investment level is correctly sized (per seo_aeo §6.4, further on-page AEO work is a non-constraint).
- **≥1 mention appears, for the first time:** investigate which prompt/assistant and what source was cited. If a source is named (e.g. a Reddit thread, a G2 listing, a roundup), that tells you which off-site surface from seo_aeo §5.3/§5.4 is actually being retrieved — the actionable move is to invest more in *that specific surface*, not to conclude "AEO is working" broadly.
- **Prompt #14 (entity resolution) shifts from "not resolved" to "partially/accurately resolved":** log as a milestone independent of the axis prompts — it means the `sameAs`/named-author fixes are propagating into model behavior, which is a precondition for the axis prompts ever citing Ledgerium.
- **A competitor that previously didn't appear starts appearing, or one drops:** log for competitive awareness; not an action trigger by itself.

---

## 4. Per-axis attribution

### 4.1 What already works (VERIFIED by source read)

`seo_page_viewed.pageType` already **is** the axis for `problem`/`persona`/`department`/`industry` (§0) — no new event or field is needed to know which axis a given page view belongs to. Two behavioral instruments are already built and axis-aware today:

- `seo_hub_viewed { hubType, pageCount, referrerClass }` — tells you how much browsing interest each axis hub gets.
- `seo_related_page_clicked { fromType, fromSlug, toType, toSlug, linkRank }` — tells you whether visitors move *between* axes (e.g. industry → role) before converting, which is directly relevant to sequencing an axis expansion.

`getFirstTouchAttributionForUser()` / `listPayingCustomerFirstTouchAttribution()` (`attribution.ts`, read directly) already stores the full parsed JSON `properties` of the first anonymous event for every user, which — when that first event is `seo_page_viewed` — includes `pageType`. **The join key to go from "paying customer" to "which axis first touched them" already exists.** What does not exist is a report that groups by it.

### 4.2 The actual instrumentation gaps

1. **No aggregation query exists that groups `listPayingCustomerFirstTouchAttribution()` results by `firstTouch.properties.pageType`.** This is a query-writing gap, not a missing-event gap — buildable without touching the event taxonomy.
2. **`searchIntent` is authored in the content registry but never emitted in any client event.** If a future question is "do `commercial`-intent pages convert differently than `informational` ones within the same axis," that field would need to be added to `seo_page_viewed`. Not needed for the four CEO axes themselves (those are captured via `pageType`), but flagged as a real gap for intent-level analysis.
3. **GSC-side data (impressions/position/clicks) has no axis field at all** — it is per-URL. The crosswalk described in §2.1 (URL prefix → `pageType`) is required before GSC data can be sliced by axis, and it does not exist as an artifact today.
4. **First-touch-only attribution understates cross-axis influence.** `firstTouchVisitorId` captures the *first* anonymous event only. If a visitor reads an `industry` page, then a `persona` page, then signs up, only the `industry` touch is credited. `seo_related_page_clicked`'s `fromType`/`toType` fields make the cross-axis path *visible*, but nothing today folds that into the conversion-attribution query — a real, if secondary, gap.

### 4.3 The dominant constraint is volume, not code (REASONED)

Even with the aggregation query in 4.2.1 built today, it would run against **whatever paying-customer population currently exists whose first touch was an SEO page** — per the seo_aeo review, sitewide SEO clicks are 25 over 3 months, and no evidence exists of any paying customer whose first touch was SEO. Building the query now would very plausibly return an empty or single-digit result set. **Do not build the axis-conversion report as a near-term priority; build it once §5's sample floor is closer to being met, and lean on the already-working `seo_hub_viewed`/`seo_related_page_clicked` behavioral signals (§4.1) for axis-level reads in the meantime**, since those don't require a conversion event to be interesting.

---

## 5. Statistical honesty

### 5.1 Current volume (VERIFIED / REASONED arithmetic on verified inputs)

1,979 impressions over ~92 days (2026-05-12 → 2026-08-11) ≈ **21.5 impressions/day sitewide**, across 164 pages ≈ **0.13 impressions/page/day** on a flat average (real distribution is skewed — a handful of pages carry most of the volume, per the `sopTemplate` and `/industries/healthcare` examples in the seo_aeo review). Applying the same flat-average approximation to the four axis clusters (MODELLED — assumes even distribution within a cluster, which is generous and almost certainly overstates the smaller clusters' true per-page volume, since the observed distribution is heavily skewed toward a few pages):

| Axis | Pages | Modelled impressions/day (cluster-wide) |
|---|---|---|
| `problem` (use case) | 22 | ~2.9 |
| `persona` (role) | 16 | ~2.1 |
| `department` | 9 | ~1.2 |
| `industry` | 9 | ~1.2 |

25 clicks over the same period ≈ **0.27 clicks/day sitewide**, overall CTR ≈ 1.26%.

### 5.2 How many impressions before a per-cluster conclusion is valid

Two different bars, stated separately because they answer different questions:

**Bar 1 — "is this number more than pure noise?"** Standard practical floors for treating a proportion (CTR, zero-impression share) as anything other than anecdote: **≥30 impressions** (the point past which the normal approximation to a binomial starts to behave reasonably) and, ideally, **≥5 observed clicks** (the same floor GSC itself effectively uses before showing a CTR at all in some views, and the same order of magnitude the expected-count-≥5 rule uses for count-based statistics generally). Below this, do not describe a cluster's CTR or zero-impression share as "the number" — describe it as "not yet computable" and say why.

**Bar 2 — "is Cluster A meaningfully different from Cluster B?"** This is a two-proportion comparison, not a one-sample floor, and requires substantially more data. Worked example (MODELLED, two-proportion z-test, α = 0.05 two-sided, 80% power, comparing a 1% CTR cluster against a 2% CTR cluster — a 1-percentage-point gap, which is roughly the size of difference that would actually be worth acting on):

```
n ≈ 2,300 impressions per cluster arm
```

At the modelled per-cluster rates in §5.1, that is:

| Axis | Modelled impr/day | Days to reach n≈2,300 | Approx. calendar time |
|---|---|---|---|
| `problem` (largest, 22 pages) | ~2.9 | ~790 days | **~2.2 years** |
| `persona` | ~2.1 | ~1,090 days | **~3.0 years** |
| `department` / `industry` (smallest, 9 pages each) | ~1.2 | ~1,920 days | **~5.3 years** |

### 5.3 The direct answer to "how long until the review's n=1/n=3 signal is trustworthy"

The seo_aeo review flagged its own `sopTemplate` finding (2 of 3 non-homepage clicks, from pages with 1 and 3 total impressions) as "a signal, not a proof." Under Bar 1 above, that page needs to accumulate **≥30 impressions** before its CTR is even a stable *single* number — at that page's own observed rate (1 impression in 3 months), that is **years away at current traffic**, not weeks. Under Bar 2 (comparing `sopTemplate` against `alternatives` as clusters), the answer is the multi-year figure in §5.2. **This signal should continue to be treated exactly as the review treated it — directional, worth acting on as a content-mix constraint (§6 of that review: any new page should come from this class), not as proof, and not something a 90-day check-in can upgrade to "proven."**

### 5.4 The direct tension with the CEO's expansion intent (REASONED)

Publishing more pages across the four axes, without first fixing authority, does not shorten the timelines in §5.2 — it *lengthens the per-page version of them*, because sitewide impressions get spread across more URLs rather than concentrating. It can shorten the *sitewide/cluster-aggregate* version somewhat (more pages in a cluster means more cluster-level impressions even if each page is thin), but only up to the ceiling already modelled in the seo_aeo review (§3.3: a 10× position-driven impression lift still lands at roughly a quarter of the revenue-plan requirement). **Recommendation embedded in the gate (§2.1):** apply the per-cluster re-entry rule *before* any axis expansion, and treat axis expansion as a content-mix decision gated on that rule cluster-by-cluster, not a blanket "expand across all four axes now" decision — the four axes do not have to be treated identically, and per §5.2 they currently have meaningfully different data volumes (`problem` and `persona` are 2–3× the sample rate of `department`/`industry`).

---

## 6. Single-page scoreboard — the ≤10 numbers

| # | Metric | Baseline (today) | Day-90 target | Expected to move? |
|---|---|---|---|---|
| 1 | Indexed pages / published pages | **Not yet computed** — REQUIRES the crosswalk in §2.1 run against the existing GSC export; this document's first concrete action item | ≥ 80% | Yes — this is the one gate metric likely to already be healthy; computing the true baseline is the deliverable, not a guess |
| 2 | Zero-impression share (trailing 90d) | **Not yet computed** — same action item as #1 | < 30% | Unknown until baseline exists — this is very plausibly the metric that fails today and explains the 164-page outcome |
| 3 | Sitewide impressions/day | **~22** (VERIFIED, 1,979/92d) | ~22 (flat) | **No — do not expect movement; more impressions at position 44 is not progress** |
| 4 | Sitewide organic clicks/quarter | **25** (VERIFIED) | ~25 (flat) | **No — explicitly not expected to move; carried over from seo_aeo §7** |
| 5 | Avg. organic position (sitewide) | **44** (VERIFIED) | 44 | **No — explicitly not expected to move; reading its absence-of-movement as failure is the specific mistake this design exists to prevent** |
| 6 | Referring domains | **~0** (REPORTED) | **≥ 8–10** | Yes — the one number that, if it doesn't move, means the off-page workstream still isn't happening (per seo_aeo §1.2/§3.2, exactly the pattern that already repeated once) |
| 7 | AI-citation panel: mentions / 56 cells (this month) | **0 — panel not yet run** | ≥ 1 | Yes, modestly — first real read happens this cycle; a jump from 0 is meaningful, a jump from 1 to 3 is not (n too small — treat directionally per §5.3's logic) |
| 8 | Named-entity `sameAs` links | **1** (VERIFIED) | **≥ 4** | Yes — cheap, controllable, and a precondition for AI-citation panel prompt #14 ever resolving |
| 9 | `sopTemplate` cluster: pages with position < 30 | **1** (`vendor-setup-sop-template` at 5.0, VERIFIED) | ≥ 2 | Directional only — n is tiny either way (§5.3); track as a constraint-compliance signal (is any new content coming from this class), not a performance claim |
| 10 | New pages published outside the §2.1 gate | **164 / 164** (the entire corpus shipped with zero outcome gate — this is the baseline the gate exists to replace) | **0** | Yes, and this is the discipline metric: it measures whether the organization applies the gate before publishing into an axis, independent of whether any given page performs |

**Explicitly excluded from this scoreboard, and why:** SEO-page → signup/paid conversion count or rate, and any per-axis click/CTR comparison. Both would read as single- or zero-digit numbers that invite false confidence or false alarm at current volume (§5). Putting them on a CEO-facing scoreboard before the sample floors in §5.2 are met would recreate exactly the failure mode this document is designed to close — a passing-looking number that measures nothing.

---

## 7. Evidence status of this document

| Claim | Status |
|---|---|
| Axis → `PageType` mapping and page counts (§0) | **VERIFIED** — source read of `content/types.ts`, `content/registry.ts`, grep count of `content/pages/*.ts` |
| `classifyReferrer()` behavior and why it misses citation-without-click (§1.1) | **VERIFIED** — source read of `referrerClassification.ts` |
| `seo_page_viewed`/`seo_hub_viewed`/`seo_related_page_clicked` schemas (§1, §4.1) | **VERIFIED** — source read of `analytics.ts` |
| No GSC API integration exists in this repo (§2.3) | **VERIFIED** — grep for `searchconsole`/`webmasters` returned zero matches |
| `attribution.ts` join mechanics (§4.1) | **VERIFIED** — source read |
| 1,979 impressions / 25 clicks / position 44 over 3 months | **REPORTED** — CEO GSC export, cited in seo_aeo review, not independently re-pulled here |
| Per-cluster impression-rate estimates (§5.1 table) | **MODELLED** — assumes even within-cluster distribution; real distribution is skewed, so smaller clusters' true per-page rate is likely lower than shown, not higher |
| Sample-size requirements for a valid per-cluster comparison (§5.2) | **MODELLED** — standard two-proportion power calculation; assumes a 1pp CTR gap is the smallest difference worth acting on (a judgment call, stated explicitly) |
| Zero-impression share for any cluster today | **NOT MEASURED ANYWHERE** — this document's first required action, not a claim |
| `sopTemplate` cluster as the one with working evidence | **REPORTED**, carried from seo_aeo review, itself flagged there as n=1/n=3 |

**First action this document implies, before any expansion decision:** run the §2.1 crosswalk against the existing GSC export (no new export needed) to fill in scoreboard rows #1 and #2 with real numbers.
