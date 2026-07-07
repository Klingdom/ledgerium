# Site State Review 002 — QA Track (Functional Health, Validation, Broken Routes, Release Risk)

**Type:** Mode 3-adjacent read-only review (NON-counting; ZERO code changes)
**Date:** 2026-07-07
**Scope:** `apps/web-app` public marketing/SEO surface (~124 pages + programmatic `[slug]` routes) + app dashboard; uncommitted WIP in `packages/process-engine/` and `apps/extension-app/`.
**Track owner:** qa-engineer

---

## 1. Validation Results (evidence)

### 1.1 `pnpm --filter @ledgerium/web-app typecheck`
**PASS.** `tsc --noEmit` — exit code 0, zero errors.

### 1.2 `pnpm --filter @ledgerium/web-app test`
**PASS — 2086 / 2086 tests, 109 test files, 0 failures, 0 skipped.** Duration ~7.6s (execution) / ~36s total incl. transform/collect. All `console.error`/`stderr` output observed during the run is intentional negative-path test logging (DB-throw mocks, cron-secret failures, sample-seed failures under mocked Prisma) — not failures.

### 1.3 Package-scoped supplementary runs (for WIP risk assessment, item 4)
- `pnpm --filter @ledgerium/process-engine test` — **PASS, 502/502, 12 files** (includes the two new untracked files `specificity.test.ts` +33 and `svrVaguePath.test.ts` +24).
- `pnpm --filter @ledgerium/extension-app test` — **PASS, 301/301, 14 files** (includes new untracked `safe-page-title.test.ts` +22). Per instructions, the real-extension Playwright harness (`playwright.real-ext.config.ts`) was **not** run.

---

## 2. Nav / SEO Cross-Reference Integrity (item 2)

Both guard suites pass and were read in full, not just executed:

- **`components/nav/navConfig.test.ts`** — asserts every `TOP_NAV` leaf href resolves to either a hand-built `STATIC_ROUTES` entry or a `getPublishedPages()` path; also checks nav-id uniqueness and curated column counts (Solutions 5/5/5). **0 dead links.**
- **`lib/seo/content.test.ts`** — blocking gate via `validateContent(ALL_PAGES)`: **0 errors**. This gate (`lib/seo/validate.ts`) checks, per page: kebab-case slug, reserved-slug collisions, duplicate slug/metaTitle/metaDescription, metaTitle/metaDescription length bounds, FAQ count 3–10, required `originalDataPoint`/`honestLimitation`, AEO `mechanismIntro`/`keyTakeaways` (3–5, ≤60 words each) for published pages, valid `updatedAt`, non-orphan `PARENT_HUB`, `related` token resolution (no self-links, no dangling tokens), 400-word content-depth floor for published leaves, and near-duplicate detection (cosine-similarity word-shingles) within type. All pass with 0 errors, 0-noted warnings surfaced in the failing set.
- Determinism tests (`generateSeoMetadata`, `generateJsonLd`, `getRelatedPages`) all byte-identical across repeat calls; `getRelatedPages` never self-links — confirmed passing.

**Content inventory per type** (all `published: true`, none empty): compare 6, workflow 18, software 10, persona 12, problem 22, sopTemplate 12, aiOpportunity 8, department 8, industry 8, alternatives 10, competitors 10 = **124 published leaves**, matching the stated scope.

---

## 3. Dynamic `[slug]` Route Audit (item 3)

11 programmatic `[slug]` routes checked line-by-line: `ai-opportunities`, `alternatives`, `compare`, `competitors`, `departments`, `industries`, `software`, `sop-templates`, `use-cases/personas`, `use-cases/problems`, `workflow-library`.

**Result: no broken or empty routes found.** Every route:
- Implements `generateStaticParams()` filtered on `published` (and, for `compare`, additionally excludes `isReservedSlug`).
- Implements a request-time `notFound()` guard mirroring the same predicate (defense in depth — a stale/mismatched param still 404s cleanly rather than rendering with `undefined` data).
- Has non-zero authored content (no type has 0 entries; smallest is `compare` at 6).

**`compare` reserved-slug handling verified correct**: `/compare/scribe` is a hand-built leaf page; `RESERVED_SLUGS['/compare'] = {'scribe'}`; the dynamic route's `generateStaticParams` and its runtime guard both exclude it — build-time and request-time both agree, so there is no ambiguity about which page serves that URL.

**`share/[token]`** is a client-rendered (`'use client'`) route with no `generateStaticParams` (correct — tokens are runtime/user-generated, not enumerable at build). It has an explicit loading state, a distinct 404-vs-generic-error message keyed off `res.status === 404`, and a signup CTA fallback. `api/share/[token]/route.ts` exists. No issue.

**Hand-built static hub pages referenced by `navConfig.test.ts`'s `STATIC_ROUTES`** (`/comparisons`, `/docs`, `/methodology`, `/about`, `/security`, `/support`, `/demo`, `/install`, `/install-extension`, `/pricing`, `/product`) all have a `page.tsx` on disk — none are dangling nav promises.

**Blog**: index page's hardcoded post array (4 slugs) matches 4 on-disk post directories 1:1 — no orphaned or missing posts.

### Minor note (P3, not a broken route)
`(public)/compare` has no direct `page.tsx` — only `[slug]` and `scribe` children — by design (`PARENT_HUB.compare = null`, "the authed app owns `/compare`"). `(app)/compare/page.tsx` serves the bare `/compare` path. This is a route-group merge, not a collision — Next.js resolves it correctly since the two groups define disjoint leaves — but it is worth naming explicitly since two different route groups contributing to the same path prefix is exactly the shape that *can* silently collide if either side later adds a `page.tsx` at the wrong depth. No test currently guards against that regression (the nav test only checks nav hrefs, not general route-collision safety).

---

## 4. Uncommitted WIP Risk Assessment (item 4) — do NOT run full extension harness (honored)

Two coordinated, in-flight feature branches are visible in `git status`, both traceable to `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md` (2026-07-04/05 diagnostic review, P0-a/P0-b/P0-c execution log).

### 4a. `packages/process-engine/` — P0-b (SVR metric) + P0-c (render-layer specificity fixes)
- New pure module `src/specificity.ts` (242 LOC) + `specificity.test.ts` (33 tests) — measure-only SVR gate, `sopValidator.ts` extended with an **optional** `specificity` field, existing 6 rejection rules verified byte-identical (31/31 `sopValidator.test.ts` pass). Determinism-clean (no clock/RNG).
- `sopBuilder.ts` / `contentEnricher.ts` render-layer text changes (labelless-click copy, coordinate stripping, single-word quoting, error-recovery label surfacing), regression-locked by new `svrVaguePath.test.ts` (24 tests).
- **All 502 process-engine tests pass**, including the two new files. No capture/normalization/segmentation/policy-engine files touched — confirmed via `git diff --stat` (scope is process-engine-only for this half of the WIP).

**Governance note:** `specificity.ts` is a new pure module at 242 LOC, exported through `index.ts` — this exceeds the CLAUDE.md D-4 clause-2 threshold (≥200 LOC pure module → `system-architect` adjacency required before downstream iterations build on the surface). The execution log attributes this to `qa-engineer` (directed) with no architect adjacency noted. Not release-blocking on its own (it's additive/measure-only and fully tested) but the specialist-invocation gate appears to not have fired for this surface — flag for the coordinator/meta-review track.

**Concrete bugs found in the WIP (new evidence, not previously documented):**

1. **P2 — Quote-character bug in `sopBuilder.ts` `buildAction()` (P0-c B4, error-recovery action text).** The new code:
   ```ts
   const oQ = recoveryLabel.includes(' ') ? '”' : '”';
   const cQ = recoveryLabel.includes(' ') ? '”' : '”';
   ```
   Both ternary branches return the *same* closing curly quote (U+201D) for **both** open and close, in **both** the multi-word and single-word cases. Intent (per the code comment "Match B3 quoting convention") was clearly to mirror `deriveInstruction()`'s B3 pattern (straight quotes for multi-word, curly “…” for single-word). The bug means every error-recovery action string renders with a mismatched/wrong opening quote, e.g. `Resolve error — click ”Retry” to continue` instead of `Resolve error — click "Retry" to continue`. **This is not merely unnoticed — it is pinned as the expected value in the new test** (`svrVaguePath.test.ts:639-641`, with a code comment at line 634-636 explicitly acknowledging "sopBuilder.ts:580 uses U+201D for both branches of the ternary, so the opening quote is also a right curly quote"). Confirmed reproducible; this field (`SopStep.action`) is customer-facing generated-SOP text. Recommend: fix the ternary before merge, or explicitly scope-flag as a known follow-up if intentionally deferred — currently it reads as an unintentional regression baked into a passing test suite.

2. **P2 — False-positive risk in `contentEnricher.ts` `cleanStepTitle()` spreadsheet-cell stripping (P0-c B2).** New regex `/^[A-Z]{1,3}\d{1,5}$/` strips any token matching 1–3 uppercase letters + 1–5 digits from step titles, intended to remove spreadsheet cell coordinates (`A1`, `B16`). Reproduced: `cleanStepTitle` on `"Review Q3 Budget"` → `"Review Budget"` — a common business-quarter reference is silently dropped because it matches the identical token shape as a cell coordinate. Same pattern would strip `P0`, `P1`, `V2`, `G7`, incident/priority/version tags, etc. **No test in `contentEnricher.test.ts` covers this false-positive class** (only `cleanStepTitle` happy-path cases exist; no acronym/quarter/priority-tag regression test). This directly conflicts with the "traceability over convenience" principle — silently dropping business-meaningful tokens from generated SOP titles. Recommend adding a negative-case allowlist or requiring surrounding coordinate context (e.g., only strip inside a recognized spreadsheet grouping-reason) before this ships broadly.

### 4b. `apps/extension-app/` — P0-a (pageTitle PII redaction, Finding F-0)
- New `content/safe-page-title.ts` (`screenPageTitle` pure + `getSafePageTitle()` DOM wrapper) + 22 new tests, all passing. `capture.ts` has **15 call sites** swapped from raw `document.title` to `getSafePageTitle()`. `label-extractor.ts`'s `applySafetyHeuristics` was changed from private to `export` (contract widening, low risk — additive).
- This is precisely the risk pattern CLAUDE.md names by history: **"iter 099 pageTitle add ... broke capture in real session immediately after unit tests passed."** `capture.ts` is a file under the explicit CEO-mandated **Extension Reliability Invariant** ("Pre-change verification MANDATORY... unit tests have repeatedly failed to catch capture-pipeline breaks").
- **The review artifact itself self-identifies this correctly**: logged as "🟡 CODE-COMPLETE, pending real-extension validation" with an explicit gate: *"closure requires real-extension validation in a live Chrome session ... Not 'shipped' until confirmed."*
- **No evidence was found that this validation has occurred** (no fresh real-ext harness output, no dist-load confirmation artifact, nothing in recent commits touching `capture.ts`/`safe-page-title.ts`). Unit tests (301/301) pass, but per CLAUDE.md's own stated pattern this is insufficient certification for this specific file class.
- Minor doc/behavior mismatch: `getSafePageTitle()`'s JSDoc claims the result is "always non-empty," but when `document.title` is empty/whitespace, `screenPageTitle` returns `''` (not the fallback label) and `getSafePageTitle` returns that `''` verbatim (test at line 118-121 confirms this is the *intended* behavior, contradicting the doc comment). Cosmetic/doc-accuracy issue only — P3.

---

## 5. Release Risks — Ranked

**P0 — Extension capture-pipeline change awaiting mandated real-extension validation.**
`apps/extension-app/src/content/capture.ts` + new `safe-page-title.ts` swap all 15 `document.title` reads for a new PII-screening wrapper. This exactly matches the CLAUDE.md-documented historical regression class (iter 099) where unit tests passed but real-session capture broke. The change's own originating review artifact declares it "pending real-extension validation" and un-shipped. **Do not merge/deploy until the real-extension harness (`playwright.real-ext.config.ts` / `sidepanel-real.spec.ts`) is run and passes, or manual real-Chrome-session evidence is logged**, per the CLAUDE.md Extension Reliability Invariant. Evidence: `git diff apps/extension-app/src/content/capture.ts` (15 call-site swaps); `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md` §10 P0-a execution log (self-declared gate, unconfirmed).

**P1 — None currently open on the committed public site.** Typecheck, full test suite, nav integrity, and SEO content-quality gates are all green with zero errors.

**P2 — Two concrete correctness bugs in uncommitted process-engine WIP, both currently un-flagged by their own tests.**
(a) Error-recovery action text renders with a mismatched quote character on both sides (bug pinned into `svrVaguePath.test.ts` as expected output rather than fixed) — customer-visible generated-SOP text defect. (b) `cleanStepTitle`'s spreadsheet-cell-coordinate stripper has no negative-test coverage and reproducibly drops legitimate business tokens (`Q3`, `P0`, `V2`, etc.) from step titles — a silent data-loss regression risk against a shipped generated-SOP surface, contrary to the project's traceability principle. Neither is committed yet; both are fixable before merge with no architectural change.

**P2 — Specialist-invocation gate (D-4 clause 2) appears not to have fired for the new 242-LOC `specificity.ts` pure module.** Not itself a functional defect (module is fully tested, additive, measure-only) but a process-compliance gap worth surfacing to the coordinator/meta-review track before this WIP is folded into a counted iteration.

**P3 — Route-group merge ambiguity for `/compare`** (documented above, no test coverage of the pattern, currently correct but fragile to future edits) and **P3 — `getSafePageTitle()` JSDoc/behavior mismatch on empty-title input** (cosmetic).

---

## 6. What Passed Cleanly (do not re-litigate)

- Web-app typecheck: clean.
- Web-app tests: 2086/2086, 109 files.
- Nav dead-link guard: 0 dead links, 0 duplicate ids, curated counts match spec.
- SEO content validation gate: 0 errors across 124 published pages (slug format, meta length, FAQ count, AEO fields, content-depth floor, near-duplicate detection, related-link resolution).
- All 11 dynamic `[slug]` route families: correct `generateStaticParams` + `notFound()` guards, non-empty content, reserved-slug carve-outs honored both at build and request time.
- `share/[token]`: correct client-rendered 404-vs-error distinction.
- process-engine package tests: 502/502 (including new WIP files).
- extension-app package tests: 301/301 (including new WIP file); real-extension harness intentionally not run per task scope.
