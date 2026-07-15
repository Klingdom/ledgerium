# SEO/AEO Growth Review — CTR Recovery + Expansion Playbook

**Owner:** growth-strategist (Mode 3-adjacent analysis artifact — no code changes)
**Scope:** (1) CTR rewrite for 4 page-2, zero-click GSC pages; (2) copy/positioning playbook for new-cluster expansion (personas, industries, software, vs-pages, document-workflow); (3) internal-linking plan to move page-2 pages to page-1; (4) top AEO moves.
**Grounded in:** `apps/web-app/src/content/pages/{alternatives,competitors}.ts`, `apps/web-app/src/content/types.ts`, `apps/web-app/src/components/seo/{AlternativesPageView,Blocks}.tsx`, `apps/web-app/src/lib/seo/related.ts`.
**Constraint honored:** no fabricated stats, no unverifiable superlatives ("#1", "best-in-class"). Every rewritten string is a reframe of content already present on the page (`shortAnswer`, `keyTakeaways`, `originalDataPoint`), not a new claim.

---

## 1. Why these 4 pages rank but don't get clicked

Diagnosis from reading the actual `metaTitle`/`metaDescription` values (not guessing):

- All 10 `alternatives.ts` pages and all 10 `competitors.ts` pages use **one of two templates verbatim**: `"Best {Tool} Alternatives in {year}"` / `"{Tool} Competitors: The {year} Landscape"`. This is the single most common SERP pattern for these query types — G2, Capterra, Zapier, and the vendors themselves all title this identically. A page-2 ranking with an indistinguishable title has no reason to be clicked over the page-1 results it's competing against, even if it eventually out-ranks them.
- The differentiator that actually exists on each page (deterministic capture vs. AI-inference / screenshots / video / in-app overlays vs. category-map framing) is buried in `shortAnswer` and `keyTakeaways` — **never surface in the title or first 60 characters of the description**, which is the only part of the page a non-clicking searcher ever sees.
- `metaDescription` for 3 of the 4 targets is honest and specific but reads like a research abstract ("Compare options by what each is best for" / "as of June 2026") — flat, no hook, no reason to pick this result over the 9 others.
- No page anywhere in the codebase carries an inbound `related` token pointing at `alternatives:walkme`, `alternatives:guidde`, `alternatives:scribe`, or `competitors:kissflow` (verified via Grep). These 4 pages only ever appear as **link targets never link recipients** — confirmed separately as an internal-linking gap (§3), which independently suppresses ranking position and is likely part of why they sit on page 2 despite earning impressions.

Fix for CTR: keep the exact-match keyword (`{Tool} Alternatives`, `{Tool} Competitors`) at the front — do not sacrifice keyword match for cleverness — but attach the one honest differentiator already stated on the page as the second clause, and use a number where the page genuinely has one (option count). No new facts introduced; every rewrite is a compression of existing page content.

### Rewrite 1 — `/alternatives/walkme`

| | Before | After |
|---|---|---|
| **metaTitle** (≤60) | `Best WalkMe Alternatives in 2026` (33 ch) | `WalkMe Alternatives in 2026: 6 Options Compared by Fit` (54 ch) |
| **metaDescription** (≤155) | `The best WalkMe alternatives for teams weighing digital adoption against process measurement. Compare options by the job you need done.` (137 ch) | `6 WalkMe alternatives for 2026 — from in-app adoption platforms to deterministic process measurement. Matched by job, not by "best."` (134 ch) |

Rationale: "6 Options Compared by Fit" replaces the generic superlative with the thing the page actually does (5 competitor options + Ledgerium, matched to job-to-be-done via `evaluationCriteria`). "By fit, not by best" quietly signals this isn't another rehashed listicle — matches the page's own honest framing (`whenTargetStillFits`).

### Rewrite 2 — `/alternatives/guidde`

| | Before | After |
|---|---|---|
| **metaTitle** | `Best Guidde Alternatives in 2026` (33 ch) | `Guidde Alternatives in 2026: Beyond How-To Video` (49 ch) |
| **metaDescription** | `The best Guidde alternatives for teams who need measurable SOPs, not just how-to videos. Compare options by what each tool is built for.` (139 ch) | `Guidde makes narrated how-to videos. These 6 alternatives include tools for screenshot guides, training delivery, and measurable SOPs computed from real work.` (155 ch) |

Rationale: "Beyond How-To Video" is a direct, honest compression of the page's own `whyPeopleSwitch` framing (video can't be measured, diffed, or kept current) — it names the category gap without claiming Guidde is bad at video (it explicitly isn't, per `whenTargetStillFits`).

### Rewrite 3 — `/alternatives/scribe`

| | Before | After |
|---|---|---|
| **metaTitle** | `Best Scribe Alternatives in 2026` (33 ch) | `Scribe Alternatives in 2026: Deterministic vs AI-Inferred` (57 ch) |
| **metaDescription** | `The best Scribe alternatives for teams that need deterministic process data, not AI-inferred maps. Compare options by what each is best for.` (142 ch) | `Scribe's Optimize agents infer process maps with AI. One of these 6 alternatives computes them deterministically instead — same input, same output.` (149 ch) |

Rationale: this page was already rewritten most recently (verifiedAsOf July 2026) but kept the same generic template — the fix here isn't "rewrite again," it's **surface the one fact on the page that's genuinely differentiated and timely**: Scribe's Optimize AI-agent launch (noted separately in the competitive-researcher findings, Nov 2025) is a specific, verifiable, dated event already reflected in `originalDataPoint` and `keyTakeaways`. "Deterministic vs AI-Inferred" is the actual axis the page argues on — putting it in the title turns a commodity listicle title into the one SERP result that names the real category split searchers researching Scribe's new agents will recognize.

### Rewrite 4 — `/competitors/kissflow`

| | Before | After |
|---|---|---|
| **metaTitle** | `Kissflow Competitors: The 2026 Landscape` (41 ch) | `Kissflow Competitors in 2026: 5 Workflow Tool Categories` (56 ch) |
| **metaDescription** | `A map of Kissflow competitors across workflow and BPM tools, grouped by what each segment does and who it fits, as of June 2026.` (130 ch) | `Kissflow competes across 5 categories — low-code BPM, checklists, mining, and more. See which segment actually matches your workflow problem.` (144 ch) |

Rationale: "landscape" and "map" are research-report words with no query-intent match ("kissflow competitors" searchers want names and a decision aid, not a genre label). "5 Workflow Tool Categories" states the actual page structure (the `segments` array has exactly 5 rows) as a concrete, verifiable count — same honesty standard as the option-count rewrite above.

### The reusable pattern (apply to remaining 6 alternatives + 8 competitors pages on next pass)

**Alternatives template:**
`{Tool} Alternatives in {year}: {N} Options Compared by {differentiator-axis}`
+ description: `{One honest sentence naming what Tool does well}. These {N} alternatives include {2-3 category names from the options list}, matched to {the real evaluation axis from evaluationCriteria[0]}.`

**Competitors template:**
`{Subject} Competitors in {year}: {N} {Category} Segments`
+ description: `{Subject} competes across {N} segments — {2-3 named from segments[]}. See which segment matches {the real decision the evaluationCriteria implies}.`

Both templates are mechanically derivable from fields already required by `AlternativesPage`/`CompetitorsPage` (`options.length`, `segments.length`, `evaluationCriteria[0]`) — this can be semi-automated at write-time rather than hand-tuned per page, which also guarantees the title never drifts from the page's actual content (an AEO-honesty benefit, not just an SEO one).

---

## 2. Positioning + copy playbook for the new clusters (personas, industries, software, vs-pages, document-workflow)

The existing `alternatives`/`competitors` clusters already encode a working formula (visible directly in `types.ts` + `AlternativesPageView.tsx`). The expansion clusters should **reuse this formula's skeleton**, not invent a new one — consistency here is itself an AEO asset (LLMs learn the site's answer shape faster when it repeats).

### 2.1 The `shortAnswer` formula (hero, first ~100 words, renders via `SeoHero`)

Every cluster's `shortAnswer` should follow this exact shape, in this order:
1. **Name the searcher's real question** in the tool's/persona's/industry's own words (not Ledgerium's vocabulary).
2. **One honest sentence about the default/incumbent approach** and its real limitation (never straw-man it).
3. **Name 2-3 categories of answer**, Ledgerium being one, described by *what it's for*, not by superiority language.
4. **One sentence naming who each doesn't fit** (this is what makes it AEO-quotable — an LLM can lift this sentence as a complete, hedge-free answer).
5. Closing signpost sentence ("Below are the strongest options... / Below is what to check first...").

Persona-page adaptation: replace step 2's "incumbent approach" with "how this role currently handles it" (manual notes, tribal knowledge, a spreadsheet); step 3 becomes "what actually helps," anchored to `howLedgeriumHelps`.

Industry-page adaptation: step 2 becomes the compliance/audit reality specific to that industry (`complianceConcerns`); step 3 names workflow types + where deterministic evidence specifically matters for that regulator/auditor.

Software-page adaptation ("How to document a workflow in Salesforce"): step 1 is literally the H1 rephrased as a question; step 2 names the generic failure mode (`documentationChallenges`); step 3 is the direct answer sequence (`oldWay` → `ledgeriumWay`).

Document-workflow cluster (new — no dedicated `PageType` exists yet; recommend authoring these as `workflow` type pages scoped to document-centric processes — e.g., "contract review workflow," "invoice approval workflow" — reusing `steps`/`systems`/`metrics`/`aiOpportunities` fields verbatim): step 2 should name the specific document-handling failure (version drift, who-approved-what ambiguity, manual re-keying) rather than a generic "manual work is slow" framing — specificity here is what separates a page that converts from one that doesn't.

### 2.2 The `keyTakeaways` pattern (3-5 self-contained AEO sentences)

Non-negotiable structural rule already enforced across the existing 10+10 pages, reuse verbatim for every new cluster:
1. **Concession sentence** — name what the default/competitor genuinely does well (builds trust; this is the sentence LLMs cite as evidence the site is not a company blog).
2. **Limitation sentence** — the specific thing that default approach cannot do (measure, diff, reproduce, audit — pick the one true for this page, don't reuse boilerplate).
3. **Mechanism sentence** — what Ledgerium actually records/computes, stated as capability not marketing ("Recording X lets Y").
4. **Adjacent-option sentence** — name 1-2 other tools/approaches that are legitimately still the right call for a different job.
5. **Honest-fit-boundary sentence** — restate when the *other* option, not Ledgerium, is still correct.

This 5-sentence shape is why the existing pages already read as trustworthy rather than promotional — do not compress it to 3 generic bullets for new clusters just to save word count; the concession + fit-boundary sentences are load-bearing for both conversion trust and AEO citation-worthiness.

### 2.3 The honest-limitation + competitor-concession pattern

Every new page needs exactly one `honestLimitation` string (BasePage-required field) that:
- Names a **real, current product boundary** (Chrome-extension-only capture, no screenshots, no live in-app overlays, no automation execution) — never a hedge like "may not fit every use case."
- States **who it's for instead** in the same sentence, so the limitation reads as routing, not apology.

Pair this with the cluster-specific concession field (`whenTargetStillFits` on alternatives, `whenCompetitorFits`/`competitorStrength` on compare, or the equivalent "when the old way still works" sentence for persona/industry/software pages) — the two together are what let a page rank commercially *and* get cited by an answer engine as a neutral source, which are usually in tension.

### 2.4 CTA-to-intent mapping (what converts which page)

Current CTA inventory in `Blocks.tsx`: `SeoHero` hero CTA ("Start free"), `MidCta` ("See this in a real workflow recording"), `FinalCta` ("Start free" + secondary "See how it works" + reassurance line "Free plan includes 5 documented workflows per month. No screenshots ever captured.").

Recommended intent-to-CTA mapping for new clusters:

| Cluster | Search intent | Hero CTA | Mid-page CTA | Final CTA framing |
|---|---|---|---|---|
| Persona | informational/early | "See how it works" (soft) | "See this in a real workflow recording" | "Start free" + name the persona's specific first win (e.g., "Record your first onboarding checklist free") |
| Industry | informational/compliance-anxious | "See how it works" | Link to `/methodology` (audit-evidence trust signal) before asking for signup | "Start free" + explicit compliance reassurance line, not generic |
| Software (e.g. "document a workflow in Salesforce") | transactional/how-to | "Start free" (searcher is close to task) | "See this in a real workflow recording" | "Start free" — this cluster should convert hardest since intent is task-specific |
| Vs-pages (`compare`) | commercial, comparison-shopping | "Start free" | existing `whenCompetitorFits`-adjacent soft CTA | "Start free" + "See how it works" dual-path (searcher is deciding, not ready to commit to either) |
| Document-workflow | commercial/transactional | "Start free" | "See this in a real workflow recording" | "Start free" — name the document type explicitly in the reassurance line |

General rule: **never put "Start free" as the only CTA on informational-intent pages** (persona, industry) — pair it with "See how it works" so low-commitment searchers have a non-signup path that still moves them down-funnel; reserve hero-position "Start free" for commercial/transactional pages where the searcher has already decided they need a tool.

---

## 3. Internal-linking strategy: push page-2 pages to page-1

Read directly from `apps/web-app/src/lib/seo/related.ts`: every page's "Related to this" module (`RelatedPagesGrid`) is populated by **(1) explicit curated `related` tokens first, then (2) tag-overlap fill** up to a limit of 3. This means link equity into any page is controlled by two authorable levers — no crawler magic, no hub page currently exists to aggregate authority (`ALTERNATIVES_PAGES`/`COMPETITORS_PAGES` are only consumed by the content registry and the tag-overlap pool, not by a rendered `/alternatives` or `/competitors` index page).

**Finding:** zero pages in the codebase currently carry `alternatives:walkme`, `alternatives:guidde`, `alternatives:scribe`, or `competitors:kissflow` in their `related` array. These 4 pages receive internal links **only** via tag-overlap fallback (weaker signal, capped at whatever 3 slots aren't already consumed by explicit tokens on the linking page) and never as a curated, editorially-chosen "go read this next."

### Action 1 — Add explicit inbound `related` tokens from higher-authority pages

Every `compare:*` page (head-of-funnel, likely the highest-authority pages since they're direct-competitor-name pages) should carry the matching `alternatives:*` and `competitors:*` token for the same tool in its `related` array, and vice versa — these three page types (`compare`, `alternatives`, `competitors`) are the same search cluster from three query angles ("Ledgerium vs Scribe" / "Scribe alternatives" / "Scribe competitors") and should form a **fully-connected triangle** per tool, not a one-way pointer:

- `compare:scribe` (if it exists) → add `alternatives:scribe`, `competitors:scribe`
- `alternatives:scribe` → add `competitors:scribe`, `compare:scribe`
- `competitors:scribe` → add `alternatives:scribe`, `compare:scribe`
- Repeat for walkme, guidde, kissflow (kissflow is competitors-only today — check whether a `compare:kissflow` page exists; if not, that's a gap-fill opportunity, see §2 vs-pages).

### Action 2 — Hub → spoke structure via the persona/problem layer

The `alternatives.ts`/`competitors.ts` pages already point *out* to `persona:*` and `problem:*` pages (e.g., walkme → `persona:process-excellence-leads`; guidde → `persona:training-managers`). These persona/problem pages are natural **hubs** because they aggregate multiple tool-comparison spokes under one job-to-be-done. Action: audit each `persona:*` and `problem:*` page's own `related` array and ensure it links back down to the 2-3 alternatives/competitors pages most relevant to that persona's actual tool-shopping list — right now the linking is one-directional (spoke → hub) with no hub → spoke return path, which is exactly the pattern that strands page-2 pages.

Concretely: `persona:process-excellence-leads` should carry `alternatives:walkme` in its `related` array (currently, per the walkme page's own outbound link, this relationship is known but not reciprocated).

### Action 3 — Build the missing category index pages

There is no rendered `/alternatives` or `/competitors` hub page today — only the flat arrays consumed internally. A single `libraryIndex`-type page (the type already exists in `PageType` but is unused) at `/alternatives` and `/competitors` listing all 10 tools each, with a one-line differentiator per entry, would:
- Give Google a crawlable, keyword-dense index page that can itself rank for broader terms ("process documentation alternatives")
- Give every spoke page a guaranteed inbound link from a single high-crawl-frequency hub
- Directly close the "zero curated inbound links" gap found above without needing to hand-edit every existing page's `related` array

This is the single highest-leverage internal-linking fix available and should be prioritized over piecemeal `related` array edits (Actions 1-2 are still worth doing for triangle-completion, but Action 3 fixes the structural gap at the root).

### Action 4 — Tag audit for fallback-tier link strength

Confirm `walkme`, `guidde`, `scribe`, `kissflow` share tags with the pages most likely to be read by users already inside the funnel (e.g., `/product`, `/pricing`-adjacent content, `/methodology`). Currently their tags are narrow (`['alternatives', 'digital-adoption', ...]` etc.) — tag-overlap fill only pulls from the same content-cluster pages, which is exactly where they already sit. Broadening tags to include a cross-cluster tag (e.g., a shared `'evaluation'` or `'buying-guide'` tag across alternatives + competitors + compare) would strengthen the fallback tier without any hand-authored links.

---

## 4. Highest-leverage AEO moves for these clusters

1. **Ship the fully-connected compare/alternatives/competitors triangle (§3 Action 1) as a structured-data move, not just a linking move.** Right now an AI answer engine crawling `alternatives:scribe` sees Ledgerium's honest self-positioning but has no crawl-path to the `compare:scribe` page's structured `CompareRow` table (the most citation-friendly artifact on the site — a literal feature/claim comparison table with a `verifiedAsOf` date). Answer engines preferentially cite pages with tabular, dated, falsifiable claims; making sure every tool cluster's most-citable page (the `compare` table) is always one click from the alternatives/competitors pages that get the bulk of the informational-intent traffic maximizes the odds the *right* page gets pulled into an AI answer, not just *a* page.

2. **Turn the `originalDataPoint` field into the anchor sentence for each page's Speakable markup, and make it identically wordable across the compare/alternatives/competitors triangle for the same tool.** Right now each of the three page types states the same underlying fact (deterministic capture vs. AI-inference, for Scribe specifically) in three independently-worded sentences (`originalDataPoint` on alternatives, `mechanismIntro` on competitors, presumably similar on compare). An answer engine that crawls all three and sees three different phrasings of the same fact has weaker confidence than one that sees the fact stated identically three times — which reads as corroboration rather than restatement. Standardize the *specific factual clause* (e.g., "Scribe's Optimize agents infer process maps with AI; Ledgerium computes them deterministically from structured interaction data") word-for-word across all three page types for a given tool, while varying the surrounding sentence. This is a low-effort, high-confidence citation-consistency win that requires no new content, only aligning existing sentences.
