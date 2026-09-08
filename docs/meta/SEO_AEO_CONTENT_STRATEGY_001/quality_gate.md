# Content Quality-Gate Audit & Outcome-Aware Gate Design

**Author:** qa-engineer agent
**Date:** 2026-09-08
**Trigger:** CEO request to expand content across use case / role / department / industry; growth review finding (`docs/meta/GROWTH_REVIEW_001/seo_aeo.md` §1.4) that `validateContent` passes 164/164 pages while the corpus is functionally invisible (25 clicks / 1,979 impressions / avg. position 44 over 3 months).
**Scope:** read-only QA analysis and gate design. **Zero product code modified.** No code diffs proposed — checks are specified, not implemented.
**Sibling artifacts in this review (read, cross-referenced, not duplicated):** `product_scope.md` (product-manager — Re-Entry Gate Spec §2, currently gate **FAIL** on all 3 conditions), `measurement.md` (analytics — per-cohort outcome thresholds §2.1), `ux_ia.md` (ux-designer — internal-link imbalance §5, proposed `axis` field for intersections §6), `growth_strategy.md`, `competitive_research.md`.
**Labels:** **VERIFIED** (read directly, today, 2026-09-08), **REASONED** (inference from verified facts), **MODELLED** (assumption-driven, assumptions stated).

---

## 0. Relationship to sibling artifacts — what this document adds

Two sibling agents in this same review already specified outcome-based gates:

- `product_scope.md` §2 specifies the **re-entry gate** (may the program resume at all) — conditions A/B/C (position <20, referring domains >0, non-brand clicks ≥1), a status file (`docs/meta/SEO_RE_ENTRY_GATE_STATUS.md`), and a PR-description citation convention.
- `measurement.md` §2.1 specifies the **per-cohort ongoing gate** (may the next batch publish) — indexation ≥80%, zero-impression <30%, cluster-median-position ≥50 kill rule.

Both are sound thresholds and I adopt them verbatim below rather than re-deriving different numbers. **What neither sibling document does — and what the task explicitly asks for — is answer whether the enforcement mechanism actually holds when someone wants to ship anyway.** `product_scope.md` §2's own enforcement mechanism ("any PR... must cite the current status-file entry... in the PR description") is a **prose convention**, not a structural block — a PR description is not validated by anything. That is the exact shape of the failure this whole review exists to prevent: SEO-F2 was also "written down, assigned an ID" (`IMPROVEMENT_BACKLOG.md:5`, `FUNNEL_AND_SOP_REVIEW_001.md` G-1) and it did not hold. Section 4 of this document is my primary contribution: a concrete, code-level mechanism that converts the PM's and analytics agent's gates from policy into something a build can actually enforce, using infrastructure this repo already has.

---

## 1. AUDIT — exactly what `validateContent` checks

**File:** `apps/web-app/src/lib/seo/validate.ts`. Entry point `validateContent(pages = ALL_PAGES)` (`validate.ts:178`). Called by `apps/web-app/scripts/validate-seo-content.ts:9,12` (a standalone CLI, **not wired into any CI workflow** — VERIFIED, `grep -rn "validate:seo\|validate-seo"` against `.github/workflows/*.yml` returns zero matches) and by `apps/web-app/src/lib/seo/content.test.ts:9-12`, which **is** the actual enforcement point: it runs under `pnpm test`, and `pnpm test` is a hard dependency of the `deploy.yml` `quality-gate` job (`.github/workflows/deploy.yml:16-40`), which `build-and-push` and `deploy` both transitively `needs:`. **VERIFIED** by direct run today: `npx vitest run src/lib/seo/content.test.ts` → 6/6 pass in 300ms against the current 186-record (164-published) registry.

It operates on exactly one input: the flattened `ALL_PAGES` array (`registry.ts:82-95`, 12 registries, currently **186 total records / 164 with `published: true`** — VERIFIED by count: `answer.ts` alone contributes 22 of the 22 unpublished drafts; every other file's record count equals its published count).

Per-record checks (loop body, `validate.ts:188-246`):

| Check | Lines | What it actually asserts |
|---|---|---|
| Slug is kebab-case | `191` | `SLUG_RE` regex match |
| Slug not reserved | `192` | not in `RESERVED_SLUGS` (hand-built page carve-out) |
| Slug unique within type | `194-197` | no two records of the same `type` share a `slug` |
| `metaTitle` unique **across the whole corpus** | `199-200` | string-equality dedup via a `Map` |
| `metaDescription` unique across the whole corpus | `201-202` | same pattern |
| `metaTitle` length 30–65 | `204` | `.length` bound, not word count |
| `metaDescription` length 120–160 | `205` | `.length` bound |
| `shortAnswer` ≤100 words | `207-208` | via the `words()` tokenizer (`14-21`) |
| FAQ count 3–10 | `210` | `p.faqs.length` bound |
| `originalDataPoint` non-empty | `212` | **`.trim()` truthiness only — see §2 below** |
| `honestLimitation` non-empty | `213` | same, truthiness only |
| `mechanismIntro` present (published only) + unique across corpus | `216-222` | presence gated on `p.published`; a lower-cased-trim dedup `Map` |
| `keyTakeaways` present (published only), count 3–5, each ≤60 words | `223-232` | array-length and per-item word-count bounds |
| `updatedAt` is a parseable date | `234` | `Number.isNaN(Date.parse(...))` — **format only, see §2** |
| `PARENT_HUB[type]` is defined | `236` | **a `Record` lookup returns non-`undefined` — does NOT verify the hub route exists on disk; this exact near-miss was documented and left unfixed by design in `docs/meta/SEO_AEO_EFFECTIVENESS_REVIEW/qa_analysis.md` §1, which is why Gate A (`sitemap.test.ts`) was built separately** |
| `related` tokens resolve | `238-241` | token parses to `type:slug` and matches a **known** record (published or not); self-link is an error |
| `related` non-empty | `242` | **warning only**, not blocking |
| Content-depth word floor (published only) | `244-245` | `words(proseSources(page)).length >= 400` (`WORD_FLOOR_LEAF = 400`, `:12`) |

Corpus-wide check (`249-259`): **near-duplicate detection**, k=5 word-shingle cosine similarity (`shingles()` `:153-160`, `cosine()` `:162-171`), computed **only between pages of the same `type`** (`:254` `a.type !== b.type: continue`) — O(n²) pairwise within each type bucket. `NEAR_DUP_FAIL = 0.7` blocks, `NEAR_DUP_WARN = 0.5` warns (`:10-11`).

**What the growth review's §1.4 summary got slightly wrong, worth correcting precisely (REASONED from source read):** it says the gate "enforces... `verifiedAsOf` freshness... and distinct data points." Neither is true as a code-level check:

- `verifiedAsOf` (`content/types.ts:158,251,268`) is **never referenced anywhere in `validate.ts`** — `grep -n "verifiedAsOf" src/lib/seo/validate.ts` returns zero matches. It is a free-text field (`'June 2026'`, `'July 2026'`) rendered in three view components (`AlternativesPageView.tsx:36`, `ComparePageView.tsx:43`, `CompetitorsPageView.tsx:36`) with **no staleness comparison against the current date anywhere in the codebase.** A page verified in June 2026 and never touched again passes every gate indefinitely.
- `originalDataPoint` (`:212`) is checked for **presence**, not **distinctness**. There is no dedup `Map` for it the way there is for `metaTitle`/`metaDescription`/`mechanismIntro`. I confirmed no exact-string duplicates exist today (VERIFIED, node script scan of 158 extracted values, 0 duplicate groups) — but that is authoring discipline, not a gate. Nothing in `validate.ts` would catch it if it regressed.

This matters for §2 and §3: the growth review's own diagnosis of the gate is *slightly more generous* than the gate actually is.

**Exhaustive list of defect classes `validateContent` structurally cannot catch**, because they are not properties of the `ALL_PAGES` array at all:

1. **Anything about search-engine outcome** — position, impressions, clicks, CTR, indexation status, referring domains. Zero fields in `SeoPage` carry this data; zero I/O of any kind happens in `validate.ts` (by design — it is documented as "pure and deterministic," `:174-177`).
2. **Route existence for hand-built and hub pages.** `qa_analysis.md` §1 (2026-08-13) already proved this class live (`/answers` 404'd for weeks) and it is why Gate A (`src/lib/seo/sitemap.ts` + `sitemap.test.ts`) and Gate B (`canonicalCoverage.test.ts`) exist today as **separate** files — `validateContent` was never extended to cover them, a new mechanism was built alongside it.
3. **`verifiedAsOf` staleness**, as shown above.
4. **`originalDataPoint` distinctness**, as shown above.
5. **Cross-type near-duplication.** The cosine check explicitly skips `a.type !== b.type` pairs (`:254`). An `industry` page and a `department` page making the identical argument in different words is invisible to this gate by construction — directly relevant to the CEO's requested expansion, since industry/department/persona/problem pages are the most structurally similar four types in the corpus.
6. **Semantic/paraphrase duplication within type.** The shingle vector is exact 5-word sequences. Two pages making an identical argument with substituted vocabulary (exactly what a template-driven or LLM-assisted authoring process for many new industry/department pages would tend to produce) can have a cosine score near 0 while being informationally redundant. The check catches copy-paste, not "says the same thing differently."
7. **Internal-link topology / authority distribution.** `validate.ts:242` only warns if a page's *own* `related` array is empty (an outbound-orphan check). There is no inbound-link check — a page could be linked to by nobody in the entire corpus and pass cleanly. `ux_ia.md` §5 (VERIFIED, this review) found exactly this: `alternatives` (15 published pages) has **zero** curated inbound links from any other type, and `industry`/`department` — the CEO's two most-requested axes — are the worst- and third-worst-linked-to types in the graph (0.33 and 0.8 inbound links/page respectively).
8. **Crawl depth / discoverability from the site root.** No check that a page is reachable within N clicks of a hub or the homepage.
9. **Hand-built pages entirely.** 19 marketing/legal pages were shipping with no canonical for months, invisible to this gate by construction — the exact motivating defect for Gate B.
10. **Combinatorial/intersection content correctness.** There is no `axis` concept in the type system today (`content/types.ts:18-30`); `ux_ia.md` §6 proposes one. Nothing in `validateContent` could evaluate an intersection page's distinctness-from-its-parents even if the field existed, because the near-dup check only compares within a flat `type`.
11. **Content *value*, at all.** Word count, FAQ count, and field presence measure production effort, not usefulness. A page can hit 400+ words of grammatically correct, factually-plausible, entirely uncompelling prose and pass with margin — see §2 for the concrete case.

**Conclusion of the audit, stated plainly:** `validateContent` is a **production-quality gate** — it verifies a page was assembled correctly (right shape, right length, right dates, no accidental collisions). It contains zero mechanism, and was never designed to contain one, that could tell you whether the page was worth writing. The growth review's core finding stands and is, if anything, understated once the `verifiedAsOf`/`originalDataPoint` items above are accounted for precisely.

---

## 2. FALSE-CONFIDENCE ANALYSIS — how a page passes everything and is still worthless

Each item below is a real way to satisfy every rule in §1 while producing zero market outcome. Where the actual corpus provides a real instance, it's cited with file:line and the matching GSC evidence from `seo_aeo.md`.

**A. A page can rank for a query class a zero-authority domain structurally cannot win, and pass with full marks.**
`/alternatives/walkme` (`content/pages/alternatives.ts:406`) — 400+ words, unique meta fields, 3–10 FAQs, `originalDataPoint` present, `mechanismIntro` present and unique, `keyTakeaways` 3–5 items, near-dup clean against the other 14 `alternatives` pages. **All fifteen `validateContent` rules pass.** GSC evidence (`seo_aeo.md` §1.1, VERIFIED): `walkme alternatives` position **72.3**. The gate has no rule that would ever fail this page, because none of its rules look at competitive query difficulty — and 134 of 164 pages (82%, `searchIntent: 'commercial'`, VERIFIED count) are in exactly this query class.

**B. A page can be freshness-dead for a year and pass indefinitely.**
Any of the 10 `alternatives` pages `verifiedAsOf: 'June 2026'` (`alternatives.ts:138,217,296,375,454,533,612,691,770`) will pass `validateContent` unchanged in June 2027, June 2030, or ever — there is no code path that compares `verifiedAsOf` to the current date. A claim about a competitor's pricing or feature set that has been stale for a year is indistinguishable, to this gate, from one verified yesterday.

**C. A page can restate an existing page's argument in different words and pass cleanly.**
`department.ts` (finance, `:5-40`) and the eight sibling department pages follow an identical rhetorical template — "[Department] teams own X, and they carry Y burden that makes trustworthy documentation essential. Most [department] processes span [systems], which is exactly why a written-from-memory SOP drifts from reality" — with only the department name, systems list, and workflow names substituted. Two such pages score near-zero cosine similarity (different named entities defeat the 5-word shingle match) while making an interchangeable argument. This is the exact shape the CEO's requested expansion (9 → N industries, 9 → N departments) would multiply, and the near-dup gate is blind to it by construction (it looks for shared word sequences, not shared argument structure).

**D. A page can be structurally isolated from the rest of the site and still pass.**
Every one of the 15 `alternatives` pages passes the "has related links" check (each has an authored `related` array pointing outward) while receiving **zero** inbound curated links from any other page type in the corpus (`ux_ia.md` §5, VERIFIED grep count). A page nobody links to is functionally an island for both crawl authority and user discovery; `validateContent` has no inbound-link concept at all, so this produces no warning, no error, nothing.

**E. A page can target a query with essentially no search volume and pass with full marks.**
Nothing in the gate checks keyword-volume plausibility (no keyword-tooling is wired into this repo — VERIFIED, no tool config anywhere in `apps/web-app`). A 400-word page for a zero-volume long-tail term scores identically to a 400-word page for a term with real demand.

**F. A page can be one of 30 authored records where 22 sit unpublished indefinitely, invisible to the health metrics that matter.**
`answer.ts` has 30 total records, only 8 `published: true` (VERIFIED count). The 22 unpublished drafts still pass every non-`published`-gated rule (slug, meta length, FAQ count, `originalDataPoint`, near-dup) forever, with no mechanism forcing a "publish or delete" decision. This is not a defect in isolation (unpublished = not live = not a market risk), but it demonstrates the gate has no lifecycle concept — a draft can sit in the "passes validation" bucket indefinitely with no cost, no visibility, and no forcing function, which is exactly the kind of silent accumulation this review's parent finding is about (a rule existing without a consequence attached).

**G. The single biggest false-confidence event already happened, and the gate cheerfully signed off on it.**
The July 2026 expansion (`seo_aeo.md` §1.3) added 100+ pages, all of which — by construction, since the corpus is reported as passing `validateContent` at every commit per `qa_analysis.md`'s own framing of the gate as the CI enforcement point — passed the gate on arrival. The measured result was impressions ×27 and clicks → 0. **This is not a hypothetical failure mode. It is the corpus's actual, dated, measured history**, and the gate that ran on every one of those commits had, and still has, zero code path that could have flagged it.

---

## 3. OUTCOME-AWARE GATE DESIGN — two tiers

This section adopts the thresholds already specified by `product_scope.md` §2 and `measurement.md` §2.1 rather than inventing new ones, and adds the missing Tier-1 items this audit surfaced in §1/§2. Where I add a check beyond the siblings' designs, it's marked **[NEW — this document]**.

### Tier 1 — pre-publish, deterministic, CI-runnable (extends `validateContent`)

All of these are pure functions over data already in the repo. No network I/O, no manual step, no GSC dependency. All are automatable **today**.

| # | Check | Threshold | Data source | Automatable today? |
|---|---|---|---|---|
| 1.1 | Existing `validateContent` rules | unchanged | `ALL_PAGES` | Yes — already shipped, `content.test.ts` |
| 1.2 **[NEW]** | `verifiedAsOf` staleness | any `verifiedAsOf` older than **6 months** from build date is a blocking error, not silent | `verifiedAsOf` field + injected build-time clock (single upstream reading, not scattered `Date.now()` — see §4 determinism note) | Yes |
| 1.3 **[NEW]** | `originalDataPoint` corpus-wide distinctness | exact-string dedup, same `Map` pattern as `metaTitle`/`mechanismIntro` (`validate.ts:199-202,219-222`) | `ALL_PAGES` | Yes |
| 1.4 **[NEW]** | Cross-type near-duplicate check | extend `NEAR_DUP_WARN`/`NEAR_DUP_FAIL` cosine comparison to run across **all** pairs, not just same-`type` pairs (drop the `a.type !== b.type: continue` guard, or add a second pass without it at a slightly higher threshold to control false positives from shared boilerplate like nav/CTA copy — see Test Plan §6) | same thresholds (0.7 fail / 0.5 warn), tune the cross-type variant empirically | `ALL_PAGES` | Yes |
| 1.5 **[NEW]** | Minimum inbound `related` links | every page must be the *target* of ≥2 other pages' `related` arrays, corpus-wide | `ALL_PAGES` (build a reverse-adjacency map) | Yes — directly closes §1 defect #7 and `ux_ia.md` §5(c)'s proposed publish-gate |
| 1.6 **[NEW]** | Unpublished-draft staleness | a record with `published: false` and no `updatedAt` change in **90 days** fails as a warning-escalating-to-error, forcing a publish-or-delete decision | `ALL_PAGES` + injected clock | Yes — closes §2(F) |
| 1.7 **[NEW, conditional — only if `axis` intersections ship per `ux_ia.md` §6]** | Intersection `related` auto-population and minimum-2-inbound-from-parents | an `axis`-bearing page must resolve `related` tokens back to both/all of its declared axis parents at build time | `ALL_PAGES` + `axis` field | Yes, once the field exists — see §5 |

**None of Tier 1 requires GSC, a keyword tool, or a human.** It runs on every commit exactly like `content.test.ts` does today.

### Tier 2 — post-publish, outcome-based, gates the *next* batch

This tier is **not** automatable end-to-end today, for one concrete reason: **there is no Search Console API integration anywhere in this repo** (VERIFIED — `grep -rln "searchconsole\|Search Console\|GSC" apps/web-app/scripts apps/web-app/src` returns only two unrelated hits — `layout.tsx`'s verification meta tag and an `analytics.ts` comment; no `webmasters`/`searchanalytics` client exists). GSC data is a manual export today and the gate is designed around that fact rather than pretending otherwise.

Two sub-gates, matching the two questions the CEO's expansion request actually poses:

**Tier 2a — Re-Entry Gate (may the program resume at all).** Adopted verbatim from `product_scope.md` §2: conditions A (per-cluster avg. position <20, trailing 28d), B (referring domains >0, sitewide), C (per-cluster non-brand clicks ≥1, trailing 90d). **Current verified status: FAIL on all three, portfolio-wide, re-checked 2026-09-08.** Per-cluster, not portfolio-blended — this is the correct scope; a portfolio average of 44 already conceals the fact that no cluster is anywhere near 20.

**Tier 2b — Per-Batch Cohort Gate (may the *next* batch, once re-entry has passed, actually ship).** Adopted verbatim from `measurement.md` §2.1: indexation ≥80% at day 30 per cohort, zero-impression share <30% at day 60 per cohort, and the kill rule (no additional pages to a cluster whose trailing-60-day median position ≥50 **and** zero-impression share ≥50%). This is the direct, corrected implementation of the iter-098 SEO-F2 gate — same numeric thresholds, but scoped **per cohort** instead of portfolio-wide (the scoping the original gate lacked, per `product_scope.md` §2's own diagnosis of why the blended-number version was scale-past-able).

| Sub-gate | Metric | Threshold | Source | Automatable today | Cadence |
|---|---|---|---|---|---|
| 2a | Cluster avg. position | <20 | GSC Search Results, per path prefix | Manual | Before any re-entry decision, then monthly recheck regardless of intent |
| 2a | Referring domains | >0 | GSC Links report | Manual | Monthly |
| 2a | Cluster non-brand clicks | ≥1 / 90d | GSC Search Results, Query dim., brand-excluded | Manual | Monthly |
| 2b | Cohort indexation | ≥80% at day 30 | GSC Coverage / URL Inspection | Manual (API exists but unwired — `urlInspection.index.inspect`, not integrated) | Once per cohort, day 30 |
| 2b | Cohort zero-impression share | <30% at day 60 | GSC Performance, Pages tab, anti-joined against full URL inventory | Manual | Once per cohort, day 60 |
| 2b | Kill rule | median position ≥50 AND zero-impression ≥50% ⇒ no further pages to that cluster | Same GSC export | Manual | Every recheck |

**Explicit answer to "is this automatable today":** No sub-metric in Tier 2 runs without a human pulling a GSC export. The honest, buildable-later automation path (flagged, not built, by `measurement.md` §2.3) is a GSC API v1 service-account integration — real future engineering work, out of scope for this document and for the CEO's current ask.

---

## 4. ANTI-BYPASS DESIGN — making Tier 2 structurally unbypassable

**The core problem, stated precisely:** `product_scope.md` §2's enforcement mechanism — a status file plus a PR-description citation requirement — is *itself* a prose rule. Nothing validates that a PR description actually cites the file, or that the citation is accurate, or that anyone checks. This is structurally the same failure shape as SEO-F2: a rule that lives in a document a human is supposed to remember to consult. `FUNNEL_AND_SOP_REVIEW_001.md` G-1/G-2 already proved that shape fails in this exact codebase, twice (the gate was scaled past, and separately was not even evaluable on the cadence at which publishing happened).

**Design principle: the gate must be read by a machine that has the power to fail a build, not by a human who is supposed to remember to look.** This repo already has two independent enforcement layers with exactly this property, both unused by the current SEO gate:

1. **A failing `pnpm test` assertion**, which is a hard dependency (`needs: quality-gate`) of `build-and-push` and `deploy` in `.github/workflows/deploy.yml`. Whatever else happens, a failing test in this suite **cannot reach production** — this is the strongest lever in this repo's actual topology (single deploy target, `push`-triggered pipeline, no separate merge-gate step to bypass).
2. **A pre-edit hook**, `.claude/hooks/check_artifacts.sh`, which already blocks code edits under `/src/` unless required upstream artifacts exist on disk (`PRD.md`, `ARCHITECTURE.md`, `API_SPEC.md`) and exits non-zero (blocking) when they're missing. The same mechanism, pointed at content files, blocks the *authoring* action before it's even committed — a second, independent layer catching the same violation earlier.

**Concrete mechanism, four parts:**

**(a) A single committed, machine-readable gate-state file** — `docs/meta/CONTENT_GATE_STATE.json` (a structured sibling to the human-readable `SEO_RE_ENTRY_GATE_STATUS.md` `product_scope.md` §2 already specifies; the markdown stays as the human-readable audit trail, the JSON is what code reads):

```json
{
  "checkedAt": "2026-09-08",
  "certifiedBy": "product-manager | ceo",
  "reEntry": { "conditionA": "FAIL", "conditionB": "FAIL", "conditionC": "FAIL", "overall": "FAIL" },
  "clusters": {
    "alternatives": { "indexationPct": null, "zeroImpressionPct": null, "medianPosition": 72.3, "verdict": "FAIL" },
    "sopTemplate":  { "indexationPct": null, "zeroImpressionPct": null, "medianPosition": null, "verdict": "UNKNOWN" }
  }
}
```

Every field is required; `null` is a legitimate value (data not yet pulled) but `verdict` must be one of `PASS`/`FAIL`/`UNKNOWN`, and **`UNKNOWN` fails closed** (see (b)). This is versioned in git exactly as `product_scope.md` §2 already specifies for its markdown counterpart — a decision to override becomes a visible diff with a commit and an author, not a silent action.

**(b) A new blocking test, `apps/web-app/src/lib/seo/contentGate.test.ts`, wired into the existing `pnpm test` / `content.test.ts` enforcement point:**

- Reads `CONTENT_GATE_STATE.json` and the current git history for `src/content/pages/*.ts`.
- **Assertion 1 — staleness fails closed:** if `checkedAt` is more than **30 days** before the build's injected reference date (a single upstream clock reading, following the codebase's own established pattern of `referenceNowMs` at `apps/web-app/src/app/api/workflows/route.ts:485-487` rather than scattered `Date.now()` calls — this is a governance-metadata staleness check, not core deterministic pipeline logic, and should be isolated exactly the way that precedent isolates its own clock read), the test fails with a message naming the exact stale date. This directly closes `FUNNEL_AND_SOP_REVIEW_001` G-2 ("the rule constrains when the gate can be read, not when the next batch may start") — a stale gate cannot be silently relied on; it must be actively refreshed to keep the build green at all.
- **Assertion 2 — new content requires a passing cluster verdict:** compute the set of `{type, slug}` records in `ALL_PAGES` whose `updatedAt` postdates `checkedAt` (i.e., content added or materially touched since the last certified check). For every such record, look up its cluster in `CONTENT_GATE_STATE.json.clusters`; if the verdict is anything other than `"PASS"` (including `"UNKNOWN"` — **fails closed, not open**), the test fails, naming the offending page and the exact verdict that blocked it.
- **Assertion 3 — re-entry gate must be PASS for *any* net-new page at all**, independent of cluster: if `reEntry.overall !== "PASS"`, any `updatedAt`-postdates-`checkedAt` record at all fails the build, full stop. This encodes `product_scope.md` §3's current recommendation (zero net-new pages while re-entry is FAIL) as code, not as a recommendation someone has to remember to follow.
- This test requires **no network I/O** and runs in the same sub-second budget as the existing suite (confirmed: the whole `content.test.ts` + Gate A + Gate B suite runs in 1.78s today, VERIFIED by direct run). It is pure JSON + git-metadata comparison.

**(c) A `.claude/hooks` pre-edit gate, mirroring `check_artifacts.sh`'s existing pattern**, blocking the *authoring* action itself: any Edit/Write targeting a new record (a new `slug:` entry) under `apps/web-app/src/content/pages/*.ts` is blocked (`exit 2`, matching the existing hook's own exit convention) unless `CONTENT_GATE_STATE.json`'s `reEntry.overall` is `"PASS"` **and** `checkedAt` is within 30 days. This is defense-in-depth, not a replacement for (b) — it catches the mistake before a commit exists at all, the same way `check_artifacts.sh` already stops code edits before PRD/ARCHITECTURE/API_SPEC exist.

**(d) Separation of duties, encoded structurally, not just as a policy line:** `certifiedBy` in the JSON must be one of an explicit allow-list (`product-manager`, `ceo`) distinct from any value an automated content-generation agent would plausibly self-report. This alone doesn't prevent a dishonest edit, but combined with (a)'s git-diff visibility, a self-certified bypass is a reviewable, attributable event rather than an invisible one — which is the actual, honest limit of any anti-bypass design: **nothing stops a human with repo write access and CEO authority from editing the JSON to say PASS.** What this design guarantees is that doing so is a **named, dated, diffable, single-point action** — not a scattered, ambiguous, plausibly-deniable one the way "we decided the prose gate didn't really apply this time" was for SEO-F2. That is the realistic ceiling for "structurally unbypassable" in a single-maintainer repo with no branch protection or required reviewers (VERIFIED — `deploy.yml` triggers on `push` to `main`/`feature/recorder-v2`, not on `pull_request`; there is no visible branch-protection config in this repository to inspect, so the practical gate is the local test suite plus the hook, not a remote-enforced review).

---

## 5. REGRESSION RISK of expansion

Ranked by what would actually break, not by theoretical possibility. All items below assume the CEO's stated axes (use case/`problem`, role/`persona`, department, industry) scale from the current 56 pages (34% of 164, per `measurement.md` §0) toward hundreds, and/or that `ux_ia.md` §6's proposed `axis`-field intersections ship.

**5.1 — Near-duplicate detection at scale (highest engineering risk).** The cosine check is O(n²) **within each type bucket** (`validate.ts:250-259`). Today's largest bucket is `answer` at 30 records → 435 pairwise comparisons, trivial (measured: the full 4-file suite including this check runs in 1.78s). If `industry` or `department` scale toward the hundreds mentioned in adjacent backlog targets (`IMPROVEMENT_BACKLOG.md:5`'s SEO-F4 named targets of 300–1,500 pages per cluster for other types), the same bucket hits **tens of thousands to over a million pairwise cosine computations** — each iterating a `Map` of every 5-word shingle in the page. This is a real build-time and CI-time regression, not a theoretical one, and it degrades silently (the test still passes correctness-wise, it just gets slower) until someone notices CI taking minutes instead of seconds.

**5.2 — Cross-type near-duplication becomes the dominant undetected risk, not an edge case.** §1 defect #5 and §2(C) show department/industry pages are the most template-similar four types in the corpus already at N=56. Scaling them without closing the same-`type`-only gap (§3 Tier 1.4) multiplies exactly the defect class the gate cannot see today.

**5.3 — Sitemap parity (Gate A) is not currently exercised by any content-scale test.** `sitemap.test.ts` asserts hub-route existence and hub-URL uniqueness (one URL per hub, `sitemap.ts` §5), but has no assertion that leaf-URL count scales correctly or stays deduplicated as leaf count grows by an order of magnitude. Two independent literal-string arrays already feed the sitemap (`HUB_TYPES` and hand-typed `staticEntries`, per `qa_analysis.md` §2) — this drift risk does not go away at scale, it compounds, because more page types and more intersections mean more surface for a hub or a static entry to be added to one array and not the other.

**5.4 — Canonical coverage (Gate B) does not extend to a new `axis`-bearing page shape automatically.** If `ux_ia.md` §6's proposal ships (an intersection page is still a `problem`/`workflow` record with an added `axis` field, not a new route type), canonical generation is unaffected (`generateSeoMetadata` unconditionally sets `alternates.canonical`, `metadata.ts:36`) — this is the one area that scales safely by construction, because canonical derivation is already fully registry-driven and never hand-authored for these types.

**5.5 — Internal-link integrity gets structurally worse, not just numerically larger.** `ux_ia.md` §5's finding (industry/department are the worst-linked-to types today) is a *ratio* problem, not a count problem — adding more industry pages without adding inbound links from the high-inbound core clique (`persona`/`compare`/`workflow`/`software`/`problem`) increases the number of thin, poorly-linked nodes rather than fixing the ratio. This is a regression that gets worse the more the CEO's exact request is fulfilled naively.

**5.6 — Combinatorial explosion is real and unbounded today.** `ux_ia.md` §6 (VERIFIED math): 9 industries × 9 departments × 16 personas = 1,296 theoretical intersections, and nothing in `registry.ts`/`related.ts` expresses "this page is the intersection of X and Y" as a first-class relationship today. If intersections are pursued, this is the single highest-leverage place to add a hard ceiling (see Test Plan §6.9) before any authoring begins, not after.

**5.7 — Build time.** Each `[slug]/page.tsx` uses `generateStaticParams` (VERIFIED, e.g. `compare/[slug]/page.tsx:9-13`) — every published page is pre-rendered at build time. 164 pages build in whatever the current baseline is (not separately measured here — flagged as a gap, see Test Plan §6.10); scaling by 5–10× multiplies SSG build time roughly linearly at minimum, and a near-dup check regression (5.1) would compound on top of it in the test suite specifically, not the Next.js build itself.

**5.8 — Unpublished-draft accumulation compounds.** §2(F)'s 22-unpublished-`answer`-record pattern, if repeated per new type/axis at scale, produces a growing shadow inventory of content that passes every check indefinitely with no forcing function — this is a governance/hygiene regression, not a technical one, but it directly enables exactly the "written down and never executed" failure pattern this whole review is about.

---

## 6. TEST PLAN — specific cases, names, assertions (no code)

**Tier 1 additions to `apps/web-app/src/lib/seo/validate.ts` + `content.test.ts` (or a new co-located `outcomeAwareValidate.test.ts`):**

1. `verifiedAsOf staleness: flags a page whose verifiedAsOf is >6 months before the injected reference date` — assert error present, message names the page id and the stale month.
2. `verifiedAsOf staleness: does not flag a page verified within the last 6 months` — negative control, zero errors.
3. `verifiedAsOf staleness: is deterministic given a fixed injected clock (no ambient Date.now())` — call twice with the same injected reference date, assert byte-identical error arrays (mirrors the codebase's existing determinism-test convention, e.g. `content.test.ts:30-44`).
4. `originalDataPoint distinctness: flags two pages sharing an identical originalDataPoint string` — construct a synthetic 2-page fixture with duplicate values, assert the specific duplicate-pair error message, mirroring the existing `duplicate metaTitle` pattern (`validate.ts:199-200`).
5. `originalDataPoint distinctness: does not flag distinct values` — regression lock against the current corpus (0 duplicates today).
6. `cross-type near-duplicate: flags two pages of DIFFERENT types whose prose sources exceed the fail threshold` — synthetic fixture, one `industry` and one `department` record built from near-identical `proseSources()` inputs; assert an error is raised (this is the assertion that currently cannot fire at all — proving it can fire on synthetic data is the regression lock for the fix).
7. `cross-type near-duplicate: does not false-positive on legitimately shared boilerplate` — synthetic fixture with two dissimilar pages that happen to share only common CTA/nav-style phrasing (e.g. "Ledgerium captures the real steps"); assert no error, to catch the threshold-tuning risk named in §3 Tier 1.4.
8. `inbound-link minimum: flags a page with zero inbound related references from any other record` — reproduces today's real `alternatives` finding (`ux_ia.md` §5) as a fixture; this test is expected to **fail against the live corpus today**, which is itself the correct outcome to record and triage, not silently skip.
9. `inbound-link minimum: does not flag a page with ≥2 inbound references` — positive control.
10. `unpublished-draft staleness: flags a published:false record whose updatedAt predates the injected reference date by >90 days` — reproduces the `answer.ts` 22-draft pattern as an explicit, testable rule instead of an invisible one.
11. `unpublished-draft staleness: does not flag a fresh draft` — negative control.

**Anti-bypass gate (`contentGate.test.ts`):**

12. `gate state: fails the build when checkedAt is more than 30 days stale` — synthetic fixture with a stale `checkedAt`; assert failure names the exact staleness in days.
13. `gate state: fails the build when reEntry.overall is FAIL and any content record postdates checkedAt` — synthetic fixture; this is the assertion that reproduces the "wrote it down and shipped anyway" failure mode as a red test, and should currently be **expected to fail if run against a hypothetical post-2026-09-08 content addition** given today's real gate-state is FAIL — proving the test actually has teeth.
14. `gate state: PASSES when reEntry.overall is PASS and no content record postdates checkedAt` — positive control, current real-world state (no net-new content since certification).
15. `gate state: an UNKNOWN cluster verdict is treated as a failure, not a pass` — explicit fail-closed lock; this is the single most important test in the whole plan, because a permissive default here (treating missing data as "not yet failing") silently reproduces the exact SEO-F2 shape.
16. `gate state: a cluster with a PASS verdict does not block edits to a DIFFERENT cluster with a FAIL verdict` — per-cluster isolation lock, directly encoding `product_scope.md` §2's "never a single site-wide PASS" principle as a test rather than a convention.
17. `gate state: the certifiedBy field must be one of the allow-listed roles` — rejects a synthetic fixture with an arbitrary/self-reported certifier string.

**Regression-risk coverage (§5), named explicitly per the prompt's ask:**

18. `sitemap parity at scale: leaf-URL count in the emitted sitemap equals getPublishedPages().length, for N=1000 synthetic published records` — a scale smoke test injecting a large synthetic `ALL_PAGES`-shaped array into `generateSeoSitemapEntries()` (or the equivalent seam), asserting no duplication and no count drift at 5–10× today's volume.
19. `sitemap parity at scale: zero duplicate URLs at N=1000 synthetic records` — set-size equality check, scaled version of the existing `sitemap.test.ts` uniqueness assertion.
20. `near-dup performance budget: same-type cosine comparison for a 500-record synthetic bucket completes in under [budget, e.g. 2s]` — a named perf-regression test with an explicit wall-clock budget, so a future slowdown fails loudly in CI rather than silently degrading local `pnpm test` runtime. (Budget number is a placeholder for whoever implements this — the point is that an explicit, asserted budget must exist, not that this document picks the number.)
21. `canonical coverage: a synthetic axis-bearing intersection page (per ux_ia.md §6) still resolves alternates.canonical via generateSeoMetadata` — forward-looking regression lock, written *before* the `axis` field ships, so Gate B cannot silently stop covering the new shape.
22. `axis intersection ceiling: rejects (or explicitly flags) a page count exceeding a named per-axis-pair ceiling` — if `ux_ia.md` §6 ships, a hard numeric ceiling (e.g., a documented cap well below the 1,296 theoretical maximum) enforced the same way `WORD_FLOOR_LEAF` is enforced today, so "we could technically generate 1,296" never silently becomes "we did."
23. `axis intersection auto-linking: an intersection page's related array resolves to both/all declared axis parents at build time` — direct implementation of `ux_ia.md` §6 item 2, written as an explicit assertion rather than left as a design note.
24. `build-time baseline: record and lock the current SSG build wall-clock time for the (public) route tree` — currently unmeasured (§5.7 gap); a baseline lock (not a hard pass/fail threshold, since infra varies) at least makes the next 5–10× content addition's build-time delta visible in a diff instead of invisible until someone complains.

---

## 7. SHIP / DO-NOT-SHIP VERDICT

**DO NOT SHIP. Do not resume content publishing today, on any axis.**

Reasoning, independent of and converging with the sibling artifacts in this review:

1. **The Tier 2a re-entry gate (`product_scope.md` §2, adopted here) is currently FAIL on all three conditions**, portfolio-wide and on every individual cluster checked. There is no cluster with an evidentiary basis for exception — the two positive signals in the entire corpus (`/sop-templates/vendor-setup-sop-template` position 5.0, `/sop-templates/system-access-request` position 12.3) are n=1 and n=3 impressions, explicitly flagged by `seo_aeo.md` §1.1 as "a signal, not a proof."
2. **The mechanism that would make new pages on the CEO's four requested axes succeed is not new content — it's off-page authority, which the CEO's request does not address and content cannot substitute for.** This is `product_scope.md` §1's finding and this document's own §1/§2 audit independently corroborates it: `validateContent` cannot see this, has never been able to see it, and adding more pages that pass it produces no new information about whether it's working, because it was never designed to measure that.
3. **The four requested axes are not new — they are 34% of the existing, already-failing corpus** (`measurement.md` §0). Expanding a demonstrated-non-working query class is the same action the July 2026 intervention already took (100+ pages, impressions ×27, clicks → 0), on the exact axes the review already diagnosed as thinnest and worst-linked.
4. **The anti-bypass mechanism this document specifies in §4 does not exist yet.** Until `CONTENT_GATE_STATE.json` and `contentGate.test.ts` (or an equivalent structural gate) are built, there is **no code-level barrier** to a repeat of the SEO-F2 pattern — only the same class of prose convention (`product_scope.md` §2's PR-description citation requirement) that has already failed once in this exact program. Shipping content now, before that mechanism exists, guarantees the next expansion is exactly as unbypassable-in-name-only as the last one.
5. **Tier 1 gaps identified in §1/§3 (staleness, distinctness, cross-type near-dup, inbound-link minimum) are not yet closed.** None of them are individually blocking on their own, but shipping new content into a gate with known, named, unclosed holes — while simultaneously proposing to scale the exact page types (`industry`/`department`) shown to be worst-linked and most template-similar — compounds risk that is cheap to close first and expensive to unwind after (per §5's regression analysis, near-dup and link-integrity debt gets structurally worse with scale, not just larger).

**What can proceed today without contradicting this verdict:** Tier 1 gate hardening (§3/§6, zero product-content risk, pure engineering), building the anti-bypass mechanism in §4, and the `verifiedAsOf` freshness pass on the *existing* 164 pages (explicitly endorsed by `product_scope.md` §3(a) as the one workstream this gate-FAIL state doesn't block). None of that is "content expansion," and none of it requires the re-entry gate to be green.

**What would change this verdict:** Tier 2a turning PASS on a specific cluster (position <20 AND referring domains >0 AND ≥1 non-brand click, that cluster only) — at which point Tier 2b's cohort gate governs the *pace* of publishing to that cluster specifically, not a portfolio-wide green light.

---

## Evidence status

| Claim | Status |
|---|---|
| `validateContent` checks enumerated (§1 table) | **VERIFIED** — direct source read, `validate.ts:1-262`, line-cited |
| `validate:seo` not wired into any CI workflow | **VERIFIED** — grep against `.github/workflows/*.yml` |
| `content.test.ts`/Gate A/Gate B all pass today, 25/25, 1.78s | **VERIFIED** — `npx vitest run` executed today, 2026-09-08 |
| `verifiedAsOf` never checked for staleness | **VERIFIED** — zero matches in `validate.ts` |
| `originalDataPoint` distinctness not code-enforced | **VERIFIED** — code read; corpus currently has 0 duplicates (VERIFIED, script scan) but that is authoring discipline |
| 164 published / 22 unpublished `answer` drafts / 186 total | **VERIFIED** — direct count |
| `/alternatives/walkme` passes all gate rules; GSC position 72.3 | **VERIFIED** (gate pass) / **REPORTED** (position, from `seo_aeo.md` citing CEO GSC export, not independently re-pulled here) |
| Cross-type near-dup gap (`a.type !== b.type: continue`) | **VERIFIED** — `validate.ts:254` |
| Inbound-link imbalance (industry/department worst-linked) | **REPORTED** — `ux_ia.md` §5, cited, not independently re-grepped in this document |
| No GSC API integration exists in this repo | **VERIFIED** — grep across `apps/web-app` |
| No branch protection / PR-gated CI visible | **REASONED** — `deploy.yml` triggers on `push`, not `pull_request`; no branch-protection config file found in repo to inspect further |
| Combinatorial intersection math (9×9×16=1,296) | **REPORTED** — `ux_ia.md` §6, arithmetic re-checked here and confirmed correct |
| Current re-entry gate status: FAIL on A/B/C | **REPORTED** — `product_scope.md` §2, dated 2026-09-08, not independently re-pulled from GSC in this document |
