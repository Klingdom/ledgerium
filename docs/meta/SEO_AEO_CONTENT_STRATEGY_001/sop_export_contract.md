# SOP Template Export — Contract Review (pre-implementation)

**Reviewer:** system-architect (D-4 clause 2 adjacency, contract-level review BEFORE implementation)
**Date:** 2026-09-08
**Status:** CONTRACT REVIEW — no product code changed by this document.
**Upstream:** `docs/meta/SEO_AEO_CONTENT_STRATEGY_001/SYNTHESIS.md` §5 Tier 1 item 1 (lines 69–71).

---

## 0. Ground truth verified before review

| Claim | Verification |
|---|---|
| 17 SOP template pages | `apps/web-app/src/content/pages/sop-template.ts` — 17 `const …: SopTemplatePage` declarations (`:5` … `:1316`), exported at `:1398` |
| Page renders sections as a description grid, no export affordance | `apps/web-app/src/components/seo/SopTemplatePageView.tsx:170-177` (`<dl>` grid); zero `download` / `clipboard` / `blob` in the file |
| metaTitle claims "(Editable)" | `sop-template.ts:8`, `:90`, and 15 siblings |
| Existing markdown-download precedent | `apps/web-app/src/app/api/workflows/[id]/export-markdown/route.ts:81-87` — `text/markdown; charset=utf-8` + `Content-Disposition: attachment` |
| Existing static route-handler precedent | `apps/web-app/src/app/llms.txt/route.ts:10` (`export const dynamic = 'force-static'`), `:65-70` (headers, `lines.join('\n')`) |
| Build is a Node server build, not `output: 'export'` | `apps/web-app/next.config.js` — no `output` key |
| `/api/` is disallowed to crawlers | `apps/web-app/src/app/robots.ts:11` |
| Non-ASCII already in the SOP corpus | U+2019 at `sop-template.ts:48, 104, 135, 643, 889, 948, 971, 1135`; U+2014 at `:1005, :1011` |
| `renderSOPMarkdown` already exists (different input type) | `packages/process-engine/src/templates/markdownRenderer.ts:67` — takes `RenderedSOP`, **not** `SopTemplatePage`. Not reusable. Case-only name collision must be avoided. |

---

## 1. Verdicts on D1–D4

### D1 — UNGATED download (no email wall) → **ENDORSE**

Reasoning, in order of weight:

1. **The binding constraint is referring domains, and it is measured.** SYNTHESIS §6 makes "referring domains > 0" a re-entry gate criterion, currently FAIL. A gated asset is structurally un-linkable: the thing a third party links to must be the thing they can reach. Gating converts the only linkable page class into a lead-capture form, which nobody links to and no assistant cites.
2. **Gating breaks the SSG posture.** An email wall requires a POST endpoint, PII storage, consent handling, and a runtime path. Ungated, the entire feature is a build-time pure function with zero runtime surface and zero new failure modes. That asymmetry is large.
3. **Gating is not measurable here anyway.** SYNTHESIS §7: ~22 impressions/day across 164 pages. Neither gated nor ungated will produce statistically readable email volume for years. Optimising for the un-measurable variable at the cost of the measurable one (referring domains, AI-citation panel) is backwards.
4. **The metaTitle already promises it.** `sop-template.ts:8` says "(Editable)". Putting a wall behind a claim already made in the SERP title is a trust defect, not a conversion tactic.

**Revision (required):** replace the gate with an *intent signal*, not nothing.
- Fire `sop_template_downloaded { pageType, slug, format }` on click — a new variant on the `AnalyticsEvent` union alongside `seo_page_viewed` / `seo_scroll_depth` (`apps/web-app/src/lib/analytics.ts:534, :577`). PII-free, matches the existing SEO event taxonomy.
- Offer email capture **after** download, as a dismissible inline block, never a modal, never blocking the file.
- The file itself carries the conversion hook: an attribution footer with the source URL (§4 item 11). Every forwarded copy carries a link home. That is the off-page mechanism, and it only works if the file travels freely.

### D2 — Phase 1 = Markdown + copy-to-clipboard, zero deps, .docx deferred → **ENDORSE**

Reasoning: `.md` is a pure string; `.docx` is a ZIP of OOXML parts. Deferring is right on effort grounds and *necessary* on determinism grounds (see the warning below).

**Revisions (required):**
1. Reserve the format axis **now** as a discriminated union (§2), so Phase 2 is purely additive. Cost today: ~10 LOC. Cost of retrofitting later: every consumer signature.
2. **Record a Phase-2 determinism warning in the module doc-comment now.** A `.docx` is a ZIP; ZIP central-directory entries embed per-entry modification timestamps. A naïve `.docx` writer therefore produces different bytes on every invocation and **silently violates D3**. Phase 2 must zero all entry mtimes to a fixed epoch derived from `page.updatedAt`, and must pin its dependency. If that constraint is not acceptable, `.docx` should not ship.
3. **Copy-to-clipboard must not become a second source of truth.** See §3.4 — copy must fetch the same bytes the download serves, not re-render.

### D3 — byte-deterministic, pure function of the registry entry → **ENDORSE, and strengthen**

The stated rule ("no `Date.now()`") is necessary but not sufficient. See §5 for the full hazard list — `Intl`, `toLocale*`, `String.normalize()`, `Map`/object-key iteration, and CRLF are each independently capable of breaking byte-identity across environments while passing a naïve "no Date.now" review.

Worth stating the *product* reason, not just the purity reason: because the file is a pure function of the registry, the served artifact is **verifiable against the page**. A reader can check that the document and the page agree. That is the Ledgerium traceability principle applied to marketing collateral, and it is the honest version of the "(Editable)" claim.

### D4 — derive only from existing fields, no new registry fields → **ENDORSE WITH REVISION**

Endorse the core, for a concrete reason the brief does not state: **adding a registry field perturbs the content quality gate.** `validate.ts:88-90` already feeds `sopSections` and `exampleProcedure` into `proseSources()`; `:245` enforces `WORD_FLOOR_LEAF = 400`; `:249-258` runs same-type near-duplicate cosine over that same vector. A new authored field shifts both the word floor and all 136 pairwise cosine scores among the 17 SOP pages for zero Phase-1 user benefit. Do not touch it.

**Revision:** extend the permitted field list by three, all already present, none requiring authoring, none changing `validate.ts` behaviour:
- `updatedAt` — **required** by D3 (it is the only legitimate date source).
- `originalDataPoint` — one real, sourced fact per page (`sop-template.ts:21-22`). Placing it in the footer makes the artifact *citable*, which is SYNTHESIS §4.3's largest named AEO gap. Already in `proseSources` base (`validate.ts:26`), so zero gate impact.
- `relatedWorkflowSlug` (optional, `types.ts:201`) + `slug`/`type` — for the footer's source URL via `pageUrl()` (`lib/seo/url.ts:6`).
- `exampleProcedure[].system` (optional, `types.ts:56`) — rendered as a step suffix when present.

Sufficiency check: `sopSections[].detail` is one sentence of *instruction* ("Why the procedure exists and the control it enforces over payments." — `sop-template.ts:38`). That is exactly the right raw material for guidance-plus-blank, and it is why no authoring is needed. The resulting document is a realistic ~1.5–2 page SOP skeleton.

---

## 2. Module contract

New module: `apps/web-app/src/lib/sop-export/`. Pure, framework-free, no React, no `next/*` imports except the type-only `SopTemplatePage`.

```
lib/sop-export/
  types.ts       — exported types + error class
  markdown.ts    — renderSopTemplateMarkdown (the Phase-1 renderer)
  filename.ts    — sopExportFilename
  render.ts      — renderSopExport (format dispatcher)
  index.ts       — barrel re-exports ONLY (CLAUDE.md: no logic in index files)
```

### 2.1 Exported surface

```ts
// types.ts
/** Phase 2 adds 'docx'. Widening this union is the ONLY change Phase 2 needs
 *  at the contract boundary. */
export type SopExportFormat = 'markdown';

/** Discriminated on `format` so Phase 2's binary body is additive, not breaking.
 *  Consumers that switch on `format` stay exhaustiveness-checked. */
export type SopExportDocument = {
  readonly format: 'markdown';
  readonly filename: string;                          // e.g. invoice-approval-sop-template.md
  readonly contentType: 'text/markdown; charset=utf-8';
  readonly body: string;                              // Phase 2 'docx' variant: Uint8Array
};

export class UnsupportedSopExportFormatError extends Error {
  readonly format: string;
  constructor(format: string);
}
```

```ts
// markdown.ts
/** Pure. Byte-deterministic. See DETERMINISM CONTRACT in the file header. */
export function renderSopTemplateMarkdown(page: SopTemplatePage): string;
```

```ts
// filename.ts
/** `${page.slug}.${ext}`. Never contains a date. ASCII-only by construction
 *  (slug is kebab-regex-validated at validate.ts:191). */
export function sopExportFilename(
  page: Pick<SopTemplatePage, 'slug'>,
  format: SopExportFormat,
): string;
```

```ts
// render.ts
/** Single entry point for all consumers (route handler, tests, future UI).
 *  THROWS UnsupportedSopExportFormatError on an unknown format — fail loudly,
 *  never silently fall back to markdown. */
export function renderSopExport(
  page: SopTemplatePage,
  options?: { readonly format?: SopExportFormat },   // default 'markdown'
): SopExportDocument;
```

**Naming:** `renderSopTemplateMarkdown`, **not** `renderSopMarkdown`. The latter differs from the existing `renderSOPMarkdown` (`packages/process-engine/src/templates/markdownRenderer.ts:67`) only by case — a real import-confusion hazard given the two take different input types.

### 2.2 Error behaviour

- `renderSopExport` with an unknown format → throws `UnsupportedSopExportFormatError`. It is a programming error, not a user input path (the route handler never passes a user-supplied format).
- `renderSopTemplateMarkdown` **never throws** for any `SopTemplatePage` that satisfies the type. Empty arrays render as the corresponding section with only a `[FILL: …]` blank; they do not omit the section. Rationale: the document's section skeleton must be stable across all 17, or the artifact is not a template.
- No `null` returns anywhere. No `try/catch` swallowing.

### 2.3 Estimated exported-surface LOC

Measured per the MR-015 §5 canonical rule (exported interface + public function bodies, excluding private helpers and test code):

| File | Exported LOC |
|---|---|
| `types.ts` | ~22 |
| `filename.ts` | ~8 |
| `render.ts` | ~16 |
| `markdown.ts` (`renderSopTemplateMarkdown` body) | ~115–150 |
| `index.ts` | ~8 |
| **Total** | **~170–205** |

Straddles the D-4 clause-2 200-LOC threshold. Honest reading: this review may not have been formally *required*. Running it pre-emptively is strictly better than discovering at ~205 LOC that it was, and every downstream Phase-2 change lands on this surface.

---

## 3. Route design

### 3.1 Decision

**Route handler at `apps/web-app/src/app/(public)/sop-templates/[slug]/download.md/route.ts`.**

URL: `/sop-templates/invoice-approval-sop-template/download.md`

```ts
export const dynamic = 'force-static';   // precedent: app/llms.txt/route.ts:10
export const dynamicParams = false;      // unknown slug ⇒ 404, no runtime path at all

export function generateStaticParams() { /* identical predicate to page.tsx:10-13 */ }
export function GET(_req: Request, { params }: { params: { slug: string } }): Response
```

**Why a `.md`-suffixed segment rather than `/download`:** direct precedent in this repo (`app/llms.txt/route.ts` — a dotted directory name), the URL is self-describing to humans, assistants and `curl -O`, and it degrades correctly if the `Content-Disposition` header is ever lost (§6.7).

**Why NOT `/sop-templates/[slug].md`:** it would be matched by the existing `[slug]` dynamic segment as a slug literally named `…-sop-template.md`. Ambiguous and fragile.

**Why NOT under `/api/`:** `robots.ts:11` disallows `/api/`. The whole point is that this URL is reachable, linkable and fetchable by assistants.

### 3.2 Static generation — confirmed for all 17

`generateStaticParams` must use the **byte-identical predicate** to the page route (`page.tsx:10-13`: `getPagesByType('sopTemplate').filter(p => p.published)`), plus `!isReservedSlug(...)` for consistency with `getPublishedPages()` (`registry.ts:107`). `RESERVED_SLUGS` (`registry.ts:68`) has no `/sop-templates` key, so the extra clause is a no-op today and a guard tomorrow. A parity test is mandatory (§7 T12).

With `dynamic = 'force-static'` + `dynamicParams = false`, Next prerenders exactly 17 route outputs at build and 404s everything else with no runtime execution.

### 3.3 Response

```
200
Content-Type:        text/markdown; charset=utf-8
Content-Disposition: attachment; filename="<slug>.md"
X-Robots-Tag:        noindex
Cache-Control:       public, max-age=86400          (matches llms.txt/route.ts:68)
```

- `charset=utf-8` is **not optional** — the corpus contains U+2019 and U+2014 (`sop-template.ts:48`, `:1005`).
- `X-Robots-Tag: noindex` — see §6.1. The `.md` must not compete with its own HTML page.
- Defensive in-handler 404: `if (!page || page.type !== 'sopTemplate' || !page.published) return new Response(null, { status: 404 })`, even though `dynamicParams = false` should make it unreachable. Mirrors `page.tsx:22`.
- Filename quoting is safe **because** the slug is kebab-regex-validated (`validate.ts:191`, `SLUG_RE`). Note for the record: `export-markdown/route.ts:79` derives a filename from a user-supplied workflow *title* and interpolates it into the same header unescaped — that is a pre-existing header-injection-shaped hazard on a different route. Not in scope here; flagged, not fixed.

### 3.4 Client affordance (copy-to-clipboard)

`SopTemplatePageView` is a server component. Add a small `'use client'` component (`components/seo/SopExportPanel.tsx`) containing the download anchor and the copy button.

**Do not pass the markdown body as a prop.** Two reasons: it serialises ~4KB of text that is already on the page into the RSC flight payload on all 17 pages, and it creates a second copy of the artifact that can silently diverge from the served file.

**Do** fetch the same URL the download serves. Single source of truth: copy and download are byte-identical by construction, permanently.

Two failure paths the implementer must handle explicitly (no silent failures):
1. **Safari transient-activation loss.** `await fetch(...)` before `navigator.clipboard.writeText(...)` can drop the user-gesture activation. Mitigation: prefetch on first `pointerenter`/`focus` into component state, then copy **synchronously** from cache on click. If the cache is cold on click, await, then fall back to a hidden-textarea `document.execCommand('copy')`.
2. **`navigator.clipboard` unavailable** (non-secure context). Mitigation: render the copy button only after a capability check, or on failure surface "Copy unavailable — use Download" inline. Never a thrown error, never a silent no-op.

The download anchor carries **both** `href` and `download="<filename>"`. Same-origin, so the attribute is honoured; it gives correct filenames even if the header is ever dropped (§6.7).

---

## 4. Document structure

Design constraint that drives everything below, stated honestly:

> **Word does not parse Markdown on paste. Google Docs does not by default.** Only Notion (and GitHub/GitLab) render pasted Markdown. So "survives paste into Word/Notion/Google Docs" **cannot** be satisfied by Markdown semantics. It is satisfied by the document reading acceptably **as plain text** — because two of the three named targets will show it as plain text.

That rules out tables (unreadable unrendered), heavy inline syntax, and reference-style links. It rules *in* short headings, blank-line separation, and plain-text-legible placeholders.

### 4.1 Placeholder representation — `[FILL: hint]`

| Candidate | Verdict |
|---|---|
| `_____` / `___` | **Reject.** `___` is `<hr>`/bold-italic in Markdown. Renders as a rule or eats the line. |
| `{{field}}` | Reject. Mail-merge syntax; reads as machinery to a human filling a form. |
| `[FILL: process owner]` | **Adopt.** No Markdown meaning mid-line, renders literally in every target including plain text, unambiguously signals incompleteness, and is **greppable** — a half-filled SOP cannot masquerade as complete. |

**Invariant (test-enforced):** a `]` is never immediately followed by `(`, anywhere in the document — that sequence is Markdown link syntax and would silently swallow the placeholder. See §7 T5.

The preamble states the convention in one line: *"Search this document for `FILL` and replace each placeholder."*

### 4.2 Section-by-section

Derived fields in brackets.

1. **`# {h1}`** — `[h1]`
2. **How to use this template** — 3 lines, fixed: what `FILL` means; that guidance lines (`>`) should be deleted once filled; that recording the process generates a filled version.
3. **Document control** — labelled list, not a table: Process owner, Version, Effective date, Last reviewed, Approved by — each `[FILL: …]`. *(This is the single largest gap between the current page and a usable SOP: the page has no document-control block at all.)*
4. **Applies to / Use when** — `> {whoUsesIt}` and `> {whenToUseIt}` as guidance, then a `[FILL: …]` for the reader's own scope. `[whoUsesIt, whenToUseIt]`
5. **One `##` section per `sopSections[i]`, in registry order** — `## {heading}`, then `> {detail}` as a guidance blockquote, then a blank line, then `[FILL: …]`. This is the mechanism that makes the artifact *fillable rather than a dump*: `detail` is instruction ("Why the procedure exists…"), so it becomes guidance, and the reader gets a blank. `[sopSections]`
6. **Procedure section is pre-seeded.** Under the `Procedure` heading, render `exampleProcedure` as a numbered list preceded by `> Example steps from a real recording — replace with your own.` Each step: `N. **{title}** — {detail}` plus ` (System: {system})` when `step.system` is present (`types.ts:56`). Then two empty numbered slots `[FILL: step]`. Rationale: an empty procedure is useless, a silently-prefilled one risks shipping another company's steps; a clearly-labelled example plus blanks is both useful and honest. `[exampleProcedure]`
7. **Review checklist — common mistakes to avoid** — `- [ ] {mistake}` per entry. GFM checkboxes render as checkboxes in Notion/GitHub and read fine as `- [ ]` in plain text. This converts a negative page list into a working QA gate. `[commonMistakes]`
8. **Limitations of this template** — `{honestLimitation}` verbatim. On-brand, and it is the differentiator; do not soften it. `[honestLimitation]`
9. **Footer** — attribution, `Source: {pageUrl(page)}`, `Template last updated: {Month YYYY from updatedAt}`, `From Ledgerium recordings: {originalDataPoint}`, and (when present) the paired workflow URL from `relatedWorkflowSlug`. This is simultaneously the link-back mechanism (D1 reasoning 4) and the citable fact (SYNTHESIS §4.3). `[updatedAt, originalDataPoint, slug, relatedWorkflowSlug]`

### 4.3 Explicit exclusion list (contract, test-enforced)

The document MUST NOT contain: `metaTitle`, `metaDescription`, `shortAnswer`, `keyTakeaways`, `mechanismIntro`, `faqs`, `howLedgeriumGenerates`, `secondaryKeywords`, `eyebrow`. These are page-SEO artifacts. Including them is precisely what turns a template into a page dump, and it would also make the `.md` a near-verbatim duplicate of the HTML page (§6.1). Enforced by §7 T7.

---

## 5. Determinism risks and guarantees

Enumerated hazards, each with the guarantee that neutralises it.

| # | Hazard | Guarantee |
|---|---|---|
| D-1 | `Date.now()` / `new Date()` for a rendered date | **Forbidden in `lib/sop-export/**`.** The only date is `page.updatedAt`, formatted by string split — the same shape as `Blocks.tsx:23-27`. Source-scan test T3b. |
| D-2 | Date **formatting** via `toLocaleDateString` / `Intl.DateTimeFormat` | **Forbidden.** Output would depend on the host ICU build and `TZ`. Use a local `MONTH_NAMES` array + `iso.split('-')`. Note: this duplicates 5 lines from `Blocks.tsx:17-27`; duplication is cheaper than coupling a pure lib to a React component file. Drift is caught by T3c (both formatters must agree on all 17 `updatedAt` values). |
| D-3 | `Map` / `Set` / `Object.keys` iteration | **Forbidden as an output-ordering source.** Iterate only registry arrays (`sopSections`, `exampleProcedure`, `commonMistakes`) whose order is fixed in `sop-template.ts`. (Note: JS object key order is *specified*, but relying on it makes the renderer fragile to reordering; arrays make order explicit.) |
| D-4 | `localeCompare` / `sort()` on strings | **No sorting anywhere.** Registry order is the output order. |
| D-5 | `String.prototype.normalize()` | **Forbidden.** NFC/NFD output depends on the runtime's Unicode version. Source bytes pass through unchanged, so output is a pure function of the source file. |
| D-6 | Smart quotes / em dashes in the corpus (U+2019 ×8, U+2014 ×2 — `sop-template.ts:48,104,135,643,889,948,971,1005,1011,1135`) | **Pass through verbatim.** Do **not** "sanitize" to ASCII — that is a lossy transform and a second source of truth. Safety comes from `charset=utf-8` on the response and a byte round-trip test (T8). |
| D-7 | BOM | **No BOM.** A leading U+FEFF breaks several Markdown parsers and shows as a stray glyph on Notion paste. Accepted tradeoff: a legacy cp1252-assuming Windows editor will mojibake the curly quotes. Asserted by T8. |
| D-8 | CRLF vs LF | **LF only.** Every join is `'\n'` (precedent: `llms.txt/route.ts:65`). No `os.EOL`. Asserted by T9. Modern Notepad has handled LF since Win10 1809; Word and Google Docs are unaffected. |
| D-9 | Trailing whitespace / trailing-newline drift | **Exactly one `\n` at EOF; no line ends in whitespace.** Asserted by T9. |
| D-10 | Markdown-significant leading characters in registry text (`#`, `>`, `-`, `*`, `+`, `1.`, `\|`, `` ` ``) silently changing structure | **No escaping transform.** Instead a **gate**: T11 fails the build if any consumed field starts with or contains one. Zero transform keeps output identical to source; the gate makes the constraint loud. Matches this repo's `validate.ts` precedent of pure-data validation over silent normalisation. If a future entry legitimately needs a `\|`, a documented escape is added *then*, with a test. |
| D-11 | Module-level mutable state across calls | **Renderer is stateless.** No caches, no memoisation, no module-level `let`. |
| D-12 | Phase-2 `.docx` ZIP mtimes | Flagged now (D2 revision 2). ZIP entries embed mtimes; unpinned they break byte-identity invisibly. |

**Guarantee statement:** for any `SopTemplatePage p`, `renderSopExport(p)` returns byte-identical output on every invocation, in every process, on every OS, under every `TZ` and `LANG`, at any wall-clock time. Verified by T1–T3.

---

## 6. Integration risks — what must NOT break

### 6.1 Sitemap — **do NOT add the `.md` URLs**

`app/sitemap.ts:63-71` merges `generateSeoSitemapEntries()` (`lib/seo/sitemap.ts:48-53`), which maps `getPublishedPages()` 1:1 to leaf URLs. Adding 17 `.md` URLs would:
- double the `sopTemplate` URL count with content that is **derived from and near-identical to** the HTML page it should be driving traffic to;
- ship 17 URLs with no canonical (route handlers cannot emit `alternates.canonical`);
- create a duplicate-content set that `validateContent` structurally cannot see (it operates on `ALL_PAGES` records, not routes) — the same blind-spot class SYNTHESIS §4.2 documents.

**Decision:** keep out of the sitemap; keep crawler-*allowed* (it is not under `/api/`, so `robots.ts:11` does not block it) so it can be linked and fetched; add `X-Robots-Tag: noindex` so it cannot outrank its own page. Net: linkable and fetchable, not indexable. That is exactly the property SYNTHESIS §5 item 1 wants.

### 6.2 `llms.txt` — one additive line, sopTemplate only

`app/llms.txt/route.ts:57-61` emits 3 lines per page. Add a 4th **only when `p.type === 'sopTemplate'`**:
`  Download (Markdown): ${base}/sop-templates/${p.slug}/download.md`

This is how the artifact reaches assistants despite `noindex` (§6.1). **Must not** change output for the other 11 types — the implementer must check for a snapshot/golden test on this route before editing.

### 6.3 Gate B (`lib/seo/canonicalCoverage.test.ts`) — **unaffected, verified**

`walkPageFiles` (`:66-77`) matches the exact filename `page.tsx` only (`:72`). A `route.ts` is invisible to it. It will neither fail nor need an `ACKNOWLEDGED_EXCEPTIONS` entry (`:152`). No change required.

### 6.4 Gate A (`lib/seo/content.test.ts` → `validate.ts`) — **unaffected by construction, because of D4**

`validateContent` is a pure function over `ALL_PAGES`. With zero registry changes (D4), all fifteen rules, the `WORD_FLOOR_LEAF = 400` check (`:245`) and the 136 pairwise same-type cosine comparisons among the 17 SOP pages (`:249-258`) produce byte-identical results. This is the strongest single argument for D4 and it must be re-verified after implementation (T14).

### 6.5 `robots.ts` — **do not modify**

`/sop-templates/**` is already allowed. Adding an entry is unnecessary and risks the disallow list.

### 6.6 `generateStaticParams` parity

Two routes now enumerate the same slug set (`page.tsx:10-13` and the new `route.ts`). Divergence produces a page with a 404 download button, or a downloadable file for an unpublished page. Parity is test-enforced (T12), not review-enforced.

### 6.7 Forward risk — `output: 'export'`

`next.config.js` has no `output` key today, so static route handlers retain their headers. **If** anyone later adds `output: 'export'`, custom response headers are dropped by static hosting and `Content-Disposition` is lost — a `.md` URL may then render inline instead of downloading. Mitigation already specified: the anchor carries `download="<filename>"` (§3.4), which is same-origin and header-independent. Record this in the route's doc-comment.

### 6.8 Not in scope, flagged

- The `/sop-templates` hub page does not surface downloads. Separate iteration.
- `export-markdown/route.ts:77-79` unescaped filename interpolation (§3.3). Pre-existing, different route, flagged not fixed.
- 6 of 17 SOP templates have zero contextual inbound links (SYNTHESIS §5 item 3). Separate iteration.

---

## 7. Test contract

The implementer must write **at minimum** these assertions. Co-located as `lib/sop-export/*.test.ts` per CLAUDE.md.

| # | Assertion |
|---|---|
| **T1** | **Repeat-call byte identity.** For all 17 pages: `renderSopExport(p).body === renderSopExport(p).body`. Use `===` / `toBe`, **not** `toEqual` — string identity, not structural equality. |
| **T2** | **Cross-instance identity.** Render from a deep clone (`structuredClone(p)`) and compare bytes. Proves no dependence on object identity or hidden ordering. |
| **T3a** | **Wall-clock independence.** `vi.setSystemTime('2020-01-01')` render, `vi.setSystemTime('2031-12-31')` render, assert identical. This is the assertion that actually proves D3, not a grep. |
| **T3b** | **Source scan.** No file under `lib/sop-export/` contains `Date.now(`, `new Date(`, `Math.random`, `Intl.`, `toLocale`, `.normalize(`, `localeCompare`, or `os.EOL`. Precedent for source-text gating: `canonicalCoverage.test.ts`. |
| **T3c** | **Date-formatter agreement.** For all 17 `updatedAt` values, the sop-export month formatter equals `Blocks.tsx`'s `formatUpdated` output. Catches drift in the deliberate 5-line duplication (D-2). |
| **T4** | **Golden fixture.** One committed byte-exact expected file for `invoice-approval-sop-template`, compared with `toBe`. Catches unintended structural drift; also serves as reviewable documentation of the output. |
| **T5** | **Fillability.** Every document contains ≥ `sopSections.length` occurrences of `[FILL:`; and **zero** occurrences of the substring `](` anywhere (the placeholder/link-syntax collision invariant, §4.1). |
| **T6** | **Content sourcing, in order.** For all 17: every `sopSections[i].heading` appears as a `## ` heading in registry order; every `exampleProcedure[i].title` appears in the Procedure section in order; every `commonMistakes[i]` appears as a `- [ ] ` item; `honestLimitation` appears verbatim. |
| **T7** | **Exclusion.** Output contains none of `metaTitle`, `metaDescription`, `shortAnswer`, `mechanismIntro`, `howLedgeriumGenerates`, or any `faqs[].a` verbatim (§4.3). Proves it is a template, not a page dump. |
| **T8** | **Encoding.** `Buffer.from(out, 'utf8').toString('utf8') === out`; `out.charCodeAt(0) !== 0xFEFF` (no BOM); the U+2019 from `sop-template.ts:48` survives verbatim in the invoice-approval output. |
| **T9** | **Line discipline.** `!out.includes('\r')`; `out.endsWith('\n') && !out.endsWith('\n\n')`; no line matches `/[ \t]+$/`. |
| **T10** | **Filename.** `sopExportFilename(p,'markdown')` matches `/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/` for all 17; is stable across calls; contains no digits-as-date and no `"` or non-ASCII (Content-Disposition safety, §3.3). |
| **T11** | **Registry markdown-safety gate** (§5 D-10). Fails, naming the field, if any consumed field (`h1`, `whoUsesIt`, `whenToUseIt`, `honestLimitation`, `originalDataPoint`, every `sopSections[].heading`/`.detail`, `exampleProcedure[].title`/`.detail`/`.system`, every `commonMistakes[]`) starts with `#`, `>`, `-`, `*`, `+`, `` ` ``, or `\d+\.`, or contains `\|` or `` ` ``. |
| **T12** | **Route parity.** The download route's `generateStaticParams()` result set equals the page route's, and has length 17. |
| **T13** | **Format dispatch.** `renderSopExport(p)` defaults to `'markdown'`; `renderSopExport(p, { format: 'docx' as never })` throws `UnsupportedSopExportFormatError` — never silently falls back. |
| **T14** | **Gate-A no-regression.** `validateContent()` returns the same `errors.length` / `warnings.length` as before the change. Cheap insurance on §6.4. |
| **T15** | **Structural floor.** Every generated document contains all `sopSections` headings plus the fixed Document-control, Review-checklist, Limitations and footer sections — i.e. the skeleton is stable across all 17 even where source arrays are short. |

That is 15+ substantive blocks, comfortably clearing the MR-006 Change C ≥12 threshold.

---

## 8. Summary of required revisions before implementation

1. D1: add `sop_template_downloaded` analytics variant; email offer is post-download, inline, dismissible.
2. D2: ship the `format` discriminated union now; record the Phase-2 ZIP-mtime determinism warning in the module header.
3. D3: extend the forbidden list beyond `Date.now` to `Intl`/`toLocale*`/`.normalize()`/`localeCompare`/`os.EOL`/sorting; LF-only; no BOM; single trailing newline.
4. D4: permit `updatedAt`, `originalDataPoint`, `relatedWorkflowSlug`, `exampleProcedure[].system` (all existing fields, zero `validate.ts` impact).
5. Name the renderer `renderSopTemplateMarkdown` (case-collision with `process-engine`'s `renderSOPMarkdown`).
6. `X-Robots-Tag: noindex` on the response; keep the `.md` URLs **out** of `sitemap.ts`; add them **to** `llms.txt` for sopTemplate only.
7. Copy-to-clipboard fetches the served URL (single source of truth) with prefetch-on-hover to preserve Safari transient activation.
8. Anchor carries both `href` and `download="<filename>"`.
