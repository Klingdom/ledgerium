# Process-Variation Sample — Verification of Variation Analysis

**Role:** process-mining analyst (read-only verification)
**Date:** 2026-06-11
**Subject:** `apps/web-app/src/lib/sample-variants.ts` — "Approve Expense Report (Sample)", 8 runs
**Engines verified:** `packages/intelligence-engine/src/{variantDetector,divergenceAnalyzer,pathSignature,variantAnalyzer}.ts`, `clustering/{clusterSignatures,traceSimilarity}.ts`, `apps/web-app/src/lib/{variantStoryMap,intelligence}.ts`
**Method:** hand-computation from source, then byte-level comparison against live engine output captured via a temporary assertion test run through `pnpm … vitest` (test deleted after capture; no source modified). The two existing suites `sample-variants.test.ts` (4) + `variantStoryMap.test.ts` (10) pass.

---

## 0. How the signature is built (so the math is reproducible)

A run's **path signature** = the ordered list of step **categories**, where category = each derived step's `grouping_reason` (`pathSignature.ts:20-30`; `processMapBuilder.ts:126` maps `grouping_reason → stepDefinition.category`). Titles and durations are **not** part of the signature — only the category sequence. This is the privacy-safe, deterministic identity used everywhere downstream.

The 8 recordings therefore reduce to these category sequences (note: the standard path's **last** step "Archive to records" is `single_action`, and the insertion's extra "Request clarification" is **also** `single_action` — this collision is the one place the math is non-obvious, handled below):

| run id | variant | category sequence | len |
|---|---|---|---|
| 001–004 | standard ×4 | `click_then_navigate · data_entry · fill_and_submit · send_action · single_action` | 5 |
| 005–006 | insertion ×2 | `click_then_navigate · data_entry · single_action · fill_and_submit · send_action · single_action` | 6 |
| 007 | shortcut ×1 | `click_then_navigate · data_entry · fill_and_submit · single_action` | 4 |
| 008 | exception ×1 | `click_then_navigate · data_entry · fill_and_submit · error_handling · send_action · single_action` | 6 |

(Live signatures confirmed identical to the above.)

---

## 1. Hand-computed truth vs. engine output

### 1a. Variant set (`detectVariants` via `analyzePortfolio`, threshold = 0.75)

Greedy clustering at `variantSimilarityThreshold = 0.75` (`types.ts:37`). Runs are processed sorted by id; identical signatures score 1.0 so the four signatures above form **4 distinct groups** — none of the cross-signature similarities reaches 0.75 (verified below), so no two distinct signatures merge into one variant.

| metric | hand-computed | engine | match |
|---|---|---|---|
| `variantCount` | 4 | **4** | ✓ |
| `runCount` | 8 | **8** | ✓ |
| standard path signature | the 5-step standard | identical | ✓ |
| standard `runCount` | 4 | **4** | ✓ |
| standard `frequency` | 4/8 = **0.50** | **0.5** | ✓ |
| `sequenceStability` | 4/8 = 0.50 | **0.5** | ✓ |

Per-variant (sorted by run count desc, tie-break by signature string):

| variant | signature | runCount | frequency | hand-check | engine evidenceRunIds |
|---|---|---|---|---|---|
| variant-1 (standard) | std 5-step | 4 | 4/8 = 0.500 | ✓ | 001,002,003,004 |
| variant-2 (insertion) | +`single_action` mid | 2 | 2/8 = 0.250 | ✓ | 005,006 |
| variant-3 (exception) | +`error_handling` | 1 | 1/8 = 0.125 | ✓ | 008 |
| variant-4 (shortcut) | −`send_action` | 1 | 1/8 = 0.125 | ✓ | 007 |

Frequencies sum to 0.50 + 0.25 + 0.125 + 0.125 = **1.000** ✓ (no double-count). `evidenceRunIds` are the real seeded session ids, sorted — **exact match** to hand-assignment.

**Tie-break note (verified, not a bug):** variant-3 (exception) and variant-4 (shortcut) both have runCount 1. The detector orders them by signature string ascending (`variantDetector.ts:80-84`). `…fill_and_submit:error_handling:…` sorts before `…fill_and_submit:single_action` (because `e` < `s`), so exception is ranked variant-3 and shortcut variant-4. Deterministic and correct; ordering of equal-frequency variants carries no truth claim.

**`similarityToStandard` (engine, informational):** insertion 0.60, exception 0.60, shortcut 0.52 — all `< 0.75`, which is exactly why they are *distinct* variants rather than absorbed into the standard. Consistent.

### 1b. Fastest / longest path (durations — `variantAnalyzer` / story-map duration not in signature)

Durations are summed from the step `durationMs` in the sample (jitter applies only to the standard runs' Review step, so it cannot change which *variant* is fastest/longest):

| variant | total duration (ms) | rank |
|---|---|---|
| shortcut (007) | 1500+7000+3500+1000 = **13,000** | **fastest** ✓ |
| standard (001) | 1500+8000+4000+2000+1000 = 16,500 (±jitter) | — |
| insertion (005) | 1500+8000+5000+4000+2000+1000 = 21,500 | — |
| exception (008) | 1500+8500+4000+6000+2000+1000 = **23,000** | **longest** ✓ |

The sample is **constructed so shortcut is unambiguously fastest and exception unambiguously longest** (the docstrings claim exactly this). Hand math confirms the claim. The `buildVariantRecords` fastest/slowest selector (`variantAnalyzer.ts:168-174`) keys off mean duration per variant and would pick shortcut / exception respectively.

### 1c. Diverge → reconverge branches (`analyzeDivergence`, LCS-backbone, backbone = standard path)

Backbone = `[click_then_navigate, data_entry, fill_and_submit, send_action, single_action]` (indices 0–4). Each non-standard variant aligned to the backbone via LCS:

| branch | run(s) | diverge **after** backbone idx | reconverge **at** idx | alt steps | skipped backbone | run-weighted share |
|---|---|---|---|---|---|---|
| **insertion** | 005,006 | after idx 1 (`data_entry`) | at idx 2 (`fill_and_submit`) | `[single_action]` | — | 2/8 = **0.250** |
| **exception** | 008 | after idx 2 (`fill_and_submit`) | at idx 3 (`send_action`) | `[error_handling]` | — | 1/8 = **0.125** |
| **shortcut** | 007 | after idx 2 (`fill_and_submit`) | at idx 4 (`single_action`) | — | `[send_action]` | 1/8 = **0.125** |

Engine output matches every column exactly, **including the subtle insertion anchoring**: the inserted `single_action` is correctly treated as an *insertion between `data_entry` and `fill_and_submit`* (alt step), NOT mis-anchored onto the backbone's trailing `single_action`. LCS with the pinned tie-break resolves the `single_action` collision the right way. DFG cross-check confirms each: `dfgConfirmedSplit=true` and `dfgConfirmedJoin=true` on all three branches (out-degree>1 at the split category, in-degree>1 at the join). The shortcut is correctly classified as a *skipped-backbone* branch (`altSteps=[]`, `skippedBackbone=[send_action]`) and rendered as a dashed bypass edge.

**Run-weighted branch shares sum to 0.250 + 0.125 + 0.125 = 0.500**, and the spine-conforming share is the complementary **0.500** (= the 4 standard runs). Total = 1.000. **No share exceeds 1, none double-counts, the partition is exact.**

---

## 2. Two divergence "frequency" scales — both correct, but worth flagging for doc authors

`analyzeDivergence` is fed the **4 variant representatives** (one row per variant), not the 8 raw runs — see `variantStoryMap.ts:97` (`runs = withSteps.map(v => ({id:v.id, steps:v.stepCategories}))`). Consequently the raw `DivergenceAnalysis` numbers are **variant-weighted**:

- `conformingRunCount = 1` and `conformingFrequency = 0.25` — i.e. *1 of the 4 variants* conforms.
- each `branch.frequency = 0.25` — i.e. *1 of 4 variants* per branch.

The story-map layer (`buildVariantStoryMap`) then **re-weights by `runCount`** to produce the user-facing numbers:

- `totalRuns = 8`, `conformingRunCount = 4` (run-weighted, `variantStoryMap.ts:107-109`), and each edge's `runShare` is the true run fraction (insertion 0.25, exception 0.125, shortcut 0.125).

**Both are internally correct**, but they are *different denominators*. The numbers a user should see (and that the story map exposes) are the **run-weighted** ones (50% conform, 25% / 12.5% / 12.5% branches). **A docs author must not surface the raw `DivergenceAnalysis.branch.frequency` (0.25/0.25/0.25) as "branch frequency"** — that is variant-weighted and would wrongly imply the rare exception/shortcut are as common as the 2-run insertion. The story-map `runShare`/`runCount` fields are the trustworthy ones. This is a presentation hazard, not an engine defect.

---

## 3. Determinism

Confirmed. `analyzePortfolio` run twice over the same bundles produced **byte-identical** variant output (`a === b` over `{variantId, runCount, signature, evidenceRunIds}`). Root causes inspected and sound:
- Signatures are pure functions of category order (`pathSignature.ts`).
- Detector sorts runs by id, greedy first-match, output sorted by (runCount desc, signature asc) (`variantDetector.ts:55-103`).
- `analyzeDivergence` sorts runs by id, LCS DP with fixed tie-break ("prefer up"), branch sort by (runCount desc, position, content) (`divergenceAnalyzer.ts:205, 240-246`).
- `clusterSignatures` sorts members by id, union toward lexicographically smaller root (`clusterSignatures.ts:87,107-113`).
- Story map computes node x/y arithmetically, no layout library, no `Date`/`random`.

The bundles themselves are built from a fixed `BASE_NOW = 1_700_100_000_000` with fixed durations, so the input is also deterministic. **Same input → identical output: verified.**

## 4. Single-cohort clustering

Confirmed. `clusterSignatures` over all 8 runs at the default threshold (0.6, `clusterSignatures.ts:28`) returns **exactly 1 cluster of size 8**. Single-link/connected-components merges everything because each non-standard signature is `traceSimilarity ≥ 0.6` to the standard hub (LCS-dominant blend, `traceSimilarity.ts:34` weights lcs 0.6 / cat 0.4). So the Variants tab gathers all 8 as one process **without needing persisted grouping** — matching `analyzeWorkflowVariants` cohort-union logic (`intelligence.ts:487-492`). ✓

Note the **two different thresholds** in play, both intentional: clustering ("are these the same process?") uses **0.6**; variant detection ("how many distinct ways within the process?") uses **0.75**. The sample is calibrated so all 8 pass 0.6 (one cohort) yet split into 4 at 0.75 (four variants). This is the correct relationship — a looser gather, a tighter split — and the sample exercises it cleanly.

## 5. Evidence-linkage

Confirmed at every layer:
- `ProcessVariant.evidenceRunIds` carries the real sorted session ids per variant (§1a table — exact match).
- `DivergenceBranch.evidenceRunIds` carries the source run ids per branch (`divergenceAnalyzer.ts:234`).
- Story-map branch/rejoin/shortcut **edges** carry `evidenceRunIds` resolved back to the real run ids (`variantStoryMap.ts:116, 166, 179-183`); spine edges carry `[]` by design. The temp test confirmed e.g. `branch-0-in → [sample-variants-005, sample-variants-006]`, `shortcut-2 → [sample-variants-007]`. The click-a-branch evidence drill therefore lands on actual recordings.

---

## 4 (task item). Discrepancy scan

| candidate failure mode | finding |
|---|---|
| frequency double-count | **None.** Variant frequencies sum to 1.000; branch run-shares + conforming share sum to 1.000. |
| wrong standard path | **None.** Standard = the 4-run 5-step path, freq 0.50, correctly the most frequent. |
| branch share summing > 1 | **None.** Run-weighted shares partition exactly (0.25 + 0.125 + 0.125 + 0.50 = 1.0). |
| insertion mis-anchored on duplicate `single_action` | **Correctly handled** — LCS treats it as an insertion, not a backbone match. |
| exception/shortcut tie ordering | **Deterministic** (signature-string tie-break); carries no truth claim, not misleading. |
| **variant-weighted vs run-weighted frequency** | **Presentation hazard (not engine defect).** Raw `DivergenceAnalysis` branch/conforming frequencies are variant-weighted (0.25 each / 0.25 conforming). The user-facing story map correctly re-weights to run shares (0.25 / 0.125 / 0.125 / 0.50 conforming). Docs/UI MUST source the run-weighted story-map fields, never the raw divergence frequencies, or a reader would see "25% conform / 25% each branch" — wrong on both counts. Flagged for doc authors; the shipped story map already does the right thing. |

No discrepancy that would put a *wrong number in front of a user via the story map* was found. The single risk is a docs author reaching past the story map into the lower-level divergence object.

---

## 5 (task item). Net verdict

**The sample correctly and faithfully demonstrates variation analysis, and the numbers a user sees through the Variants story map are TRUSTWORTHY.**

- 4 variants, standard = 50% (4/8), insertion = 25% (2/8), exception = 12.5% (1/8), shortcut = 12.5% (1/8) — hand-computed and engine-produced numbers are **identical**.
- Fastest = shortcut (13.0s), longest = exception (23.0s) — matches construction.
- Three diverge→reconverge branches anchor and rejoin exactly where the hand alignment says, each evidence-linked to its real source runs, DFG-confirmed.
- Output is deterministic; all 8 cluster into one cohort; the looser-gather (0.6) / tighter-split (0.75) threshold pair is exercised correctly.

**One caveat for whoever writes the user-facing docs:** present branch and conforming frequencies from the **run-weighted story-map layer** (`runShare`/`runCount`/`conformingRunCount` over `totalRuns = 8`), **not** from the raw `analyzeDivergence` result, whose frequencies are variant-weighted (denominator 4) and would mislead. The shipped UI path already uses the correct layer; this is a guardrail against a future doc/UI shortcut, not a current defect.
