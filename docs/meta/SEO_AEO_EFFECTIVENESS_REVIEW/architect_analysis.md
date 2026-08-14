# SEO/AEO Content Engine — Architecture Effectiveness Review

**Agent:** system-architect
**Date:** 2026-08-13
**Mode:** Read-only assessment. Zero code changed.
**Scope:** `apps/web-app/src/content/**`, `apps/web-app/src/lib/seo/**`, the 12 dynamic route
families under `apps/web-app/src/app/(public)/`, `apps/web-app/src/app/sitemap.ts`.

---

## 0. Method and honesty statement

**What I verified directly (source-read, counted):** every file in the content model and SEO lib,
all 12 `generateStaticParams` implementations, the sitemap merge, the CI workflow, and per-type
page counts.

**What I could NOT run:** the Bash tool is disabled in this session. I did not execute `next build`,
`pnpm test`, or `validate:seo`. **Every timing figure below is a model, not a measurement.** Each
model states its assumptions and is calibrated against one real observation recovered from
`.claude/audit/tool-events.jsonl:3231-3232` — a `pnpm validate:seo` run at 2026-06-26T18:50:57Z →
18:50:59Z, i.e. **~2 s wall clock including `tsx` startup and module load**, at a then-smaller page
count. Treat the numbers as order-of-magnitude engineering estimates. Where a model is uncertain by
more than one order of magnitude, I say so.

**Counts verified today:**

| Type | Pages | Type | Pages |
|---|---|---|---|
| workflow | 24 | software | 16 |
| problem | 22 | persona | 16 |
| sopTemplate | 17 | alternatives | 15 |
| compare | 10 | competitors | 10 |
| industry | 9 | department | 9 |
| aiOpportunity | 8 | answer | 8 |

**Total 164 authored = 164 published** (every page in the registry has `published: true`).

Sitemap arithmetic reconciles exactly to the stated 194: 19 hand-written static entries
(`src/app/sitemap.ts:9-57`) + 11 hub URLs (`src/lib/seo/sitemap.ts:7-19`) + 164 leaves
(`src/lib/seo/sitemap.ts:48-53`) = **194**. No collisions were removed by the dedupe at
`src/app/sitemap.ts:62-69`.

---

## 1. Scale ceiling

### 1.1 Summary verdict

| Axis | 164 (today) | 1,000 | 5,625 | Binds? |
|---|---|---|---|---|
| Sitemap URL count / byte size | trivial | trivial | ~1.1 MB, 5.6k URLs | **No** — 8.9x headroom to Google's limit |
| `related` graph computation | trivial | ~1 s total | ~5-20 s total | **No** |
| Registry lookups (`getBySlug`, `getPagesByType`) | trivial | trivial | ~1 s total | **No** |
| SSG render (12 × `generateStaticParams`) | seconds | ~1-2 min | **~10-25 min** | **Yes, softly** |
| Near-duplicate cosine validator | <1 s | ~2-6 s | **~5-15 min + ~0.5-0.7 GB live heap** | **Yes, hard** |

**The single hard wall is the validator.** Everything else degrades gracefully. Critically, the
validator wall is **cheap to remove** — see §1.5. It is not an argument against scaling; it is a
~100 LOC debt that must be paid before ~2,500 pages.

### 1.2 Sitemap — the stated concern does not bind

Google's limits are 50,000 URLs / 50 MB uncompressed per sitemap file. At 5,625 URLs and roughly
180-200 bytes of XML per entry, the file is **~1.1 MB and 5,625 URLs** — 11% of the URL limit and
2% of the size limit. Sitemap-index splitting becomes necessary at **~45,000 URLs**, which is 8x
beyond the stated ambition. Next.js provides `generateSitemaps()` for that case and adopting it is
purely additive to `src/app/sitemap.ts:6`.

**This concern can be closed.** The real sitemap problem is correctness, not size — see §2.3.

One secondary observation: `latestUpdatedFor` (`src/lib/seo/sitemap.ts:22-28`) recomputes a full
`getPagesByType` scan per hub, 11 times. That is O(11n) and irrelevant at any plausible scale.

### 1.3 The `related` graph — not a bottleneck

`getRelatedPages` (`src/lib/seo/related.ts:44`) is invoked once per page render via
`RelatedPagesGrid` (`src/components/seo/Blocks.tsx:240-241`). Per call it does:

- an O(n) `pool.find` per explicit token (`related.ts:55`), bounded by `related.length` (0-3), and
- one O(n) filter + map + an O(k log k) sort over the tag-overlap candidate set (`related.ts:63-67`).

Across a full build that is O(n²) in the worst case: 5,625 × ~5,625 ≈ 31.6M candidate evaluations
plus sorting. Modelled at ~50M simple ops/sec that is **5-20 s across the entire build** — noise
against a 10-25 min SSG render. No action required.

There is a latent correctness risk, not a performance one: the sort key is
`a.p.slug.localeCompare(b.p.slug)` (`related.ts:67`). `localeCompare` is ICU-locale-sensitive.
Two build machines with different default locales *can* produce different orderings for
slugs containing non-ASCII characters or differing on case/punctuation. All current slugs are
ASCII-kebab (enforced by `SLUG_RE` at `validate.ts:9,191`), so this is dormant — but it is a
determinism hazard sitting in a codebase whose top-line principle is determinism. `<` on the
already-validated ASCII slug would be strictly safer and strictly cheaper.

### 1.4 The near-duplicate cosine check — quantified

**Yes, it is O(n²).** `validate.ts:250-259` is a full upper-triangular double loop. The prompt's
~15.8M figure is correct for the *loop iterations*: C(5,625, 2) = **15,819,000**.

But the expensive `cosine` call is skipped for cross-type pairs (`validate.ts:254`). The real cost
driver is **same-type pairs**:

| Pages | Same-type pairs (12 types, even split) | vs today |
|---|---|---|
| 164 (actual distribution) | **1,206** | 1x |
| 1,000 | 40,836 | 34x |
| 2,500 | 258,336 | 214x |
| 5,625 | **1,316,952** | **1,092x** |

Cost *per pair* — `cosine` at `validate.ts:162-171`:

1. iterate map `a` with a `b.get()` lookup each: ~|v| operations;
2. `mag(a)` — **materialises a fresh `[...m.values()]` array** and reduces: ~|v| ops + |v| allocations;
3. `mag(b)` — same again.

So each pair costs **~3|v| operations and ~2|v| freshly allocated array slots**. The magnitudes are
recomputed on every single comparison despite being a property of the vector alone. That is the
dominant defect, not the quadratic loop.

|v| = distinct 5-gram shingles ≈ (word count − 4). The content floor is 400 words
(`validate.ts:12,245`); a sampled `answer` page (`src/content/pages/answer.ts:11-75`) yields roughly
1,000 words through `proseSources`. I model **|v| ≈ 800**.

**Compute at 5,625 pages:** 1,316,952 pairs × 2,400 ops ≈ **3.2 billion operations**, plus
**~2.1 billion array-slot allocations**.

**Memory at 5,625 pages:** `validate.ts:249` materialises *all* vectors before the loop starts, so
they are all simultaneously live. 5,625 × 800 entries × ~110-150 bytes/entry (Map slot + a ~40-char
key string) = **~500-700 MB of live heap**.

That combination — a half-gigabyte live set plus billions of short-lived allocations — is the
worst case for a generational GC. Modelled at an effective 20-50M ops/sec under that GC pressure:
**~5-15 minutes, with real OOM risk** on Node's default old-space limit. My uncertainty here is
roughly 3x either way; what I am confident about is the *shape* (quadratic in pages, linear in
prose length, with a superlinear GC penalty once the live set passes a few hundred MB).

**Where it actually hurts.** `validate:seo` is **not wired into `build`** — `package.json:7` is a
bare `next build` with no `prebuild` hook, and `.github/workflows/deploy.yml:40-44` runs `typecheck`
and `pnpm test` but never `validate:seo`. The gate reaches CI only because `content.test.ts:11`
calls `validateContent(ALL_PAGES)` inside the vitest suite. So the quadratic cost lands on
**`pnpm test` — the 2,183-test workspace suite that runs on every push**. At 5,625 pages the
whole-repo test suite would gain 5-15 minutes. That is a developer-experience and CI-cost failure,
not a production failure.

Practical thresholds with the code as written:

- **≤1,500 pages:** ~5-12 s. Unremarkable.
- **~2,500 pages:** ~20-40 s. Noticeable; start planning the fix.
- **~3,000 pages:** ~30-60 s and ~350 MB. The fix is now overdue.
- **≥5,000 pages:** minutes, with OOM risk. Unshippable without the fix.

### 1.5 The validator fix is cheap — this is important

Three changes, none architectural, in roughly 60-100 LOC:

1. **Precompute magnitudes.** Store `{ id, type, vec, mag }` at `validate.ts:249`. This removes
   ~2/3 of per-pair operations and **100% of the array allocations** — it eliminates the GC problem
   outright. Expect ~3x on compute and a much larger win on wall clock.
2. **Bucket by type before looping.** Iterate `pairs within each type bucket` instead of all
   C(n,2) pairs with a discard test. Removes 15.8M no-op iterations at 5,625; more importantly it
   makes the actual cost visible in the code.
3. **Add a candidate prefilter.** Only compare pages that share ≥1 `tag`, or apply MinHash/LSH
   banding. Cosine ≥0.7 on 5-grams essentially requires large lexical overlap, so a tag- or
   band-based prefilter is a safe over-approximation and typically cuts candidate pairs 10-100x.

With (1) and (2) alone, 5,625 pages lands in the tens of seconds. With (3), single-digit seconds.

**Conclusion for §1: the engine's compute does not have a real 5,625-page ceiling.** It has one
concentrated, cheaply-repayable hotspot. The ceiling is elsewhere — see §4.

### 1.6 SSG build

Twelve independent `generateStaticParams` implementations, all structurally identical
(e.g. `src/app/(public)/departments/[slug]/page.tsx:9-13`). Each is O(n) over `ALL_PAGES` and
returns only its own type's slugs. Total params work is trivial.

The cost is React rendering 5,625 pages. Modelled at 10-20 pages/sec/worker with Next's default
worker pool, that is **~10-25 minutes** for the render phase, on top of webpack compile. Memory is
fine — `ALL_PAGES` is roughly 28 MB of strings at 5,625 pages, replicated per worker.

Two things I would change before scaling past ~1,000 pages:

- `next.config.js:6` sets `productionBrowserSourceMaps: true`, explicitly marked `TEMP
  (hydration-debug) ... Remove after the root cause is identified`. Shipping source maps for
  thousands of prerendered pages materially inflates build time and image size. This flag has
  outlived its debugging purpose and is now a scaling tax.
- There is no build-memory or worker configuration in `next.config.js`. At 5,000+ pages that
  usually needs explicit tuning. Not urgent below ~2,000.

Also worth noting: `getBySlug` (`registry.ts:101-103`) is a linear scan and is called **twice per
page** — once in `generateMetadata` and once in the component body (e.g.
`departments/[slug]/page.tsx:16` and `:21`). That is 2n² comparisons = 63M at 5,625 pages, roughly
one second total. Harmless, but a `Map<string, SeoPage>` index built once would remove it and would
also fix the `related.ts:55` `pool.find`.

---

## 2. Content model integrity

### 2.1 The discriminated union is the strongest part of this design

`types.ts:18-31` (closed `PageType` union) plus `types.ts:321-333` (the `SeoPage` authored union)
with per-type interfaces carrying only their own fields is exactly right. The header comment at
`types.ts:6-11` names the anti-pattern it avoids ("NO 40-field god-object") and the code honours it.
Deriving `canonical` and `breadcrumbs` rather than authoring them (`types.ts:10-11`, implemented at
`url.ts:6-8` and `jsonLd.ts:21-32`) removes an entire class of self-reference bugs. This is good
architecture and it should be preserved through any refactor.

### 2.2 Adding a 13th type: partially additive, partially shotgun

I traced every touch point required to add a type. There are **13**, and they split cleanly:

**Compile-enforced (4) — safe, TypeScript will not let you forget:**

| # | Location | Why enforced |
|---|---|---|
| 1 | `registry.ts:30` `ROUTE_PREFIX` | `Record<PageType, string>` |
| 2 | `registry.ts:47` `PARENT_HUB` | `Record<PageType, ...>` |
| 3 | `metadata.ts:9` `OG_TYPE` | `Record<PageType, ...>` |
| 4 | `types.ts:321` `SeoPage` union | union member required for authoring |

**Silently omissible (5) — nothing fails; the type just partially disappears:**

| # | Location | Failure mode if forgotten |
|---|---|---|
| 5 | `registry.ts:82-95` `ALL_PAGES` spread | pages exist, are never validated, never routed, never in sitemap — **totally invisible** |
| 6 | `sitemap.ts:7-19` `HUB_TYPES` | hub never enters the sitemap |
| 7 | `src/app/(public)/<x>/[slug]/page.tsx` | leaf URLs in sitemap, all 404 |
| 8 | `src/app/(public)/<x>/page.tsx` | hub URL in sitemap, 404 — **this is the live `/answers` defect** |
| 9 | `jsonLd.ts:144-178` switch | a new `JsonLdType` silently emits nothing; the `switch` has no `default`/`never` guard |

**Loud-ish but not enforced (1):**

| # | Location | Failure mode |
|---|---|---|
| 10 | `validate.ts:33-148` `proseSources` if/else chain | missing branch → only base fields counted → likely trips the 400-word floor at `validate.ts:245`. Fails *usually*, by luck, not by construction. A type with rich base fields could pass with its entire body unmeasured for depth and near-duplication. |

Plus 3 mechanical files (page data module, view component, and its import).

**Verdict: adding a type is ~30% compile-safe and ~70% checklist-safe.** The `Record<PageType, ...>`
maps are the right instinct, applied inconsistently. The three highest-risk omissions (#5, #6, #8)
are precisely the ones that produced the live `/answers` defect.

**The house pattern for this already exists in this repo and was not applied here.**
`src/lib/dashboard-columns/presets.ts:527-538` and `src/lib/process-graph/types/closed-unions.ts:11-12`
both use `satisfies` + `Exclude<T, U> extends never` compile-time exhaustiveness locks, and
`registry.test.ts:585-589` asserts one. The SEO content engine contains zero instances of that
pattern. Applying it to `ALL_PAGES` and `HUB_TYPES` is a handful of lines and converts two of the
three dangerous omissions into compile errors.

### 2.3 The `/answers` defect is possible **by construction** — this is the core architectural finding

**Confirmed live.** `src/app/(public)/answers/[slug]/page.tsx` exists. There is **no**
`src/app/(public)/answers/page.tsx`. Every other type in `HUB_TYPES` has its hub file. So
`/answers` is emitted into the sitemap by `sitemap.ts:7-19` and 404s.

It is worse than one bad sitemap row. The same non-existent URL is asserted in **three independent
places**:

1. `sitemap.ts:18` → `HUB_TYPES` includes `'answer'` → `/answers` enters the sitemap.
2. `registry.ts:60` → `PARENT_HUB.answer = { label: 'Answers', path: '/answers' }` → every one of
   the 8 answer pages emits a `BreadcrumbList` JSON-LD item pointing at a 404 (`jsonLd.ts:28`).
3. `jsonLd.ts:109` → `DefinedTermSet.url` = `${SITE_CONFIG.url}/answers` → the glossary's declared
   canonical home is a 404, on every answer page.

**Why the architecture makes this class inevitable:** URLs are declared as **free strings in three
separate structures** (`ROUTE_PREFIX` at `registry.ts:30-44`, `PARENT_HUB` at `registry.ts:47-62`,
`HUB_TYPES` at `sitemap.ts:7-19`), while route existence is a **filesystem fact** that TypeScript
cannot observe. There is nothing in the type system, the validator, or the test suite that compares
the set of emitted URLs against the set of resolvable routes. The engine is free to emit any string
it likes into the sitemap and into structured data.

The inverse drift is also live and confirms the diagnosis is bidirectional: `/comparisons` and
`/methodology` both exist as real pages (`src/app/(public)/comparisons/page.tsx`,
`src/app/(public)/methodology/page.tsx`) and appear in **neither** the static list nor the engine
output — real content, absent from the sitemap.

**The gap in the test suite is the root cause.** `content.test.ts` never touches
`generateSeoSitemapEntries`. Not one assertion covers the sitemap. A single test asserting that
every sitemap path resolves to a route file would have caught all three instances at once.

### 2.4 Reserved-slug carve-out: fragile, and currently load-bearing on only one entry

Three concrete problems.

**(a) The `/use-cases` entry is dead by construction.** `RESERVED_SLUGS` is keyed by route prefix
(`registry.ts:68`) and `isReservedSlug` looks up `RESERVED_SLUGS[ROUTE_PREFIX[type]]`
(`registry.ts:77`). For `persona`, `ROUTE_PREFIX` is `/use-cases/personas`; for `problem` it is
`/use-cases/problems`. Neither equals the `/use-cases` key at `registry.ts:73`. That set can never
match. The comment at `registry.ts:71-73` says this is deliberate ("Declared here for documentation
only") — which I accept, but a documentation-only entry sitting inside a live enforcement structure
is a trap for the next author, who will reasonably assume adding a key there protects something.

**(b) Enforcement is applied to only 4 of 12 routes.** `isReservedSlug` appears in
`generateStaticParams` for `answers/[slug]:11`, `compare/[slug]:11`, `workflow-library/[slug]:11`,
and `software/[slug]:11`. It is **absent** from `ai-opportunities`, `alternatives`, `competitors`,
`sop-templates`, `industries`, `departments`, `use-cases/problems`, and `use-cases/personas` — all
at `:10-12` of their respective `page.tsx`. Twelve near-identical copies with two behaviours is a
textbook shotgun surface.

**(c) The net safety today is real but accidental.** `validate.ts:192` errors if any page claims a
reserved slug, so a collision is caught — but only if the validator runs, and the validator reaches
CI solely through `content.test.ts` (§1.4). And it currently protects exactly **one** slug,
`/compare/scribe`. The mechanism is untested at any interesting scale.

The structurally correct fix is to invert ownership: derive the reserved set from the filesystem
(any `page.tsx` that is not `[slug]` under a type's prefix is reserved) rather than maintaining a
parallel hand-written list. That also fixes §2.3, because the same route-manifest derivation answers
both "does this URL exist" and "is this slug taken."

---

## 3. Determinism

### 3.1 The generators are genuinely pure

I found **no** `Date.now()`, `new Date()`, `Math.random()`, or I/O in `metadata.ts`, `jsonLd.ts`,
`url.ts`, `related.ts`, or `sitemap.ts`. `updatedAt` is authored data (`types.ts:118`) and flows
through as a literal (`jsonLd.ts:44-45,73-74`; `sitemap.ts:50`). Output is a pure function of the
content objects plus `SITE_CONFIG`. Key ordering is fixed by object-literal order, so
`JSON.stringify` is byte-stable. **The design is correct.**

Two residual hazards:

- `related.ts:67` `localeCompare` — locale-sensitive ordering, dormant only because slugs are
  ASCII-validated. See §1.3.
- `jsonLd.ts:144-178` — the `switch` on `JsonLdType` has no exhaustiveness guard, so a future union
  member emits nothing rather than failing. Silent, not non-deterministic, but the same family of
  problem.

### 3.2 The determinism tests are substantially weaker than they appear

`content.test.ts:29-57` has three tests. Assessed honestly:

**Test 1 & 2 (`generateSeoMetadata` / `generateJsonLd` byte-identical across calls,
`content.test.ts:30-44`).** These call the function twice **in the same process with the same
input** and compare. That proves referential transparency within a single process. It does **not**
prove byte-stability across builds, across machines, across Node versions, or across refactors.
There is no golden snapshot anywhere. A refactor that changes every emitted JSON-LD key order would
pass both tests green. For an engine whose output is consumed by crawlers and diffed across
deploys, **snapshot tests are the assertion that matters and they do not exist.**

**Test 3 (`getRelatedPages` never self-links, `content.test.ts:46-56`) is vacuous for 10 of 12
types.** The assertion is:

```
expect(r.path).not.toBe(`/${p.type}/${p.slug}`);
```

But `r.path` is built from `ROUTE_PREFIX` (`related.ts:23,31-33`), not from the raw type name. For
`workflow` the real path is `/workflow-library/<slug>` while the assertion tests against
`/workflow/<slug>` — a string that can never be produced. Same for `answer` (`/answers` vs
`/answer`), `sopTemplate`, `aiOpportunity`, `department`, `industry`, `persona`, `problem`,
`alternatives`, `competitors`. Only `compare` and `software` happen to have `ROUTE_PREFIX ===
'/' + type`, so only those two types are actually tested. The self-link property *is* correctly
implemented (`related.ts:46` seeds the `seen` set with self), so there is no live bug — but the
test guarding it is inoperative for 83% of types and would not catch a regression.

**Coverage gaps, ranked:**

1. **Zero sitemap tests.** No assertion that emitted URLs resolve. Root cause of §2.3.
2. **Zero snapshot tests.** Cross-build byte-stability is asserted nowhere.
3. **Near-duplicate detection is never directly tested.** `validate.ts:249-259` is only exercised
   transitively by "current content produces zero errors." No test proves a known-duplicate pair is
   *detected*. The gate's sensitivity is unverified.
4. **`getRelatedPages` `limit` and ordering-stability semantics untested.**
5. **Determinism tests cover 3 of 6 lib modules** — `validate.ts` and `sitemap.ts` have none.

**Verdict: determinism is achieved by construction and asserted by accident.** The implementation
is better than its tests.

---

## 4. Authoring cost curve — the actual ceiling

Every page must carry, hand-authored:

- `originalDataPoint` — "≥1 real Ledgerium-sourced fact. Required for a page to be published"
  (`types.ts:98-99`), blocking at `validate.ts:212`;
- `honestLimitation` — one real product constraint (`types.ts:111-112`), blocking at `validate.ts:213`;
- `mechanismIntro` — one sentence, **globally unique**, enforced at `validate.ts:216-222`;
- `keyTakeaways` — 3-5 standalone sentences, ≤60 words each (`validate.ts:223-232`);
- 3-10 FAQs (`validate.ts:210`), ≥400 words of body prose (`validate.ts:245`), and pairwise cosine
  <0.7 against every same-type sibling (`validate.ts:256`).

**At 5,625 pages this is a demand for 5,625 distinct, defensible, Ledgerium-sourced facts and 5,625
distinct honest product limitations.**

I do not believe that supply exists, and I want to be precise about why rather than hand-waving.
The limitations are the sharper constraint: Ledgerium has a bounded number of *genuine* product
constraints — browser-only capture, no native desktop apps, no paper steps, and so on. The sampled
pages already reuse that same small set with varied phrasing
(`src/content/pages/answer.ts:37-38` and `:102-103` are two rewordings of the browser-only limit).
At 164 pages that is honest. At 5,625, `honestLimitation` degenerates into a paraphrase generator
for perhaps a dozen underlying truths.

`originalDataPoint` is worse, because it makes a claim about the world. Both sampled values
(`answer.ts:26-27`, `answer.ts:92-93`) are qualitative assertions about aggregate recording
behaviour, not traceable computed figures. They are plausible. They are also **unverifiable by the
system** — nothing links them to a query, a dataset, or a run.

### 4.1 The validator cannot detect the failure mode it exists to prevent

This is the crux. The gate enforces **presence** (non-empty string) and **lexical distance**
(cosine on 5-gram shingles). It cannot enforce **truth** or **substantive novelty**.

A 5-gram cosine of 0.7 requires heavy verbatim phrase overlap. Two pages can be 100% substantively
identical — same claim, same structure, same underlying fact — and score cosine ~0.2 with routine
paraphrase. The `NEAR_DUP_WARN = 0.5` warning tier (`validate.ts:11`) is non-blocking. **Any
competent paraphrase, human or model, defeats this gate trivially.**

So as `n` grows, the quality gate silently changes meaning:

- at 164 pages: "is this page substantively different?" — plausibly true, because a human authored
  each fact and would notice repeating themselves;
- at 5,625 pages: "is this page **differently worded**?" — which is precisely the property that
  scaled-content generation optimises for.

### 4.2 Scaled-content-abuse exposure

Google's March 2024 spam policy defines scaled content abuse as generating many pages primarily to
manipulate rankings, **explicitly regardless of whether production was automated or human**. The
policy's tests are purpose and value-add, not method. Two consequences:

1. **"We wrote it with an LLM but a human reviewed it" is not a defence.** The relevant question is
   whether each page adds value a user could not get elsewhere. `originalDataPoint` is exactly the
   right instinct — it is the value-add — but only while each one is genuinely distinct and true.
2. **Enforcement is cluster-level.** Helpful-Content-style demotion is applied site-wide or
   section-wide. 4,000 thin pages do not merely fail to rank; they can drag down the 164 good ones.
   **The marginal page has negative expected value once the fact supply is exhausted.**

The project's own review recognises this — `SEO_AEO_SUPERPROMPT_REVIEW_001.md:114` states "A thin
generated URL is *negative* coverage (cluster-level Helpful-Content demotion risk)." The
architecture, however, provides no mechanism that enforces that judgement. It enforces string
length and lexical distance.

### 4.3 The stated target has no matching authoring plan

- `SEO_AEO_SUPERPROMPT_REVIEW_001.md:119` — "~300-500/tranche ... toward ~5,625 over 9-12 months."
- `SEO_AEO_SUPERPROMPT_V2.md:165` — same figure.
- But the **live roadmap** plans Batch 1 = 20 new pages, Batch 2 = 25-30, Batch 3 = 25, Batch 4 =
  40-50 (`SEO_AEO_EXPANSION_001/roadmap.md:18,24,30,36`). That is **~110-125 pages across four
  batches**, landing near 290 total.

The operational plan is running at roughly one-twentieth of the aspirational rate. That is not a
criticism of the roadmap — the roadmap is realistic and gated on indexation evidence
(`roadmap.md:28`). It is evidence that **5,625 is an aspiration nobody has costed.**

Reaching it on the stated 9-12 month timeline requires ~470-625 pages/month, each with a unique
verified fact. That is not achievable by human authoring. It is achievable only with LLM
generation — at which point `originalDataPoint` becomes model-generated, and the one property
that makes these pages defensible under §4.2 becomes the one property most likely to be
fabricated. **The architecture, at 5,625, converts its own quality moat into its largest
hallucination surface.**

### 4.4 The move that would make a large number defensible

`originalDataPoint` should be **derived, not authored** — computed from the live recorded-workflow
corpus with a traceable query, a run identifier, and a computation date, rather than typed by hand.
That is the only version of this strategy that scales honestly, and it is squarely aligned with
`CLAUDE.md`'s own principles ("Every output traceable to source events", "Evidence before
interpretation"). Concretely, `originalDataPoint: string` would become something like
`{ claim: string; metricKey: string; computedAt: string; sourceQuery: string; n: number }`, and the
validator would gain a real check: *does this fact resolve to a computation over real data?*

That is a genuine architectural extension, not a tweak. It is also the only thing I would accept as
justification for raising the page cap materially. **Until it exists, page count is bounded by
human fact supply, not by compute.**

---

## 5. Coupling between the public SEO surface and the authed app

### 5.1 The `/workflow-library` reconciliation is sound

`registry.ts:25-28` documents it precisely: the authed app owns `/workflows/[id]`
(`src/app/(app)/workflows/[id]/page.tsx`), Next.js forbids two parallel dynamic segments at one
path, so SEO workflow pages live at `/workflow-library/[slug]`. The rationale is recorded at the
point of the decision, and the chosen name independently matches the product's "workflow library"
concept rather than being an awkward workaround. **This is good engineering and it is not fragile.**

### 5.2 `/compare` is the actual coupling risk

This one is genuinely shared:

- authed: `src/app/(app)/compare/page.tsx` and `src/app/(app)/compare/diff/page.tsx`;
- public: `src/app/(public)/compare/[slug]/page.tsx` (engine) **and** `src/app/(public)/compare/scribe/page.tsx`
  (hand-built);
- reserved: `registry.ts:69` protects only `scribe`;
- and `PARENT_HUB.compare = null` with the comment "the authed app owns `/compare`"
  (`registry.ts:56-57`), which is why `compare` is excluded from `HUB_TYPES` (`sitemap.ts:7-19`).

So one URL segment is claimed by two route groups and three page kinds, and the arbitration lives
in a hand-maintained `Set` of one string. The observable consequences today:

- `compare` pages have a truncated breadcrumb (Home → page, no hub) — a minor structured-data
  weakness on the highest-priority page type (`sitemap.ts:52` assigns compare `priority: 0.8`);
- the public comparison hub was built at `/comparisons` instead (`src/app/(public)/comparisons/page.tsx`),
  which is a reasonable workaround but is **absent from the sitemap entirely** (§2.3);
- any future authed route added under `/compare/<something>` will silently shadow or be shadowed
  depending on route-group resolution, with `RESERVED_SLUGS` offering no protection unless someone
  remembers to update it.

The blast radius is currently small. It grows with every `compare` page added, and `compare` is a
high-value type. I would not call this urgent, but I would call it the one place where the public
and authed surfaces can break each other, and I would resolve it by moving the authed comparison
tool under an unambiguous authed-only prefix rather than by extending `RESERVED_SLUGS`.

### 5.3 Route-group isolation is otherwise correct

Every other engine prefix (`/software`, `/industries`, `/departments`, `/sop-templates`,
`/ai-opportunities`, `/alternatives`, `/competitors`, `/answers`, `/use-cases/*`) is uncontested by
`(app)`. `/use-cases/operations|compliance|ai-implementation` are leaf pages at a different segment
depth than `/use-cases/personas|problems`, so they genuinely cannot collide — correctly reasoned at
`registry.ts:71-73`.

---

## 6. Recommendation

### 6.1 Verdict: **extend, then cap at 1,500 published pages**

Not refactor — the content model is sound and a rewrite would destroy a working discriminated union
to fix problems that are localised. Not uncapped extension — the constraint is content supply, not
code.

**Hard cap: 1,500 published pages. Review gate at 750.**

### 6.2 Why 1,500

**Compute headroom, with no forced refactor.** At 1,500 the validator does ~93,000 same-type
comparisons — modelled at 5-12 s, absorbed by the test suite without complaint. SSG lands around
2-5 minutes. The sitemap is at 3% of Google's URL limit. Nothing in §1 binds. (I would still do the
§1.5 fixes — they are cheap — but 1,500 does not *require* them, so the cap is not hostage to
engineering work.)

**It is ~9x current, and reachable at the roadmap's real velocity.** `roadmap.md:18-36` ships
20-50 pages/batch; `SUPERPROMPT_V2.md:165` targets 300-500/tranche. Three to four tranches at the
documented rate reaches ~1,500. **This is the largest number the organisation has an actual plan
to author.**

**It is at the outer edge of honest fact supply.** 1,500 distinct `originalDataPoint`s from a real
recorded-workflow corpus plus genuine research is demanding but conceivable. 5,625 is not, and
`honestLimitation` exhausts its underlying truth set far earlier — probably by 500-800 pages, at
which point the field becomes paraphrase and should be re-designed (§4.4) rather than replicated.

**It keeps the cluster-level risk bounded.** Under §4.2, the downside of over-shooting is not
"pages don't rank" but "the whole section is demoted." 1,500 is well inside the range where each
page can still be defended individually if Google asks.

**Why not 750 as the cap?** Too conservative given the roadmap already has ~290 pages planned and
the compute is nowhere near stressed; it would cap growth for reasons that are not real.
**Why not 3,000?** That crosses the validator threshold (forcing the refactor), roughly triples SSG
build time, and — decisively — exceeds any credible estimate of distinct-fact supply. The extra
1,500 pages would be paraphrase, which is negative-value under §4.2.

### 6.3 The 750-page gate

At 750 published pages, hold and produce evidence before continuing:

1. **Indexation.** ≥80% of the most recent batch indexed within 14 days, and <30% zero-impression
   at week 6 — the project's own gate at `roadmap.md:28`. If either fails, the cap drops to the
   current count; more pages will not fix an indexation problem.
2. **Fact-supply audit.** Sample 50 `originalDataPoint`s. What fraction are traceable to real data
   versus plausible-sounding prose? If under ~70%, stop and build §4.4 before authoring more.
3. **Limitation entropy.** Count distinct underlying constraints across all `honestLimitation`
   values. If 750 pages map to fewer than ~25 real constraints, the field has become decorative and
   should be redesigned.

### 6.4 Raising the cap above 1,500

One condition, and it is not negotiable: **`originalDataPoint` must become derived and traceable**
per §4.4 — computed from the recorded-workflow corpus with a query, an `n`, and a computation date,
verifiable by the validator. That converts the fact supply from human-bounded to data-bounded and
is the only mechanism that makes a four-figure page count defensible under Google's scaled-content
policy. Absent it, 5,625 should be formally retired as a target rather than left standing as an
uncosted aspiration.

### 6.5 Sequenced engineering work

**Now — correctness (small, independently shippable):**

1. Create `src/app/(public)/answers/page.tsx`. One missing file currently produces a 404 in the
   sitemap, a broken breadcrumb on 8 pages, and a broken `DefinedTermSet.url` on 8 pages (§2.3).
2. Add a test asserting every `generateSeoSitemapEntries()` path resolves to a route file. This is
   the assertion whose absence allowed #1, and it closes the class, not the instance.
3. Add `/comparisons` and `/methodology` to the static sitemap entries (`src/app/sitemap.ts:9-57`).
4. Fix the vacuous self-link assertion at `content.test.ts:53` — compare against
   `ROUTE_PREFIX[p.type] + '/' + p.slug`. It currently tests 2 of 12 types.

**Before ~750 pages — integrity:**

5. Add `satisfies` / `Exclude<..> extends never` exhaustiveness locks over `ALL_PAGES`
   (`registry.ts:82`) and `HUB_TYPES` (`sitemap.ts:7`), matching the existing house pattern at
   `presets.ts:527-538`. Converts the two most dangerous silent omissions into compile errors (§2.2).
6. Apply `isReservedSlug` uniformly across all 12 `generateStaticParams`, or better, derive the
   reserved set from the route manifest and delete the hand-written list (§2.4).
7. Add golden snapshot tests for `generateSeoMetadata` and `generateJsonLd`. Determinism is
   currently asserted only within a single process (§3.2).
8. Wire `validate:seo` into CI explicitly (`deploy.yml:40-44`) rather than relying on it running
   incidentally inside the vitest suite.
9. Replace `localeCompare` at `related.ts:67` with `<`; add a `never` guard to the `jsonLd.ts:144`
   switch.

**Before ~1,500 pages — performance:**

10. The §1.5 validator fixes: precompute magnitudes, bucket by type, add a tag-based candidate
    prefilter. ~100 LOC; removes the only hard scale wall in the system.
11. Remove `productionBrowserSourceMaps: true` (`next.config.js:6`) — already marked `TEMP`.
12. Build a `Map`-based slug index in the registry to replace the linear scans at
    `registry.ts:98,102` and `related.ts:55`.

**Deferred until the cap is challenged:** sitemap-index splitting (not needed below ~45,000 URLs),
hub pagination (`HubIndex.tsx:60-70` renders every page of a type unpaginated — fine below ~200
per type, worth revisiting above), and the §4.4 derived-fact redesign.

---

## 7. Open questions for the coordinator

1. **Is 5,625 a live commitment or a retired aspiration?** The roadmap plans ~290. The answer
   determines whether §4.4 is urgent architectural work or a non-issue.
2. **Who owns `/compare`?** Public engine, hand-built page, and authed tool all claim it, arbitrated
   by a one-element `Set` (§5.2).
3. **Should `validate:seo` block `next build`?** Today the gate reaches CI only via the test suite
   (§1.4). That is a coincidence, not a design.
4. **Is a 13th page type planned?** `roadmap.md:39` raises a `feature`/`product` type as a Batch-4
   open question. If yes, do the §6.5 item 5 exhaustiveness locks **first** — a new type added today
   has five silent-omission paths, and one of them is exactly how `/answers` broke.
