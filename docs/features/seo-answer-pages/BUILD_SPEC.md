# SEO/AEO `answer` Page Type — Build Spec

**Type:** Design / build spec (ZERO product code). Author: system-architect. Date: 2026-07-16.
**Program:** SEO/AEO Expansion 001 — AEO batch (definitional, answer-first pages).
**Precedent mirrored:** `docs/meta/SEO_AEO_EXPANSION_001/architecture.md` §2 (the `versus` new-type seam list) and §6 (the reusable 9-seam checklist).

**Goal:** a new `answer` page type that owns *"what is X"*, *"X vs Y (definitional)"*, and *"how does X work"* queries and is optimized for AI-answer-engine citation (DefinedTerm + Speakable + a short, hedge-free direct answer in the first 30% of the page).

**Hard constraint:** deterministic, validator-clean, and byte-identical across builds (enforced by `lib/seo/content.test.ts`). This spec reuses existing `BasePage` fields (`shortAnswer` → `.seo-answer` Speakable, `keyTakeaways`, `mechanismIntro`, `faqs`, `originalDataPoint`) so answer pages pass the gate the same way every other type does.

---

## 1. The `AnswerPage` interface

### 1.1 Design decisions (why these fields, not others)

| AEO need | Field | Source |
|---|---|---|
| Direct answer, ≤~50 words, Speakable | **reuse `BasePage.shortAnswer`** (renders in `.seo-answer` via `SeoHero`) | already validator-gated ≤100 words; author ≤50 for AEO |
| Canonical term for `DefinedTerm` + entity anchoring | `term` (new) | feeds `DefinedTerm.name`; distinct from `primaryKeyword` which stays a query string |
| Formal definition prose (the "X is …" paragraph) | `definition` (new) | feeds `DefinedTerm.description`; **distinct wording from `shortAnswer`** to avoid self-dup |
| Definitional body + "how does X work" expansion | `inDepth: AnswerSection[]` (new) | the depth that clears the 400-word floor |
| Quotable TL;DR | **reuse `keyTakeaways`** | already gated 3–5, ≤60 words each |
| Q&A for FAQPage schema | **reuse `faqs`** | already gated 3–10 |
| "X vs Y (definitional)" table | `comparisonTable?: ComparisonTable` (new, **optional**) | concept-vs-concept (NOT tool-vs-tool — that is the `versus` type) |
| Glossary cross-links | `relatedTerms: GlossaryLink[]` (new) | presentational chips → `/answers/<slug>`; graph authority still lives in `related` |
| Freshness / citation (E-E-A-T) | `sources: AnswerSource[]` (new) | on-page "Sources" block; optional `Article.citation` |

`comparisonTable` is **optional** and is the ONLY difference between a `what-is-X` page and an `X-vs-Y (definitional)` page — one type, two shapes, one validator branch. This mirrors how `versus` kept a single interface with a `rows` table.

### 1.2 Exact TypeScript (goes in `content/types.ts`)

```ts
// Add 'answer' to PageType union.
// Add 'DefinedTerm' to JsonLdType union (see §2, seam 10 — it is NOT in the engine yet).

export interface AnswerSection {
  readonly heading: string;
  readonly body: string;
}

/** Concept-vs-concept definitional table (e.g. process mining vs task mining). */
export interface ComparisonRow {
  readonly label: string;
  readonly itemA: string;
  readonly itemB: string;
}
export interface ComparisonTable {
  readonly itemA: string;               // e.g. "Process mining"
  readonly itemB: string;               // e.g. "Task mining"
  readonly rows: readonly ComparisonRow[];
}

/** Inline glossary chip → /answers/<slug>. Presentational; authority lives in `related`. */
export interface GlossaryLink {
  readonly term: string;
  /** Slug of another `answer` page. SHOULD also appear in `related` as `answer:<slug>`. */
  readonly slug: string;
}

/** Freshness / citation entry. Feeds the on-page Sources block + optional Article.citation. */
export interface AnswerSource {
  readonly label: string;
  readonly url?: string;
  /** ISO date the source was checked. Feeds the visible "verified" line. */
  readonly retrievedAt?: string;
}

export interface AnswerPage extends BasePage {
  readonly type: 'answer';
  /** Canonical defined term. Feeds DefinedTerm.name. */
  readonly term: string;
  /** Formal 2–4 sentence definition. UNIQUE wording vs shortAnswer. Feeds DefinedTerm.description. */
  readonly definition: string;
  /** Definitional body + "how does X work" expansion. 2–4 sections. Clears the 400-word floor. */
  readonly inDepth: readonly AnswerSection[];
  /** Present ⇒ this is an "X vs Y (definitional)" page. Absent ⇒ a "what is X" page. */
  readonly comparisonTable?: ComparisonTable;
  /** Inline glossary cross-links. */
  readonly relatedTerms: readonly GlossaryLink[];
  /** Citation / freshness sources. */
  readonly sources: readonly AnswerSource[];
}
```

Add `AnswerPage` to the `SeoPage` union.

**JSON-LD to declare per page:** `['Article','FAQPage','DefinedTerm','BreadcrumbList','WebPage','Organization']`.
- `WebPage` already carries `speakable` targeting `.seo-answer` / `.seo-datapoint` — Speakable is free as long as `AnswerPageView` reuses `SeoHero` + `DataPointCallout`.
- **Deliberately NOT `HowTo`.** "How does X work" here is *explanatory*, not procedural. HowTo belongs to `problem`/`workflow`/`sopTemplate` (which emit it from `steps`). Emitting HowTo from an answer page would be a false claim and would invite near-dup with the how-to `problem` cluster. Keep answer pages non-procedural.

---

## 2. The end-to-end seam list (mirrors the versus §6 checklist)

**10 seams: the standard 9-seam new-type checklist + 1 net-new (DefinedTerm emitter).** The `versus` type needed no `jsonLd.ts` change because it reused existing schema types; `answer` adds `DefinedTerm`, which the engine does not yet emit — that is seam 10.

| # | File | Edit |
|---|---|---|
| 1 | `content/types.ts` | Add `'answer'` to `PageType`; add `'DefinedTerm'` to `JsonLdType`; add the 5 interfaces (§1.2); add `AnswerPage` to `SeoPage` union. |
| 2 | `content/registry.ts` | `ROUTE_PREFIX.answer = '/answers'`; `PARENT_HUB.answer = { label: 'Answers', path: '/answers' }`; `import { ANSWER_PAGES }` + spread into `ALL_PAGES`. |
| 3 | `content/pages/answer.ts` | `export const ANSWER_PAGES: AnswerPage[] = [...]`. Slug convention: `what-is-<term>` and `<a>-vs-<b>`. |
| 4 | `components/seo/AnswerPageView.tsx` | New view. MUST reuse `SeoHero` + `DataPointCallout` (Speakable anchors), `KeyTakeaways`, `FaqBlock`, `RelatedPagesGrid`, `HonestLimitation`, `FinalCta`. Renders `definition`, `inDepth[]` via `ProseSection`, optional `comparisonTable`, `relatedTerms` chips, and a `sources` block. |
| 5 | `lib/seo/metadata.ts` | `OG_TYPE.answer = 'article'` (map is `Record<PageType,…>` → omission is a compile error; good forcing function). |
| 6 | **`lib/seo/validate.ts`** | **CRITICAL — add the `answer` branch to `proseSources()`** (§2.1). Without it the depth counter under-counts and every answer page fails the 400-word floor. Single most-missed step. |
| 7 | `app/(public)/answers/[slug]/page.tsx` | Copy the `compare` route verbatim, swap `'compare'`→`'answer'` and `ComparePageView`→`AnswerPageView`. |
| 8 | `lib/seo/sitemap.ts` | Add `'answer'` to `HUB_TYPES`. |
| 9 | `app/llms.txt/route.ts` | Add `{ type: 'answer', heading: 'Definitions & answers' }` to `TYPE_ORDER` (else answer pages are invisible to the LLM site map). |
| 10 | **`lib/seo/jsonLd.ts`** | **NET-NEW: add `definedTerm(page)` emitter + `case 'DefinedTerm'` in the switch** (§2.2). |

`app/sitemap.ts` needs no edit — it already merges `generateSeoSitemapEntries()`. `lib/seo/related.ts` needs no edit — it resolves any `${type}:${slug}` token generically. `content.test.ts` needs no edit — it iterates `ALL_PAGES`; it will start covering answer pages automatically (and will FAIL until seam 6 lands — that is the intended tripwire).

### 2.1 The validator branch (seam 6 — load-bearing)

Add to `proseSources()` in `lib/seo/validate.ts`:

```ts
} else if (page.type === 'answer') {
  base.push(
    page.term,
    page.definition,
    ...page.inDepth.flatMap((s) => [s.heading, s.body]),
    ...(page.comparisonTable
      ? [
          page.comparisonTable.itemA,
          page.comparisonTable.itemB,
          ...page.comparisonTable.rows.flatMap((r) => [r.label, r.itemA, r.itemB]),
        ]
      : []),
    ...page.relatedTerms.map((t) => t.term),
    ...page.sources.map((s) => s.label),
  );
}
```

Near-dup is checked **within type**, so the two `X-vs-Y` pages (`process-mining-vs-task-mining`, `process-map-vs-flowchart`) must carry distinct nouns/prose to stay under cosine 0.70 (target <0.50 to avoid the warn). Distinct subjects make this easy.

### 2.2 The DefinedTerm emitter (seam 10 — net-new)

Add to `lib/seo/jsonLd.ts`:

```ts
function definedTerm(page: SeoPage): JsonLdObject | null {
  if (page.type !== 'answer') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: page.term,
    description: page.definition,
    url: pageUrl(page),
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Ledgerium Process Glossary',
      url: `${SITE_CONFIG.url}/answers`,
    },
  };
}
```

…and in `generateJsonLd()`:

```ts
case 'DefinedTerm': {
  const d = definedTerm(page);
  if (d) out.push(d);
  break;
}
```

Optional enhancement (not required to pass the gate): extend `article()` to add `citation: page.sources.filter(s => s.url).map(s => ({ '@type': 'CreativeWork', name: s.label, url: s.url }))` when `page.type === 'answer'`. Keep deterministic (no dates from `Date.now()`).

---

## 3. Content-generation contract

An `AnswerPage` object MUST satisfy every `BasePage` rule in `architecture.md` §5.1 (slug kebab/unique; `metaTitle` 30–65 unique; `metaDescription` 120–160 unique; `shortAnswer` ≤100 words; `keyTakeaways` 3–5 each ≤60 words; `mechanismIntro` non-empty + globally unique; `faqs` 3–10; `related` all resolve, no self-link, ≥2 curated; `honestLimitation` + `originalDataPoint` non-empty; ISO `updatedAt`; ≥400 prose words when published) **plus** the answer-specific fields:

- `term` — canonical, capitalized as a noun phrase (e.g. "Process intelligence").
- `definition` — 2–4 sentences; **worded differently from `shortAnswer`** (self near-dup is real).
- `inDepth` — 2–4 `{heading, body}` sections; this is where "how does X work" lives (do not spin it into a separate page — consolidating avoids near-dup and concentrates citation authority).
- `comparisonTable` — present ONLY for definitional X-vs-Y pages.
- `relatedTerms` — each `slug` SHOULD also appear in `related` as `answer:<slug>` so the graph stays authoritative.
- `sources` — ≥1; at least one with a `url`.
- `jsonLd` — `['Article','FAQPage','DefinedTerm','BreadcrumbList','WebPage','Organization']`.

### 3.1 FULLY FILLED example — passes the gate

```ts
const whatIsProcessIntelligence: AnswerPage = {
  type: 'answer',
  slug: 'what-is-process-intelligence',                              // kebab, unique in answer
  metaTitle: 'What Is Process Intelligence? Definition and How It Works', // 57 chars ✓ (30–65), unique
  metaDescription:
    'Process intelligence is the practice of analyzing how work actually happens from recorded events. Learn what it means, how it works, and why it matters.', // 152 chars ✓ (120–160), unique
  h1: 'What is process intelligence?',
  eyebrow: 'Definition',
  shortAnswer:
    'Process intelligence is the practice of understanding how a business process really runs by analyzing recorded events from the actual work — the clicks, systems, timing, and handoffs — rather than how people remember it. It turns real execution data into maps, metrics, and improvement opportunities.', // 44 words ✓ (≤50 target, ≤100 gate)
  primaryKeyword: 'process intelligence',
  secondaryKeywords: ['what is process intelligence', 'process intelligence definition', 'process intelligence software'],
  searchIntent: 'informational',
  tags: ['answer', 'process-intelligence', 'process-mining', 'definition', 'glossary'],
  related: ['answer:what-is-process-mining', 'answer:process-mining-vs-task-mining'], // ≥2, resolve within first set ✓
  originalDataPoint:
    'In Ledgerium recordings, most of a process\'s elapsed time is wait time between systems and approvers, not active work — a split that only becomes visible once each step is timestamped from real execution rather than estimated from memory.', // unique fact
  mechanismIntro:
    'Ledgerium produces process intelligence by recording the real browser workflow — every click, system, and handoff with its timing — and computing a process map, cycle-time metrics, and improvement opportunities from that evidence rather than from a memory-written description.', // globally unique
  keyTakeaways: [
    'Process intelligence describes how a process actually executes, reconstructed from recorded interaction events rather than from interviews or memory.',
    'It is distinct from a static process map: intelligence carries timing, systems, variants, and exceptions, so it can be measured and compared over time.',
    'Process mining and task mining are two techniques that feed process intelligence — mining event logs from systems, and observing the desktop/browser work itself.',
    'The core payoff is a current-state, evidence-based baseline: where time is lost, where variants diverge, and where automation would actually help.',
    'Documentation written from memory drifts out of date; process intelligence stays current because it is regenerated from real recorded work.',
  ],                                                                  // 5 items, each <60 words ✓
  honestLimitation:
    'Ledgerium builds process intelligence from browser-based work. Steps performed in native desktop applications or on paper are not observed directly and need a person to add that context.',
  term: 'Process intelligence',
  definition:
    'Process intelligence is a category of software and practice that reconstructs how a business process actually executes by capturing and analyzing real interaction events — the steps, systems, timing, and decision points of the work as performed. Unlike documentation written from memory, it produces an evidence-based, current-state view of the process that can be measured, compared across runs, and improved.',
  inDepth: [
    {
      heading: 'How process intelligence works',
      body: 'Process intelligence starts by capturing a real execution of the process as an ordered stream of structured events — each with a timestamp, the system it occurred in, and enough context to identify the step. Those events are normalized and segmented into steps, then grouped into the end-to-end flow. From that structured record the software computes a process map, cycle-time and wait-time metrics, the common variants and exceptions, and the points where the process stalls. Because the output is derived deterministically from the recorded events, the same run always produces the same map — which is what makes the result trustworthy enough to act on.',
    },
    {
      heading: 'Process intelligence vs a static process map',
      body: 'A hand-drawn process map or flowchart captures how a process is supposed to run. Process intelligence captures how it did run, with the timing and system context attached. That difference matters because the gaps between the intended flow and the real flow — the rework loops, the off-path exceptions, the handoffs that sit idle for days — are exactly where time and money are lost, and a static diagram cannot show them.',
    },
    {
      heading: 'What teams use process intelligence for',
      body: 'The most common uses are establishing a current-state baseline before an improvement or automation project, generating SOPs that reflect the real process rather than an idealized one, finding where cycle time is actually spent, and identifying which steps are repetitive enough to be good automation candidates. In each case the value comes from working off evidence — a recording of the real work — instead of an estimate.',
    },
  ],
  relatedTerms: [
    { term: 'Process mining', slug: 'what-is-process-mining' },
    { term: 'Task mining', slug: 'what-is-task-mining' },
    { term: 'Cycle time', slug: 'what-is-cycle-time' },
  ],
  sources: [
    { label: 'Ledgerium AI — Product overview', url: 'https://ledgerium.ai/product', retrievedAt: '2026-07-16' },
    { label: 'Ledgerium AI — Methodology (how we research this)', url: 'https://ledgerium.ai/methodology', retrievedAt: '2026-07-16' },
  ],
  faqs: [
    { q: 'What is process intelligence in simple terms?', a: 'It is a way of seeing how a business process really runs — the actual steps, systems, timing, and handoffs — by analyzing a recording of the real work, instead of relying on how people describe it from memory.' },
    { q: 'How is process intelligence different from process mining?', a: 'Process mining is one technique that feeds process intelligence: it reconstructs a process from event logs left behind in systems. Process intelligence is the broader outcome — the current-state, measurable view of the process, which can be built from mining, from task observation, or both.' },
    { q: 'Is process intelligence the same as a process map?', a: 'No. A process map is a diagram of the intended flow. Process intelligence is the evidence-based version, carrying real timing, variants, and exceptions, so it can be measured and compared rather than just read.' },
    { q: 'What do you actually get from process intelligence?', a: 'A current-state baseline: a process map computed from real work, cycle-time and wait-time metrics, the common variants and exceptions, and the steps where automation would genuinely help.' },
  ],                                                                  // 4 faqs ✓ (3–10)
  jsonLd: ['Article', 'FAQPage', 'DefinedTerm', 'BreadcrumbList', 'WebPage', 'Organization'],
  author: { name: 'Ledgerium Research Team', sameAs: ['https://www.linkedin.com/company/ledgerium'] },
  updatedAt: '2026-07-16',
  published: true,
};
```

**Depth check:** answer `proseSources` pulls `shortAnswer + originalDataPoint + honestLimitation + keyTakeaways + mechanismIntro + faqs + term + definition + inDepth(3 sections) + relatedTerms + sources` → **well above 400 words** (the three `inDepth` bodies alone are ~350 words). Distinct subject nouns keep within-type cosine < 0.50.

---

## 4. Recommended first set (8 answer pages)

Spread: 5 definitional "what is" + 2 concept-vs-concept comparisons + 1 reframed metric term. Every slug verified against `ROUTE_PREFIX` collisions and `RESERVED_SLUGS` (none conflict; `/answers` is a brand-new segment).

| # | Slug | Query owned | Shape | Overlap flag |
|---|---|---|---|---|
| 1 | `what-is-process-intelligence` | "what is process intelligence" | what-is | **Blog overlap:** `/blog/what-is-process-intelligence` already exists (in `sitemap.ts`). Different URL prefix → no route collision, but content cannibalization. **Make the answer page the canonical definitional entity page; repoint the blog post's internal links (or a 301) to `/answers/what-is-process-intelligence`, and keep the blog post as narrative/opinion, not a competing definition.** |
| 2 | `what-is-process-mining` | "what is process mining" | what-is | Clean. Pairs with #3/#4. |
| 3 | `process-mining-vs-task-mining` | "process mining vs task mining" | X-vs-Y (`comparisonTable`) | **NOT the `versus` type** (that is Tool-A-vs-Tool-B products). This is concept-vs-concept and correctly belongs to `answer`. |
| 4 | `what-is-task-mining` | "what is task mining" | what-is | Clean. Pairs with #3. |
| 5 | `process-map-vs-flowchart` | "process map vs flowchart" | X-vs-Y (`comparisonTable`) | Clean; distinct nouns keep it out of #3's near-dup bucket. |
| 6 | `what-is-an-sop` | "what is an SOP / standard operating procedure" | what-is | **Overlaps the `sopTemplate` cluster + `/sop-templates` hub.** Keep this page purely definitional (what an SOP *is*); cross-link to `/sop-templates` for the editable-template/how-to intent. Different `primaryKeyword` + `searchIntent` (informational-definitional) satisfies the roadmap §3 cannibalization rule. |
| 7 | `what-is-a-document-workflow` | "what is a document workflow" | what-is | **Overlaps the `problem` how-to cluster** (`problem:how-to-document-a-workflow`, per `architecture.md` §3). Distinct query ("what is" definitional vs "how to" procedural) and distinct `primaryKeyword` — allowed. Cross-link the two; do NOT restate the how-to steps here. |
| 8 | `what-is-cycle-time` | "what is cycle time (in a process)" | what-is | **Reframed from the prompt's `how-to-measure-cycle-time`.** "How to measure X" is procedural → belongs to `problem`, and a `how-to-measure-cycle-time` answer page would near-dup that type. The definitional `what-is-cycle-time` (with a "how it's measured" `inDepth` section) is the correct answer-type home and avoids the collision. |

**Overlap-avoidance summary:** the two structural risks are (a) `answer` "how does/how to" pages colliding with the procedural `problem` type — resolved by keeping answer pages definitional and folding "how it works" into an `inDepth` section (#7, #8); and (b) the existing `/blog/what-is-process-intelligence` post — resolved by making the answer page canonical and demoting the blog to narrative (#1). Both are enforced at authoring time via the roadmap §3.2 pre-authoring cannibalization diff (distinct `primaryKeyword` + `searchIntent`).

**Internal linking (per growth.md §3):** wire the first set into a fully-connected glossary — each page carries ≥2 curated `related` tokens to siblings in the set (they resolve because the batch ships together), plus `relatedTerms` chips. This gives every page guaranteed inbound links from day one and lets the `/answers` hub act as a `DefinedTermSet` aggregating authority.

---

## 5. Sequencing

1. Land seams 1, 5, 6, 10 first (types + OG map + validator branch + DefinedTerm emitter) — these are compile/gate-forcing; `content.test.ts` will fail loudly until seam 6 is present, which is the intended tripwire.
2. Land the view (seam 4) + route (seam 7).
3. Author the 8 pages (seam 3) `published: false`, run `pnpm validate:seo` + `pnpm test`, then flip `published: true`.
4. Land sitemap + llms.txt (seams 8, 9) so the pages are discoverable.
5. Repoint the `/blog/what-is-process-intelligence` internal links to the new canonical answer page.
