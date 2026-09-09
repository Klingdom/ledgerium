# Measurement Program — What Ledgerium Can Honestly Publish

**Date:** 2026-09-09
**Scope:** Tier 1 item 2 of `SYNTHESIS.md` — "Publish real measured data."
**Author:** analytics agent (coordinator-invoked)
**Mode:** Analysis / design only. No product code written or run. No numbers invented.

---

## 0. How to read this document

Every factual claim below is labeled:

- **VERIFIED** — I read the file/function myself in this session and the number or mechanism is exactly as stated.
- **REASONED** — a conclusion drawn from verified facts, with the inference shown.
- **MODELLED** — an assumption-dependent estimate, always with the assumptions stated. There are very few of these, and none of them are proposed for publication.

Nothing in this document is a number to copy into marketing content as-is. Section 1 tells you exactly which numbers are safe to publish, with what wording. Section 3 tells you which ones are not, and why.

---

## 1. What is honestly publishable today

Ranked by citability (how likely an AI assistant or skeptical engineer is to treat it as real evidence rather than a claim).

### 1.1 — Export integrity hashes (strongest: verifiable by any customer, on their own data, right now)

**Claim:** Every workflow session Ledgerium exports carries content hashes for its four constituent files, so the customer — not Ledgerium — can verify the export has not been altered.

- **Source:** `fixtures/workflows/accounts-payable-invoice-processing.json` → `manifest.fileHashes` block (VERIFIED — I read this exact structure: `{ "session.json": "...", "normalized_events.json": "...", "derived_steps.json": "...", "policy_log.json": "..." }`). This is the export manifest shape, present in every fixture file of this format, not something invented for this claim.
- **N required:** none. This is a property of a single export, checkable by the person who holds it.
- **Caveat sentence:** *"Every exported session bundle includes a hash for each of its four component files. You can recompute the hash of any file you export and confirm it matches — this does not depend on trusting Ledgerium's word for it."*
- **Why this ranks #1:** it needs zero customers, zero new instrumentation, and zero sample-size hedge. It's a mechanism claim about something already shipped, and it is falsifiable by literally any reader with the file in hand (see §6).
- **Action needed to publish:** none beyond writing the sentence and, ideally, exposing what hash algorithm is used in a short methodology note (I did not verify the algorithm — the field name suggests SHA-256 length hex strings but I did not trace the hashing function itself; **name it precisely before publishing**, do not guess).

### 1.2 — Live-vs-batch convergence (the "I1 invariant") — strongest determinism claim

**Claim:** The step-segmentation that happens while you are still recording (live/streaming) produces byte-identical output to the step-segmentation that happens when the same session is reprocessed offline in a batch. Two structurally different code paths converge to the same result.

- **Source (VERIFIED, read directly):**
  - `packages/segmentation-engine/src/convergence-live.regression.test.ts` — 12 named golden fixtures, each checked twice: (a) finalized `LiveStep` output byte-equals the golden expected output (`expect(JSON.stringify(observed)).toBe(JSON.stringify(golden))`), and (b) two independent runs of the same input are byte-identical to each other. 24 assertions.
  - `packages/segmentation-engine/src/convergence-batch.regression.test.ts` — the same 12 fixtures run through the batch segmenter (`segmentEvents`), same two checks per fixture. 24 assertions.
  - Both suites assert against the **same** golden fixture files (`packages/segmentation-engine/fixtures/golden/*.json`, 12 files: `demo`, `spreadsheet-cells`, `action-button-then-other`, `action-button-rapid-repeat`, `annotation-mid-stream`, `idle-gap`, `multi-domain-tabs`, `spa-route-change`, `error-recovery`, `fill-and-submit`, `single-action-no-label`, `empty-session`) — which is what makes it a convergence claim (two paths, one truth) rather than two separate determinism claims.
- **N:** 12 fixtures, 24 assertions per code path, run on every commit (test files exist in the checked-in test suite; I did not re-run `pnpm test` myself since the task instructs no product-code execution, but the assertions are literal `expect(...).toBe(...)` equality checks, not fuzzy comparisons).
  - It is also true that a bug fix I have no way to independently re-verify today without running the suite could exist between "the code as I read it" and "the code as it runs" — treat the *mechanism* (this is how the tests are structured) as VERIFIED and the *current pass/fail state* as unverified-by-me-in-this-session. Whoever ships this claim should run `pnpm --filter @ledgerium/segmentation-engine test` immediately before publishing and cite the run.
- **Caveat sentence:** *"We test this with byte-for-byte equality assertions across 12 recorded-behavior scenarios, run on every code change — not spot-checked, not sampled."*
- **What this is NOT:** a claim about accuracy (whether the segmentation is *correct* relative to what a human would call a "step") — only about *consistency* (same input → same output, regardless of which code path processed it). Do not conflate the two in copy.

### 1.3 — Full-pipeline determinism (raw event → normalized → segmented)

**Claim:** The entire pipeline — from a raw captured browser event through normalization to a finalized process step — produces byte-identical, reproducible output.

- **Source (VERIFIED):** `packages/normalization-engine/src/full-pipeline.regression.test.ts`. 4 named fixtures (`click-with-label`, `fill-and-submit`, `route-change`, `rapid-focus-blur`), each checked in two suites: (1) raw `.ndjson` → normalized `CanonicalEvent[]` byte-match + two-run determinism; (2) full pipeline → `DerivedStep[]` byte-match + two-run determinism. 16 assertions total.
- **N:** 4 fixtures (smaller corpus than 1.2 — do not merge the "12" and "4" numbers into one figure; they are different test suites over different fixture sets).
- **Caveat sentence:** *"Verified end-to-end, not just at the internal segmentation boundary — from the raw captured event through to the finished process step."*
- This is best published **alongside** 1.2, not instead of it — together they cover the two pipeline boundaries (normalization→segmentation, and live→batch) that actually matter.

### 1.4 — Fixture corpus composition (descriptive, not a performance claim)

**Claim:** Ledgerium's own test corpus spans 10 named, cross-industry workflow types and dozens of real enterprise systems — useful as "breadth of coverage" content, not as a results claim.

- **Source (VERIFIED):** `fixtures/workflows/README.md`. Ten scenarios: accounts-payable-invoice-processing (18 events / 6 steps / NetSuite), employee-onboarding-saas (25/8, Workday+Slack+Jira+Gmail), customer-support-ticket-triage (22/7, Zendesk+Salesforce), sales-crm-opportunity-update (20/5, Salesforce), ecommerce-order-refund-processing (30/9, Shopify+Gmail), healthcare-patient-intake-admin (33/9, EpicCare EHR+BCBS Portal), insurance-claim-review (40/13, Guidewire+NICB), it-access-provisioning (25/8, ServiceNow+Azure AD+VPN), marketing-campaign-launch-checklist (25/8, Monday+HubSpot+Slack), procurement-vendor-setup (34/9, SAP+Google Sheets).
- **What this is safe to say:** "our own engineering test suite models workflows across finance, HR, support, sales, e-commerce, healthcare admin, insurance, IT, marketing, and procurement, with 5 to 13 steps and up to 40 recorded events per scenario."
- **What this is NOT safe to say:** anything implying these are customer workflows, typical customer results, or a statistically meaningful sample of "how businesses actually work." They are internal QA fixtures (see §1.5 caveat — same corpus).
- **Caveat sentence:** *"These are internal test scenarios built to exercise our recording and analysis pipeline across a range of industries and process shapes — not customer data."*

### 1.5 — A single worked example: wait-time vs. active-step-time, from one named fixture

This is the closest thing to the "publish real measured data" ask in `SYNTHESIS.md` item 2 — a concrete number, not a mechanism restatement — but it needs the most careful caveat of anything in this list, so read the caveat before the number.

- **Computation (VERIFIED — I performed this arithmetic directly on the fixture JSON, no code executed, pure addition of fields already in the file):**
  - Source: `fixtures/workflows/accounts-payable-invoice-processing.json`.
  - Session duration: `endedAt` − `startedAt` = 402,000 ms (6 min 42 s) — matches the last event's `t_ms: 402000` exactly.
  - Sum of the six `derivedSteps[].duration_ms` values (4,800 + 14,300 + 6,700 + 6,400 + 5,700 + 12,000): **49,900 ms** — the time actually inside a recorded step.
  - Remainder (402,000 − 49,900 = 352,100 ms) is elapsed time that falls *between* steps in this recording — e.g., a 112,300 ms gap between "enter line item 2" and "approve vendor bill," and a 203,800 ms gap between "approve" and "post to GL."
  - As percentages of the session: **~12.4% inside a recorded step, ~87.6% between steps.**
- **N:** exactly 1 (one named fixture). This is a worked example, not a statistic, and must never be presented with a percent sign implying a population.
- **The caveat that makes or breaks this claim's honesty:**
  1. This fixture is **synthetic test data**, not a captured customer session. The fixtures README describes them as scenarios built "for testing the Ledgerium process intelligence pipeline" and for seeding demo accounts — not organic usage. `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md` independently confirms this pattern for the sibling fixture corpus: *"corpus SVR over the 10 curated workflow fixtures remains 0 because they were authored fully-labelled"* — i.e., this team has already, elsewhere, explicitly documented that its own fixtures are hand-authored, not captured.
  2. Because it's synthetic, the 87.6% figure demonstrates **how the measurement works**, not what a customer should expect. A hand-authored fixture's gap structure reflects what the fixture author decided to model, not a real distribution of wait time in any business process.
- **Correct framing:** *"Here is a worked example from one of our internal test recordings, showing how the report separates time spent inside a step from time elapsed between steps. [table/numbers]. This is an illustration of the mechanism using a synthetic test scenario — not a customer result or a typical value."*
- **Incorrect framing (do not do this):** "Ledgerium found that 88% of process time is wasted waiting" or any headline implying this is a discovered fact about business processes in general. That would be exactly the kind of fabricated-adjacent claim the task explicitly forbids, laundered through a single real fixture instead of a made-up one. The number is real; the generalization is not, and nothing in the fixture supports one.
- **Recommendation:** publish this only in a clearly-labeled "how it works" / methodology context (e.g., a product-mechanism page, not a stats/benchmark page), with the actual JSON excerpt shown or linked so a reader can check the arithmetic themselves (see §6).

### 1.6 — SVR (Step Vagueness Rate) baseline — real, regression-locked, but internal-facing only

- **Source (VERIFIED):** `packages/process-engine/src/svrBaseline.test.ts`, cross-referenced against `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md` §10. Runs the real `processSessionFull()` pipeline (not a mock) over the 12 segmentation-engine golden fixtures. Measured, regression-locked baseline: **31 total instructions across 11 scored fixtures (`empty-session` excluded — it has zero derived steps and is honestly reported as "skipped," not scored as 0%), 1 vague instruction, aggregate SVR = 1/31 ≈ 3.2%.** The test hard-asserts these exact numbers (`expect(totalInstructions).toBe(31)`, `expect(totalVague).toBe(1)`) — if the underlying scorer or SOP builder changes and the number moves, CI fails.
- **N:** 11 scored fixtures, 31 instructions.
- **Why this is NOT publishable as a customer-facing "our SOPs are 96.8% specific" claim, in the project's own documented words (VERIFIED, quoted from the source doc):** *"11 of the 12 golden fixtures are fully-labelled by design (they exist to test segmentation boundary behavior, not vagueness) and correctly score 0%... This is not a demonstration of the real-world vagueness problem... that requires production session data."* The doc goes further: an earlier attempt at this exact metric scored a suspicious, non-diagnostic 0% until the team found and fixed a scoring bug that let two of three signals pass independently of the vague-text match — a documented instance of catching a metric that "never fires on its own designed worst case."
- **What IS honestly publishable from this:** not the percentage, but the *practice* — as an engineering-transparency/AEO-trust signal, not an outcomes claim: *"We regression-test our SOP-quality scorer against a fixture corpus and lock the numeric baseline in CI, so a quality regression fails the build instead of shipping quietly."* This is a rigor claim about the company's engineering discipline, which is legitimate and interesting content (and directly supports the AEO differentiation goal — "deterministic, evidence-linked" — without needing a customer-facing percentage at all), but it is a different claim from "our output is 96.8% specific," and the two must never be merged in copy.

### Summary ranking

| Rank | Claim | N | Type | Publishable as-is? |
|---|---|---|---|---|
| 1 | Export hash verification | 1 (any export) | Mechanism/integrity | Yes, today |
| 2 | Live↔batch convergence (I1) | 12 fixtures × 2 paths | Determinism | Yes, today, with the "re-run before you publish" caveat in §1.2 |
| 3 | Full-pipeline determinism | 4 fixtures | Determinism | Yes, today |
| 4 | Fixture corpus breadth | 10 scenarios | Descriptive coverage | Yes, as coverage language only |
| 5 | AP fixture wait/active split | 1 (synthetic) | Worked example | Yes, only as a labeled mechanism illustration |
| 6 | SVR engineering practice (not the %) | 11 fixtures | Rigor/process claim | Yes, as a practice statement; the raw % is not publishable as an outcomes claim |

---

## 2. The determinism claim, specifically

**What is actually true, precisely stated:** given the same recorded input, the same version of the pipeline produces byte-identical output — every time, and identically whether the output was produced live (while the session was still being recorded) or reconstructed later from a batch reprocessing pass. This is a **property**, verifiable in a single execution (run it twice, diff the output), not a statistic that needs a sample size. N=1 genuinely is enough for a determinism claim, in a way it is never enough for a performance claim — this is the one place in this whole exercise where a small number is fully rigorous, not merely convenient.

**What determinism does NOT mean, and must not be implied to mean:**
- It is not an accuracy claim (correct segmentation vs. what a human would call a step).
- It is not a claim about the *raw capture* being noise-free (browser timing jitter, network variance in wall-clock timestamps, etc. — determinism here is about the deterministic *processing* of a given input, not a claim that repeated human execution of the same task yields the same recorded events).

**Strongest forms of evidence, ranked by how hard they are to dismiss:**

1. **Self-service reproduction using the live product (strongest — does not require trusting Ledgerium's tests or CI at all).** The `/upload` page already exists (VERIFIED — referenced in `fixtures/workflows/README.md`: "Each file can be uploaded directly via the Ledgerium web app upload page (`/upload`)"). A visitor (or an AI agent operating a browser on a visitor's behalf) could upload the same session bundle twice and compare the resulting SOP/health-score/process-map output, or compare the export manifest hashes (§1.1) across the two runs. This turns an internal test assertion into something an outside, skeptical party can do themselves, on the actual product, with zero access to the source repository. **This is the single highest-leverage thing to build/document next** for making the determinism claim externally verifiable rather than merely asserted — and it requires no new engineering, only a documented procedure and possibly a small downloadable fixture file for visitors who don't have their own recording yet.
2. **A published reproducibility procedure with a hash target.** A short, dated methodology page: "Download this fixture. Upload it. The resulting export's `derived_steps.json` hash will be `<exact hash>`. If it isn't, tell us — that's a bug." This is a falsifiable, specific commitment (see §6), stronger than a hash manifest alone because it names the *expected value* in advance rather than only offering a way to check internal consistency after the fact.
3. **A hash manifest, published as-is.** Already exists in the export format (§1.1) — the weakest of the three because it only proves *this specific export is self-consistent*, not that *re-running produces the same export*. Still worth publishing on its own, since it costs nothing and it is a real, shipped mechanism.
4. **A "run this yourself" script or public fixture + expected-output pair, for engineers.** This would mean open-sourcing (or publishing standalone, outside the private repo) a small slice of the pipeline plus a fixture and its expected output, so a technically sophisticated reader (or a crawler indexing a public repo) can independently confirm determinism without needing product access at all. This is the heaviest lift of the four (IP/competitive exposure questions belong to product/legal, not to this analysis) but is the version that would most likely get picked up and cited by AI assistants and engineering audiences, because it is inspectable, dated, and machine-readable — not prose asserting a property.

**What would make a skeptical engineer or an AI assistant treat this as verified rather than asserted:** specificity and falsifiability, not confidence of tone. "We are deterministic" is an assertion. "Upload this exact file; the SHA-256 of the resulting `derived_steps.json` will be `9f2e...`; if it differs, that's a defect, not noise" is a falsifiable claim with a name, a date, and a number attached — that is the difference between marketing copy and evidence, and it is achievable using infrastructure that already exists (§1.1's hash manifest + the existing `/upload` flow).

---

## 3. What is NOT publishable yet, and the N each needs

This list is as load-bearing as §1. Naming these honestly is itself part of the deterministic-measurement brand — a company that claims measurement as its differentiator should be visibly disciplined about what it does not yet know.

| Claim class | Example of what NOT to publish | Why it's blocked today | N / prerequisite needed |
|---|---|---|---|
| **Any customer outcome statistic** | "Customers reduce cycle time by X%" | Zero customers exist (VERIFIED per task brief; also consistent with every internal doc reviewed, which treats N=6 dev-DB rows as the *only* available sample and repeatedly flags it as too small even for an internal decision) | Real paying customers, real recorded workflows, over time. See row below for how much. |
| **Health-score / variation-score population statistics** (mean, median, distribution, correlation) | "Average workflow health score is 87" | `docs/analysis/HEALTH_SCORE_DISTRIBUTION_COMPARISON.md` (VERIFIED, read in full) explicitly states N=6 is "below the recommended minimum of 10 for reliable distribution analysis" and its own Spearman correlation function refuses to compute below N=5. That floor was set for an *internal* engineering decision (v1→v2 retirement). A public, customer-facing "typical score" claim should sit well above that internal floor. | REASONED: for a public "typical/average" claim, recommend N≥30 independent workflows as an absolute floor before publishing any central-tendency number, and disclosure of the full distribution (not just a mean) given the demonstrated volatility at small N — the existing N=6 sample's own delta table shows one workflow swinging the mean by 12 points, i.e., a single outlier can move a small-N average by double digits. Larger, cross-industry N (ideally 100+, multiple company sizes) before calling anything "typical." |
| **Automation-opportunity score validity** | "Workflows we flag as 'automate' get automated and save time" | The score (`computeAiOpportunityScore` / `computeOpportunityTag`, VERIFIED in `apps/web-app/src/lib/workflow-metrics.ts`) is a *prediction*, never validated against a real automation outcome. No instrumentation exists today that records "did the user act on this tag, and what happened after" (confirmed — see §5). | Requires *outcome* data, not just more workflows: real customers who acted on an "automate"/"standardize" recommendation, with a measured before/after (see §5 for the missing instrumentation). This is a data-*type* gap, not only a data-*volume* gap — adding more unvalidated scores does not fix it. |
| **Time-saved / ROI claims** | "Save N hours per week" | No usage-duration telemetry exists across paying accounts over time; no before/after comparison mechanism exists at all (see §5). | Real customer accounts, multi-week/month usage, plus the before/after instrumentation in §5. |
| **SVR as a customer-facing accuracy percentage** | "Our SOPs are 96.8% specific" | Per §1.6: the current 3.2% aggregate SVR is a property of a hand-labeled test corpus, honestly documented by the project's own review as non-diagnostic for real-world capture quality (*"corpus SVR... remains 0 because they were authored fully-labelled... real-world corpus SVR will be observable once sessions with capture-failures flow through"*). | Real production sessions must flow through the capture pipeline and be scored — explicitly gated, per `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md`, behind CEO approval for the P1-d/e/f capture-pipeline enrichment items (currently HELD under the Extension Reliability Invariant). This needs both real customers **and** a specific, currently-paused engineering sequence to complete. |
| **Any "X% of businesses have this problem" market-sizing claim** | "70% of process documentation is outdated" | No first-party survey or measurement exists in this repo at all; this would be a claim about the world, not about Ledgerium's product, and nothing here computes it. | Out of scope for this analysis entirely — would need a genuinely separate research/survey effort with its own methodology, or a cited (not fabricated) third-party source. |
| **Before/after time-to-document, or "old way vs. Ledgerium way" quantified** | "Takes 3 hours manually vs. 10 minutes with Ledgerium" | This requires a designed comparison (paired task, same process, two methods), which does not exist anywhere in this codebase. The existing `oldWay` / `ledgeriumWay` content fields (seen in `content/pages/workflow.ts` proseSources) are prose contrasts, not measured comparisons. | REASONED: a small controlled comparison (e.g., 10–20 paired sessions, same task documented the old way and via Ledgerium) would be the minimum credible N for even a hedged claim — and it is a study to design and run, not something derivable from any existing fixture or database. |

**The general pattern in this section:** every blocked claim needs either (a) real customers at meaningful N, (b) an instrumentation type that doesn't exist yet regardless of N (outcome tracking, before/after pairing), or (c) both. None of them can be shortcut by re-analyzing the existing fixtures or the N=6 dev database harder — that data has already been correctly flagged, in this codebase's own prior work, as insufficient for the much lower bar of an internal decision.

---

## 4. Measurement program design — keeping published numbers honest over time

The cautionary precedent named in the task brief (llms.txt pricing drift from `plans.ts`) is exactly the failure mode to design against: a number gets hand-typed into content once, and the source of truth moves without the copy moving with it.

### 4.1 Principle

**No number appears in publishable content unless it is imported from a generated artifact, and that artifact is regenerated from the same code the corresponding regression test calls — never re-implemented a second time in a content script.** This directly avoids the shadow-function-divergence failure class this project has already hit once in production code (documented in `CLAUDE.md`'s own iteration history as "MDR-P05: shadow-function v1/v2 consolidation," where two independent implementations of the same metric silently disagreed). A content-facing number computed by a second, parallel implementation of the same math is the same bug in a different location.

### 4.2 Proposed mechanism

1. **A single generator script**, following the existing naming convention (`apps/web-app/scripts/health-score-distribution.ts`, `apps/web-app/scripts/validate-seo-content.ts`): e.g. `apps/web-app/scripts/generate-measurement-facts.ts`. This script:
   - Reads the fixture/golden-file counts directly from disk (`fixtures/workflows/`, `packages/*/fixtures/golden/`, `packages/process-engine/fixtures/vagueness-golden/`).
   - Calls the *same* exported functions the regression tests call (`computeSopVagueness` / `processSessionFull` from `@ledgerium/process-engine`, `computeWorkflowMetrics` from `apps/web-app/src/lib/workflow-metrics.ts`) rather than re-deriving the arithmetic — so a change to the underlying formula automatically changes both the test's expected value and the published fact, in lockstep, from one code path.
   - Writes one canonical, version-controlled artifact — e.g. `docs/analysis/MEASUREMENT_FACTS.json` (machine-readable) plus a generated `.md` mirror for human review, matching the pattern already used by `health-score-distribution.ts` for its markdown artifact.
   - Content modules (`apps/web-app/src/content/pages/*.ts`) import specific fields from this generated module — never a hand-typed literal — for any field that claims to be a measured fact.

2. **A staleness/drift gate**, extending the anti-bypass mechanism `SYNTHESIS.md` §6 already proposes for the SEO re-entry gate (`CONTENT_GATE_STATE.json` + a blocking `contentGate.test.ts`), rather than inventing a second, competing gate:
   - Add a check, in the same blocking test, that re-runs the generator's computation for every published "measured fact" field and fails if the regenerated value doesn't byte-match what's embedded in content. This is the direct fix for the specific gap `SYNTHESIS.md` names: *"`validate.ts` never checks staleness anyway."*
   - Reuse the existing `verifiedAsOf` field convention already present in `content/types.ts` for competitor claims (`CompareContentPage.verifiedAsOf`, `AlternativesPage.verifiedAsOf`). Add a parallel `measuredAsOf` field to any content type carrying a generated measurement fact, and have the gate flag (not silently pass) any measured claim whose `measuredAsOf` is older than a defined threshold (e.g., 2 release cycles / N months — a product/content decision, not an engineering one) **or** whose value no longer matches the freshly regenerated source. Two independent triggers: age, and drift.

3. **For future customer-derived statistics** (once real customers exist — see §5): a separate, explicitly human-gated script, e.g. `apps/web-app/scripts/customer-measurement-snapshot.ts`, that:
   - Queries the production database using the same statistical helpers already written and tested (`packages/intelligence-engine/src/stats.ts`'s `mean`/`median`/`percentile`/`stdDev`, and the percentile/Spearman logic in `health-score-distribution.ts` — reuse, don't re-derive).
   - Refuses to mark a result "publishable" below a stated N floor (§3's REASONED N≥30 recommendation for any public central-tendency claim), the same shape of self-limiting warning `health-score-distribution.ts` already prints for N<10.
   - Writes a dated snapshot artifact (`docs/analysis/CUSTOMER_MEASUREMENT_SNAPSHOT_<date>.md`) for **human** review and explicit promotion into content — mirroring the deliberate, no-silent-promotion discipline this project already applies to backlog cold-pool items (`CLAUDE.md`'s Audit-Intake Pattern: promotion requires an explicit trigger, never "coordinator judgment"). A public statistic is at least as consequential as a backlog row; it should not auto-publish.

### 4.3 What this buys

- The pricing-drift failure mode (hand-typed number, source moves, copy doesn't) becomes structurally impossible for any field sourced this way, because the content module has no literal to drift — it imports a generated value.
- The existing regression-test discipline (byte-identical assertions, hard-coded expected values that fail loudly on drift) is reused as the staleness detector, instead of building a second, parallel staleness system.
- Every published number carries a machine-checkable "as of" and a machine-checkable "still true" — the two things `validate.ts` was flagged as missing.

---

## 5. Instrumentation gap — what to capture so there is a real dataset in 6–12 months

Today, per §3, the blocking gap for most claims is **customers**, full stop — no instrumentation change fixes zero N. But two instrumentation gaps exist *independent of* customer count, and both need to be closed now so that once customers arrive, the clock on "defensible dataset" starts immediately rather than 6–12 months after that.

**Gap 1 — no outcome tracking on recommendations.** The product computes a prediction (`opportunityTag`: automate/standardize/optimize/monitor/healthy, `computeAiOpportunityScore`, VERIFIED in `workflow-metrics.ts`) but nothing records what the user did about it or what happened after. Propose:
- New analytics event(s) in `apps/web-app/src/lib/analytics.ts` (the existing `AnalyticsEvent` discriminated union already used for `dashboard_v2_viewed`, `workflow_row_clicked`, etc.): e.g. `opportunity_tag_action_taken { workflowId, opportunityTag, actionType: 'automated' | 'standardized' | 'dismissed', atMs }`.
- A `sop_downloaded` / `sop_shared` event — the minimum viable "was this artifact actually used" adoption signal (also directly useful for the Tier 1 item 1 downloadable-SOP-template work in `SYNTHESIS.md`, which is a natural place to add it).

**Gap 2 — no before/after linkage across repeated recordings of the "same" process.** The intelligence-engine already has the primitives to detect that two recordings belong to the same process family (`packages/intelligence-engine/src/familyScorer.ts`, `exactGroupScorer.ts`, `pathSignature.ts` — VERIFIED to exist, not read in full detail this session, but their names and the `buildMetrics`/`ProcessRunBundle` shapes I did read confirm the aggregation-across-runs capability exists at the engine level). What's missing is a first-class event fired when a *repeat* recording of an existing `ProcessDefinition` family lands, comparing the new run's `avgDurationMs` / `stepCount` / `variationScore` against the family's prior baseline. Propose:
- A new event or table (`WorkflowImprovementEvent`, or an extension of the existing `ProcessInsight` model) computed on-ingest (BullMQ is already the queue technology per this project's stack) whenever a run matches an existing family, recording the delta.
- This is the *only* mechanism that could ever honestly support a "before/after" claim (§3's blocked "old way vs. Ledgerium way" row) — without it, no volume of new customers changes the answer, because nothing links a customer's "before" recording to their "after" recording.

**Gap 3 (softer, but worth naming) — qualitative case studies are legitimate and should not wait for N.** Once there are even 3–5 paying customers, structured interviews (self-reported, clearly labeled as such, never dressed up with a percentage) are honest, immediately available content that doesn't have a sample-size problem because it never claims to generalize. This is a Growth/CS workstream, not an instrumentation one, but it belongs in this plan because it's the one credible source of "measured-adjacent" content available before N clears any statistical floor.

**Timeline implication:** if Gaps 1 and 2 are instrumented *before* the first paying customers arrive (rather than 6 months into having customers), then "6–12 months from first customer" is a realistic window for a first defensible before/after dataset, gated on the N≥30-ish floor from §3 and on enough calendar time passing for repeat recordings to actually occur. If the instrumentation is added *after* customers arrive, the clock effectively restarts from whenever it ships — this is a build-it-now argument even with zero current customers.

---

## 6. Falsifiability — how a reader checks each claim

| Claim | How anyone can verify or refute it |
|---|---|
| Export hash verification (§1.1) | Export any session; recompute the stated hash algorithm over the named file; compare. Requires only the customer's own export — no repo access needed. |
| Live↔batch convergence (§1.2) | **Today, requires repo access** (private repo): run `pnpm --filter @ledgerium/segmentation-engine test` and read `convergence-live.regression.test.ts` / `convergence-batch.regression.test.ts` directly. **To make this externally falsifiable**, either (a) publish the reproducibility procedure from §2 item 2 (download a fixture, upload it via `/upload`, compare the resulting export's hash against a stated value), or (b) publish the fixture + expected-output pair standalone. Until one of those ships, an external reader must take the *mechanism* on trust even though the *test* is real — say so plainly if publishing before that ships. |
| Full-pipeline determinism (§1.3) | Same limitation and same remedy as the row above — repo-access-only today; upload-and-compare would make it self-serve. |
| Fixture corpus breadth (§1.4) | Only verifiable with repo/file access today. If any of these fixtures are ever linked or downloadable from the marketing site (the README already frames them as uploadable via `/upload`), a reader could upload one and see the same step/event counts appear in their own dashboard — direct, self-service confirmation. |
| AP fixture wait/active split (§1.5) | Fully falsifiable by **anyone**, no repo access needed, if the relevant JSON (or even just the six step start/end timestamps) is shown or linked alongside the claim — it's addition and subtraction on 18 numbers. This is the one claim in this document cheap enough to make trivially self-checkable; do so. |
| SVR practice claim (§1.6, the process claim, not the %) | Repo-access-only today (`packages/process-engine/src/svrBaseline.test.ts`, and the honest discussion in `docs/meta/SOP_DETAIL_SPECIFICITY_REVIEW_001.md` §10). Not something to make self-serve for outsiders in the near term — this is an internal-engineering-rigor claim, appropriately evidenced by pointing at (not necessarily publishing) the practice. |

**The pattern across this table:** almost everything in §1 is fully real and checkable *by an engineer with repository access* today, but only two items (export hashes, and the AP fixture arithmetic) are checkable *by an outside reader with zero special access* right now. Closing that gap — via the "download a fixture, upload it, compare the hash" procedure in §2 — is the single highest-leverage next step for turning "verified" from something true-in-principle into something an external skeptic (or an AI assistant weighing sources) can act on without trusting Ledgerium's say-so.

---

## 7. One-paragraph answer to the task

Ledgerium can honestly publish exactly one class of thing today: **verifiable properties of its own pipeline** (export integrity hashes, live/batch convergence, full-pipeline determinism, and one clearly-labeled worked example from a named synthetic fixture) — not yet any claim about customer outcomes, typical results, or ROI, because those require either real customers at a defensible N (≥30, REASONED) or an instrumentation type (before/after linkage, recommendation-outcome tracking) that doesn't exist yet regardless of N. The single most citable thing available today is the export hash manifest: it needs zero customers, zero sample size, and is checkable by any one person on their own data. The single highest-leverage next step is making the pipeline's determinism checkable the same way — by publishing a download-and-verify procedure using the existing `/upload` flow — rather than leaving it as an internal test suite that only an engineer with repo access can confirm.
