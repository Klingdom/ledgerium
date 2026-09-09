# Tier 1 Item 2 — "Publish Real Measured Data" — Scope, Gate Ruling, Sequencing

**Author:** product-manager agent
**Date:** 2026-09-09
**Source:** `SYNTHESIS.md` §5 Tier 1 item 2; `content_model.md` §3.0/§3.1 (MeasuredFact model); `product_scope.md` (re-entry gate, currently FAIL on all three conditions)
**Sibling documents (do not duplicate):** `measurement_program.md` (analytics — what is honestly measurable, the regeneration mechanism) and `evidence_artifact_scope.md` (content-editor — artifact shape, citability). This document owns scope control, the gate ruling, sequencing, acceptance criteria, and the go/no-go/defer call. It does not specify the MeasuredFact schema or the generator's internals — that is the siblings' job.
**Scope of this document:** decision and control document only. No product code modified.

---

## 1. Problem Statement

**What problem does publishing measurements actually solve?**

Two distinct problems are bundled under "publish real measured data," and they must be separated because they have different costs, different honesty constraints, and different owners:

1. **The zero-data problem (VERIFIED).** A grep for any percentage across ~850KB of content returns exactly one hit, and it is a code comment (`answer.ts:6`). Zero external citations corpus-wide. For a product whose entire differentiator is *deterministic measurement*, the content publishes no measurements. This is a real, named defect, independently found by two specialist agents (seo-aeo and content-editor) in the same review cycle. Fixing it is honest, cheap, and directly on-brand.
2. **The link-magnet / benchmark-report problem (REASONED, content-editor's thesis).** content-editor's §4(c) argues a recurring, real customer-usage benchmark ("*State of Back-Office Process Variance*") would be citable, linkable, and impossible for competitors to replicate — and is therefore a genuine attack on the binding off-page-authority constraint, not just content polish. This is a much bigger claim and a much bigger artifact than problem 1.

**Is either worth doing now, given the binding constraint is off-page authority and the Chrome Web Store listing is still unsubmitted?**

Problem 2, as content-editor's own illustrative example states it ("*across 34 observed runs, vendor setup ran 5 distinct paths*"), **is not achievable today.** Ground truth: zero paying customers, dev DB at N=6 — a sample size this program's own analytics artifact (`docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md`) already flagged as statistically insufficient for an *internal* engineering decision. Publishing it externally, where the credibility stakes on a determinism-branded product are higher, not lower, would be worse than publishing nothing. This is not a scope question or an editorial-effort question — it is a data-availability wall that no amount of good work in the next iteration removes. **Ruling: problem 2, at the scale content-editor describes, is not in scope and cannot be brought into scope by better editorial work. It is deferred, with an explicit numeric re-entry condition (§8).**

Problem 1 is a different, much smaller thing: there are exactly two classes of number this company can honestly publish today without any customer data —

- **The determinism claim itself** (VERIFIED, per CLAUDE.md iteration record): byte-identical convergence across golden fixtures, across three engines (segmentation, normalization, process/live-vs-batch), enforced in CI on every commit (e.g., the I1/I1a/I1b invariant suites — `packages/segmentation-engine/src/invariants.test.ts`, `packages/normalization-engine/src/invariants.test.ts`, `packages/segmentation-engine/src/convergence-live.regression.test.ts`, `apps/web-app/e2e` fixture-level suites referenced across iter 011–053 of this file's own history). This is a true, strong, machine-checkable fact about the *engineering property*, not a claim about customer processes.
- **Fixture-derived structural facts** from the 11 real cross-industry workflow fixtures in `fixtures/workflows/` (step counts, system counts, pattern classification — already tabulated in `fixtures/workflows/README.md`), explicitly and prominently labeled as synthetic reference fixtures used for engineering validation, never presented as a market or customer claim.

Both are cheap, both are true today, both are regenerable by machine, and neither requires a single customer. **This is what item 2 is honestly narrowed to.**

**Is it worth doing now?** Weighed honestly against the actual binding constraint:

- It does not move organic position (blocked by authority — stated explicitly in §6 so it cannot later be read as failure).
- It probably does not move referring domains either, and this document explicitly declines to inherit content-editor's "artifact = link-acquisition program" thesis for the narrow version — that thesis was built for the big benchmark report, which is deferred. A small data box added to already-existing, already-published pages, with no new distribution behind it, is unlikely to independently attract backlinks. Distribution (Tier 2: Chrome Store, listings, outreach) is the actual lever for discovery; this item does not touch it and should not be sold as if it does.
- It *can* plausibly move the one metric that does not require backlinks: the monthly 14-prompt AI-citation panel (SYNTHESIS §7), because an assistant can retrieve and cite a well-labeled fact from an indexed page without anyone having linked to it first. This is a real, decoupled reason to do it — not a strong one, but a legitimate one.
- Cost is small (§5: 2 mandatory iterations, one agent each, zero new pages, zero new CI risk to existing publish/sitemap surfaces) and does not compete with or precede Chrome Web Store submission — different owner, different surface, zero resource contention.

**Recommendation: a bounded, low-priority GO on the narrow version; an explicit DEFER on the benchmark-report version.** This is not "ship item 2 as written." It is "ship the honestly-achievable 10% of item 2, and stop." If CEO bandwidth for reviewing new initiatives is the actual scarce resource this month, a full defer of this entire item until after Chrome Web Store submission is also a legitimate call — nothing about the narrow version is urgent, and §7 kill criteria make it cheap to stop before spending either iteration.

---

## 2. Gate Resolution

**The tension, stated precisely:** `product_scope.md` §6 bars "publishing on the industries / departments / personas-roles / problems-use-cases axes beyond the existing 164 pages... under any framing, until the gate passes," and the SYNTHESIS re-entry gate (§6) is written even more broadly: "Publishing may resume when all three [conditions] hold... per-cluster." Gate status today: **FAIL on all three conditions, portfolio-wide and on every cluster** (verified in `product_scope.md` §2, re-checked 2026-09-08). Item 2 involves adding new content. Does the gate block it?

**Ruling: (c) — a narrow, explicitly-bounded exception. Not (a) blanket exemption, not (b) full block.**

Rejecting (a) explicitly: claiming the sopTemplate pages are "not programmatic SEO pages" would be false. `sop-template.ts` is one of the eleven page types enumerated by `getPublishedPages()` (`registry.ts:106-108`), consumed by `sitemap.ts` and `llms.txt/route.ts` exactly like every other axis. It is the exact system the gate polices. A blanket exemption on category grounds is precisely the kind of hand-wave that could later be reused to justify enriching the 22 `problem` pages or the 9 `industry` pages under the same claimed exemption — the smuggling risk this task explicitly warns against.

Rejecting (b) full block: the gate's own stated mechanism — `CONTENT_GATE_STATE.json` + `contentGate.test.ts` + PR-level enforcement citing the status file — is written to police **net-new indexed pages** (the PR clause literally reads: "Any pull request adding files under `apps/web-app/src/content/pages/`..."). It does not, by its own text, police edits to already-published pages that add zero new URLs. `product_scope.md` §3(a)'s own recommendation ("zero net-new pages; improve existing only... via the existing `verifiedAsOf` SLA") already establishes that maintaining/enriching already-shipped pages is the *sanctioned* track, distinct from the moratorium's actual target. SYNTHESIS item 1 (downloadable SOP templates — shipped today, commit d090ed5) is direct precedent: it added real, substantive content to the same 17 already-published pages, with zero new URLs, and shipped without gate certification. Item 2's narrow form is structurally identical to item 1's already-accepted precedent.

**The exception is granted, and its boundary is defined so it cannot be reused for anything else.** An edit to already-published content is exempt from `SEO_RE_ENTRY_GATE_STATUS` certification **if and only if all six conditions hold simultaneously:**

1. **Zero new files** under `apps/web-app/src/content/pages/` in the implementing PR(s) — no new URL is created (machine-checkable: `git diff --name-status` shows no `A` status under that path).
2. **Zero new registry entries.** The `sopTemplate` page count is exactly 17 before and after (machine-checkable, §4).
3. **Single named field, single named page type, allow-listed explicitly:** the new field(s) may only be added to the schema for the `sopTemplate` type, and only on the 17 entries that already exist. No other of the eleven page types (`persona`, `department`, `industry`, `problem`, `answer`, `alternatives`, `compare`, `competitors`, `workflow`, `software`) may receive this field under this exception — even though content-editor's own §3.2–§3.4 models describe analogous facts for persona/department/industry pages, those are explicitly **not** authorized by this document and require their own future scope doc.
4. **Every quantitative claim resolves through the anti-fabrication CI check** (§4) — sourced only from a checked-in, deterministic generator reading `fixtures/workflows/*.json` and/or CI-verified determinism-invariant test output. Never hand-typed.
5. **No change** to `registry.ts`'s publish predicate, `sitemap.ts`, the `llms.txt` route, or `validate.ts`'s pass/fail logic.
6. **No new page template or component.** The new field renders via an incremental addition to the existing `SopTemplatePageView.tsx`, not a new view.

If any one of the six is violated, the work is not exempt — it reverts to "subject to the gate" and must wait for a per-cluster PASS or an explicit, logged CEO override per `product_scope.md` §2's contingency mechanism. This ruling itself should be treated as visible, not silent: per the gate's own separation-of-duties principle (a person proposing to publish should not be the sole certifier of the rule that lets them), **CEO sign-off on this six-condition boundary is requested at the top of §8**, not assumed.

The benchmark-report idea (content-editor §4(c)) is a new page/new URL by definition and receives ruling **(b): fully subject to the gate, currently FAIL, not authorized under any exception in this document.**

---

## 3. Scope: In and Out

### In scope

- Adding a bounded `measuredFact`-shaped field (exact schema owned by `evidence_artifact_scope.md`) to the 17 already-published `sopTemplate` registry entries, containing at most two classes of claim:
  1. the determinism/CI-convergence fact, worded generically (not per-template, since it is a property of the engine, not of any one workflow), and
  2. fixture-derived structural facts specific to the fixture matching that template's process family, explicitly labeled as synthetic/reference.
- A checked-in, deterministic generator script (owned by analytics per `measurement_program.md`) that computes both claim classes from `fixtures/workflows/*.json` and/or CI test output and emits a versioned data artifact consumed at build/content time — never hand-typed into the `.ts` registry files.
- A CI check that fails the build if any digit sequence in the new field's rendered string does not match the generator's current output (§4).
- A mandatory, fixed caveat string on every fixture-derived claim (exact wording owned by content-editor), absent only from the determinism claim (which is a general engineering fact, not a sample-derived one, and instead must cite its own concrete provenance — e.g., named test suite, not a vague superlative).
- Updating this document's own boundary text to be citable by future PR descriptions, per the self-certification checklist in §4.
- A formal, logged deferral of the benchmark-report vision with a numeric re-entry condition (§8).

### Explicitly out of scope

- Any new page, URL, or page type (`/research/*`, "State of Back-Office Process Variance," or equivalent) — blocked by the gate ruling in §2.
- Extending the `measuredFact` field, or any equivalent, to `persona`, `department`, `industry`, `problem`, `answer`, or any other page type. content-editor's §3.2–§3.4 models for those types are noted as good future work and are explicitly **not authorized here** — doing so now would recreate the exact "one exception, quietly generalized into a program" failure this document exists to prevent.
- Any claim derived from the dev DB (N=6) or from any customer account. This is not merely discouraged — it is forbidden outright, because N=6 was already ruled statistically insufficient for an internal decision by this program's own analytics artifact; publishing it externally is a strictly worse bar to fail.
- Any change to `validate.ts`, `registry.ts`'s publish predicate, `sitemap.ts`, or the `llms.txt` route.
- Any new visual component or page template.
- Backlink outreach, journalist pitching, or analyst briefing on the artifact — that is Tier 2 founder-outreach scope (SYNTHESIS §5 item 8), separately owned, not funded or scheduled by this document.
- Defining the exact `measuredFact` schema, exact wording, or exact regeneration cadence — owned by the sibling documents; this document requires only that both exist and pass the acceptance criteria below.

---

## 4. Acceptance Criteria

All must hold before this item is declared shipped. Machine-checkable items are marked **[CI]**.

1. **[CI]** Zero files with git status `A` under `apps/web-app/src/content/pages/` across the implementing PR(s).
2. **[CI]** `getPublishedPages().filter(p => p.type === 'sopTemplate').length === 17` before and after — asserted as a test, not eyeballed.
3. **[CI]** Anti-fabrication check (the core control): every numeric literal present in the new `measuredFact` field(s) across all 17 entries has a byte-identical match to a value emitted by the checked-in generator's current output. Concretely: a test that (a) re-runs the generator against the current `fixtures/workflows/*.json` and current CI-verified invariant-test output, (b) diffs the regenerated data artifact against the value embedded in / read by the registry, and (c) fails red on any mismatch. This is the direct structural fix for the failure mode named in the constraints given for this task (the `llms.txt` pricing-drift precedent): that drift went undetected specifically because no CI check tied published copy to a source of truth. This criterion is that check, applied here before publication rather than after a drift is discovered.
4. **[CI]** Every fixture-derived claim's rendered output contains the fixed required caveat substring (content-editor to define the exact token; this document requires the check exist and be non-optional — no code path may render a fixture-derived number without it).
5. **[CI]** `pnpm test`, `pnpm typecheck`, `pnpm build` pass with zero regressions to existing suite counts attributable to this change.
6. **[CI]** Sitemap entry count unchanged (164 URLs) before/after — diffed, not assumed.
7. **[Manual, PR-level]** PR description explicitly checks off all six boundary conditions from §2 by name — mirrors the existing gate's PR-enforcement pattern (`product_scope.md` §2.3) rather than inventing a new one.
8. **[Manual]** The determinism claim's wording cites a concrete, machine-read count (e.g., "N golden fixtures" where N is read from the fixture directory, not hand-typed) — no rounding, no "highly reliable," no unsourced superlatives.
9. **[Manual]** A reviewer distinct from the implementing agent confirms no claim in the new field could be read, in isolation, as a customer-usage statistic — the caveat must survive being read out of context.

---

## 5. Sequencing

Two mandatory iterations, one optional wrap-up. Small by design — this is a bounded hedge, not a program.

| # | Delivers | Primary agent | Adjacent | Gate check |
|---|---|---|---|---|
| 1 | Deterministic generator script + versioned data artifact, computing the determinism-proof fact and fixture-derived structural facts from `fixtures/workflows/*.json` and CI invariant-test output. **Zero content-page changes** — infrastructure only, proven regenerable before any claim is published. | `analytics` | `qa-engineer` (reviews determinism/reproducibility of the generator itself) | N/A — no content touched |
| 2 | `measuredFact` field added to the 17 `sopTemplate` registry entries, sourced only from iteration 1's artifact; incremental render addition to `SopTemplatePageView.tsx`; the CI checks in §4 items 2–4 land in the **same** PR as the content, not as a follow-up. | `content-editor` | `analytics` (reviews claim wording against generator output) | §2 six-condition self-certification in PR description |
| 3 (optional) | QA/validation pass confirming §4 items 1, 5, 6 hold; reads item 1's already-shipped download-diff (commit d090ed5) first to avoid conflicting or duplicated claims on the same pages; formally logs the deferral of the benchmark-report vision (§8) as a dependency-blocked backlog row, not a vague "someday." | `product-manager` or `qa-engineer` | — | Confirms exemption held, not just claimed |

Rationale for the ordering: the anti-fabrication rail (iteration 1) must exist and be proven regenerable **before** any number is written into a published page — this is the same "build the trap before loading the gun" logic the six-condition boundary is written to enforce, and it prevents the awkward state of shipping a number in iteration 2 that iteration 1 later finds cannot actually be reproduced.

---

## 6. Success Metrics

| Metric | Baseline | Target | Note |
|---|---|---|---|
| Organic position (any cluster) | ~44, portfolio-blended | **Will not move. Explicitly not a goal.** | Stated in advance per SYNTHESIS §7 discipline, so it cannot later be misread as failure. |
| Referring domains | ~0 | **Not expected to move from this item alone.** | This document explicitly declines to inherit the "artifact = link magnet" thesis for the narrow version; that thesis applies to the deferred benchmark-report, not this. |
| Corpus quantitative-claim count | 1 percentage, in a code comment, zero external citations | ≥1 machine-verified, regenerable, honestly-caveated claim live on an already-published page | The target is "regenerable," not "large." A small true number beats a large fabricated one. |
| CI-enforced anti-fabrication coverage on the modified surface | 0% (no precedent existed before the `llms.txt` pricing-drift incident) | 100% — every numeric literal in the new field traceable to the generator, checked on every commit | The one metric this item moves with certainty. |
| Page/URL count | 164 | 164, unchanged | Invariant, not an improvement target — proves the gate boundary held. |
| Monthly 14-prompt AI-citation panel | Not run / 0 hits | Leading indicator only; a single hit anywhere in the panel's ongoing history would be the first evidence this specific artifact is retrievable by an assistant | **A zero at 90 days is not failure** — SYNTHESIS §7 already predicts a false zero at current volume; the panel is cheap (~28 min/month) precisely so it can run for a long time without urgency. |
| Paying customers | 0 | Unaffected by this item | Named here only to state explicitly that this item does not move the one milestone that matters (SYNTHESIS §7). |

---

## 7. Kill Criteria

Pre-committed before either mandatory iteration starts.

**Stop and defer the entire item (not just narrow it further) if:**
- Iteration 1's generator cannot compute *any* claim that is both non-trivial and survives the honesty caveat test — i.e., analytics's own `measurement_program.md` concludes there is nothing honestly publishable, not even the determinism fact. Do not force a weaker substitute into iteration 2 to avoid "wasting" iteration 1.
- Shipping the CI anti-fabrication check (§4 item 3) as a **hard, blocking** gate turns out not to be buildable (e.g., the generator's output is not actually deterministic/reproducible on a clean checkout). Publishing a number without the enforcement mechanism is forbidden outright by the task's own absolute constraint — better to ship nothing than repeat the `llms.txt` pattern.
- At any point, hitting an editorial or design goal would require touching `validate.ts`, `registry.ts`'s publish predicate, `sitemap.ts`, adding a new file under `content/pages/`, or adding the field to a second page type. This is scope creep past the boundary in §2, not a reason to expand the boundary — halt and escalate to CEO for an explicit, logged decision rather than quietly widening the exception.

**Continue if:**
- The generator deterministically produces at least the determinism-proof fact.
- The CI gate builds and passes.
- Both iterations keep page count, sitemap count, and registry-type-count exactly invariant.

**Explicitly do NOT treat as kill signals** (pre-committed so they cannot be misread later):
- Zero hits in the monthly AI-citation panel at 90 days.
- Zero movement in referring domains.
- Zero movement in organic position.

All three are named in §6 as not expected to move by this item; treating their non-movement as evidence of failure is the exact reasoning error SYNTHESIS §7 identifies as the cause of the July 2026 expansion.

---

## 8. Dependencies and Blockers

**Needs explicit CEO decision:**

1. **Ratify the §2 six-condition gate-exception boundary.** This is a scope-interpretation call with real consequences (it lets content ship without full re-entry-gate certification), and per the gate's own separation-of-duties principle, it should not rest on this document's self-certification alone.
2. **Confirm priority relative to Tier 2.** Recommendation: proceed in parallel — different agents, zero resource contention, zero coupling to Chrome Web Store submission — but this document does not assume that call is obvious; a CEO preference to fully defer until after Chrome Web Store submission ships is equally valid and costs nothing to state explicitly.
3. **Accept the narrowing of item 2** from "publish a small, honest benchmark set" (SYNTHESIS's literal wording) to "retrofit two honestly-computable, customer-data-free facts onto already-published pages, with the customer-usage benchmark formally deferred." The CEO commissioned the SYNTHESIS; the narrowing should be visible to them, not assumed.
4. **Set the numeric re-entry condition for the deferred benchmark-report vision.** Proposed default, pending CEO override: **N ≥ 20 customer-observed process runs** before any customer-usage benchmark claim is even drafted — chosen to match content-editor's own honesty threshold ("if n < 20, publish n and say the sample is small") applied as a floor for a flagship claim, not merely a caveat trigger for a marginal one.

**No blocker on:**
- Chrome Web Store submission — not a technical dependency of this item, only a value-multiplier for its (already modest) distribution reach.
- The two sibling documents — `measurement_program.md` and `evidence_artifact_scope.md` — which this document assumes will land before iteration 1/2 begin but does not gate its own publication on.

---

## 9. Risks

**Leading risk: credibility damage from publishing a weak number on a determinism-branded product.** If a prospect, competitor, or journalist notices a claim resting on 11 synthetic fixtures or a 6-account dev database presented as anything resembling a market fact, it does direct damage to the one asset the company cannot afford to weaken — the "deterministic, evidence-linked" positioning that is the entire differentiator. This is precisely the failure mode content-editor names in `content_model.md`'s honesty constraints, and precisely the failure mode the task's absolute constraint names via the `llms.txt` pricing-drift precedent. **Mitigation, by construction, not by discipline:** the six-condition boundary in §2 makes fabrication structurally hard to ship — no customer-data claims are permitted at all under this scope (§3 "out of scope"), the only two permitted claim classes are a true engineering-property fact and explicitly-labeled synthetic fixtures, and every number is CI-enforced against a regenerable source (§4). The control does not rely on any one agent remembering to be careful.

**Scope-erosion risk.** A narrow, well-reasoned exception is exactly the kind of artifact that gets cited later to justify a broader one ("we already did this for sopTemplate, why not persona"). **Mitigation:** the allow-list in §2 condition 3 names the one page type and one field explicitly and states in the same sentence that extending it to other types requires a new scope document. Future agents reading this file should find the boundary, not a precedent to stretch.

**Low-ROI-given-no-distribution risk.** Doing this before Chrome Web Store submission may produce content that sits undiscovered, since the constraint that actually gates discovery (authority, distribution) is untouched by this item. **Mitigation:** cost is small and explicitly bounded (§5), does not compete for the same specialist agents as Tier 2, and §6 sets expectations honestly rather than overselling the artifact's reach.

**Coordination risk with item 1.** Item 1 (downloadable SOP templates) shipped today on the same 17 pages. Iteration 2's implementer must read that diff first (§5, iteration 3 note) to avoid a duplicated or inconsistent claim landing on the same page from two initiatives in close succession.

**Generator-fragility risk.** If the generator depends on anything non-pinned (wall-clock time, an unpinned fixture version, non-deterministic test ordering), the anti-fabrication check becomes unreliable rather than absent — arguably worse, because it creates false confidence. **Mitigation:** iteration 1 explicitly requires `qa-engineer` review of the generator's own determinism before any content consumes its output, and the fixtures are already schema-versioned (`fixtures/workflows/README.md`: schema 1.0.0, segmentation 1.1.0), giving a pinned baseline to build against.
