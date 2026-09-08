# SEO / AEO Content Strategy — Resolving the Expansion Tension

**Author:** seo-aeo agent
**Date:** 2026-09-08
**Question posed:** the CEO wants more content by use case, role, department and industry. `GROWTH_REVIEW_001/seo_aeo.md` (2026-09-02) says stop publishing. Resolve the tension technically and honestly.
**Evidence base:** direct source read of `apps/web-app/src` on 2026-09-08 (every `file:line` below was opened, not recalled); CEO-supplied GSC figures for the trailing 3 months; `docs/meta/GROWTH_REVIEW_001/seo_aeo.md` as REPORTED prior art, not re-litigated.

**Label key:** VERIFIED = read in source today · REPORTED = from a prior artifact · REASONED = inference from verified facts · MODELLED = arithmetic with assumptions stated inline.

---

## 0. The resolution, before the analysis

The prior review and the CEO are not actually in conflict, because they are talking about different things.

The CEO's ask is **already structurally satisfied**. Role, department, industry and use-case axes all exist and are fully populated: `persona` 16, `department` 9, `industry` 9, `workflow` 24, `problem` 22 (VERIFIED — type counts over `content/pages/*.ts` reconcile to 164). Every one of those pages sits at an average position of 44. **The corpus does not have a coverage problem. It has a position problem, and a fifth axis does not change position.**

So the honest answer is not "publish more" and not "publish nothing." It is:

> **The binding constraint is off-page. On-page has exactly two things left worth doing, and both are things that make the site *linkable* rather than things that make it *optimised*.** Everything else on-page is finished, and the intersection axis is the 5,625-page treadmill wearing a disguise — with one narrow, evidence-gated exception.

Those two items are internal-link redistribution (§1.2) and converting the one cluster that has ever ranked into an actual takeaway artifact (§3). The second doubles as the only linkable asset the site could build in code — which is where "more content" and "stop publishing" genuinely reconcile.

---

## 1. Q1 — What on-page still has real marginal return?

Sub-area by sub-area, ruthlessly.

| Sub-area | Marginal return | Basis |
|---|---|---|
| Titles / descriptions / keywords | **Nothing** | Length + uniqueness gate-enforced, `validate.ts:203-205`. Position 44 means nobody sees them. |
| Canonicals | **Nothing** | `metadata.ts:37` sets `alternates.canonical` for all registry pages; `canonicalCoverage.test.ts` walks `(public)` for hand-built pages and includes a negative-control test proving the guard can fail. |
| Sitemap | **Nothing** | Derived (`lib/seo/sitemap.ts:36-54`), parity-tested (`sitemap.test.ts`). Note `priority`/`changeFrequency` are ignored by Google — do not tune them. |
| Robots | **Nothing** | `app/robots.ts` — `/api/`, `/dashboard/`, `/settings/`, `/share/` disallowed; AI crawlers allowed under `*`. Correct. |
| Structured-data breadth | **Nothing** | Organization/WebSite `@id` graph, BreadcrumbList, FAQPage, Article, SoftwareApplication, DefinedTerm, Speakable all present. More types is theatre. Two *correctness* defects remain — §2. |
| `llms.txt` | **Near-nothing** | Two residuals, §1.3. |
| og:image | **Near-nothing** | All 164 pages share `/img/demo/dashboard.png` (`metadata.ts:6`). Zero ranking value; slight value in AI/social card rendering. |
| **Internal linking** | **REAL — the one exception** | §1.2 |
| **`searchIntent` as a decision field** | **REAL, but as replacement** | §1.1 |

### 1.1 `searchIntent` is non-diagnostic, and that matters for the expansion decision

This sharpens the prior review rather than contradicting it.

VERIFIED intent distribution by type:

```
sop-template    commercial=17  informational=0
alternatives    commercial=15  informational=0
problem         commercial=0   informational=22
answer          commercial=0   informational=8
```

The prior review's framing — "82% commercial is the wrong query class" (REPORTED, §1.1) — is directionally right but **cannot be operationalised through this field**, because the corpus's best and worst performers are both declared `commercial`:

- `sopTemplate:vendor-setup-sop-template` — `searchIntent: 'commercial'` (VERIFIED, `content/pages/sop-template.ts:507`) — position **5.0**.
- `alternatives:*` — also `searchIntent: 'commercial'` — position **74** (REPORTED, GSC).

**REASONED:** the discriminating variable is query specificity and competition density, and **the content model records neither.** No field in `BasePage` (`content/types.ts:78-118`) would let anyone predict, before authoring, whether a new page is winnable at this domain authority. That is the real reason 164 pages could be produced without anyone noticing they were unwinnable — not a missing gate, but a missing *variable*.

For the expansion question this is decisive: **you cannot currently author a page and know whether it is a vendor-setup page or a scribe-alternative page.** Fixing that is a prerequisite to any expansion (§5.6).

### 1.2 Internal linking — the one on-page lever with genuine marginal return

Internal links are the **only link equity the site controls.** With ~0 referring domains (REPORTED), the internal graph is not a minor factor — it is the entire distribution mechanism for whatever authority exists.

VERIFIED by direct computation over the `related` token graph in `content/pages/*.ts` (164 nodes):

```
pages parsed:            164
zero contextual inbound:  58   (35%)
inbound distribution:    {0:58, 1:33, 2:15, 3:12, 4:11, 5:5, 6:10, ... 29:1}
orphans by type: alternatives 15, competitors 7, industry 7, department 6,
                 sopTemplate 6, workflow 6, software 5, compare 4, aiOpportunity 2
```

Three findings fall out.

**(a) 35% of the corpus has no contextual inbound link.** Those pages are reachable only from a flat hub list (`HubIndex.tsx:60`) and the sitemap. A flat sibling list distributes materially less than an in-body contextual anchor. *All 15* `alternatives` pages are in this set — defensible, since they are the class that cannot win anyway. But **6 of 17 `sopTemplate` pages are also in it**, and that is the one cluster with a demonstrated page-1 result.

**(b) The tag-overlap fallback is dead code in production.** `related.ts:63-75` scores tag overlap to fill up to `limit = 3` links. VERIFIED: 159 of 164 pages already declare exactly 3 curated `related` tokens (one declares 2). The fill loop therefore never executes. The system has an automatic orphan-remediation mechanism that is structurally unreachable — raising `limit` to 5 activates it immediately at zero authoring cost.

**(c) `compare` pages have no breadcrumb hub.** `PARENT_HUB.compare = null` (`registry.ts:59`) with the comment "No public /compare hub" — but `/comparisons/page.tsx:41-44` **is** a functioning hub listing every compare page. The IA has a hub the breadcrumb graph denies. Combined with (a), the 4 orphaned compare pages have neither contextual inbound links nor a declared parent.

**REASONED value:** this will not move position 44 on its own — nothing on-page will. Its value is that when authority does arrive, it lands in a graph that concentrates it on pages that can convert it, rather than spreading it uniformly across 15 alternatives pages that cannot. A few hours of work, and the only on-page item I would defend spending them on.

### 1.3 Two small `llms.txt` residuals

**(a) Fixed, but re-breakable.** The pricing line now correctly lists Free / Starter $49 / Solo $89 and explicitly names Team and Growth as waitlist-only (VERIFIED, `app/llms.txt/route.ts:42`, with a good explanatory comment). Commit `37f37e2` closed prior FINDING A. **But it is still a hard-coded string, not derived from `plans.ts`** — it drifted once and the mechanism that allowed it is unchanged.

**(b) 25 published pages are silently absent.** `TYPE_ORDER` (`llms.txt/route.ts:12-23`) enumerates 10 of 12 authored types. `alternatives` (15) and `competitors` (10) are omitted with no stated rationale. **REASONED:** probably a defensible editorial choice — those are the unwinnable pages — but an undocumented omission in a generated file is indistinguishable from a bug. One comment resolves it.

### 1.4 Latent defects, one line each

- `/comparisons/page.tsx:41` — `getPagesByType('compare')` **without** `.filter((p) => p.published)`. Every other hub filters (VERIFIED across all 12 hub routes). Currently harmless — zero `published: false` records exist (VERIFIED) — but it is a hole in the indexability gate.
- `app/(public)/about/page.tsx:274` — "1,393 tests passing" as a public trust stat, against 2,183 in `CLAUDE.md`. Trust hygiene, not SEO.

**Verdict on Q1:** internal-link redistribution, and replacing `searchIntent` with a field that actually predicts winnability. Everything else on-page: **nothing.**

---

## 2. Q2 — Entity architecture: minimum path from "not resolvable" to "citable"

### 2.1 The type error, precisely

`lib/seo/jsonLd.ts:63-69` (VERIFIED):

```js
author: {
  '@type': 'Person',
  name: page.author.name,                       // 'Ledgerium Research Team' x 164
  ...(page.author.sameAs ? { sameAs: page.author.sameAs } : {}),
}
```

with `PageAuthor` = `{ name, sameAs? }` (`content/types.ts:70-73`), and all 164 records carrying `sameAs: ['https://www.linkedin.com/company/ledgerium-ai']` (VERIFIED, 164/164).

Two distinct errors compound:

1. **`Person.name` is not a person.** "Ledgerium Research Team" is a collective noun. No knowledge graph can resolve it to an individual.
2. **`Person.sameAs` points at an Organization.** `sameAs` asserts *entity identity*. This declares that a Person **is** the LinkedIn company page. A consumer either discards the node as malformed or, worse, merges the Person and Organization entities. It is the one assertion in the corpus that is not merely weak but **actively wrong**, repeated 164 times.

The visible layer agrees with the structured layer — `Blocks.tsx:77` renders the byline "By Ledgerium Research Team" on every page. They are consistently wrong together.

**Compounding fact (VERIFIED):** `app/(public)/about/page.tsx:253` has a section commented `{/* Founder / Company */}` that **names no human**. There is exactly one `'@type': 'Person'` in the entire codebase — the broken one. Site-wide, there is no named human.

### 2.2 The concrete minimum path

**Tier 1 — necessary, and cannot be done in code.** Entity resolution requires *independent corroboration*. `organization.ts:66` ships exactly one `sameAs`, and the comments at `:51-64` document a careful, honest investigation that correctly declined to add unverified profiles (GitHub resolved to an unrelated company; Crunchbase/G2/ProductHunt 403'd; X handles 404'd). That work was right. Its outcome is unchanged: one self-declared profile is not corroboration. **No schema.org change substitutes for this.** REPORTED: the 2018 LGUM ICO has more corroborating references than the company.

**Tier 2 — real, cheap, enabling (~3-4 hours; a precondition for §5).**

1. **Name a human.** Replace `'Ledgerium Research Team'`. `PageAuthor` is centralised; this is a constant plus a find-replace.
2. **Fix the type error.** `Person.sameAs` → that person's own LinkedIn. Add `worksFor: { '@id': SITE_ORGANIZATION_ID }` — the *correct* way to express the relationship the current `sameAs` is abusing. `Article.publisher` already references the Organization by `@id` correctly (`jsonLd.ts:71`), so the pattern is established in-file.
3. **Give the person an `@id` and a page.** Add a `Person` node with a stable `@id` (e.g. `${SITE_CONFIG.url}/about#person`) on `/about`, and have every `Article.author` reference it **by `@id`** rather than restating a string 164 times. This is exactly the discipline `organization.ts` already applies to the Organization node, and `organizationEntity.test.ts` already contains assertions of that shape to copy.
4. **Close the loop:** `Organization.founder → Person @id`. Bidirectional linkage is what makes a node resolvable rather than merely present.

**Tier 3 — theatre. Do not do.**

- More `knowsAbout` terms — self-declared, unweighted.
- `AggregateRating` / `Review` — no reviews exist. Fabrication, and a structured-data policy violation.
- More `sameAs` entries to unverified profiles — `organization.ts:51-64` already correctly refused this. Do not undo it.
- Additional schema types (`Course`, `Event`, further `HowTo` expansion).
- Attempting a Wikidata/Wikipedia entry at current notability — it will be deleted, and self-creation is a policy breach.

**One genuine correctness item:** `jsonLd.ts:83` emits `offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }` on every `SoftwareApplication`. A free tier does exist (5 workflows/mo), so this is defensible rather than false — but an `AggregateOffer` with `lowPrice: 0` / `highPrice: 89` describes the product accurately and costs one edit.

**Honest summary:** Tier 2 makes the entity *machine-legible* and stops the site emitting a contradiction at scale. It does **not** by itself produce citations. Tier 1 does, and Tier 1 is not engineering. The reason to do Tier 2 anyway is that it is a precondition — shipping more pages under a non-resolvable, type-erroneous author multiplies a known defect by the page count.

---

## 3. Q3 — The transactional gap, and why it is the reconciliation

### 3.1 The gap, made concrete on the one page that ranks

VERIFIED, `content/pages/sop-template.ts:498-508`:

```
slug:            'vendor-setup-sop-template'
metaTitle:       'Vendor Setup SOP Template (Editable)'
metaDescription: 'A free, editable vendor setup SOP template with roles, steps,
                  and approvals. ...'
searchIntent:    'commercial'
```

This page ranks **position 5.0** (REPORTED, GSC — n=1 impression, stated plainly). Its title says *Editable*. Its description says *free, editable*.

VERIFIED: **there is no editable artifact.** Across all 18 components in `components/seo/`, the complete set of literal outbound links is `/product` ×3, `/` ×2, `/methodology`, `/ai-opportunities`, plus three template-literal links to related registry pages. Adding the shared CTA blocks: `SIGNUP = '/signup'`, `DEMO = '/demo'`, `PRICING = '/pricing'` (`Blocks.tsx:13-15`, consumed by `SeoHero`/`MidCta`/`FinalCta`). **There is no download, no copy-to-clipboard, no .docx, no Google Docs link, and no email capture anywhere on the public site.**

And `sopSections` — the field a reader would assume is the template — renders as a **description grid** headed "What this SOP covers" (`SopTemplatePageView.tsx:167-176`): prose *about* an SOP, not an SOP.

**REASONED:** the site ranks #5 for a transactional query, promises a free editable template, and delivers an account-signup CTA. That is an intent-fulfilment failure, and it is the most concrete thing wrong with the only cluster that has ever worked.

### 3.2 Transactional query classes that genuinely exist in this category

REASONED from the corpus's own `primaryKeyword` / `secondaryKeywords` fields and category structure. **No volumes are asserted — no keyword tooling is available and none were fabricated.**

| Class | Shape | Existing coverage |
|---|---|---|
| Artifact acquisition | `<process> SOP template download`, `free <process> SOP template` | Ranks; fulfils nothing |
| Format-qualified | `SOP template Word / Google Docs / Excel / PDF` | None |
| Checklist variant | `<process> checklist template` | None |
| Tool-scoped documentation | `how to document a <tool> workflow`, `<tool> process documentation` | 16 `software` pages, all `commercial`, no artifact |
| Free-tool intent | `free SOP generator`, `process documentation tool free` | None |
| Install intent | `chrome extension to record process` | Routes to a Developer-mode sideload — `config.ts:16` is still `.../placeholder` (VERIFIED) |

### 3.3 How a transactional page must differ structurally

Not a copy change — a different page contract:

| | Existing commercial page | Transactional page |
|---|---|---|
| Primary content | Prose *about* the topic | **The artifact itself**, above the fold |
| User's job | Never completed on-page | Completed on-page, unconditionally |
| Gate | Signup CTA ×3 | **No email wall, no signup wall** |
| CTA role | Price of admission | The *upgrade*: "or record the real process and get it filled in" |
| Schema | `Article` + `HowTo` | `+ DigitalDocument`/`CreativeWork` with `encodingFormat`, `isAccessibleForFree: true`. Keep `HowTo` — `jsonLd.ts:109` already derives it correctly from `exampleProcedure`. |
| Content model | `sopSections` (descriptive) | **New field required** — the SOP body as copyable text. `sopSections` cannot serve this; it is authored as description. |

### 3.4 Why this is the reconciliation, not just a conversion fix

**REASONED, and this is the load-bearing argument of the report:**

A genuinely free, genuinely useful, genuinely downloadable SOP template is **the only page class on this site that anyone would ever link to.** Ops bloggers, procurement newsletters, r/ops threads and "best SOP resources" roundups link to free templates. **Nobody has ever linked to a "Scribe alternative" page.**

The prior review's #1 constraint is referring domains, and its ranked plan (REPORTED §5.1-5.5) is entirely non-engineering — which is precisely why, on its own evidence (§3.2: "this team executes code"), it did not get executed. **The transactional artifact is the one item that is simultaneously (a) shippable in code by a team that ships code, and (b) directly serving the off-page constraint.**

That is how "publish more" and "stop publishing" reconcile: **stop publishing pages that argue; ship a small number of pages that give something away.** The unit of work is not a page — it is a linkable asset. And the right first candidates are the 17 SOP templates that already exist, which need enrichment, not net-new pages at all.

---

## 4. Q4 — The intersection thesis

**Position: reject it as an axis. Permit a handful of evidence-backed instances.**

### 4.1 The decisive technical argument — cannibalisation is structurally invisible to the gate

VERIFIED, `lib/seo/validate.ts:254`:

```js
if (!a || !b || a.type !== b.type) continue;
```

Near-duplicate detection compares pages **only within the same type.** An intersection page ("invoice approval SOP for insurance claims") would be a new type — and would therefore **never** be compared against `industry:insurance`, `department:finance`, or `sopTemplate:invoice-approval-sop-template`, the three pages it is definitionally the conjunction of.

The gate would report clean while manufacturing exactly the duplication it exists to prevent. **This is not hypothetical: it is the single most likely failure mode of the CEO's proposal, and the existing safeguard is blind to it by construction.**

Compounding: **there is no `primaryKeyword` uniqueness or overlap check at all.** `validate.ts` enforces uniqueness on `metaTitle` (:200), `metaDescription` (:202), `mechanismIntro` (:219) and slug (:195) — VERIFIED, `primaryKeyword` appears nowhere in the file. Today all 164 `primaryKeyword` values happen to be distinct (VERIFIED) — that is authoring discipline, not enforcement. Intersections are precisely where keyword overlap becomes near-certain, and precisely there that nothing is watching.

### 4.2 Thin content — the self-refutation risk

Word floor is 400 (`validate.ts:12`). Existing pages carry ~5,100-7,200 bytes of authored TypeScript each (VERIFIED, per-type averages), i.e. roughly 800-900 words of genuinely distinct prose. That is real authoring cost — plausibly 2-4 hours per page (MODELLED; hours assumed, not measured).

An intersection page must contain facts *specific to the intersection* — what actually differs about invoice approval in insurance versus manufacturing. Ledgerium has exactly one honest source for such facts: `originalDataPoint`, drawn from real recordings.

**That supply is finite, unknown, and unenforced.** `originalDataPoint` is `readonly originalDataPoint: string` (`types.ts:99`), and the gate checks only that it is non-empty (`validate.ts:212`). There is no provenance assertion tying it to an actual recording.

**REASONED, and this is the sharpest objection:** if the company does not hold recordings of insurance invoice approval, the intersection page must be *reasoned* rather than *observed*. That is exactly the "written from memory" failure the entire product positioning attacks (`llms.txt/route.ts:31`: *"most process documentation is written from memory, so it is outdated and incomplete"*). **Publishing intersection pages without intersection data would make the site a live counter-example to its own thesis.** That is a brand risk, not merely an SEO risk.

### 4.3 Crawl budget — honestly, not the issue, and I will not pretend otherwise

The expected answer here is "crawl budget." It is wrong at this scale and I decline to assert it.

**REASONED from VERIFIED/REPORTED facts:** GSC reports impressions distributed across **164 pages** — essentially the entire corpus. Google has crawled and indexed effectively all of it. Google's crawl-budget guidance is directed at sites in the ~10k+ URL range. Moving 164 → 250, or even → 750, will not approach a crawl ceiling.

The real dilution risk is **site-level quality assessment** — the aggregate signal from a corpus where a growing share of pages have near-zero engagement — not crawl. Arguing crawl budget at 164 pages is arguing the wrong thing, and it would let a genuinely bad idea be rejected for a reason that does not survive scrutiny.

### 4.4 The steelman, and why it still fails

The strongest case for intersections: they are genuinely lower-competition. That is true and I accept it.

But lower competition on a query with near-zero volume yields near-zero traffic **even at position 1**. And the site cannot measure the volume — no tooling exists, and this report fabricates none. So the intersection bet is:

> unmeasurable volume × unmeasurable win probability × **known** cost of 2-4 authoring hours per page

with a directly relevant prior: 136 pages added since June produced a 27× impression rise and a decline to **zero** clicks (REPORTED §1.3). Full cross-products are large — 9 industries × 9 departments = 81; × 16 personas = 1,296; × 17 SOP templates = 22,032 (MODELLED, arithmetic on verified axis counts only). The abandoned 5,625-page ambition sits squarely inside that space.

**Verdict: it is the treadmill in disguise.** The disguise is that "lower competition" is true; the trick is that it is irrelevant when volume is unmeasured and authority is zero.

### 4.5 The narrow exception

Intersection pages are defensible where **all three** hold:

1. Backed by a real `originalDataPoint` from an actual recording of **that exact intersection** — not the parent industry, not the parent department;
2. Targeting a transactional artifact query per §3 — i.e. the page gives something away;
3. Corresponding to the named ICP vertical. REPORTED: `REVENUE_PLAN_20K_001` identifies **financial services** as ICP #1, and it still has no landing page while `education` and `retail` shipped (VERIFIED — both present in `content/pages/industry.ts`).

That is on the order of **5-10 pages, authored as demand-validated one-offs, never as a generated axis** — and only after §5.

---

## 5. Q5 — Technical preconditions before any net-new page ships

Ordered. Items 1-3 are blocking and are code. Item 4 is blocking and is not code, which is exactly why it will be the one that slips.

**1. Cross-type near-duplicate detection.** Remove the `a.type !== b.type` short-circuit at `validate.ts:254`, or add a second all-pairs pass with a type-aware threshold. **Blocking.** Without it, the gate certifies the exact failure the expansion would cause. Cost: O(n²) cosine at n=164 is ~13k comparisons; at n=750 ~280k — trivially fast.

**2. `primaryKeyword` / `secondaryKeywords` overlap gate.** Exact-match uniqueness on `primaryKeyword`, plus a warning on high token overlap between any `primaryKeyword` and any other page's `primaryKeyword` or `secondaryKeywords`. **Blocking.** Currently zero enforcement (§4.1).

**3. Contextual inbound-link floor.** Enforce ≥1 (target ≥2) curated inbound `related` reference per published page in `validateContent`, **and remediate the existing 58** (§1.2). Raising `related.ts` `limit` from 3 to 5 reactivates the dead tag-overlap fill at zero authoring cost. **Blocking** — otherwise net-new pages inherit the orphan pattern by default.

**4. An outcome gate wired to real data.** VERIFIED: there is no GSC data in the repo — `data/` contains only workflow upload JSON. The iter-098 health gate (≥80% indexed AND <30% zero-impression before scaling) exists as prose, was scaled past, and **no code could have enforced it because the input does not exist in the repository.** Until a GSC export is committed or the API is wired, every gate here measures production quality and none measures outcome — the precise mechanism of the 2026-07 failure (REPORTED §1.4). **This is the precondition that actually matters, and the one that is not engineering-shaped.**

**5. Entity preconditions.** §2 Tier 2 — named author + `Person`/`Organization` type fix. Shipping more pages under a non-resolvable, type-erroneous author multiplies a known defect by the page count.

**6. A winnability field in the content model.** Replace or supplement `searchIntent` with something that predicts what it was presumably meant to predict (§1.1) — e.g. an authored competition-density estimate plus an explicit `artifactType` for transactional pages. Without it, authors cannot distinguish a vendor-setup page from a scribe-alternative page before writing it.

**7. `originalDataPoint` provenance.** For any intersection or expansion page, require the field to reference a real recording. Otherwise "original data point" is a prose formality (§4.2) and the corpus quietly becomes memory-written.

**8. One-liners.** `/comparisons/page.tsx:41` — add `.filter((p) => p.published)`. `registry.ts:59` — give `compare` a `PARENT_HUB` of `/comparisons`, which already exists. `llms.txt/route.ts:42` — derive pricing from `plans.ts`; document the `alternatives`/`competitors` omission at `:12-23`.

**9. The prior review's re-entry criteria remain unmet** (REPORTED §6.7): target-cluster position <20, referring domains >0, ≥1 non-brand query with clicks. **None is met today.** Items 1-8 are what must be true *before* publishing; these three are what must be true before publishing is *worth doing*.

---

## 6. What this means for the CEO's ask, stated plainly

- **"More content by role / department / industry"** — those axes are built and populated (16 / 9 / 9). Adding a fourth dimension to a corpus that does not rank on three changes nothing. **Decline the axis.**
- **"More content" reinterpreted as "more linkable assets"** — accept, enthusiastically, scoped to **enriching the 17 existing SOP templates into real downloadable artifacts** (§3). Zero net-new URLs. Directly serves the off-page constraint. Shippable by a team that ships code.
- **Intersections** — 5-10 evidence-backed instances at most, gated on §5, concentrated on the financial-services ICP that has no page today. Never a generated cross-product.
- **The honest expectation:** none of this moves position 44 inside 90 days. It makes the site linkable, resolvable, and worth linking to — so that the off-page work, whenever it starts, lands on something that can convert.

---

## 7. Evidence status

| Claim | Status | Source |
|---|---|---|
| 164 pages; 134 commercial / 30 informational / 0 transactional | **VERIFIED** | counts over `content/pages/*.ts`, 2026-09-08 |
| Per-type counts (workflow 24, problem 22, sopTemplate 17, …) | **VERIFIED** | same |
| 164/164 authored by `Ledgerium Research Team` | **VERIFIED** | same |
| `chromeStoreUrl` still `placeholder` | **VERIFIED** | `lib/config.ts:16` |
| Exactly one sitewide `sameAs` | **VERIFIED** | `lib/seo/organization.ts:66` |
| `Person.sameAs` points at an Organization page | **VERIFIED** | `lib/seo/jsonLd.ts:63-69` + `content/types.ts:70-73` |
| Only one `'@type': 'Person'` exists in the codebase | **VERIFIED** | repo-wide search |
| `/about` "Founder" section names no human | **VERIFIED** | `app/(public)/about/page.tsx:253-262` |
| 58/164 pages have zero contextual inbound links | **VERIFIED** | computed over the `related` graph, 2026-09-08 |
| Tag-overlap fallback never fires (159/164 have exactly 3 tokens) | **VERIFIED** | `lib/seo/related.ts:63-75` + token counts |
| Near-dup detection is intra-type only | **VERIFIED** | `lib/seo/validate.ts:254` |
| No `primaryKeyword` uniqueness gate | **VERIFIED** | full read of `lib/seo/validate.ts` |
| No download / copy / email-capture affordance sitewide | **VERIFIED** | link enumeration across `components/seo/*.tsx` + public routes |
| `vendor-setup-sop-template` declared `commercial`, promises "editable" | **VERIFIED** | `content/pages/sop-template.ts:498-508` |
| `/comparisons` hub omits the `published` filter | **VERIFIED** | `app/(public)/comparisons/page.tsx:41` |
| `PARENT_HUB.compare = null` despite `/comparisons` existing | **VERIFIED** | `content/registry.ts:59` |
| `llms.txt` pricing fixed; omits `alternatives` + `competitors` | **VERIFIED** | `app/llms.txt/route.ts:12-23, 42` |
| No GSC data in repo | **VERIFIED** | `data/` contains only workflow uploads |
| GSC: 25 clicks / 1,979 impressions / position 44 / 164 pages | **REPORTED** | CEO export, 2026-09-08 |
| `vendor-setup-sop-template` at position 5.0 (n=1 impression) | **REPORTED** | GSC; **n is tiny — signal, not proof** |
| 90-95% of AI citations from third-party domains | **REPORTED** | `GROWTH_REVIEW_001 §4.1`; not re-verified |
| 136 pages since June → 27× impressions, clicks to zero | **REPORTED** | `GROWTH_REVIEW_001 §1.3` |
| Financial services = ICP #1 with no landing page | **REPORTED** | `REVENUE_PLAN_20K_001` via `GROWTH_REVIEW_001 §5.2`; the absence is VERIFIED |
| Indexation ≈ complete ⇒ crawl budget is not the constraint | **REASONED** | impressions span the full corpus |
| ~800-900 unique words/page; 2-4 authoring hours/page | **MODELLED** | from 5.1-7.2 KB authored TS per record; hours assumed, not measured |
| Cross-product sizes (81 / 1,296 / 22,032) | **MODELLED** | arithmetic on verified axis counts only |
| Transactional query classes | **REASONED** | from corpus keyword fields + category structure. **No volumes asserted — no tooling available, none fabricated.** |

**Not measurable today:** query volume for any term (no tooling); AEO citation rate (citation-without-click is invisible to referrer instrumentation — REPORTED §4.3); whether recordings exist to support any specific intersection page (§4.2) — **this must be checked before §4.5 is acted on.**
