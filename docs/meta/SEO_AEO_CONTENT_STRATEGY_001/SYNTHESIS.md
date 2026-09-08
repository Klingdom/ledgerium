# SEO / AEO Content Strategy 001 — Coordinator Synthesis

**Date:** 2026-09-08
**Mode:** Mode 3-adjacent multi-agent strategic review (NON-counting; zero product code modified)
**Panel:** 10 specialists — seo-aeo, competitive-researcher, market-research, growth-strategist, product-manager, analytics, content-editor, system-architect, qa-engineer, ux-designer
**Question posed by CEO:** improvements to SEO and AEO, plus a strategy to develop more content by use case, role, department, and industry.

---

## 1. Verdict

**Do not publish net-new pages on any of the four axes. 10 of 10 specialists reached this independently.**

The four axes are not an untried expansion — they are **already 56 of the 164 published pages (34% of the corpus)**, and they are the weakest-performing third of it. `industry` averages 0.33 inbound internal links per page and `department` 0.8, the two lowest in the corpus. Departments are demonstrably name-swap templated, with one FAQ answer byte-identical across four pages.

**But the request is not rejected — it is redirected.** There is real, high-value content work available right now. It is not new pages. It is turning the corpus from *arguments* into *artifacts and evidence*.

---

## 2. The reframe that resolves the tension

> **The four axes are organizing dimensions, not query dimensions.**

Buyers do not search the taxonomy. They search the named artifact.

- Nobody searches "banking workflow documentation" — they search **"KYC checklist."**
- Nobody searches "Ledgerium for M&A integration leads" — that persona page exists and has never ranked.

Use case / role / department / industry are the right way to **organize and target** artifacts, and the right segmentation for founder outreach. They are the wrong unit of publication.

---

## 3. Five findings that overturn the prior review (`GROWTH_REVIEW_001/seo_aeo.md`, 2026-09-02)

That review is strong and its top-line conclusion (authority is the binding constraint) stands. Five specifics do not.

| # | Prior claim | Corrected finding | Source |
|---|---|---|---|
| 1 | The failure is the intent mix — 82% `commercial` is the wrong query class | **`searchIntent` does not predict outcome.** The position-5 winner and the position-74 losers are *all* declared `commercial`. No field in the content model predicts winnability | seo-aeo |
| 2 | The sopTemplate cluster is the proven winner (position 5.0 / 12.3) | **Does not reproduce in live search today.** Consistent with near-zero-volume artifacts, not stable rankings. Real, but noise with the right shape | competitive-researcher |
| 3 | Financial services is the #1 ICP and still has no landing page | **Stale** — `banking` and `insurance` industry pages both exist | market-research (coordinator-verified) |
| 4 | Content carries "dated verification" | **`verifiedAsOf` = 0 on all five expansion-axis registries.** Only `competitors.ts` has it (11). And `validate.ts` never checks staleness anyway | content-editor + qa-engineer (coordinator-verified) |
| 5 | Zero organic visibility anywhere | **`/competitors/soroco` ranks page 1 (~8th) for a live "Soroco alternatives" search** — the only verified organic visibility found. Protect it | competitive-researcher |

**Net effect:** the lesson "pivot from commercial to transactional intent" was wrong. The real predictors are internal-link equity, the presence of a genuinely linkable artifact, and third-party authority.

---

## 4. Root cause, stated precisely

Three independent agents converged on the same mechanism.

**4.1 The publish path has no gate.** `getPublishedPages()` (`registry.ts:106-108`) publishes on `published && !isReservedSlug` alone. Adding one object literal to a registry ships a live page. Both `sitemap.ts:48` and `llms.txt/route.ts:27` consume it directly.

> *The gate was prose; the publish path was code.* That is exactly how the iter-098 health gate was written down, assigned an ID, and scaled past.

**4.2 The quality gate cannot see outcome — or several quality defects.** `validateContent` (`validate.ts:178-262`) checks shape, lengths, FAQ counts and *same-type* near-duplication. It does **not** check `verifiedAsOf` staleness, `originalDataPoint` distinctness, cross-type duplication, or inbound-link starvation. `/alternatives/walkme` passes all fifteen rules with margin at GSC position 72.3.

**4.3 The corpus contains no evidence.** A grep for any percentage across ~850KB of content returns **exactly one hit — in a code comment**. Zero external citations corpus-wide. All 164 `originalDataPoint` fields are mechanism restatements.

> A product whose entire differentiator is deterministic measurement publishes no measurements. This is the single largest AEO gap: there is nothing in the corpus an assistant would have reason to cite.

---

## 5. What to do instead — ranked

### Tier 1 — content work with real value (this is the answer to "more content")

**1. Make the 17 SOP templates actually downloadable.** *Highest-value single action in this review.*
The page that reached position 5 has **"Editable" in its title** and offers no download, copy, .docx or email capture — verified: zero such affordance in `SopTemplatePageView.tsx` or `Blocks.tsx`. The winner is a picture of a template.
This one action simultaneously serves: the binding off-page constraint (a free template is the only page class anyone links to), conversion (email capture), and AEO (a citable artifact). It is the only content action that touches all three.

**2. Publish real measured data.** The product generates deterministic process measurements — cycle times, variance, step counts, automation rates. Publish a small, honest benchmark set with method and sample size. This is the only thing that makes Ledgerium *citable* rather than merely *indexed*, and it is unique to this company.

**3. Fix internal linking — 58 of 164 pages (35%) have zero contextual inbound links**, including 6 of the 17 SOP templates. Internal links are the only link equity a zero-authority domain fully controls, and the auto-fill in `related.ts:63-75` is dead code. `industry` and `department` are the most starved and never link to each other.

**4. Add an `/install` CTA to the shared `Blocks.tsx` hero/CTA.** No SEO page links to `/install`; every CTA goes to `SIGNUP`, `DEMO`, `/product` or `/pricing`. One edit propagates to all 164 pages. Visitors currently meet an unannounced Developer-Mode sideload eight steps later.

**5. Name a human author (~1 hour).** `jsonLd.ts:63-69` emits a `Person` whose `sameAs` is a *company* LinkedIn page — a wrong identity assertion, 164 times. Fix to `worksFor`, give the Person a stable `@id` on `/about`, add `Organization.founder`.

### Tier 2 — the actual binding constraint (not content, not code)

**6. Submit the Chrome Web Store listing.** Third consecutive review flagging the same ready-but-unsubmitted item; `config.ts:16` is still `placeholder`. It is an independent ranking surface owing nothing to domain authority, and it is the floor of every other channel. **Note:** Scribe's own store title already claims "Process Intelligence" — differentiate the listing copy deliberately.

**7. Claim third-party listings** — G2, Capterra, SaaSHub, SourceForge, Owler, Product Hunt, AI-tool directories. Dozens of single-founder competitors have this; Ledgerium has none. Serves SEO, AEO and direct acquisition at once. Full 17-target list in `competitive_research.md`.

**8. Founder-led outreach**, segmented by the four axes — this is where role and industry earn their keep, as *targeting logic*, not as pages.

### Tier 3 — do not do

- Do not expand the `department` axis at all (name-swap templated; overlaps `persona`).
- Do not build industry × department × use-case intersections. 1,782 theoretical cells against a demand ceiling of ~750, and `validate.ts:254` skips cross-type comparison — the gate would certify them clean while creating the exact duplication it exists to prevent. Honest ceiling if ever attempted: **15–30** cells with a real practitioner name.
- Do not argue "it won't scale." Build is ~2–4.5 min and nothing breaks below ~750 pages. That argument is false and will be rebutted.

---

## 6. The re-entry gate

Publishing may resume when **all three** hold, per-cluster, certified by CEO/product-manager — never by the agent proposing to publish:

1. average position < 20
2. referring domains > 0
3. ≥1 non-brand click in trailing 90 days

**Status today: FAIL on all three.**

**Anti-bypass (the part that has failed twice):** a committed `CONTENT_GATE_STATE.json` plus a blocking `contentGate.test.ts` that fails closed on stale or `UNKNOWN` verdicts and blocks any content whose `updatedAt` postdates a non-PASS certification. A failing test blocks `deploy.yml`. Prose rules have now been scaled past twice; only code holds.

---

## 7. Measurement honesty

At current volume (~22 impressions/day across 164 pages), distinguishing two clusters' CTR requires **~2,300 impressions per arm — 2.2 to 5.3 years**.

A per-axis content strategy is therefore not merely unlikely to rank; it is **unfalsifiable on any actionable timescale**. Choosing between use-case / role / department / industry on search evidence is impossible for years.

Expect at 90 days: organic position stays ~44. Impressions and clicks will not move. **Do not read that as failure** — reading it as failure is what caused the July expansion.

Track instead: referring domains (0 → 8–10), Chrome Store live + installs, G2 listing with ≥5 reviews, `sameAs` count (1 → 4), a 14-prompt monthly AI-citation panel (~28 min/month, stored diffable in-repo), and **≥1 paying customer** — the only milestone that matters.

---

## 8. Open decisions for the CEO

1. Accept the redirect (artifacts + evidence) in place of axis expansion? — panel is unanimous.
2. Approve Tier 1 items 1–5 as a bounded engineering sequence?
3. Who owns Tier 2 (Chrome Store, listings, outreach)? Six of seven prior non-code recommendations were not started; the one code item shipped. This will repeat unless owned and calendared.
4. Adopt the re-entry gate + anti-bypass mechanism?
5. Confirm brand-collision response — three unrelated "Ledger[ium]" entities now compete for the branded query, and Ledgerium does not appear on page 1 of its own name.

---

## 9. Panel artifacts

| File | Agent |
|---|---|
| `seo_aeo.md` | seo-aeo |
| `competitive_research.md` | competitive-researcher |
| `market_research.md` | market-research |
| `growth_strategy.md` | growth-strategist |
| `product_scope.md` | product-manager |
| `measurement.md` | analytics |
| `content_model.md` | content-editor |
| `architecture.md` | system-architect |
| `quality_gate.md` | qa-engineer |
| `ux_ia.md` | ux-designer |

**Housekeeping:** `apps/web-app/src/app/(app)/upload/page.tsx` (+33/−6) was already uncommitted before this review. No agent modified product code.
