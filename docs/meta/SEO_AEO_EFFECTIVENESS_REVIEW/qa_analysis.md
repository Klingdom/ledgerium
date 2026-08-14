# SEO/AEO Content Engine — QA Gate-Design Failure Analysis

**Agent:** qa-engineer
**Date:** 2026-08-13
**Mode:** Read-only. Zero code changed. Zero code proposed as diffs — findings only, with file:line evidence and fix direction.
**Trigger:** Live crawl (2026-08-13) found `/answers` returning 404 while listed in the live sitemap
(its 8 leaf pages return 200), and 19 live 200-status pages with no `<link rel="canonical">`. The
last full review, `SITE_STATE_REVIEW_002` (2026-07-07), reported the build-time SEO gate green and
"zero broken routes." This document explains why the gate did not — and structurally could not —
catch either defect, and specifies the regression gate that would.

---

## 0. Verdict, ranked by severity

| # | Severity | Finding | Status today |
|---|---|---|---|
| 1 | **P0 — live defect, user- and crawler-facing** | `/answers` hub returns 404. It is reachable from `sitemap.xml`, `llms.txt`, **and** the on-page breadcrumb + `BreadcrumbList` JSON-LD rendered on all 8 `answer` leaf pages. | Live now |
| 2 | **P0 — gate-design defect (root cause of #1)** | The sitemap generator asserts hub-index URLs by string literal with **zero verification** that the corresponding Next.js route exists. This is a general defect class, not a one-off typo. | Structural, unfixed |
| 3 | **P1 — gate-design defect** | The SEO content validator (`validateContent`) operates exclusively on the in-memory content registry (`ALL_PAGES`) and has no visibility into hand-built `page.tsx` files at all. It cannot see canonical tags, hub pages, or the route tree — by construction, not by oversight. | Structural, unfixed |
| 4 | **P1 — live defect** | 19 hand-built static pages ship zero `alternates.canonical`, all of them the exact 19 entries hardcoded in `apps/web-app/src/app/sitemap.ts:9-57`. | Live now, pre-existing |
| 5 | **P2 — gate-design gap** | `navConfig.test.ts` validates nav→route resolution, not sitemap→route resolution — the wrong direction to catch either defect above, and would not have caught #1 even in principle because `/answers` is not linked from the nav. | Structural |
| 6 | **P3 — informational, same defect class, opposite direction** | `/methodology` and `/comparisons` are real, canonical-bearing, nav-linked pages **absent from `sitemap.xml`** — proof the hardcoded route list drifts in both directions, not just toward false positives. | Live now |

---

## 1. What the validator checks, and what it structurally cannot check

**File:** `apps/web-app/src/lib/seo/validate.ts` (`validateContent`, called from
`apps/web-app/scripts/validate-seo-content.ts` and from
`apps/web-app/src/lib/seo/content.test.ts`, which runs under `pnpm test` in CI per
`.github/workflows/deploy.yml`'s `quality-gate` job).

`validateContent(pages: readonly SeoPage[] = ALL_PAGES)` is a **pure function over one input**:
`ALL_PAGES`, the flattened array of 164 typed content-registry objects (`workflow`, `software`,
`persona`, `problem`, `sopTemplate`, `aiOpportunity`, `department`, `industry`, `alternatives`,
`competitors`, `compare`, `answer`). Everything it checks is a property of that array:

- slug format / uniqueness within type (`validate.ts:191-197`)
- reserved-slug collision (`validate.ts:192`, via `isReservedSlug`)
- duplicate `metaTitle` / `metaDescription` across the whole set (`:199-202`)
- length bounds on `metaTitle` (30–65), `metaDescription` (120–160), `shortAnswer` (≤100 words) (`:204-208`)
- FAQ count bounds, required `originalDataPoint` / `honestLimitation` (`:210-213`)
- AEO fields: `mechanismIntro` dedupe, `keyTakeaways` count/length (`:215-232`)
- `updatedAt` parses as a date (`:234`)
- `PARENT_HUB[p.type]` is *defined* (`:236`) — see below, this is a near-miss, not a real check
- `related` tokens resolve to another entry in `ALL_PAGES` (`:238-241`)
- content-depth word floor and near-duplicate cosine similarity (`:244-259`)

**Every one of these is scoped to objects that are already members of `ALL_PAGES`.** Two whole
classes of page are invisible to this function by construction, not by bug:

1. **Hub/index pages** (`/answers`, `/workflow-library`, `/departments`, …). These are hand-built
   `page.tsx` files under `apps/web-app/src/app/(public)/`. They are never instantiated as
   `SeoPage` records — there is no `HubPage` type, no hub entry in `ALL_PAGES`. The validator's
   `pages` parameter never contains anything representing them, so nothing in the file can assert
   anything about them, including whether their route exists.

2. **Hand-built marketing/legal pages** (`/`, `/product`, `/pricing`, `/docs`, `/blog` + posts,
   `/support`, `/about`, `/security`, `/install`, `/privacy`, `/terms`, `/compare/scribe`, the 3
   `/use-cases/*` leaf pages). Same reason: these are not `SeoPage` records. Their `metadata`
   (including `alternates.canonical`, or its absence) is a static object literal exported directly
   from each `page.tsx` file (e.g. `apps/web-app/src/app/(public)/product/page.tsx:24-33`) — a code
   path `validateContent` never imports, never executes, never reads.

**The near-miss worth calling out explicitly:** `validate.ts:236` —
`if (PARENT_HUB[p.type] === undefined) errors.push(...)` — looks like it protects against exactly
this failure mode ("orphan" type with no parent hub). It does not. It only checks that a
`PARENT_HUB` *record* exists for the type (`{ label: 'Answers', path: '/answers' }` is a non-`undefined`
object), never that `PARENT_HUB[type].path` **resolves to an actual route**. For the `answer` type
this check passes cleanly — `PARENT_HUB.answer` is defined — while the path it points at 404s. The
rule's name ("orphan") and its actual assertion ("hub record exists in a TS `Record`") have quietly
diverged from what an orphan-detection rule should mean once hub pages stopped being guaranteed to
exist 1:1 with `PARENT_HUB` entries.

**Direct answer to the core question:** the validator cannot see the `/answers` 404 because the
404 is a property of the **Next.js route tree** (a `page.tsx` file that does or doesn't exist on
disk), and `validateContent` never touches the filesystem, the app router, or even the sitemap
generator that emits the offending URL. It validates *content correctness*, not *route existence*.
Those are different gates and only one of them was built.

---

## 2. Sitemap ↔ route drift: confirmed, with file:line, and shown to be structural

Two **independent**, hand-maintained arrays of URL string literals feed the sitemap, and neither is
checked against `apps/web-app/src/app/(public)/**`:

**A. Hub URLs — `apps/web-app/src/lib/seo/sitemap.ts:7-19, 38-46`**

```ts
const HUB_TYPES: readonly PageType[] = [
  'workflow', 'software', 'persona', 'problem', 'sopTemplate', 'aiOpportunity',
  'department', 'industry', 'alternatives', 'competitors', 'answer',
];
...
const hubs: MetadataRoute.Sitemap = HUB_TYPES.map((type) => ({
  url: `${base}${ROUTE_PREFIX[type]}`,
  ...
}));
```

`ROUTE_PREFIX['answer']` is `/answers` (`apps/web-app/src/content/registry.ts:42`). Nothing in this
function — or anywhere in the codebase — checks that
`apps/web-app/src/app/(public)/answers/page.tsx` exists before emitting the URL. It doesn't:

```
$ find "apps/web-app/src/app/(public)/answers" -type f
apps/web-app/src/app/(public)/answers/[slug]/page.tsx
```

Only the dynamic leaf route exists. There is no `answers/page.tsx`. All 10 of the other 11
`HUB_TYPES` entries **do** have a `page.tsx` at their `ROUTE_PREFIX` path (verified directly —
`workflow-library/page.tsx`, `sop-templates/page.tsx`, `ai-opportunities/page.tsx`,
`departments/page.tsx`, `software/page.tsx`, `industries/page.tsx`,
`use-cases/personas/page.tsx`, `use-cases/problems/page.tsx`, `alternatives/page.tsx`,
`competitors/page.tsx` all present). `answer` is the sole exception. This confirms the drift is not
theoretical — it has already happened once, in exactly the way this defect class predicts: a new
`PageType` was added, its hub-index page was never created, and nothing forced the omission to
surface before shipping.

**B. Hand-typed static entries — `apps/web-app/src/app/sitemap.ts:9-57`**

```ts
const staticEntries: MetadataRoute.Sitemap = [
  { url: `${baseUrl}/`, ... },
  { url: `${baseUrl}/product`, ... },
  ...
  { url: `${baseUrl}/terms`, ... },
];
```

19 literal URL strings, typed by hand, with **zero relationship** to the `src/app/(public)` file
tree. This is the exact same defect class as (A) — a hardcoded route list disconnected from the
route source of truth — and it is proven to drift **in the opposite direction** too: `/methodology`
and `/comparisons` are real routes (`apps/web-app/src/app/(public)/methodology/page.tsx`,
`.../comparisons/page.tsx`), both carry `alternates: { canonical: ... }`, and both are linked from
the primary nav (`navConfig.ts:120,156,166` — `res_methodology`, `sol_compare`/`res_compare`), yet
neither appears in `staticEntries` nor in the engine-generated hub/leaf sets. They are simply
missing from `sitemap.xml`. (`/demo` and `/install-extension` are correctly absent — both are
permanent redirects per `next.config.js:15-30`, so omission there is intentional, not a bug.)

**Conclusion for task 2:** yes, the sitemap and the actual route set can drift, in both directions,
because the sitemap is generated from two independently-authored literal-string arrays and neither
is ever cross-checked against `apps/web-app/src/app/(public)/**`. This is the root defect class.
`/answers` is simply the currently-live instance of it.

---

## 3. `navConfig.test.ts` coverage vs. the actual gap

**File:** `apps/web-app/src/components/nav/navConfig.test.ts`

This guard validates **nav → route**, not **sitemap → route**:

```ts
const validRoutes = new Set<string>([...STATIC_ROUTES, ...getPublishedPages().map(pagePath)]);
const leaves = collectLeaves(TOP_NAV);
it('every nav href resolves to a known static route or a published page', () => { ... });
```

Three separate reasons it would not, and could not, have caught either live defect:

1. **Wrong data source entirely.** It walks `TOP_NAV` (`navConfig.ts`) and checks membership
   against `STATIC_ROUTES` (a *third* hand-maintained literal array, `navConfig.test.ts:12-19`) and
   `getPublishedPages()`. It never imports or calls `sitemap()` or `generateSeoSitemapEntries()`.
   The two guards check disjoint graphs — there is no code path anywhere that checks "does every
   sitemap URL resolve," only "does every nav URL resolve."

2. **`/answers` is not in the nav at all.** Grep of `navConfig.ts` finds no `sol_answers` /
   `res_answers` entry — answer pages are reachable only via the sitemap, `llms.txt`, and the
   in-page breadcrumb (`apps/web-app/src/components/seo/Blocks.tsx:27-38`, which renders
   `<Link href={hub.path}>` for every leaf page's parent hub, and
   `apps/web-app/src/lib/seo/jsonLd.ts:21-32`, which emits the same URL as a `BreadcrumbList`
   `ListItem`). `navConfig.test.ts` structurally cannot see a route that no nav item points at,
   even if its design were otherwise perfect for this purpose.

3. **`STATIC_ROUTES` is itself the same defect class, dormant.** It is a fourth hand-typed array
   (`navConfig.test.ts:12-19`) asserting route existence by string literal, with no filesystem
   check. It currently happens to be accurate (every entry in it has a real `page.tsx`), but
   nothing prevents it from silently going stale the same way `HUB_TYPES` and `staticEntries` did —
   e.g. if `/methodology` or `/blog` were ever removed from disk, this test would keep passing
   while the corresponding nav links 404.

**Coverage matrix:**

| Guard | Direction checked | Left-hand data | Right-hand data | Catches `/answers` 404? | Catches missing canonical? |
|---|---|---|---|---|---|
| `content.test.ts` → `validateContent` | content correctness | `ALL_PAGES` | `ALL_PAGES` (self) | No — hubs aren't `SeoPage` records | No — hand-built pages aren't `SeoPage` records |
| `navConfig.test.ts` | nav → route | `TOP_NAV` hrefs | `STATIC_ROUTES` (hardcoded) ∪ `getPublishedPages()` | No — `/answers` isn't linked from nav | No — doesn't inspect `metadata` at all |
| *(none exists)* | sitemap → route | `sitemap()` output | filesystem `page.tsx` tree | — | — |
| *(none exists)* | static-page metadata completeness | `page.tsx` `metadata` exports | — | — | — |

The bottom two rows are the missing gate. See §5.

---

## 4. Other latent instances of the same defect class

**Hub-index gap (the `/answers` defect class), checked exhaustively across all 11 `HUB_TYPES`:**

| Type | `ROUTE_PREFIX` | `page.tsx` at hub root? |
|---|---|---|
| workflow | `/workflow-library` | ✅ |
| sopTemplate | `/sop-templates` | ✅ |
| aiOpportunity | `/ai-opportunities` | ✅ |
| department | `/departments` | ✅ |
| software | `/software` | ✅ |
| industry | `/industries` | ✅ |
| persona | `/use-cases/personas` | ✅ |
| problem | `/use-cases/problems` | ✅ |
| alternatives | `/alternatives` | ✅ |
| competitors | `/competitors` | ✅ |
| **answer** | **`/answers`** | **❌ — only `answers/[slug]/page.tsx` exists** |

`answer` is the sole live instance today. `/blog` (hand-built, not a `PageType` hub, not in
`HUB_TYPES`) has its own `page.tsx` and is fine. `compare` correctly has **no** public hub
(`PARENT_HUB.compare = null`, and `compare` is deliberately absent from `HUB_TYPES`) — that
carve-out is intentional and consistent.

**Reserved-slug carve-outs** (`RESERVED_SLUGS`, `registry.ts:68-74`), checked for the same
filesystem-existence gap: `compare/scribe`, `use-cases/operations`, `use-cases/compliance`,
`use-cases/ai-implementation` all have real `page.tsx` files, and — unlike the hub-index case —
this carve-out has genuine defense-in-depth: `isReservedSlug()` is checked in three independent
places for every `[slug]` route (`generateStaticParams` exclusion, `getPublishedPages()` sitemap
exclusion, and the request-time `notFound()` guard in the page component itself — verified present
in `compare/[slug]/page.tsx:11,22`, `software/[slug]/page.tsx:11`, `workflow-library/[slug]/page.tsx:11`,
`answers/[slug]/page.tsx:11,22`, and by pattern in the remaining `[slug]` families). No live defect
here today, but the underlying filesystem-existence assumption (`RESERVED_SLUGS` lists a page that
is presumed to exist as a hand-built route) is still asserted by convention only, never verified —
same root class, just currently accurate.

**Sitemap under-coverage** (opposite-direction instance of the same root cause): `/methodology`,
`/comparisons` — see §2B. Lower severity because omission from `sitemap.xml` degrades discovery
rather than breaking a live link, but it is the same "hardcoded literal array, never reconciled
against the route tree" defect, just manifesting as false negatives instead of false positives.

---

## 5. Proposed regression gate (design only — not implemented)

Two new deterministic, CI-runnable checks, structured to mirror the existing
`validate-seo-content.ts` / `content.test.ts` pattern (pure functions, zero network I/O, zero
`Date.now()`/`Math.random()`, fail loudly with actionable output). Both operate on the filesystem
route tree as ground truth — the one artifact neither existing guard currently reads.

### Gate A — Sitemap ↔ filesystem route parity

**New module**, e.g. `apps/web-app/src/lib/seo/routeParity.ts` + co-located
`routeParity.test.ts`, wired into `pnpm test` (and, for symmetry with the existing standalone
script, an optional `scripts/validate-routes.ts` CLI entry point for local/manual runs).

1. **Build `REAL_STATIC_ROUTES`** by recursively walking
   `apps/web-app/src/app/(public)` with Node's `fs.readdirSync` (no `next build` required — this
   is a source-tree walk, deterministic, fast). For every directory that contains a literal
   `page.tsx`, record its URL path with route-group segments (`(public)`) stripped. **Exclude**
   any path segment matching `/^\[.*\]$/` (dynamic segments — `[slug]`, `[token]`, `[...]`) from
   this set; those are handled by rule 3 below, not by literal-path matching.

2. **Build `DECLARED_ROUTES`** by importing and calling the actual `sitemap()` default export from
   `apps/web-app/src/app/sitemap.ts` (which internally calls `generateSeoSitemapEntries()`), then
   stripping `SITE_CONFIG.url` from each `.url` to get a path. This is the exact function that
   ships to production — testing its *output*, not a re-implementation of its logic, is what makes
   this a regression gate rather than a duplicate of the thing under test.

3. **Partition `DECLARED_ROUTES` into (a) leaf entries** — paths matching
   `${ROUTE_PREFIX[type]}/${slug}` for some `type`/`slug` pair — verified against
   `getPublishedPages()` (already effectively covered, but assert explicitly for completeness),
   and **(b) everything else** (home, hubs, and hand-built static pages).

4. **Assertion 1 (catches the `/answers` 404 directly):** every route in partition (b) must have an
   exact match in `REAL_STATIC_ROUTES`. Failure message format:
   `sitemap declares "${url}" but no page.tsx exists at "src/app/(public)${path}/page.tsx"` — this
   is the assertion that would have failed on `/answers` at the exact commit that introduced it
   (`625f929`, 2026-07-19), before it ever reached `main`.

5. **Assertion 2 (catches sitemap under-coverage, §2B/§4):** every entry in `REAL_STATIC_ROUTES`,
   minus a small explicit `EXCLUDE_FROM_SITEMAP` allowlist (auth flows —
   `/login`, `/signup`, `/forgot-password`, `/reset-password`; utility routes —
   `/share/[token]` already excluded by the dynamic-segment filter; anything the redirect table in
   `next.config.js` already redirects away from), must have a match in `DECLARED_ROUTES`. This is
   the assertion that would fail today for `/methodology` and `/comparisons`, forcing an explicit
   decision (add to sitemap, or add to the allowlist with a reason) rather than silent omission.

Both assertions are pure set-difference operations over two already-computed sets — no HTTP calls,
no browser, no `next build`, sub-second runtime, safe to run on every commit.

### Gate B — Static-page canonical presence

**New module**, e.g. `apps/web-app/src/lib/seo/canonicalCoverage.test.ts` (or fold into Gate A's
file — they share the `REAL_STATIC_ROUTES` filesystem walk).

Design choice: **source-text static analysis, not a runtime import of the page component.**
Dynamically `import()`-ing every `page.tsx` to introspect its `metadata` export would work in
principle, but it pulls in every component's full dependency graph (icons, images, client
components, possibly `next-auth`/env-dependent imports) purely to read one field — slow, brittle,
and prone to unrelated false failures. A source-text scan is faster, has zero import side effects,
and matches the existing codebase's own precedent of pure-data validation
(`validate.ts`'s `SLUG_RE` regex check is the same style of static analysis).

1. For every file in `REAL_STATIC_ROUTES` (built once and shared with Gate A), read the file text
   and locate the `metadata`-export block (`export const metadata: Metadata = { ... }`) or a
   `generateMetadata` function declaration.
2. **Assertion 1:** the block must contain an `alternates` key whose value contains `canonical`
   (regex on the order of `/alternates\s*:\s*\{[^}]*canonical/s`, or — more robustly — a small
   TypeScript AST walk via the `typescript` compiler API already available in the workspace, since
   regex-on-source is fragile against reformatting; AST is the more durable choice if this gate is
   actually built). Failure message: `"${file}" ships export const metadata with no alternates.canonical — SEO_AEO_EFFECTIVENESS_REVIEW P1-4"`.
   This assertion, run today, fails on exactly the 19 files enumerated in §0 and nothing else —
   confirmed by direct inspection (`grep -c alternates` across every non-`[slug]` `page.tsx` under
   `(public)`, tabulated in the crawl that motivated this review).
3. **Assertion 2 (stretch, lower priority):** where the canonical value is a statically-extractable
   string literal (the 11 hub pages that already do this correctly, e.g.
   `alternates: { canonical: '/workflow-library' }`), assert it equals the page's own derived route
   path — this catches copy-paste canonical mistakes (a page whose canonical literal points at a
   *different* page, which is a worse defect than a missing one because it actively tells search
   engines to deduplicate against the wrong URL). Not required to close the immediate gap; flagged
   here so it isn't lost if Gate B is built as a real deliverable.

### Wiring

Both gates should run as part of the existing `pnpm test` suite (already the actual CI enforcement
point — `content.test.ts` runs under `pnpm test` in `.github/workflows/deploy.yml`'s `quality-gate`
job; there is **no separate CI step for `validate:seo`** — the standalone script is a
local/manual-run convenience with pretty console output, but the gate that actually blocks `main`
is the vitest suite). No new CI wiring is needed beyond adding the new `*.test.ts` files — they
will be picked up automatically. If a standalone `pnpm validate:routes` script is added to mirror
`validate:seo`, it should be added explicitly to `deploy.yml`'s `quality-gate` job for symmetry, or
left as vitest-only like `content.test.ts` currently is.

---

## 6. Was `SITE_STATE_REVIEW_002` wrong, or did the defects appear afterward?

**Assessed separately per defect — they have different timelines and different verdicts.**

**`/answers` 404 — the review was correct at the time; the defect was introduced 12 days later.**
`SITE_STATE_REVIEW_002` is dated 2026-07-07 and states "all 124 SEO pages validate; all 11 dynamic
`[slug]` families have correct `generateStaticParams` + `notFound()` guards... Zero broken routes."
At that date the `answer` page type did not exist. It was introduced in commit `625f929`
(`feat(seo): AEO answer page type — 8 definitional pages + DefinedTerm/Speakable seams`), dated
**2026-07-19 08:43:05 -0600** — twelve days after the review. That commit added
`answers/[slug]/page.tsx`, added `'answer'` to `HUB_TYPES` in `lib/seo/sitemap.ts` (+1 line, per
the commit's own diffstat), and added the `PARENT_HUB.answer` / `ROUTE_PREFIX.answer` entries — but
never added `answers/page.tsx`. There is exactly one commit touching that path in the repository's
entire history (`git log` confirms), so this was not a later regression on top of working code —
the hub index was simply never built in the commit that should have shipped it, and no gate existed
to catch the omission (per §1–§3 above). **Verdict: `SITE_STATE_REVIEW_002`'s "zero broken routes"
claim was true when written and became false 12 days later.** This is a real gap in the review
cadence (a gate-less feature landed after the last full review and before the next one), not an
error in the review itself.

**19 missing-canonical pages — pre-existing, predates the review, and the review never claimed
otherwise.** `git log` on `apps/web-app/src/app/(public)/product/page.tsx` traces back to the
original marketing-site build (`35ca610 feat(web-app): marketing site Wave 1 — nav, routing,
product page, docs`), long before the `lib/seo/*` content engine existed. These pages were
hand-authored outside the content-registry system from day one and never had `alternates.canonical`
in their design. `SITE_STATE_REVIEW_002`'s SEO row in its validation table says
`SEO content validation (lib/seo/content.test.ts, 124 pages) | 0 errors` — a **narrowly and
accurately scoped claim** about the 124 registry-driven pages that existed at the time. It does not
claim canonical coverage for hand-built pages anywhere in the document, and a search of the review
finds no mention of the 19 static pages' metadata at all. **Verdict: not wrong — out of scope by
construction, the same way `validateContent` is out of scope by construction (§1).** The defect is
real and has been live since each page was authored; it simply sits in a part of the site no
existing artifact (review or automated gate) has ever been designed to examine.

**Net assessment:** `SITE_STATE_REVIEW_002` should not be graded as having missed these — one
defect postdates it, and the other was never within any stated or implied scope of its SEO checks.
The actionable finding is forward-looking: the site currently has **zero gate** that would catch
either class again, and §5 specifies the one that would.

---

## 7. Handoff

**Validated:** the exact structural reason the build-time gate passed while `/answers` 404s and 19
pages ship without canonical, confirmed with file:line citations against live source; the sitemap↔
route drift is bidirectional and already has two live instances (§2, §4); `navConfig.test.ts`
checks a different graph in a different direction and would not have caught either defect even in
principle (§3).

**Passed:** nothing new is claimed passing — this is a defect-and-gate-design report, not a
release-readiness sign-off.

**Failed / blocking:**
- P0 `/answers` hub 404 — user-facing broken link on 8 live pages' breadcrumbs + structured data,
  plus sitemap/`llms.txt` exposure. Needs a hub `page.tsx` (implementation, not this report's scope).
- P1 19 pages missing `alternates.canonical` — silent duplicate-content/indexing risk on high-value
  pages (home, pricing, product).
- P0/P1 gate-design gap — no regression protection exists for either class today; will recur on the
  next hub-type addition or hand-built page absent explicit process discipline.

**Recommended next action:** hand this artifact to `backend-engineer` or `frontend-engineer` (per
CLAUDE.md role boundaries — implementation is not qa-engineer's role) to (a) add
`apps/web-app/src/app/(public)/answers/page.tsx`, (b) backfill `alternates.canonical` on the 19
enumerated pages, and to `system-architect`/`qa-engineer` jointly to build Gate A + Gate B from §5
as the permanent regression protection, before either defect is closed as "fixed" without a test
that would catch its recurrence.

**File:line index of every citation in this report:**
- `apps/web-app/src/lib/seo/validate.ts:178-262` (`validateContent`), `:236` (near-miss orphan check)
- `apps/web-app/scripts/validate-seo-content.ts:1-29`, `apps/web-app/src/lib/seo/content.test.ts:1-57`
- `apps/web-app/src/lib/seo/sitemap.ts:7-19,38-46` (`HUB_TYPES`, hub URL generation)
- `apps/web-app/src/app/sitemap.ts:9-71` (`staticEntries`, merge logic)
- `apps/web-app/src/content/registry.ts:30-44` (`ROUTE_PREFIX`), `:47-62` (`PARENT_HUB`), `:68-79` (`RESERVED_SLUGS`/`isReservedSlug`)
- `apps/web-app/src/app/(public)/answers/[slug]/page.tsx:1-22` (exists); `apps/web-app/src/app/(public)/answers/page.tsx` (does not exist)
- `apps/web-app/src/components/nav/navConfig.test.ts:1-62`, `apps/web-app/src/components/nav/navConfig.ts:1-187`
- `apps/web-app/src/components/seo/Blocks.tsx:27-44` (`Breadcrumbs`, renders `/answers` link)
- `apps/web-app/src/lib/seo/jsonLd.ts:21-32` (`breadcrumbs`, emits `/answers` in `BreadcrumbList`)
- `apps/web-app/src/app/llms.txt/route.ts:1-63` (emits `Index: ${base}/answers`)
- `apps/web-app/src/lib/seo/metadata.ts:29-55` (`generateSeoMetadata`, sole `alternates.canonical` emitter)
- `apps/web-app/src/app/(public)/product/page.tsx:24-33` (representative hand-built page, no canonical)
- `apps/web-app/next.config.js:15-30` (redirects: `/demo`, `/install-extension`, `/docs.html`)
- `.github/workflows/deploy.yml:23-40` (`quality-gate` job: `pnpm typecheck` + `pnpm test`, no separate `validate:seo` step)
- Commit `625f929` (2026-07-19 08:43:05 -0600) — introduces `answer` type and the `/answers` gap
- `docs/meta/SITE_STATE_REVIEW_002.md:4,14,29-36` — review date and validation-baseline table
