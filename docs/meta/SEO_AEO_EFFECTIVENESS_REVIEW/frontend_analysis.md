# Frontend Technical SEO/AEO Implementation Audit — `apps/web-app`

**Scope:** read-only static analysis of `apps/web-app` against the live crawl performed 2026-08-13
(`https://ledgerium.ai/sitemap.xml` = 194 URLs, 193 × 200, `/answers` = 404; 19 pages with no
`<link rel="canonical">`; median 1127 rendered words). No product code was changed to produce this
report. All findings are cited `file:line` against the current `main` branch working tree.

**Verification method:** direct source inspection, `git log`/`git show` on the commits that
introduced the affected surfaces, and one live tool run — `npx tsx scripts/validate-seo-content.ts`
— which confirmed the repo's own content-quality gate passes cleanly (`164 pages passed the quality
gate`), which is the baseline that makes the two live defects notable: they sit **outside** every
existing automated check, not inside a check that's silently failing.

---

## Executive summary

Two independent architectural facts explain both live defects:

1. **The content-registry pipeline (164 programmatic pages, 11 hub types) and the hand-built
   marketing/legal shell (19 static pages) are two parallel systems that only partially share
   conventions.** The registry pipeline has a deterministic metadata generator
   (`generateSeoMetadata()`) that always sets canonical, and a build-time validator
   (`validateContent()`) that enforces title/description length, duplication, content depth, and a
   *data-presence* orphan check. The hand-built pages have neither — each one hand-authors its own
   `Metadata` object with no shared generator and no gate.
2. **Nothing in the repo cross-checks that every entry in `HUB_TYPES` / `ROUTE_PREFIX` /
   `PARENT_HUB` (pure data, `src/content/registry.ts`) actually resolves to a real Next.js route
   file.** The sitemap, breadcrumbs, `DefinedTerm` schema, and `llms.txt` all mechanically derive
   URLs from that data. When a route file is missing, all four surfaces confidently emit a URL that
   404s — and the repo's orphan check (`validate.ts:236`) only tests that the *map entry* exists, not
   that the *route* exists, so it cannot catch this class of bug.

Both defects are structural gaps in the SEO tooling, not one-off typos — worth fixing at the
tooling layer (add a route-existence check + a shared canonical helper), not just patching the two
symptoms.

---

## P0 — indexation-blocking, confirmed live

### P0-1. `/answers` hub 404s — missing route file, referenced from 4 separate surfaces

**Root cause.** `src/app/(public)/answers/` contains only `[slug]/page.tsx`
(`src/app/(public)/answers/[slug]/page.tsx:1-32`). There is no `src/app/(public)/answers/page.tsx`.
Every other entry in `HUB_TYPES` (`src/lib/seo/sitemap.ts:7-19`) has a corresponding hand-authored
hub file using the shared `HubIndex` component — confirmed by directory listing:

```
src/app/(public)/workflow-library/page.tsx   ✓ uses HubIndex
src/app/(public)/software/page.tsx           ✓ uses HubIndex
src/app/(public)/alternatives/page.tsx       ✓ uses HubIndex
src/app/(public)/competitors/page.tsx        ✓ uses HubIndex
src/app/(public)/ai-opportunities/page.tsx   ✓ uses HubIndex
src/app/(public)/departments/page.tsx        ✓ uses HubIndex
src/app/(public)/industries/page.tsx         ✓ uses HubIndex
src/app/(public)/sop-templates/page.tsx      ✓ uses HubIndex
src/app/(public)/use-cases/personas/page.tsx ✓ uses HubIndex
src/app/(public)/use-cases/problems/page.tsx ✓ uses HubIndex
src/app/(public)/answers/page.tsx            ✗ DOES NOT EXIST
```

`HubIndex.tsx:14-16` even documents "the completeness gate for the **10** hub pages that render
through this shared component" — the comment is itself stale evidence that `answer` (an 11th
`HUB_TYPES` member) was never wired in. `git show --stat 625f929` (`feat(seo): AEO answer page
type — 8 definitional pages + DefinedTerm/Speakable seams`, 2026-07-19) shows the commit added
`content/pages/answer.ts`, `app/(public)/answers/[slug]/page.tsx`, and the registry/sitemap/jsonLd
wiring — but never created the parent `page.tsx`. This is a one-time feature-authoring omission,
not a regression.

**Why every existing guard missed it:**
- `src/lib/seo/validate.ts:236` — `if (PARENT_HUB[p.type] === undefined) errors.push(...)`. This
  only checks that the `PARENT_HUB` *map* has an `answer` key (it does,
  `src/content/registry.ts:60`) — it never checks that `PARENT_HUB[p.type].path` resolves to a real
  route. `pnpm validate:seo` therefore reports 164/164 clean while the hub is 404.
- `src/lib/seo/sitemap.ts:38-46` mechanically emits `${base}${ROUTE_PREFIX[type]}` for every
  `HUB_TYPES` member with zero route-existence check.
- No test in the repo asserts canonical/route presence (`grep -rn canonical **/*.test.ts*` returns
  only unrelated `canonicalHash.test.ts` matches).
- No Playwright/e2e crawl of `sitemap.xml` exists (`e2e/` has no sitemap-integrity spec).

**Blast radius — the broken URL is embedded in 4 places, not 1:**

| Surface | File:line | Effect |
|---|---|---|
| `sitemap.xml` | `src/lib/seo/sitemap.ts:38-46` (`HUB_TYPES` includes `'answer'`) | Googlebot/Bingbot fetch a 404 from the sitemap itself |
| Visible breadcrumb link (all 8 answer leaf pages) | `src/components/seo/Blocks.tsx:27-38` (`Breadcrumbs`, `hub.path` from `PARENT_HUB`) | Real, crawlable `<a href="/answers">` on every answer page points to a 404 |
| `BreadcrumbList` JSON-LD (same 8 pages) | `src/lib/seo/jsonLd.ts:21-32` (`breadcrumbs()`) | Structured-data breadcrumb trail contains a 404'd `item` URL |
| `DefinedTerm.inDefinedTermSet.url` (same 8 pages) | `src/lib/seo/jsonLd.ts:106-110` — hardcoded `` `${SITE_CONFIG.url}/answers` `` (bypasses `PARENT_HUB` entirely, a second independent hardcode of the same broken path) | AEO/LLM consumers parsing `DefinedTerm` get a dead glossary-index URL |
| `/llms.txt` "Index:" line for the **first** content section | `src/app/llms.txt/route.ts:43-48` (`if (hub) lines.push('Index: ${base}${hub.path}')`) | The AEO-specific discovery file — the exact surface this whole review is about — leads with a 404. `answer` is first in `TYPE_ORDER` (`route.ts:13`), so this is the very first indexed link an LLM crawler encounters after the "Key entry points" block. |

**Compounding factor — the hub is also absent from primary nav.** `grep -n "answers" src/components/nav/navConfig.ts` returns zero matches. So even after the route file is created, the hub page will have no inbound link from the site's persistent navigation; it will only be reachable via sitemap.xml, `llms.txt`, and the (currently-broken) breadcrumb/JSON-LD links on its own 8 children. Until the hub exists, the 8 answer leaf pages are effectively a **semi-orphaned cluster** — their only guaranteed inbound links are the sitemap entries themselves and the 22 curated `related` cross-links between the 8 pages (per the introducing commit message); any inbound links from other page types depend on non-guaranteed tag-overlap matches in `getRelatedPages()` (`src/lib/seo/related.ts:44-76`, pool defaults to all 164 pages, ranks by tag overlap — there is no explicit `answer:` token anywhere in the other 11 content files, confirmed by grep).

**Proposed fix (not implemented):**
1. Create `src/app/(public)/answers/page.tsx`, mirroring the 10 working hubs exactly (e.g.
   `src/app/(public)/workflow-library/page.tsx:1-22`): `export const metadata` with
   `alternates: { canonical: '/answers' }`, and render
   `<HubIndex ... pages={getPagesByType('answer').filter(p => p.published)} hubType="answer" />`.
2. Add an `/answers` entry point to `navConfig.ts` (e.g. under the existing "Learn" column,
   `src/components/nav/navConfig.ts:149-158`) so the cluster isn't nav-orphaned once live.
3. Close the systemic gap, not just this instance: add a build-time (or `validate:seo`-time) check
   that every `HUB_TYPES` entry in `src/lib/seo/sitemap.ts` has a corresponding
   `src/app/(public)/<prefix>/page.tsx` on disk. This is what should have caught it, and will catch
   the next one.

---

### P0-2. 19 hand-built pages emit zero `<link rel="canonical">`

**Confirmed defect set** (grep of every hand-built `page.tsx` under `src/app/(public)` for
`alternates`/`canonical` — zero matches on all 19; each has only a plain `export const metadata`):

`/`, `/product`, `/pricing`, `/docs`, `/blog`, `/blog/capture-before-you-automate`,
`/blog/screenshot-tools-vs-structured-capture`, `/blog/what-is-process-intelligence`,
`/blog/why-your-sops-are-already-outdated`, `/support`, `/about`, `/security`, `/install`,
`/privacy`, `/terms`, `/compare/scribe`, `/use-cases/operations`, `/use-cases/compliance`,
`/use-cases/ai-implementation`.

This set is **exactly** the static URL array in `src/app/sitemap.ts:9-57` — clean confirmation that
DEFECT 2 maps 1:1 to "every page whose sitemap entry is hand-written rather than
registry-generated."

**Root cause — two parallel metadata paths that were never reconciled:**
- Registry-driven pages use `generateSeoMetadata()` (`src/lib/seo/metadata.ts:29-55`), which
  **unconditionally** sets `alternates: { canonical: url }` at line 36. All 164 programmatic pages,
  plus 2 of the hand-built pages that reuse the same convention manually — `/comparisons`
  (`src/app/(public)/comparisons/page.tsx:11`, `alternates: { canonical: '/comparisons' }`) and
  `/methodology` (`src/app/(public)/methodology/page.tsx:9`) — correctly have canonicals.
- The 19 defect pages predate the registry engine (the marketing shell was built in commit
  `c48e138 feat: marketing site, public pages, logo integration, and copy polish`, before the SEO
  engine existed) and were never retrofitted with `alternates.canonical` when the engine's
  convention was established. `/comparisons` and `/methodology` prove the fix pattern was already
  known and used elsewhere in the same codebase — it just wasn't applied consistently to the
  original 19.
- `metadataBase` is set once, in `src/app/layout.tsx:13`. This is easy to mistake for "canonical is
  handled globally," but Next.js's Metadata API only uses `metadataBase` to resolve **relative
  asset URLs** (OG/Twitter images) — it does **not** synthesize a `<link rel="canonical">` tag from
  it. Confirmed: no page emits a canonical unless `alternates.canonical` is explicitly set.
- No test/lint gate checks canonical presence on non-registry pages (same evidence as P0-1: `grep`
  for `canonical` across `*.test.ts*` finds nothing relevant).

**Impact.** The three highest-intent, highest-traffic pages on the entire site — homepage,
`/product`, `/pricing` — have no canonical, alongside `/docs`, the blog index + 4 posts, and 8 more
marketing/legal pages. These are exactly the pages most likely to accumulate query-string variants
from paid/email traffic (`?utm_*`, `?ref=`), which without a canonical tag are the pages most at
risk of being indexed as separate, ranking-diluting URLs.

**Proposed fix (not implemented):** add `alternates: { canonical: '<path>' }` to each of the 19
`metadata` objects — a one-line addition per file, following the exact pattern already used
correctly by `/comparisons` and `/methodology` in the same tree. Recommend extracting a tiny shared
helper (e.g. `staticPageMetadata(path, {...})`) so future hand-built pages can't repeat this
omission — mirrors the intent behind `generateSeoMetadata()` for the registry side.

---

## P1 — real degradation, not indexation-blocking

### P1-1. Same 19 hand-built pages: title/description length bounds violated, uncovered by any gate

The repo's own `validateContent()` (`src/lib/seo/validate.ts:204-205`) enforces `metaTitle` 30–65
chars and `metaDescription` 120–160 chars for the 164 registry pages, and — confirmed by running it
— currently passes 164/164 cleanly (`npx tsx scripts/validate-seo-content.ts` → `OK — 164 pages
passed the quality gate`). That gate has **no visibility into the 19 hand-built pages** (they are
not in `ALL_PAGES`). Manually measuring the same fields on those 19 files against the team's own
stated bounds:

| Page | Title (chars) | Over 65? | Description (chars) | Over 160? |
|---|---|---|---|---|
| `/` (`src/app/(public)/page.tsx:23`) | 75 | yes | 189 | yes |
| `/product` (`.../product/page.tsx:25`) | 56 | — | 174 | yes |
| `/pricing` (`.../pricing/page.tsx`) | 72 | yes | 182 | yes |
| `/docs` | 70 | yes | 168 | yes |
| `/blog` | 58 | — | 138 | — |
| `/blog/capture-before-you-automate` | 42 | — | 163 | yes |
| `/blog/screenshot-tools-vs-structured-capture` | 78 | yes | 160 | — |
| `/blog/what-is-process-intelligence` | 67 | yes | 175 | yes |
| `/blog/why-your-sops-are-already-outdated` | 49 | — | 118 | — |
| `/support` | 56 | — | 153 | — |
| `/about` | 64 | — | 177 | yes |
| `/security` | 73 | yes | 180 | yes |
| `/install` | 57 | — | 182 | yes |
| `/privacy` | 64 | — | 171 | yes |
| `/terms` | 64 | — | 157 | — |
| `/compare/scribe` | 65 | (borderline) | 199 | yes |
| `/use-cases/operations` | 69 | yes | 170 | yes |
| `/use-cases/compliance` | 73 | yes | 168 | yes |
| `/use-cases/ai-implementation` (`.../use-cases/ai-implementation/page.tsx:20-22`) | 81 | yes | 180 | yes |

7 of 19 titles exceed 65 chars (one — `/use-cases/ai-implementation` — by 16 chars); 12 of 19
descriptions exceed 160 chars (several by 20–40 chars, e.g. `/compare/scribe` at 199). These are
concentrated on the pages most likely to be clicked from a SERP (home, pricing, product, security),
so the practical effect is truncated/reflowed snippets on exactly the pages where a clean,
intentional snippet matters most for CTR.

**Proposed fix (not implemented):** trim to the same 30–65 / 120–160 bounds already enforced
elsewhere in this codebase, and extend `validateContent()` (or a small sibling check) to also cover
the 19 static pages so this can't silently regress again.

### P1-2. Duplicate, inconsistent `Organization` JSON-LD on every one of the 164 leaf pages

`src/app/layout.tsx:38-61` emits a sitewide `@graph` with `@id`-linked `WebSite` + `Organization`
nodes on **every** page (this is correct practice — `WebSite.publisher` references
`{'@id': '${SITE_URL}/#organization'}`, and each leaf page's own `webPage()` JSON-LD correctly
references the same `WebSite` by `@id`: `src/lib/seo/jsonLd.ts:42`,
`isPartOf: {'@id': '${SITE_CONFIG.url}/#website'}`).

However, every leaf page whose `jsonLd` array includes `'Organization'` (all 4 observed
combinations in `src/content/pages/*.ts` do) **also** emits a second, independent `Organization`
object via `organization()` (`src/lib/seo/jsonLd.ts:8-19`) that:
- has **no** `@id`, so it is not linked to the sitewide graph at all (a second, disconnected entity
  rather than a reference to the first), and
- has a **different** `knowsAbout` array — 4 items (`jsonLd.ts:16`) vs. the root layout's 5 items
  including `'AI integration'` (`layout.tsx:57`) — i.e. the same real-world entity is described with
  two different fact sets in the same document.

This is a data-consistency defect a structured-data validator will flag as two distinct
`Organization` entities on one page, not a rich-result blocker but a real correctness gap.

**Proposed fix (not implemented):** drop the per-page `organization()` emission entirely (the
sitewide `@id`-linked one in `layout.tsx` already covers every page), or convert it to reference
`{'@id': '${SITE_CONFIG.url}/#organization'}` instead of restating the entity.

### P1-3. Structured-data completeness gaps vs. Google's recommended (not required) properties

- `Article` (`src/lib/seo/jsonLd.ts:67-83`) has no `image` property. Google's Article guidelines
  list `image` as recommended for Article Discover/Top-Stories eligibility.
- `Article.publisher` (`jsonLd.ts:81`) and the standalone `organization()` object both omit `logo`
  — recommended on `Organization`/`publisher` for logo display in rich results and Knowledge Panel
  treatments.

Neither is required for basic validity and neither affects the FAQ/HowTo AEO-only framing this
review is checking; flagged because they're cheap, high-leverage additions once P1-2 is resolved
(the fix for one naturally touches the other).

### P1-4. Two live, canonical'd, nav-linked pages are absent from `sitemap.xml`

`/comparisons` (`src/app/(public)/comparisons/page.tsx`, linked from nav twice —
`navConfig.ts:120` footer link and `navConfig.ts:166` Company column — and itself lists all 10
`compare`-type leaf pages via `getPagesByType('compare')`) and `/methodology`
(`src/app/(public)/methodology/page.tsx`, linked from nav — `navConfig.ts:156`) are not present in
either the static array (`src/app/sitemap.ts:9-57`) or `generateSeoSitemapEntries()`
(`src/lib/seo/sitemap.ts`, since neither is a `PageType`). They are still crawlable via nav links
(not orphans in the strict sense), but they receive no sitemap-driven `lastmod`/`priority` signal
and are inconsistent with the sitemap otherwise being the canonical list of indexable public pages.

**Proposed fix (not implemented):** add both to the static array in `src/app/sitemap.ts:9-57`.

---

## P2 — lower impact / hygiene

### P2-1. Answer-cluster orphan risk (downstream of P0-1)

Until P0-1 and the nav gap are both fixed, the 8 `/answers/*` leaf pages are reachable only via (a)
their own sitemap entries, (b) the 22 curated intra-cluster `related` links between the 8 pages
themselves, and (c) non-guaranteed tag-overlap matches surfaced by `getRelatedPages()`
(`src/lib/seo/related.ts:44-76`) from unrelated page types. There is no deliberate, curated inbound
link from any other content type into the answer cluster (`grep -rn "'answer:" src/content/pages/`
outside `answer.ts` itself returns zero matches). Once the hub exists this resolves itself for the
hub→leaf hop, but cross-type inbound linking (e.g. a `workflow` or `problem` page explicitly citing
a relevant "what is X" definition) remains opportunity, not a defect.

### P2-2. Unused 889 KB image asset, byte-identical in size to the flagged extension icon

`public/img/ledgerium_recorder_logo.png` is 910,663 bytes, 1024×1024 PNG. `grep -rn
ledgerium_recorder_logo src/` returns **zero** references anywhere in the app — it is not linked
from any page, `<Image>`, favicon config, or metadata object. It is not a live page-weight risk
(unreferenced files aren't requested by a browser), but its file size is byte-identical to
`apps/extension-app/icons/icon-128.png` (also 910,663 bytes, flagged in the prompt) — strong
circumstantial evidence both are the same unoptimized master export dropped into two trees without
compression. Worth a one-off image-optimization pass across `public/img/` generally (several
demo/screenshot PNGs in the 200–600 KB range — `sop-view.png` 607 KB, `report-view.png` 507 KB,
`workflow-view.png` 261 KB) even though the pages that reference them do use `next/image` with
explicit dimensions (confirmed in `src/app/(public)/product/page.tsx:221-248` — no `unoptimized`
flag present in `next.config.js`, so Next's built-in image optimizer resizes/re-encodes at request
time; risk here is source-file bloat and build/deploy size, not necessarily delivered bytes).

### P2-3. Two fully-built page trees are permanently unreachable (dead code, not a live risk)

`src/app/(public)/demo/page.tsx` (219 lines) and `src/app/(public)/install-extension/page.tsx` (247
lines) can never be served: `next.config.js` (`redirects()`) permanently 308-redirects `/demo` →
`/product` and `/install-extension` → `/install` before Next.js resolves to these route files.
Confirmed no redirect chains (`/demo`→`/product`, `/install-extension`→`/install`, `/docs.html`→
`/docs` are each single-hop; `src/middleware.ts` only matches authenticated app routes and does not
interact with public marketing paths). Not an indexation issue — flagging so the dead files aren't
mistaken for live content during a future edit, and so nobody links to `/demo`/`/install-extension`
expecting the shadowed content to render.

### P2-4. Observational — content depth and word-floor context

The user-supplied crawl reported `/blog` (the hand-built index page, not a registry content leaf)
at 370 words, below the registry's `WORD_FLOOR_LEAF = 400` (`src/lib/seo/validate.ts:12`). This
floor only applies to `proseSources()` on the 164 registry pages (`validate.ts:24-150`, gated at
line 245) — `/blog` is outside `ALL_PAGES` entirely, so this is not a gate violation, just a note
that the hand-built shell has no equivalent content-depth expectation at all, consistent with the
broader theme of this audit (no shared quality bar between the two systems).

---

## Confirmed NOT a defect (verified against the prompt's stated concern)

### Rendering / SSG status — `force-dynamic` was removed, not "left intact"

The prompt asked to check whether an iter-098 `force-dynamic` fix in the `(public)` layout was
"left intact" and undermining SSG/indexability. Current source shows the opposite:
`src/app/(public)/layout.tsx:4-16` contains a NOTE documenting that `force-dynamic` **was removed**
(commit `c9e8912 perf(seo): restore SSG for public pages by removing redundant force-dynamic`,
following the earlier `0ae7424 fix(web): force-dynamic public pages to resolve hydration
mismatch`). The hydration mismatch that originally motivated `force-dynamic` (React #418/#425 from
`PublicNav`'s auth-conditional CTA) is now handled correctly at the component level: `PublicNav.tsx`
uses a `mounted` gate (`PublicNav.tsx:38-40`) so server HTML and first client paint both render the
logged-out CTA, and only swaps to the authenticated state post-mount — this is the textbook-correct
fix (server/client markup parity) rather than the blunt `force-dynamic` workaround. No
`export const dynamic = 'force-dynamic'` (or similar override) exists anywhere under
`src/app/(public)/` today (confirmed by grep). All 12 dynamic-segment leaf routes
(`workflow-library/[slug]`, `software/[slug]`, `alternatives/[slug]`, `competitors/[slug]`,
`ai-opportunities/[slug]`, `departments/[slug]`, `industries/[slug]`, `sop-templates/[slug]`,
`use-cases/personas/[slug]`, `use-cases/problems/[slug]`, `compare/[slug]`, `answers/[slug]`) export
`generateStaticParams()` and contain no `'use client'` at the route level, confirming genuine SSG
with content in the server-rendered HTML, not client-only rendering. (Note: the local `.next/`
build artifact in this checkout is stale — `BUILD_ID` dated 2026-07-01, predating the `/answers`
feature entirely — so it was not used as evidence for this conclusion; the source-code
configuration above is definitive on its own.)

### FAQPage / HowTo — deprecated-rich-result framing matches implementation

`src/lib/seo/jsonLd.ts:136-140` documents: "FAQPage and HowTo no longer produce Google rich results
... emitted for LLM / answer-engine semantic parsing only." The implementation matches that stated
intent cleanly:
- `FAQPage` only emits when `page.faqs.length > 0` (`jsonLd.ts:156`), and `faqs.length` is bound to
  3–10 by `validateContent()` (`validate.ts:210`) — no empty/thin FAQ blocks ship.
- `HowTo` only emits when a `steps` source exists for the page's type (`jsonLd.ts:114-134`,
  null-guarded at the call site `jsonLd.ts:164-168`) — no HowTo without steps.
- `DefinedTerm` is correctly gated to `type === 'answer'` only (`jsonLd.ts:98-99`).
- `Speakable`'s two target selectors, `.seo-answer` and `.seo-datapoint`
  (`jsonLd.ts:51`), are confirmed present in the rendered DOM on every leaf template:
  `.seo-answer` from `SeoHero` (`Blocks.tsx:85`) and `.seo-datapoint` from `DataPointCallout`
  (`Blocks.tsx:111-118`), the latter called unconditionally in all 12 `*PageView.tsx` components
  against the required `originalDataPoint` field (confirmed present in all 164 pages via grep count
  match). Speakable never points at a selector that doesn't exist on the page.

This is a clean pass — no action needed, called out explicitly per the review's task list.

### robots.txt / noindex / hreflang / redirect chains

- `src/app/robots.ts` allows `/` broadly, disallows only `/api/`, `/dashboard/`, `/settings/`,
  `/share/` (all correctly non-public/authenticated surfaces), and links `sitemap.xml`. No blanket
  disallow.
- No `noindex` found anywhere under `src/app/(public)`; `generateSeoMetadata()` sets `robots: {index:
  false}` only for `!page.published` (`metadata.ts:37-39`) and all 164 pages currently have
  `published: true` (confirmed via grep for `published: false` — zero matches).
- No i18n/hreflang setup exists (`next-intl`, `i18n` config both absent) — single-locale site,
  consistent, not a gap.
- No redirect chains: all 3 entries in `next.config.js` `redirects()` are single-hop, and
  `src/middleware.ts` only matches `(app)` authenticated routes, never intersecting public marketing
  paths.

---

## Summary table

| ID | Severity | Finding | Primary citation |
|---|---|---|---|
| P0-1 | **P0** | `/answers` hub 404s; broken URL embedded in sitemap, breadcrumbs, `BreadcrumbList` JSON-LD, `DefinedTerm` JSON-LD, and `llms.txt` | `src/app/(public)/answers/` (missing `page.tsx`) |
| P0-2 | **P0** | 19 hand-built pages emit no `<link rel="canonical">`, including `/`, `/product`, `/pricing` | 19 files under `src/app/(public)/*` — see list above |
| P1-1 | P1 | Same 19 pages violate the repo's own title/description length bounds, uncovered by `validateContent()` | manual measurement vs. `src/lib/seo/validate.ts:204-205` |
| P1-2 | P1 | Duplicate, inconsistent `Organization` JSON-LD (disconnected `@id`, differing `knowsAbout`) on all 164 leaf pages | `src/lib/seo/jsonLd.ts:8-19` vs. `src/app/layout.tsx:38-61` |
| P1-3 | P1 | `Article`/`Organization` JSON-LD missing recommended `image`/`logo` | `src/lib/seo/jsonLd.ts:67-83` |
| P1-4 | P1 | `/comparisons`, `/methodology` live + canonical'd + nav-linked but absent from sitemap.xml | `src/app/sitemap.ts:9-57` |
| P2-1 | P2 | Answer-cluster has no curated cross-type inbound links (downstream of P0-1) | `src/lib/seo/related.ts:44-76` |
| P2-2 | P2 | Unused 889 KB image, byte-identical size to flagged extension icon | `public/img/ledgerium_recorder_logo.png` |
| P2-3 | P2 | Two page trees permanently shadowed by redirects (dead code) | `src/app/(public)/demo/page.tsx`, `src/app/(public)/install-extension/page.tsx` |
| P2-4 | P2 | `/blog` index below registry word floor (not gated — hand-built page) | observational only |
| — | confirmed OK | SSG intact, `force-dynamic` removed correctly | `src/app/(public)/layout.tsx:4-16` |
| — | confirmed OK | FAQPage/HowTo/DefinedTerm/Speakable implementation matches stated AEO-only intent | `src/lib/seo/jsonLd.ts:136-180` |
| — | confirmed OK | robots.txt, noindex, hreflang, redirect chains all clean | `src/app/robots.ts`, `next.config.js` |
