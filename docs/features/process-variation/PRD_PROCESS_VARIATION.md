# PRD: Workflow Clustering + Process-Variation Analysis

**Status:** Draft — awaiting CEO review  
**Author:** product-manager agent  
**Date:** 2026-06-10  
**Feature code:** PROC-VAR  
**Target surface:** Workflows dashboard + per-process Report tab

---

## 1. Problem and Value

### 1.1 The pain today

Every recording Ledgerium captures is an island. A user who records "Send Customer Report" twelve times sees twelve separate rows in their dashboard. There is no signal that run #12 is structurally the same process as run #1, no aggregated cycle-time across those runs, no visibility into how two of those twelve runs took a different path through the same process, and no way to see where that divergence happened or whether it mattered.

This breaks the core value proposition. Ledgerium's evidence-linked moat depends on observing many runs of the same process to produce trustworthy baselines. A single run produces a SOP. Multiple runs of the same process should produce process intelligence — frequency, timing, variant distribution, and where the process goes wrong. Without clustering, the intelligence layer has nothing meaningful to aggregate.

The problem has three specific failure modes users encounter today:

1. **No recognition of recurrence.** A user who records the same invoice-processing workflow ten times receives no feedback that these are the same process. Each run appears as a standalone recording. The user has no way to know they have accumulated a meaningful evidence base.

2. **No variation visibility.** When two runs of the same process differ — one executor downloads a PDF, another copies the data manually — there is no way to see that divergence, quantify how often it occurs, measure whether the variation costs time, or decide which path to standardize.

3. **No convergence tracking.** In real processes, paths diverge and then reconverge. A user needs to see "variant A and variant B both end up at the same confirmation step — they just get there differently." Today that structure is invisible.

### 1.2 Why this is the right problem to solve now

The intelligence engine already produces `VariantSet`, `VarianceReport`, `BottleneckReport`, and `TimestudyResult` at the portfolio level. The `groupingTypes.ts` module already defines `ProcessGroup`, `ProcessFamily`, `ProcessVariantRecord`, `DeviationPoint`, and `CanonicalComponent`. The scoring infrastructure (`exactGroupScorer.ts`, `familyScorer.ts`, `variantAnalyzer.ts`) already computes multi-dimensional similarity with structured explanation codes. The Prisma schema already persists `ProcessDefinition`, `ProcessFamily`, `ProcessVariantRecord`, and `GroupRelationship`.

The gap is narrow and specific: `clusterWorkflows()` in `apps/web-app/src/lib/intelligence.ts` groups runs by **identical** path signature only. Two runs that diverge by a single inserted step receive separate `ProcessDefinition` rows and are never compared. The scoring and analysis infrastructure built in Phases 3 and 5 exists precisely to close this gap — it has never been connected to the grouping decision or surfaced in the UI.

This feature connects those dots. It does not require new algorithms. It requires wiring existing primitives into a grouping policy, persisting the results, and building the UI surface that makes them legible.

### 1.3 Connection to Ledgerium's evidence-linked moat

The distinguishing claim for Ledgerium is deterministic, evidence-linked process intelligence. That claim is hollow if every recording is an island. The value of recording a process ten times is not ten SOPs — it is one process with a measured standard path, a quantified variant distribution, and a bottleneck map that no single run could produce. Clustering is the mechanism that converts raw recordings into evidence.

Without it, the "AI recommendations" surface under development (AI Vision, AI+1 through AI+10) has nothing defensible to anchor to: a recommendation derived from a single run is an inference, not a measurement. A recommendation derived from thirty runs of the same process — with a 78% standard-path frequency and a documented 34-second bottleneck at step 4 — is evidence.

---

## 2. Personas and Jobs-to-Be-Done

### 2.1 Primary: Operations Lead

**Who:** Manages a team of 5-25 people executing repeating operational processes (order processing, reporting, customer onboarding, compliance checklists). Cares about throughput, consistency, and whether the team is following the agreed procedure.

**Jobs-to-be-done:**

- "I need to know whether my team is all executing this process the same way, or whether some people have developed their own shortcuts."
- "I need to see how long this process actually takes across the whole team, not just the one time I watched it."
- "I need to know which step is slowing everyone down, and whether the slow version and the fast version do something different."
- "I need to tell my team: here is the standard path, here is why we chose it."

**Current workaround:** Manually reviewing individual recordings, building spreadsheets, watching recordings side-by-side.

### 2.2 Secondary: Process Owner / Analyst

**Who:** Responsible for maintaining a documented standard procedure. May author SOPs, runs process improvement projects, or prepares evidence for audit.

**Jobs-to-be-done:**

- "I need to see whether what people actually do matches the documented SOP."
- "I need to identify which variant of a process is fastest, and whether it is safe to standardize on it."
- "I need to show leadership a before/after comparison after a process change — did the new training reduce variance?"
- "I need to produce a report that shows process performance over time."

### 2.3 Tertiary: Individual Recorder (Self-optimizer)

**Who:** An individual contributor who records their own workflows to build personal SOPs or find where they spend time.

**Jobs-to-be-done:**

- "I recorded this task five times this month — what is my average time and where do I keep getting stuck?"
- "Am I doing this the same way every time, or do I have inconsistencies?"

**Note on MVP boundary:** The primary persona drives the MVP scope. The individual recorder's needs are largely addressed by single-process reporting which ships with MVP. The process owner's comparison and SOP-alignment needs are fast-follow.

---

## 3. Goals and Non-Goals

### 3.1 Goals

**MVP (the set of outcomes this PRD is committing to):**

- G1. Every new recording that arrives is automatically assigned to a process group. Assignment is deterministic, evidence-linked, and reversible by the user.
- G2. A user can see, on the Workflows dashboard, which recordings belong to the same process, how many runs a process has, and its median cycle time.
- G3. A user can open a process and see the variant distribution: which path is standard, how often each variant occurs, and how each variant differs from the standard.
- G4. A user can see, within a variant, where the path diverges from standard and where it reconverges — the diverge/reconverge visualization the CEO described.
- G5. A user can see per-process and per-variant timing: mean, median, p90, min/max duration.
- G6. The system honestly represents low-confidence or single-run processes: it does not show statistics it cannot support.
- G7. A user can manually override a grouping decision: merge two processes, split a run out, or mark two processes as "not the same."

### 3.2 Non-Goals (MVP)

- NG1. AI-generated recommendations based on variant data. (AI Vision scope, dependent on AI+4 through AI+10.)
- NG2. Real-time clustering on every keystroke during a recording session. Clustering runs at ingestion, not live.
- NG3. Cross-user or cross-team process comparison. Team-scoped clustering is a fast-follow once team workspace data isolation is validated.
- NG4. Graph-based visualization (swimlane, BPMN). The diverge/reconverge view is a step-sequence comparison, not a full process graph. BPMN export is already a separate feature.
- NG5. Drift detection against a baseline window as a user-facing alerting feature. The `DriftReport` data is computed and stored; surfacing it as notifications is fast-follow.
- NG6. A dedicated "Processes" top-level nav item. MVP surfaces within the existing Workflows dashboard and Report tab, not a parallel surface.
- NG7. Custom similarity thresholds configurable by users. Thresholds are tuned constants in `scoringConfig.ts`. User-adjustable thresholds are later.
- NG8. Variant labeling by human-readable business meaning (e.g., "the PDF path" vs. "the manual entry path"). MVP shows step-category differences. Human-label authoring is fast-follow.

---

## 4. User Stories and Acceptance Criteria

### Story A: Automatic grouping of recordings into a process

**As an ops lead, when I upload or record a new workflow, I want the system to automatically determine whether this recording is another run of a process I have already recorded, so I do not have to manually organize recordings.**

**Acceptance criteria:**

- A1. When a recording is ingested, the system scores it against all existing `ProcessDefinition` groups owned by the same user using the multi-dimensional `scoreExactGroup()` function from `exactGroupScorer.ts`. A score of 0.82 or above (`exactGroupThresholds.minimum`) triggers assignment to that group. If no group meets the threshold, a new `ProcessDefinition` is created.
- A2. Assignment uses `scoreExactGroup()` dimension scores, not path-signature equality. Two runs that differ by one inserted step and score 0.87 are assigned to the same group.
- A3. The assignment result includes a confidence band label ("Verified", "High Confidence", "Moderate Confidence") derived from `resolveConfidenceBand()`, persisted to `ProcessDefinition.confidenceBand`.
- A4. Each assigned run's `Workflow.processDefinitionId` is set to the matched group.
- A5. The grouping decision is logged in `ProcessDefinition.explanationJson` using the `GroupingExplanation` schema, which includes the top explanation codes and a one-sentence summary. This is the audit trail.
- A6. Grouping is deterministic: given the same set of recordings processed in any order, the resulting group assignments are identical. (Determinism is guaranteed by sorted-runId processing order already used in `detectVariants()`.)
- A7. A recording that is short (fewer than `shortWorkflowStepCount = 2` steps per `DEFAULT_SCORING_CONFIG`) or incomplete receives a confidence cap of 0.75 and displays a "Low confidence — recording may be incomplete" indicator.
- A8. Grouping does not rely on title matching alone. `GENERIC_TITLE_PENALTY` (0.4) reduces the title dimension weight when the title matches any pattern in `genericTitlePatterns`. Path evidence is always required.

### Story B: Reviewing and confirming a cluster

**As an ops lead, I want to be able to review which recordings have been grouped together, and correct the system when it has grouped two recordings that are not actually the same process.**

**Acceptance criteria:**

- B1. From the Workflows dashboard, a user can click into a process group and see all member recordings listed with their individual run date, duration, variant assignment, and confidence score.
- B2. A user can move a recording out of its current process group into a different group, or into "unassigned." Moving a run triggers re-computation of the source group's aggregate metrics.
- B3. A user can merge two process groups. Merging re-runs `analyzePortfolio()` on the combined set and updates `intelligenceJson`, `variantCount`, and `stabilityScore` on the surviving group.
- B4. A user can split a group: select a subset of runs and create a new process group from them. The remaining runs stay in the original group.
- B5. A user can mark two specific recordings as "not the same process." This creates a `GroupRelationship` record with `relationshipType: 'possible_match'` and `confidenceScore: 0`, which suppresses future auto-merge of these two runs.
- B6. All user-override actions are logged with timestamp and are reversible within 30 days.
- B7. After any merge, split, or move, the system asynchronously re-runs intelligence analysis on the affected groups and updates `intelligenceJson`. The UI shows a "Recalculating..." state while this is in progress.

### Story C: Viewing the variant distribution and standard path

**As an ops lead, I want to see how many distinct ways my team executes a process, which way is most common, and how the less common versions differ.**

**Acceptance criteria:**

- C1. The process report surface (within the existing Report tab, scoped to a `ProcessDefinition`) shows a variant distribution chart. The chart lists each variant by rank (most frequent first), its run count, its percentage of total runs, and its average duration.
- C2. The most frequent variant is labeled "Standard path." The label uses the existing `isStandard: true` field on `ProcessVariantRecord`.
- C3. Each variant row shows `isFastest`, `isSlowest`, and `isOutlier` badges derived from the existing `ProcessVariantRecord` boolean fields.
- C4. Clicking a variant opens a step-by-step view showing the variant's path compared to the standard path. Steps that match the standard path are shown in a neutral style. Steps that are inserted, deleted, or substituted relative to the standard are highlighted using `DeviationPoint.deviationType` values from the existing schema.
- C5. The variant view shows the variant's `avgDurationMs` alongside the standard path's average for direct comparison.
- C6. When `variantCount = 1` (all runs follow the same path), the UI shows "100% of runs follow the standard path" and does not render a variant comparison view.
- C7. When `runCount < 2`, the UI shows "Only one run recorded. Record this process again to unlock variant analysis." No variant statistics are displayed. This is the honest single-run state.

### Story D: The diverge-and-reconverge visualization

**As an ops lead, I want to see where different runs of a process break off into different paths and then come back together, so I can understand which parts of the process are fixed and which parts vary.**

**Acceptance criteria:**

- D1. Within the variant detail view for a process with two or more variants, the system renders a step-sequence alignment view. Steps shared by all variants are rendered in a "common corridor" style. Steps present in only some variants are shown as branches off the common corridor.
- D2. The alignment is computed using the LCS-based alignment already implemented in `variantAnalyzer.ts` (`computeAlignment()`). Steps in the common path are those that appear in the aligned sequences of all variants at the same relative position or semantic signature.
- D3. A "reconvergence point" is a step position where two or more diverged variants rejoin the common path. The UI marks reconvergence points visibly.
- D4. Each branch segment shows: step category label, count of runs that take this branch, and average time spent in this branch.
- D5. The visualization is a vertical list (not a 2D graph). It scales to display up to 5 variants before collapsing additional variants into an "N more variants" control. Displaying all variants is available via expansion.
- D6. The visualization is built from `ProcessVariantRecord.deviationPoints` and `ProcessVariantRecord.pathStepCategories` already persisted in the database. No new engine computation is required at render time.
- D7. On a process with a single variant (no divergence), the diverge/reconverge view is not rendered. A message reads: "All recorded runs follow the same path."

### Story E: Per-variant and cross-run reporting

**As a process owner, I want a report that shows me the performance of each variant of a process over time, including where the variants differ in speed, so I can make a case for standardizing on the faster path.**

**Acceptance criteria:**

- E1. The process report shows aggregate timing for all runs combined (mean, median, p90, min, max) sourced from `TimestudyResult.totalDuration` persisted in `intelligenceJson`.
- E2. The report shows timing broken down by variant. For each variant: run count, frequency percentage, mean duration, and duration vs. standard-path comparison (absolute and percentage).
- E3. The report shows per-step timing for the standard path using `TimestudyResult.stepPositionTimestudies`. Steps are listed in order. For each step: step category, mean duration, p90 duration, and number of runs that contributed data.
- E4. Bottleneck steps (those in `BottleneckReport.bottlenecks`) are visually flagged in the per-step list. The flag shows the `durationRatio` (e.g., "2.3x slower than average") sourced directly from `BottleneckStep`.
- E5. High-variance steps (those in `VarianceReport.highVarianceSteps`) are visually flagged. The flag shows the `coefficientOfVariation` (e.g., "CV 0.82 — high variance") sourced from `HighVarianceStep`.
- E6. All statistics link back to the source run IDs via `evidenceRunIds`. A user can click any statistic and see which specific recordings contributed to it.
- E7. When `runCount < 3`, statistics that require minimum sample sizes (median, p90, standard deviation) are withheld and replaced with a "Needs more runs for reliable statistics" label. The threshold constants from `INTELLIGENCE_DEFAULTS` govern this — `MIN_RUNS_FOR_VARIANT_DETECTION = 2` for variant detection; p90 and standard deviation require explicit minimum-run counts defined in `WDC2-P02` registry field `minRunsRequired`.
- E8. The report is scoped to a `ProcessDefinition`. It is accessed via the Report tab on a workflow that has a `processDefinitionId`. The tab label changes to reflect the process context: "Process Report — [canonical name] (N runs)."

### Story F: Single-run vs. multi-run honest state management

**As any user, I want the UI to be honest about what it can and cannot show me based on how many recordings I have for a process.**

**Acceptance criteria:**

- F1. A workflow with no `processDefinitionId` (unassigned or not yet clustered) shows a "Solo recording" badge. The Report tab shows individual-run data only (SOP, step timing, tools used). No variant or aggregate content is shown.
- F2. A `ProcessDefinition` with `runCount = 1` shows all individual-run content and a "Record this process again to unlock comparison" prompt. Aggregate statistics are not shown.
- F3. A `ProcessDefinition` with `runCount` between 2 and 4 shows aggregates with a "Low sample — statistics are preliminary" notice. Variant detection runs but the low-sample-size `ExplanationCode` is shown.
- F4. A `ProcessDefinition` with `runCount >= 5` shows the full reporting surface without qualifiers. This is the threshold at which `DEFAULT_SCORING_CONFIG.lowSampleSizeThreshold = 3` has been exceeded with margin.
- F5. All thresholds are enforced in the UI layer from the constants already in `DEFAULT_SCORING_CONFIG` and `INTELLIGENCE_DEFAULTS`, not hardcoded in component code.
- F6. The Workflows dashboard shows each process group's `runCount` and a status indicator: "1 run", "3 runs — building baseline", "12 runs."

---

## 5. Scope Phasing

### Phase 1: MVP — Similarity-based clustering + variant distribution (shippable increment)

**Outcome:** Every recording is automatically assigned to a process group using similarity scoring. Users can see how many runs belong to each process and view the variant distribution.

**Delivers:** Stories A (grouping), C (variant distribution + standard path), F (honest state management).

**What ships:**

- Replace the `clusterWorkflows()` exact-signature-equality gate with a call to `scoreExactGroup()` from `exactGroupScorer.ts`. Group workflows scoring >= `exactGroupThresholds.minimum` (0.82). This is a change to approximately 20 lines in `apps/web-app/src/lib/intelligence.ts`.
- Persist `confidenceBand`, `explanationJson`, `nameSignature`, `stepSignatureHash`, `startAnchor`, `endAnchor` fields on `ProcessDefinition`. These columns already exist in the schema (added in the Phase 5 intelligence build). They need to be populated by the updated clustering logic.
- Populate `ProcessVariantRecord` rows by calling `detectVariants()` per `ProcessDefinition` and mapping results to the existing `ProcessVariantRecord` schema. This runs as part of the ingest pipeline after clustering.
- Workflows dashboard: add run count badge and process group label to each workflow row in the existing `WorkflowList.tsx` surface.
- Process group detail page (within the existing workflows navigation): list member runs, show variant distribution chart using `ProcessVariantRecord` data, honest-state messaging.
- Report tab: scope to process when `processDefinitionId` is set; show aggregate timing, variant frequency table, per-step timing from `TimestudyResult`.

**Dependencies:**
- `exactGroupScorer.ts` is already exported from `@ledgerium/intelligence-engine` index. No package work required.
- `ProcessVariantRecord` table exists in schema. No migration needed.
- `intelligenceJson` is already populated by `analyzePortfolio()` in the current pipeline. The `TimestudyResult`, `VarianceReport`, `VariantSet`, and `BottleneckReport` data is already in the database for any process with >= 1 run analyzed.

**Explicitly excluded from Phase 1:**
- Diverge/reconverge visualization (Story D). Requires alignment rendering logic.
- Manual override (Story B). Requires user-action API routes.
- Cross-run reporting with per-step linking (Story E in full). Partial: aggregate timing and variant table ship; `evidenceRunIds` drill-through is Phase 2.
- Family-level grouping (`scoreFamilyMembership()`). Phase 2.

### Phase 2: Fast-follow — Diverge/reconverge view + manual override + full report

**Outcome:** Users can see exactly where paths diverge and reconverge, correct grouping errors, and access the full reporting surface with evidence links.

**Delivers:** Stories B (manual override), D (diverge/reconverge), E (full reporting with evidence links).

**What ships:**

- Diverge/reconverge step-alignment visualization using `ProcessVariantRecord.deviationPoints` and `pathStepCategories`. LCS alignment is already computed by `computeVariantDistance()`. The visualization is a frontend rendering problem, not an algorithm problem.
- Manual override API routes: merge, split, move-run, mark-not-same. Requires three new `POST` endpoints and BullMQ job for async re-analysis after changes.
- `GroupRelationship` records for manual "not the same" overrides. Table exists; API routes do not.
- Evidence drill-through: clicking any statistic filters the run list to the contributing `evidenceRunIds`.
- Drift detection signal on the Report tab: show `DriftReport` content when a baseline window exists (comparing last 30 days vs. prior 30 days, using the time-range preference from `UserDashboardPreference`).

### Phase 3: Later — Family grouping, team-scoped clustering, SOP alignment integration

**Outcome:** Related-but-not-identical processes (e.g., "Send Report to Customer — World" and "Send Report to Customer — EMEA") are grouped into a family. Teams see shared processes across members.

**What ships:**

- Family detection using `scoreFamilyMembership()` from `familyScorer.ts`. Populates `ProcessFamily` table.
- Family-level report: shows cross-group comparison within a family.
- Team-scoped clustering: when a recording is made in a team workspace, cluster against the team's shared process library, not just the individual user's runs.
- SOP alignment integration: within the process report, show `SOPAlignmentResult` comparing actual variant distribution against the documented SOP steps.
- Canonical component detection using `detectComponents()`. Shows shared step patterns across unrelated processes.

---

## 6. Success Metrics

### 6.1 Clustering quality (leading indicator, measurable at Phase 1 launch)

| Metric | Baseline | Target (30 days post-launch) | Measurement method |
|--------|----------|------------------------------|--------------------|
| Auto-grouping rate | 0% (all recordings are solo) | >= 60% of recordings assigned to a group with >= 2 runs | `Workflow.processDefinitionId` not null AND `ProcessDefinition.runCount >= 2` |
| Confidence band distribution | N/A | >= 50% of groupings at "High Confidence" or "Verified" band | `ProcessDefinition.confidenceBand` distribution query |
| Manual override rate | N/A | <= 15% of groupings corrected by user action within 7 days | Count of merge/split/move actions / total groupings |

**Interpretation:** An override rate above 15% indicates the similarity thresholds need tuning. An override rate of 0% alongside low auto-grouping rates indicates recordings are too diverse to cluster (legitimate) or the threshold is too conservative (needs tuning).

### 6.2 Variation insight engagement (product-market fit signal, measurable at Phase 1 launch)

| Metric | Baseline | Target (60 days post-launch) | Measurement method |
|--------|----------|------------------------------|--------------------|
| Variant distribution views per process | 0 | >= 0.4 views per process per week for processes with >= 3 runs | PostHog event `process_variant_view_opened` |
| Report tab engagement on clustered processes | N/A (no clustered processes) | >= 40% of users with >= 3-run processes open the Report tab within 7 days of clustering | `process_report_viewed` event |
| Process group return visits | N/A | >= 30% of users return to a process group more than once within 30 days | Cohort analysis on `process_group_opened` |

### 6.3 Time-to-insight (user experience signal)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time from recording upload to cluster assignment | <= 10 seconds for single run against existing groups | Server-side latency on `/api/workflows/[id]/analyze` route |
| Time to first variant comparison view | <= 3 seconds page load | Client-side performance budget on process detail page |
| Clustering re-computation after merge/split | <= 30 seconds end-to-end (async) | BullMQ job duration |

### 6.4 Business outcome metrics (lagging indicators, measurable at Phase 2)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Recordings per process (average) | >= 3 per process for active users (weekly active) | Indicates users are recording processes repeatedly — the prerequisite for meaningful analysis |
| Feature retention: process report re-open rate | >= 50% of users who open a process report open it again within 14 days | Indicates the report is producing durable value, not one-time curiosity |
| Plan upgrade conversion from variation analysis surface | Measurable baseline within 60 days | Variation analysis is a Team-plan differentiator; upgrade prompts appear when variant count exceeds free-tier limits |

---

## 7. Dependencies and Risks

### 7.1 Technical dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `scoreExactGroup()` in `exactGroupScorer.ts` | Shipped, exported | Used in `@ledgerium/intelligence-engine` index |
| `detectVariants()` in `variantDetector.ts` | Shipped, exported | Called per process group at ingest |
| `computeVariantDistance()` in `variantAnalyzer.ts` | Shipped, exported | Required for Story D (Phase 2) |
| `ProcessDefinition` schema fields: `confidenceBand`, `explanationJson`, `nameSignature`, `startAnchor`, `endAnchor`, `stepSignatureHash`, `eventSignatureHash` | Schema columns exist; not yet populated | Need population in updated `clusterWorkflows()` |
| `ProcessVariantRecord` table | Exists in schema; not yet populated by production pipeline | Need insertion in post-cluster pipeline step |
| `intelligenceJson` already populated | Yes, for analyzed processes | `TimestudyResult`, `VarianceReport`, `VariantSet` are already in JSON |
| `ColumnAccessorContext` with `referenceNowMs` and `activeTimeRange` | Shipped (iter 065) | Required for any dashboard column showing variant-level metrics |

### 7.2 Determinism requirements

All clustering decisions must be deterministic. Given the same set of recordings, re-running clustering must produce identical group assignments. This is guaranteed by:
- `scoreExactGroup()` is a pure function.
- Group assignment iterates recordings sorted by `Workflow.createdAt` then `Workflow.id` for tie-breaking.
- `detectVariants()` already sorts by `runId` before processing.

Any change to the processing order without a corresponding version bump to `SCORING_MODEL_VERSION` is a defect. The `ProcessDefinition.confidenceBand` persisted at clustering time is the audit record. If thresholds change, existing groups must be flagged for re-analysis rather than silently re-clustered.

### 7.3 Mis-grouping risk

The highest operational risk is false positives: two different processes grouped together. The consequences are that variation statistics are computed over heterogeneous data, producing meaningless results.

Mitigations:
- The 0.82 minimum threshold in `exactGroupThresholds` is conservative by design. The scorer requires agreement across title, anchors, step sequence, event sequence, systems, and artifacts — not just step similarity.
- Generic titles (`test`, `workflow 1`, `untitled`) receive a 0.4 penalty on the title dimension, forcing the remaining dimensions to carry the decision.
- Confidence band is always shown in the UI. Users see "Moderate Confidence" groupings and know to review them.
- Manual override (Story B) is Phase 2 but is architecturally designed in from the start: `GroupRelationship` with `confidenceScore: 0` suppresses future auto-merge.
- The acceptance criteria in Story A explicitly require that explanation codes are logged for every grouping decision. These are user-visible in the detail view.

False negatives (same process not grouped) are less harmful: the recordings remain as solo runs. The user can manually merge in Phase 2. They do not receive incorrect statistics — they receive no statistics.

### 7.4 Privacy constraints

The clustering and variation analysis layer must remain privacy-safe per the intelligence engine's design contract:
- Step categories (`GroupingReason` values) are used for path signatures, not step titles or page content.
- `StepFingerprint.semanticSignature` uses `verb:object:system:eventType` — no free-text user-input content.
- `DeviationPoint` fields contain step category strings only.
- `ExplanationCode` labels and summaries in `GroupingExplanation` reference structural signals, not content signals.
- No `ProcessVariantRecord`, `ProcessDefinition`, or `GroupRelationship` field stores raw step titles, page content, or user-entered text.

Any future Phase 3 work on semantic title matching via `NormalizedTitle` must apply the same privacy gate: the `familySignature` and `exactSignature` fields in `NormalizedTitle` operate on parsed verb/entity/artifact tokens, not on raw title strings.

### 7.5 Scale constraints

The current `clusterWorkflows()` function is O(N^2) in the number of workflow runs: every new run is scored against every existing group. At small scale (< 500 workflows per user), this is acceptable. At larger scale, a candidate selection step using path-signature pre-filtering will be required before full scoring.

The `pathSignature` stored on `ProcessDefinition` provides a fast pre-filter: compute bigram similarity between the new run's signature and each existing group's `pathSignature` and only score the top-K candidates. This is an optimization, not a correctness change, and is deferred to Phase 2 when scale data exists.

### 7.6 Plan-tier gating

Variation analysis is a differentiation point for Team plan. The following limits apply:

- **Free tier:** Clustering and grouping run for all recordings. The variant distribution view shows up to 2 variants. For processes with 3+ variants, a "Upgrade to Team to see all variants" gate applies.
- **Starter tier:** Up to 3 variants shown. Full per-step timing report shown. No drift detection.
- **Team tier:** All variants, full reporting surface, drift detection, manual override, evidence drill-through.

These gates must be enforced in the UI layer using existing `PLAN_HIERARCHY` and `useFeatureGate()` patterns. The analysis always runs at full fidelity in the backend regardless of plan; gating is a display decision.

---

## 8. Open Questions for CEO

| ID | Question | Why it matters | Default if no response |
|----|----------|----------------|------------------------|
| OQ-1 | Should the diverge/reconverge visualization (Story D) be a Phase 1 MVP item or confirmed as Phase 2? The CEO described this feature specifically and it may be the most visually compelling differentiator. | Scope and timeline impact. Story D requires frontend alignment rendering work that adds approximately 3-4 days. | Phase 2 as written above. |
| OQ-2 | What is the intended surface for process groups on the Workflows dashboard — a grouped list (processes with expandable runs) or a flat list with process-group indicators on individual workflow rows? | Affects `WorkflowList.tsx` architecture significantly. A grouped list is more scannable but requires a different data contract than the current flat list. | Flat list with process-group badges, as scoped in Phase 1. |
| OQ-3 | Should the family grouping (broader "same process, different qualifier" clustering via `scoreFamilyMembership()`) be Phase 1 or Phase 3? Example: "Send Report — World" and "Send Report — EMEA" grouped under one family. | If users record parameterized variants of the same process, family grouping is important for them to see the full picture. However, it adds complexity to the grouping decision and the display surface. | Phase 3 as written above. |
| OQ-4 | What is the threshold for the free-tier variant limit? The current proposal is 2 variants free, 3 on Starter, unlimited on Team. Is this the right segmentation? | Pricing and conversion. If the threshold is too low, free users cannot see enough to understand the value. If it is too high, there is no upgrade lever. | The values above are the PM default. CEO override welcome. |
| OQ-5 | Should manual clustering override (Story B — merge, split, move-run, mark-not-same) be in Phase 1 or Phase 2? The risk of a Phase 1 without override is that users who encounter a mis-grouping cannot correct it. | Trust in the system. If users cannot fix errors, they may distrust the clustering and disengage. Counter-argument: false-positive rate should be low given the 0.82 threshold; Phase 2 override is available within ~4 weeks. | Phase 2 as written. Escalate to Phase 1 if CEO judges trust risk is high. |
| OQ-6 | Is the Report tab the correct surface for process-level variation analysis, or should this get a dedicated section in the Workflows dashboard sidebar or a new Process Detail page? The current proposal maps variation analysis into the existing Report tab, scoped to a ProcessDefinition when one exists. | Surface discoverability and navigation clarity. | Scoped Report tab as written. |

---

## 9. Acceptance Criteria Summary (machine-readable checklist)

For engineering reference, the minimum-shippable set for Phase 1:

- [ ] `clusterWorkflows()` uses `scoreExactGroup()` with threshold 0.82, not path-signature equality.
- [ ] `ProcessDefinition.confidenceBand` is populated for all groups after clustering.
- [ ] `ProcessDefinition.explanationJson` is populated with top 3 supporting codes and summary for all groups.
- [ ] `ProcessVariantRecord` rows are created/updated for every `ProcessDefinition` with >= 1 run after `detectVariants()` runs.
- [ ] `Workflow.processDefinitionId` is set for all clustered workflows.
- [ ] Workflows dashboard shows run count and process group label per workflow row.
- [ ] Process detail view lists member runs and shows variant distribution chart from `ProcessVariantRecord` data.
- [ ] Report tab scoped to process shows aggregate timing (mean, median, p90) from `intelligenceJson.timestudy`.
- [ ] Report tab shows variant frequency table.
- [ ] Per-step timing from `intelligenceJson.timestudy.stepPositionTimestudies` rendered in Report tab.
- [ ] Bottleneck flags rendered from `intelligenceJson.bottlenecks.bottlenecks`.
- [ ] Honest-state messaging rendered for runCount = 1, runCount 2-4, runCount >= 5.
- [ ] Free-tier variant gate enforced (2 variants visible, upgrade prompt at 3+).
- [ ] All clustering decisions pass workspace `pnpm typecheck` and `pnpm test` with no regressions.
- [ ] No `Date.now()` calls inside clustering or variant detection logic (determinism requirement per MDR-P03 pattern).

---

## 10. What This PRD Does Not Define

The following are explicitly deferred to downstream specialist agents:

- Architecture decisions for the async re-analysis job (BullMQ job structure, concurrency, failure handling) — deferred to `system-architect`.
- Specific React component structure for the variant distribution chart and step-alignment view — deferred to `ux-designer` and `frontend-engineer`.
- API contract for the merge/split/override endpoints (Phase 2) — deferred to `system-architect` + `backend-engineer` at Phase 2 entry.
- Performance benchmarks and index strategy for `scoreExactGroup()` at scale — deferred to `system-architect` when scale data is available.
- Test plan — deferred to `qa-engineer`.
- Analytics event taxonomy for this feature — deferred to `analytics` agent.
- Growth copy for upgrade prompts and variant-analysis empty states — deferred to `growth-strategist`.
