# Programmatic Content System — Architecture Review

**Author:** system-architect
**Date:** 2026-09-08
**Scope:** the registry → view → validator → sitemap content pipeline in `apps/web-app`, and whether it can safely carry a use-case / role / department / industry expansion.
**Upstream context (accepted, not re-litigated):** `docs/meta/GROWTH_REVIEW_001/seo_aeo.md` — SEO is a 12-month compounding asset, not a Q4 channel; publishing is stopped; re-entry criteria are unmet.

**Evidence labels used throughout:** **VERIFIED** = read from source today, cited `file:line`. **REASONED** = inference from verified structure. **MODELLED** = quantified estimate with assumptions stated inline.

---

## 0. The answer, before the analysis

The pipeline is **well built and structurally sound**, and it is **not the constraint**. It has one architecturally significant defect and it is not a performance defect:

> **There is no machine-enforced ceiling on the corpus. Adding one object literal to `src/content/pages/*.ts` publishes a page, puts it in the sitemap, in `llms.txt`, and in the internal link graph — with no cap, no manifest, no approval, and no outcome evidence required.** (VERIFIED — `registry.ts:82-95`, `registry.ts:106-108`, `sitemap.ts:48-53`, `llms.txt/route.ts:27`; no cap constant exists anywhere in `apps/web-app` — grep for `MAX_PAGES|PAGE_CAP|ALL_PAGES.length` returns only a console log at `scripts/validate-seo-content.ts:25`.)

That is precisely the mechanism by which the iter-098 health gate was "scaled past." The gate was prose. The publishing path was code. Code wins.

On the CEO's expansion question, the architecture answer is:

1. **`persona` is not a clean role axis** — it is three axes wearing one type. Splitting is cheap *now* (16 records) and expensive later. But splitting is only worth doing **if publishing resumes**, and it should not resume yet.
2. **industry × department × use-case intersections should not be built.** Not because the pipeline cannot carry them — it can — but because 1,782 pages is 11× the current corpus aimed at a query space already measured too small, and the near-duplicate gate that would be the only defence is **structurally blind to exactly the duplication intersections create** (VERIFIED — `validate.ts:254`, same-type-only comparison).
3. **The highest-value architecture work right now is a hard, fail-closed publish cap** — roughly a day of work — and **nothing else**. Everything else in this document is a design for a future that is currently gated.

---

## 1. Current architecture assessment

### 1.1 What the pipeline is

Six layers, cleanly separated:

| Layer | Location | Assessment |
|---|---|---|
| Content model | `src/content/types.ts` | Discriminated union on `type`, 12 leaf interfaces, `readonly` throughout (`types.ts:18-31`, `types.ts:321-333`). Correct. |
| Registry | `src/content/registry.ts` | Eager concatenation of 12 modules (`registry.ts:82-95`); route prefixes and parent hubs as `Record<PageType, …>` (`registry.ts:30-62`); reserved-slug carve-out for hand-built leaves (`registry.ts:68-79`). Correct. |
| Views | `src/components/seo/*PageView.tsx` | One view per type, shared blocks in `Blocks.tsx`. Correct. |
| Derivation | `src/lib/seo/{url,metadata,jsonLd,related}.ts` | Canonicals and breadcrumbs are **derived, never authored** (`types.ts:78`, `url.ts:6-8`, `metadata.ts:36`). This is the single best decision in the system — it deletes an entire defect class. |
| Validation | `src/lib/seo/validate.ts` | Pure function, 164/164 passing, run in CI. |
| Distribution | `src/app/sitemap.ts`, `src/app/llms.txt/route.ts` | Both derived from `getPublishedPages()`; static entries win on collision (`sitemap.ts:63-71`). Correct. |

**VERIFIED corpus:** exactly **164** leaf records across 12 registry files — workflow 24, problem 22, sopTemplate 17, persona 16, software 16, alternatives 15, competitors 10, compare 10, industry 9, department 9, answer 8, aiOpportunity 8 (grep `^  slug: ` over `src/content/pages/`). **13,264** non-blank lines of registry content ≈ 81 lines per record.

**VERIFIED routes:** 52 `page.tsx` under `(public)`, of which 11 are `[slug]` dynamic routes feeding the 164 leaves, plus 11 hubs and ~30 hand-built pages.

### 1.2 What is genuinely strong

- **Determinism is enforced, not asserted.** `content.test.ts:29-68` asserts `generateSeoMetadata`, `generateJsonLd`, and `getRelatedPages` are byte-identical across calls. `related.ts:67` uses a stable `overlap desc, slug asc` sort — no `Date`, no `Math.random`. This is the Ledgerium determinism principle actually landed in the marketing surface.
- **Gate A (sitemap ↔ filesystem parity) asserts on output, not intent.** `sitemap.test.ts:76-100` walks the *actual emitted URLs* and resolves each to a `page.tsx` on disk, deliberately independent of which internal array (`HUB_TYPES` vs `PARENT_HUB`) drifts. This is the right shape for a parity gate and it closed a real `/answers` 404.
- **Gate B (canonical presence) is enforced-by-default with a reasoned allowlist.** `canonicalCoverage.test.ts:152-174` requires every new hand-built page to either carry a canonical or be added to `ACKNOWLEDGED_EXCEPTIONS` **with a written reason**. It also self-tests its own detector against synthetic fixtures (`canonicalCoverage.test.ts:260-333`) — a gate that proves it can fail. Rare and good.
- **JSON-LD `@id` node graph.** `Organization` is emitted once sitewide; leaf pages reference it (`jsonLd.ts:72`, `jsonLd.ts:88`) and the leaf-level `Organization` case is an explicit documented no-op (`jsonLd.ts:140-149`). Correct entity modelling.
- **Honest about what schema buys.** `jsonLd.ts:130-135` states plainly that FAQPage and HowTo no longer produce rich results. Documentation that refuses to oversell itself is a quality signal.

### 1.3 The real limits — where it breaks under expansion

**L-1 — No corpus cap. (VERIFIED; severity: highest)**
`getPublishedPages()` (`registry.ts:106-108`) filters on `published && !isReservedSlug`. That is the entire publish decision. `sitemap.ts:48` and `llms.txt/route.ts:27` both consume it directly. There is no count check anywhere in the repo. A registry entry *is* a publish. Designed against in §4.

**L-2 — The near-duplicate gate cannot see cross-type duplication. (VERIFIED; severity: high under expansion)**
`validate.ts:254` — `if (!a || !b || a.type !== b.type) continue;`. Cosine similarity is computed **only within a type**. This is currently benign and would become the central failure under any axis expansion, because the duplication expansion creates is *cross-type by construction*:

- `persona:hr-teams` — primaryKeyword `'HR process documentation'`, tags `['persona','hr',…]` (`persona.ts:615`, `persona.ts:618`)
- `department:hr` — primaryKeyword `'HR workflows'`, h1 `'HR workflows'` (`department.ts:94`, `department.ts:90`)

Two pages, two types, one topic, zero gate coverage. The same collision holds for `persona:compliance-teams` ↔ `department:compliance`, `persona:it-directors` ↔ `department:it`, and `persona:insurance-claims-managers` ↔ `industry:insurance`. **Four cross-type topic collisions already exist in a 164-page corpus and the validator reports zero errors.**

**L-3 — `tags` is an uncontrolled vocabulary that silently drives the link graph. (VERIFIED; severity: medium)**
`types.ts:95` declares `tags: readonly string[]` with no enum. `validate.ts` never inspects `tags`. Yet `related.ts:62-67` uses tag overlap as the fallback link source for every page. A typo (`'complaince'`) produces a page with fewer related links, no error, no warning — `validate.ts:242` only warns when `related` is *empty*, and the tag-overlap fill happens after that check, at render time.

Worse, the vocabulary already conflates axis-value with topic: `'operations'` is simultaneously a department slug (`department.ts:165`), an industry tag on banking and retail (`industry.ts:255`, `industry.ts:650`), and a persona tag (`persona.ts:18`). Any facet system built on these tags would mis-group on day one.

**L-4 — Hubs are unpaginated and render the full type. (VERIFIED; severity: medium at 3× corpus)**
`HubIndex.tsx:60-70` maps every page of a type into a card grid, and `HubIndex.tsx:31-40` emits an `ItemList` containing every one. The component's own comment concedes it: *"faceted filtering is a Tranche-1 follow-up once page counts justify it"* (`HubIndex.tsx:9-11`). At 24 workflow pages this is fine. At 200 it is a 200-link page with 200 inline meta descriptions and an unbounded JSON-LD array — a crawl-budget and UX problem simultaneously.

**L-5 — `verifiedAsOf` is a claim the system displays but cannot check. (VERIFIED; severity: medium, and it contradicts a prior review)**
`ComparePageView.tsx:43`, `AlternativesPageView.tsx:36` and `CompetitorsPageView.tsx:36` render *"verified as of {page.verifiedAsOf}"* to the public. The field is a free-form `string` (`types.ts:158`, `types.ts:251`, `types.ts:268`). **`validate.ts` never references it** — no format check, no staleness check. 35 pages publish a freshness guarantee with no enforcement, and the oldest values read `'June 2026'` (e.g. `compare.ts:63`, `alternatives.ts:138`, `competitors.ts:133`) — three months stale today.

> Correction to the record: `GROWTH_REVIEW_001/seo_aeo.md:71` states the validator *"enforces … `verifiedAsOf` freshness."* It does not. That claim should not be relied on.

**L-6 — Every page links to a permanent redirect. (VERIFIED; severity: low but sitewide)**
`Blocks.tsx:14` defines `const DEMO = '/demo'`, used at `Blocks.tsx:168`, `:195`, `:238`. `next.config.js:17-21` permanently 301s `/demo` → `/product`. All 164 leaf pages therefore emit internal links that redirect. The repo already knows `/demo` is unreachable — it is documented as such at `canonicalCoverage.test.ts:153-157` — and links to it anyway.

**L-7 — `getBySlug` is a linear scan called twice per page. (VERIFIED; severity: none today, named for completeness)**
`registry.ts:102` — `ALL_PAGES.find(...)`. Each route calls it in `generateMetadata` and again in the component (e.g. `industries/[slug]/page.tsx:16`, `:21`). That is O(n) × 2 × n per build. At n=164 that is ~54k comparisons — irrelevant. It stays irrelevant to ~5,000 pages. **This is not a real limit and should not be "optimized."** Named so nobody spends a day on it.

---

## 2. The role axis: is `persona` the right model?

### 2.1 Finding: `persona` is currently three different axes in one type

**VERIFIED** — the 16 `persona` slugs (`persona.ts`, grep `^  slug: `) partition into three distinct entity kinds:

| Kind | Slugs | Count |
|---|---|---|
| **Job title** (a person, searchable as a role) | `operations-managers`, `revops-managers`, `business-analysts`, `it-directors`, `training-managers`, `insurance-claims-managers`, `legal-operations-managers`, `process-excellence-leads`, `ma-integration-leads`, `consultants` | 10 |
| **Team / function** (a group, near-synonymous with `department`) | `compliance-teams`, `hr-teams`, `customer-success-teams`, `ai-transformation-teams` | 4 |
| **Org model / buyer context** (neither a title nor a department) | `shared-services-leaders`, `bpo-operations` | 2 |

The `PersonaPage` interface (`types.ts:161-172`) is genuinely persona-shaped — `whoThisIsFor`, `painPoints`, `dayInTheLife`, `jobsToBeDone`, `whatTheySearchFor`. That is a *buying-persona* model. But 4 of 16 records are departments in disguise, and they collide head-on with the `department` type (L-2 above).

### 2.2 Do role and persona need separating?

**Answer: conceptually yes, structurally no — and the correct action today is neither.**

The argument *for* separating job-title from buying-persona is real:
- They target different query classes. `"process documentation for operations managers"` (`persona.ts:15`) is a role query. A buying-persona page targets no query at all — it is a mid-funnel fit-validation asset that people arrive at from elsewhere.
- They want different schemas. A role page wants `whatTheySearchFor` + `jobsToBeDone`. A buying-persona page wants objection handling, procurement context, and a champion narrative — none of which exist in `PersonaPage` today.

The argument *against* acting on it now is decisive:
- The site has **zero measured demand signal for the role axis**. Of three non-homepage clicks in a quarter, two came from `sopTemplate` and one from `industries/healthcare` (`GROWTH_REVIEW_001/seo_aeo.md:47-51`). No persona page has produced anything.
- Splitting a type produces **more pages, not better ones** — the exact motion §6 of the growth review prohibits.
- Every record already carries a full role framing. A split would be re-filing, not authoring.

### 2.3 Migration cost, if it ever must split

**MODELLED, with the structure VERIFIED.** The union design makes this genuinely cheap, which is the point of having built it that way.

| Work | Cost | Basis |
|---|---|---|
| Add `'role'` to `PageType` + `RolePage` interface + union member | ~40 LOC | `types.ts:18-31`, `types.ts:321-333` |
| `ROUTE_PREFIX` + `PARENT_HUB` entries (`Record<PageType,…>` — TypeScript forces exhaustiveness, so omission is a compile error) | ~4 LOC | `registry.ts:30-62` |
| `OG_TYPE` entry (same exhaustiveness property) | 1 LOC | `metadata.ts:9-23` |
| `proseSources()` branch | ~10 LOC | `validate.ts:24-149` |
| New `RolePageView` + route + hub | ~250 LOC | mirrors `PersonaPageView.tsx` + `use-cases/personas/` |
| **Re-file 10 job-title records** persona → role | mechanical; type change + slug preserved | 10 × ~86 lines |
| **Merge or delete 4 team records** colliding with `department` | editorial judgement, not mechanical | `persona.ts:521/607/693/864` |
| **301 redirects** `/use-cases/personas/{10 slugs}` → `/roles/{slug}` | 10 entries in `next.config.js:15-33` | required — these URLs are in the live sitemap |
| Update `related` tokens pointing at moved pages | grep-and-replace; `validate.ts:240` fails the build on any unresolved token, so this cannot be missed silently | — |

**Estimated: 1.5–2 engineering days, low risk.** The `Record<PageType, …>` exhaustiveness at `registry.ts:30`, `registry.ts:47` and `metadata.ts:9` means a half-done split fails `pnpm typecheck` rather than shipping broken. That is the migration insurance the original design bought.

**Recommendation: do not split now.** Record the decision. If publishing ever resumes and role queries show measured impressions, split then — the cost does not grow materially with corpus size because it is per-record mechanical work, and there are only 16 records.

**The one thing worth doing regardless (and it is not a split):** the 4 team-shaped persona records duplicate department pages today. That is a live near-duplicate the gate cannot see. It is a *deletion* candidate, not a migration.

---

## 3. Intersection modelling (industry × department × use-case)

### 3.1 Recommendation: do not build it

**Combinatorics, VERIFIED counts:**

| Model | Pages | vs. current corpus |
|---|---|---|
| industry × department | 9 × 9 = **81** | +49% |
| industry × use-case (problem) | 9 × 22 = **198** | +121% |
| department × use-case | 9 × 22 = **198** | +121% |
| **industry × department × use-case** | 9 × 9 × 22 = **1,782** | **+1,087%** |
| all pairwise + triple | 2,259 | +1,377% |

1,782 pages is 11× the entire existing corpus, generated to attack a query space the demand analysis already capped at ~650–750 total addressable pages. This is the 5,625-page ambition returning under a different name.

**Three architectural reasons beyond the demand argument:**

1. **The only gate that could catch the resulting duplication is structurally blind to it.** `validate.ts:254` compares within-type only. A new `intersection` type would put all 1,782 in one comparison bucket — good — but every intersection page is a recombination of prose already published on its two or three parents, which are *different* types. The parent-child duplication is invisible by construction. Meanwhile the within-type check becomes 1,782² / 2 = **1.59M pairwise cosine computations** (§5).

2. **The internal link graph inverts.** Today: 164 leaves, 11 hubs, ~3 related links per page (`related.ts:44` default `limit = 3`), curated-first then tag-overlap fill. Adding 1,782 nodes makes 91.6% of the graph machine-composed pages competing with their own parents for the same tag-overlap slots. `related.ts:62-67` scores purely on overlap count with a slug-alphabetical tiebreak — with 1,782 near-identical tag sets, the tiebreak becomes the *primary* ordering, i.e. link distribution becomes effectively alphabetical. Every industry page would fill its 3 related slots with `automation-…`, `banking-…`, `compliance-…` intersections and stop linking to workflows and SOP templates — the cluster that is the only one with a page-1 result.

3. **The tag vocabulary cannot support faceting.** L-3: `'operations'` is a department, an industry sub-theme, and a persona tag simultaneously. Facet derivation from tags would mis-group immediately, and there is no controlled vocabulary to derive from instead.

**Sitemap size is *not* a reason.** `sitemap.ts` emits a single flat array with no index-splitting, but Google's limits are 50,000 URLs / 50MB uncompressed. At 164 → ~190 URLs, or even at 2,000, this is a non-issue. Stated explicitly so it is not cited as a constraint it isn't.

### 3.2 If it is built anyway — the bounded design

Stated so that if the decision goes the other way, it goes there with a defensible shape rather than an unbounded one.

**Data model: allowlisted composed pages, not a dedicated registry and not derived facets.**

- **Reject "dedicated registry."** 1,782 hand-authored records at the current 81-lines-per-record density is ~144,000 lines of TypeScript. Not authorable, and if it were template-filled it would be exactly the name-swap templating the corpus has so far correctly avoided.
- **Reject "derived pages"** (auto-generate all N from parents). This is the failure mode by definition: pages that exist because a loop produced them, containing nothing their parents don't.
- **Accept "facet pages with an explicit allowlist"** — a small, committed list of *pairs*, each carrying authored content.

```ts
// content/intersections.ts  (illustrative — NOT built)
export interface IntersectionPage extends BasePage {
  readonly type: 'intersection';
  readonly axisA: { type: 'industry'; slug: string };
  readonly axisB: { type: 'department'; slug: string };
  /** Content that exists on NEITHER parent. Gate-enforced ≥250 words. */
  readonly uniqueThesis: string;
  readonly uniqueEvidence: readonly string[];
  readonly originalDataPoint: string; // must differ from both parents'
}
```

**Six hard constraints, all machine-enforceable in `validate.ts`:**

1. **Pairs only, never triples.** Drop use-case from the intersection entirely. Ceiling 81, not 1,782.
2. **Allowlist ≤ 24 pairs**, enumerated in the publish budget (§4). Not "all 81."
3. **Unique-thesis floor:** `uniqueThesis` must be ≥250 words and must not appear in either parent — enforce with the existing shingle machinery, but **cross-type**: cosine(intersection, parentA) < 0.35 and cosine(intersection, parentB) < 0.35. This requires fixing L-2 first; the fix is a precondition, not a nice-to-have.
4. **Distinct `originalDataPoint`** from both parents (exact-match check, trivially enforceable — `validate.ts` already builds an equality map for `metaTitle` at `:199`).
5. **Canonical strategy: self-canonical, or do not ship.** `metadata.ts:36` already self-canonicals every page. If a pair cannot justify a self-canonical, it is not a page — it is a filtered view of a hub and should be a client-side filter on the hub with no URL. **Never** ship canonical-to-parent intersection URLs; that is a crawl-budget tax with no upside.
6. **Link-graph budget:** each intersection may claim at most 1 of the 3 related-slots on either parent, and intersections may not link to other intersections. Enforce by rejecting `related` tokens of type `intersection` on `intersection` pages.

**Build-time impact of the bounded version:** 24 pages on 164 → 188. Negligible on every axis (§5). That is the point of bounding it.

---

## 4. Content-generation safeguards — a cap that cannot be scaled past

### 4.1 The specific failure to design against

The iter-098 gate (≥80% indexed **and** <30% zero-impression before scaling) failed for one reason: **it was written in a document and the publishing path was code.** Nothing in the repo consulted it. It was not overridden — it was simply never asked.

Any replacement must satisfy three properties:

- **P1 — On the publish path.** The check must be a function of the registry itself, so that adding a record is what trips it.
- **P2 — Fail closed on neglect.** If the evidence that would authorize publishing is missing or stale, the answer is *no*. Silence must block, not permit. (The iter-098 gate failed open: nobody measured, so nobody was stopped.)
- **P3 — Raising the cap must require an affirmative, dated, on-the-record statement — not a silent one-line edit.** You cannot make a cap technically unraisable in a repo where the author controls all the files. You *can* make raising it cost a signed statement that is wrong if the numbers are wrong.

### 4.2 Design

Four artefacts. Total ≈ 250 LOC including tests.

**(a) `src/content/publishBudget.ts` — the ledger.**

```ts
export const PUBLISH_BUDGET = {
  /** Absolute ceiling on published leaf pages. */
  hardCap: 170,                       // = 164 today + 6 headroom
  /** Per-type ceilings. Sum may exceed hardCap; hardCap binds. */
  perType: { workflow: 26, problem: 24, sopTemplate: 22, persona: 16,
             software: 16, alternatives: 15, competitors: 10, compare: 10,
             industry: 9, department: 9, answer: 10, aiOpportunity: 8 },
  /** Append-only. Every raise leaves a permanent record. */
  history: [
    { at: '2026-09-08', cap: 170, reason: 'initial cap, set at corpus size + 6' },
  ],
} as const;
```

**(b) `src/content/publishManifest.ts` — the explicit ship list.**

```ts
/** A page is live IFF `published === true` AND its id is here. */
export const PUBLISH_MANIFEST: ReadonlySet<string> = new Set([
  'workflow:invoice-approval-workflow', /* … 164 ids … */
]);
```

`getPublishedPages()` (`registry.ts:106-108`) gains one clause:

```ts
return ALL_PAGES.filter(
  (p) => p.published && !isReservedSlug(p.type, p.slug)
      && PUBLISH_MANIFEST.has(`${p.type}:${p.slug}`)
);
```

**This is the load-bearing change.** It converts "adding a registry entry publishes a page" into "adding a registry entry publishes nothing." Because `sitemap.ts:48` and `llms.txt/route.ts:27` both route through `getPublishedPages()`, one edit covers every distribution surface. **P1 satisfied.**

**(c) `src/content/publishEvidence.ts` — the fail-closed health gate.**

```ts
export const PUBLISH_EVIDENCE = {
  measuredAt: '2026-09-08',      // ISO; must be within 45 days to authorize any raise
  source: 'GSC export 2026-05-12 → 2026-08-11',
  indexedPct: 0,                  // % of sitemap URLs indexed
  zeroImpressionPct: 0,           // % of published pages with 0 impressions
  referringDomains: 0,
  clusterAvgPosition: 44,
  nonBrandClickingQueries: 0,
} as const;

/** Re-entry criteria, from GROWTH_REVIEW_001 §6.7. Raising `hardCap` requires ALL true. */
export const RE_ENTRY_CRITERIA = {
  minIndexedPct: 80,
  maxZeroImpressionPct: 30,
  minReferringDomains: 1,
  maxClusterAvgPosition: 20,
  minNonBrandClickingQueries: 1,
  maxEvidenceAgeDays: 45,
} as const;
```

**(d) `src/lib/seo/publishGate.test.ts` — five blocking assertions, run by `pnpm test` in CI (`deploy.yml:43-44`).**

1. `getPublishedPages().length <= PUBLISH_BUDGET.hardCap` — fails naming the overflow pages.
2. Per-type counts `<= PUBLISH_BUDGET.perType[type]`.
3. **Manifest ↔ registry parity, both directions.** A manifest id with no record = stale entry, fail. A `published: true` record absent from the manifest = **fail with the message "this page is authored but not shipped; add it to PUBLISH_MANIFEST and confirm budget headroom."** Not a silent skip — a loud stop.
4. `PUBLISH_BUDGET.history` is append-only and monotonic, and `history[last].cap === hardCap`. A raise without a history entry fails.
5. **The raise gate.** If `hardCap > history[0].cap`, then **every** `RE_ENTRY_CRITERIA` threshold must be satisfied by `PUBLISH_EVIDENCE`, **and** `daysBetween(PUBLISH_EVIDENCE.measuredAt, history[last].at) <= maxEvidenceAgeDays`. Missing, malformed or stale evidence ⇒ **fail**. **P2 satisfied — neglect blocks publishing.**

### 4.3 Why this survives the scale-past attempt

Adding a page now requires four coordinated edits: registry record, manifest id, budget headroom, and — if the cap must move — a dated evidence file whose numbers are checked against thresholds. The final step is the control. To publish page 171 today, someone must edit `publishEvidence.ts` to claim `indexedPct: 80` and `referringDomains: 1` when both are 0 (`GROWTH_REVIEW_001 §7`).

That is not a config tweak. It is a **falsified measurement, committed under a name and a date, in a file whose only purpose is to hold that measurement.** It appears in the diff of the same commit that adds the page. It is exactly as reviewable as it needs to be.

Two supporting notes:

- **Fail-closed is the whole design.** Compare with `plan-availability.ts:42-50` — the billing surface already uses this pattern: `loading` is never `available`; any shape not explicitly `true` resolves `unavailable`. The publish gate should be the same shape, for the same reason.
- **Do not add a file-hash ratchet.** It was considered. It adds ceremony without adding a truth claim, and hash-mismatch failures teach engineers to regenerate hashes reflexively. The evidence file is the stronger control precisely because it demands a statement about the world, not about bytes.

### 4.4 Two smaller safeguards, same commit

- **Fix L-2: make near-duplicate detection cross-type.** `validate.ts:254` — drop the `a.type !== b.type` skip; keep the 0.7 fail / 0.5 warn thresholds within-type and add a looser cross-type threshold (fail ≥0.6, warn ≥0.4). At n=164 the cost is 13,366 pairs — milliseconds. This is the gate that makes any future expansion honest, and it will immediately surface the four persona↔department collisions from §2.1. **Expect it to fail on first run. That is it working.**
- **Fix L-5: validate `verifiedAsOf`.** Enforce `/^(January|…|December) \d{4}$/`, and error when a published page's `verifiedAsOf` is more than 180 days behind the newest `verifiedAsOf` in the corpus (a relative check needs no clock, preserving `validate.ts`'s purity — no `Date.now()`).

---

## 5. Build and performance

### 5.1 Current state

**VERIFIED structure:** `(public)/layout.tsx:4-15` records that `force-dynamic` was removed and SSG restored. `llms.txt/route.ts:10` is `force-static`. No `revalidate` anywhere under `(public)`. So all 164 leaves + 11 hubs + ~30 hand-built pages prerender at build.

**MODELLED build cost** (assumptions: GitHub-hosted `ubuntu-latest` 2-core runner per `deploy.yml:47`; Next 14.2 App Router; leaf pages are pure server components over in-memory literals with no I/O):

| Term | Estimate | Basis |
|---|---|---|
| Compile / bundle | 90–210 s | dominated by `productionBrowserSourceMaps: true` (`next.config.js:6`) and `transpilePackages` of two workspace packages (`next.config.js:7`) |
| Static generation, 205 routes | 10–25 s | no data fetching; ~10–20 pages/s/worker |
| `validate:seo` + `pnpm test` (separate CI step) | seconds | `content.test.ts` + `sitemap.test.ts` + `canonicalCoverage.test.ts` |
| **Total `next build`** | **~2–4.5 min** | page generation is <15% of it |

**The corpus is not currently a build-time factor.** Turning off `productionBrowserSourceMaps` — a `TEMP (hydration-debug)` flag per `next.config.js:3-5` — would save more build time than deleting half the pages.

### 5.2 Where it actually breaks — and it is not the build

**MODELLED, with the O(n²) structure VERIFIED at `validate.ts:249-259`.** The near-duplicate detector builds a k=5 shingle frequency Map per page (`validate.ts:153-160`) and computes pairwise cosine over the upper triangle. Per-page shingle count ≈ word count ≈ 500–900 (the floor is 400, `validate.ts:12`). Cosine (`validate.ts:162-171`) iterates `a`'s entries with a Map lookup each, then recomputes both magnitudes **inside the loop body** — `mag()` is called per pair, not memoized (`validate.ts:168`), roughly tripling the constant.

| n | pairs | ≈ Map ops | wall-clock (single-threaded JS) | memory for shingle Maps |
|---|---|---|---|---|
| 164 (today) | 13,366 | ~2.7e7 | **< 1 s** | ~35 MB |
| 400 | 79,800 | ~1.6e8 | ~2–5 s | ~85 MB |
| **750** (demand ceiling) | 280,875 | ~5.6e8 | **~10–25 s** | ~160 MB |
| **1,500** (prior recommended cap) | 1,124,250 | ~2.2e9 | **~60–150 s** | ~320 MB |
| 2,259 (all pairwise intersections) | 2.55e6 | ~5.1e9 | ~3–6 min | ~480 MB |
| **1,782** (triple intersections, one type) | 1.59e6 | ~3.2e9 | ~2–4 min | ~380 MB |
| 5,625 (abandoned ambition) | 1.58e7 | ~3.2e10 | **~20–45 min** | ~1.2 GB, OOM risk at Node's default heap |

**Conclusions, stated plainly:**

- **Below ~750 pages, nothing in this pipeline has a performance problem.** Not the build, not the validator, not the sitemap, not `getBySlug`. The reason not to expand is editorial and demand-side, not technical. Do not use "it won't scale" as the argument — it is false below 750 and it will be correctly rebutted.
- **The first genuine break is the validator, not SSG,** and it breaks **CI** (`deploy.yml:44` runs `pnpm test`, which runs `content.test.ts:10` → `validateContent`), not `next build`. It becomes noticeable around 750, painful around 1,500, and prohibitive past ~3,000.
- **If the cap is ever raised past ~600, fix the validator first** — hoist `mag()` out of the pair loop, precompute per-vector norms once (O(n) instead of O(n²)), and skip pairs whose token-count ratio is outside [0.5, 2.0]. That is ~15 LOC and buys roughly an order of magnitude. Do it *when* needed, not now.
- **SSG itself becomes a problem at ~3,000–5,000 pages**, where generation time, `.next` output size and Docker image size (`deploy.yml:64-71` pushes to GHCR every commit) start to dominate. Far beyond any defensible corpus target.
- **The sitemap never becomes a problem** below 50,000 URLs. No splitting work is warranted.

---

## 6. Single source of truth — the drift audit

The `llms.txt` pricing defect (Finding A) was **fixed in content** (commit `37f37e2`; `llms.txt/route.ts:36-44` now names Solo and marks Team/Growth waitlist-only). **The mechanism was not fixed.** The prices are still a hand-typed English sentence. Below, every drift surface between the content registries and product truth.

| # | Drift | Evidence | Status |
|---|---|---|---|
| **D-1** | **Pricing prose vs `PRICING_CONFIG`.** `llms.txt/route.ts:44` hard-codes `"Free (5 workflows/mo), Starter $49/mo (15 workflows/mo), Solo $89/mo (unlimited…)"`. Source of truth is `PRICING_CONFIG.plans[].price` (`config.ts:32`, `:51`, `:75`) and quotas are in `PLAN_FEATURES[].maxRecordingsPerMonth` (`plans.ts:77`, `:85`, `:115`). Three restatements of the same fact, one of them English. | `llms.txt/route.ts:44` vs `config.ts:32+` vs `plans.ts:75-195` | **OPEN — content correct today, mechanism unchanged.** Generate the sentence from `PRICING_CONFIG` × `PLAN_FEATURES`. |
| **D-2** | **Purchasability has three independent representations.** `BLOCKED_PLANS_AWAITING_WORKSPACE_BUILD` (`checkout/route.ts:65`) is the server truth; `derivePlanAvailability()` (`plan-availability.ts:42-50`) derives the button state from `/api/billing/sku-availability`; `llms.txt/route.ts:44` states it in prose. Nothing ties the third to the first two. | as cited | **OPEN.** |
| **D-3** | **Hard-coded price inside the content registry.** Two FAQ answers state *"paid plans starting at 49 dollars per month."* Correct today; drifts silently the day Starter moves. No gate connects registry prose to `PRICING_CONFIG`. | `compare.ts:83`, `compare.ts:488` | **OPEN.** |
| **D-4** | **Feature-tier drift — the most substantive one.** Persona/workflow pages promise intelligence outputs without a tier qualifier — e.g. *"a report showing where time is lost"* (`persona.ts:14`) — and the hero CTA on every leaf page points at `/signup` (`Blocks.tsx:13`, `Blocks.tsx:90`), i.e. the free tier. Free has `...NO_FEATURES` — no `healthScores`, no `intelligenceLayer`, no `bottleneckAnalysis` (`plans.ts:76-83`), and `PRICING_CONFIG` free explicitly lists limit `'No intelligence layer'` (`config.ts:68`). **The corpus promises the free tier something the free tier does not include.** | as cited | **OPEN — highest-severity drift in this list.** |
| **D-5** | **`verifiedAsOf` displayed but unvalidated.** Rendered publicly at `ComparePageView.tsx:43`, `AlternativesPageView.tsx:36`, `CompetitorsPageView.tsx:36`; free-form `string` at `types.ts:158/251/268`; **zero references in `validate.ts`**. 35 pages; oldest `'June 2026'`. Contradicts `GROWTH_REVIEW_001/seo_aeo.md:71`. | as cited | **OPEN.** Fix in §4.4. |
| **D-6** | **16 software pages carry vendor claims with no freshness field at all.** `SoftwarePage` (`types.ts:135-145`) has no `verifiedAsOf`, yet records make version-sensitive assertions about third-party products (e.g. Coupa server-side approval routing, `software.ts:899`, `software.ts:935-936`). | as cited | **OPEN.** |
| **D-7** | **Author identity duplicated 164×.** `author: { name: 'Ledgerium Research Team', sameAs: ['…/company/ledgerium-ai'] }` is restated per record (pattern at `persona.ts:86`). Emitted as schema.org `Person` (`jsonLd.ts:64-68`) whose `sameAs` is a company page — a type error. Changing to a named human is a 164-site edit, not a constant change. | as cited | **OPEN.** Prior review's Finding D; ~1 hr if a shared constant is introduced first. |
| **D-8** | **`tags` uncontrolled, yet load-bearing.** `types.ts:95` free-form; drives related-link fill (`related.ts:62-67`); never validated. Vocabulary already collides across axes (`'operations'` appears as department slug `department.ts:165`, industry tag `industry.ts:255`/`:650`, and persona tag `persona.ts:18`). | as cited | **OPEN.** Blocks any future faceting. |
| **D-9** | **All 164 pages link to a 301.** `Blocks.tsx:14` `/demo`, used at `:168`, `:195`, `:238`; permanently redirected at `next.config.js:17-21`; already documented unreachable at `canonicalCoverage.test.ts:153-157`. | as cited | **OPEN.** 1-line fix. |
| **D-10** | **Chrome Web Store URL still `placeholder`.** `config.ts:16`. Not a content-registry drift, but it is the truth-vs-site gap with the largest business consequence, and it is unchanged since the growth review named it. | `config.ts:16` | **OPEN.** |

**Structural verdict on D-1 through D-4:** the pattern is consistent. **Product truth lives in `plans.ts` / `config.ts` / `checkout/route.ts`; the content layer restates it in English; no gate connects them.** The generic fix is one test, not ten edits: a `productTruth.test.ts` that (a) greps the registry corpus and `llms.txt` output for `/\$\d+|\d+ dollars/` and asserts every matched number appears in `PRICING_CONFIG.plans[].price`, and (b) asserts no page whose CTA targets `/signup` claims a capability whose `minimumPlanForFeature()` (`plans.ts:237-239`) is above `free`, unless the page also states the tier. Part (b) needs a small claim→`FeatureKey` mapping table; that table is the honest cost, and it is worth paying once.

---

## 7. What has real marginal value right now

Publishing is gated. Most of this document describes work for a future that may not arrive. Ruthless ordering:

### Tier 1 — do (≈1 day total)

**1. The publish cap (§4).** ~250 LOC across four files plus one test. This is the only item that changes what the system *permits*. Everything else changes what it *contains*. It should ship before any expansion conversation continues, because it converts "should we expand?" from a discussion into a gate with a number.

**2. Cross-type near-duplicate detection (§4.4).** One line deleted at `validate.ts:254`, one threshold added. Expect it to fail immediately on the four persona↔department collisions — which is the finding, and which is information the expansion decision needs.

### Tier 2 — do only if bundled with Tier 1 (≈2 hours)

**3. `verifiedAsOf` format + relative-staleness validation (D-5).** The site currently publishes an unenforceable freshness guarantee on 35 pages. Cheap to close.

**4. Generate the `llms.txt` pricing sentence from `PRICING_CONFIG` (D-1).** ~15 LOC. The prior fix corrected the symptom; this removes the mechanism. Worth doing while the file is fresh in mind, not as its own task.

**5. `Blocks.tsx` `/demo` → `/product` (D-9).** One line, removes a 301 from all 164 pages.

### Tier 3 — do not do now

- **Persona/role split (§2).** Cost does not grow with time; benefit is zero while publishing is stopped. Record the decision; revisit only on measured role-query demand.
- **Any intersection work (§3).** Including "just the design." The design is in §3.2 if it is ever needed.
- **Validator O(n²) optimization (§5).** Premature by a factor of ~5 in corpus size.
- **`getBySlug` indexing (L-7).** Never needed at any defensible corpus size.
- **Hub pagination (L-4).** Needed at ~60 pages per type; the largest type is 24.
- **Sitemap index splitting.** Needed at 50,000 URLs; current 190.
- **`productTruth.test.ts` (§6).** Genuinely valuable, but D-4 is a *content* defect that a `growth-strategist` copy pass fixes faster than a claim→FeatureKey mapping table. Build the gate only if the corpus is ever going to grow.

### The honest framing for the CEO's expansion question

The pipeline can carry the expansion. That is the wrong question. The right one is whether 1,782 machine-composed pages aimed at a query space already measured at ~9 clicks/day-at-page-1 is a better use of the next month than the Chrome Web Store listing that has been submission-ready since 2026-08-19 (`config.ts:16` still `placeholder`).

The architecture's job here is to make the wrong answer expensive to execute. That is what §4 does. **Build the cap, then have the strategy conversation with the cap already in place.**

---

## Appendix — evidence status

| Claim | Status | Citation |
|---|---|---|
| 164 leaf records across 12 registries; per-type counts | **VERIFIED** | grep `^  slug: ` over `src/content/pages/` |
| 13,264 non-blank registry lines (~81/record) | **VERIFIED** | line count over `src/content/pages/` |
| 52 `page.tsx` under `(public)`; 11 dynamic `[slug]` routes | **VERIFIED** | glob `app/(public)/**/page.tsx` |
| No corpus cap exists anywhere | **VERIFIED** | grep `MAX_PAGES\|PAGE_CAP\|ALL_PAGES.length` → only `scripts/validate-seo-content.ts:25` |
| Publish decision is `published && !isReservedSlug` only | **VERIFIED** | `registry.ts:106-108` |
| Sitemap + `llms.txt` both consume `getPublishedPages()` | **VERIFIED** | `sitemap.ts:48`, `llms.txt/route.ts:27` |
| Near-duplicate check is within-type only | **VERIFIED** | `validate.ts:254` |
| 4 persona↔department/industry topic collisions | **VERIFIED** | `persona.ts:615/618` vs `department.ts:90/94`; +`compliance-teams`, `it-directors`, `insurance-claims-managers` |
| `verifiedAsOf` rendered publicly, never validated | **VERIFIED** | `ComparePageView.tsx:43` / `AlternativesPageView.tsx:36` / `CompetitorsPageView.tsx:36`; absent from `validate.ts` |
| `tags` free-form, drives related-link fill, unvalidated | **VERIFIED** | `types.ts:95`, `related.ts:62-67` |
| All leaf pages link to `/demo`, which 301s | **VERIFIED** | `Blocks.tsx:14/168/195/238`, `next.config.js:17-21` |
| Free tier has no intelligence features; leaf CTAs target `/signup` | **VERIFIED** | `plans.ts:76-83`, `config.ts:68`, `Blocks.tsx:13/90`, `persona.ts:14` |
| Hard-coded `$49` inside the registry | **VERIFIED** | `compare.ts:83`, `compare.ts:488` |
| `llms.txt` pricing is a hand-typed sentence | **VERIFIED** | `llms.txt/route.ts:44` vs `config.ts:32+` |
| Team/Growth block checkout; Solo purchasable | **VERIFIED** | `checkout/route.ts:65`, `plans.ts:114-128` |
| Chrome Store URL still `placeholder` | **VERIFIED** | `config.ts:16` |
| CI runs `pnpm typecheck` + `pnpm test`; `validate:seo` is NOT in `next build` | **VERIFIED** | `deploy.yml:40-44`, `package.json:7`, `package.json:20` |
| Workspace vitest picks up `apps/*/src/**/*.test.ts` (so the SEO gates do run in CI) | **VERIFIED** | `vitest.config.ts:6-9` |
| Migration cost of a persona/role split ≈ 1.5–2 days | **MODELLED** | structure verified at `types.ts:18-31`, `registry.ts:30-62`, `metadata.ts:9-23` |
| Build ≈ 2–4.5 min; generation <15% of it | **MODELLED** | assumptions stated §5.1; not measured on CI |
| Validator O(n²) wall-clock table | **MODELLED** | structure verified `validate.ts:249-259`; constants estimated, not benchmarked |
| SSG becomes a problem at ~3,000–5,000 pages | **REASONED** | extrapolation from §5.1 generation rate + image-size pressure |
| Sitemap size is not a constraint below 50,000 URLs | **REASONED** | published Google limits vs current ~190 |
