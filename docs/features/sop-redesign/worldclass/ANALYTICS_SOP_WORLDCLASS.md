# SOP Quality + Performance Analytics — World-Class Measurement Spec

**Date:** 2026-06-15
**Author:** Analytics agent
**Scope:** Read-only analysis of process-engine, intelligence-engine, sop-view, and analytics.ts. No implementation. Defines what to measure, what is honestly computable, and what must not be fabricated.

---

## 1. SOP Quality Metrics — Honestly Computable

Each metric below is confirmed against a specific engine field. No metric is listed unless the computation path exists in shipped code.

### 1.1 Instruction-level evidence coverage (P0)

**What it measures:** The fraction of SOP steps that have at least one source-event-linked instruction, proving the step is derived from observed behavior rather than inferred boilerplate.

**Field path:** `SOP.steps[n].instructions[m].sourceEventId` (type: `string`, defined in `types.ts:SOPInstruction`).

**Computation:** Count steps where `step.instructions.length > 0` divided by `step count`. A step with zero instructions fails `validateRenderedSOP` rule 3 (`step_has_no_evidence`), so any SOP that passed the validator has 100% instruction coverage. The more granular metric is the per-step instruction count: `step.instructions.length` is the number of observed events that produced actionable instructions after noise suppression.

**Display label:** "Every step is evidence-backed" or per-step instruction count badge.

**Honest constraint:** This metric measures structural evidence presence, not semantic accuracy. It cannot certify that the SOP is correct, only that each step traces to at least one source event. Do not label this as "verified" or "validated."

---

### 1.2 Step-level confidence (P0)

**What it measures:** The segmentation engine's certainty that step boundaries are correctly placed. Low confidence indicates ambiguous interaction sequences where the engine was less certain about where one step ends and the next begins.

**Field path:** `SOP.steps[n].confidence` (type: `number` 0–1, defined in `types.ts:SOPStep`). Also aggregated at `SOP.qualityIndicators.averageConfidence` and `SOP.qualityIndicators.lowConfidenceStepCount` (defined in `types.ts:QualityIndicators`).

**Computation:** Already computed. `computeQualityIndicators` in `contentEnricher.ts:856` calculates `averageConfidence` (mean across all finalized steps) and counts steps below 0.7 threshold. The UI already renders a per-step confidence dot in `SOPExecutionMode.tsx` via `ConfidenceDot` using thresholds: green ≥ 0.85, blue ≥ 0.70, amber below 0.70.

**Display label:** Aggregate: "XX% average confidence." Per-step: colored dot already rendered.

**Honest constraint:** Confidence is segmentation certainty, not factual accuracy. A step can have 0.95 confidence and still have an incorrect procedure if the recording itself was atypical. Do not equate high confidence with "this SOP is correct."

---

### 1.3 Completion status (P0)

**What it measures:** Whether the recorded session ended cleanly at a terminal state versus mid-flow.

**Field path:** `SOP.qualityIndicators.isComplete` (type: `boolean`, `contentEnricher.ts:866`). Derived from `lastStep.status === 'finalized'` on the last derived step.

**Computation:** Already computed. The SOP Header in `SOPHeader.tsx:33` already renders "Complete" or "Partial" badges from `metadata.isComplete`.

**Honest constraint:** "Partial" SOPs should display a disclosure: "Recorded session ended before completion — procedure may be incomplete." Single-run partial SOPs should not be exported or shared without this disclosure.

---

### 1.4 Friction count and severity profile (P0)

**What it measures:** The number and severity distribution of friction events detected during the observed run: excessive navigation, repeated errors, backtracking, context switching, long waits, redundant actions.

**Field paths:**
- `SOP.frictionSummary` (type: `FrictionIndicator[]`, `types.ts:SOP`). Each entry has `type`, `severity` (`low|medium|high`), `label`, `stepOrdinals`.
- `SOP.qualityIndicators.frictionCount` (type: `number`, `types.ts:QualityIndicators`).
- `SOP.qualityIndicators.errorStepCount` (type: `number`).

**Computation:** Already computed by `detectFriction` in `contentEnricher.ts:359`. Detection rules: repeated errors (step grouping = `error_handling`), long waits (step duration > 30s), excessive navigation (4+ consecutive `click_then_navigate` steps), context switching (3+ system switches), repeated clicks (`repeated_click_dedup` grouping), backtracking (revisiting a route template already visited).

**Display label:** "N friction points detected" with severity breakdown (high/medium/low count). Per-step friction already shown in `SOPExecutionMode.tsx:374` via colored banners.

**Honest constraint:** Friction is behavioral signal from one recorded session. A high-friction SOP does not mean the process is bad for all operators — it means this particular recording showed these patterns. Do not generalize from N=1.

---

### 1.5 System count and system diversity (P1)

**What it measures:** How many distinct systems the process spans. High system count combined with context-switching friction = integration opportunity.

**Field path:** `SOP.systems` (type: `string[]`, `types.ts:SOP`). Count is `SOP.systems.length`. Also at `SOP.qualityIndicators.systemCount`.

**Computation:** Already computed. `uniqueSystems` in `stepAnalyzer.ts` collects `page_context.applicationLabel` across all events. Rendered in `SOPHeader.tsx:49` as a metric chip.

---

### 1.6 Estimated process duration (P1)

**What it measures:** The total duration of the observed run. Provides a benchmark for "how long should this take."

**Field path:** `SOP.estimatedTime` (type: `string`, formatted by `formatDuration`). Raw milliseconds from `derivedSteps.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0)` in `sopBuilder.ts:150`.

**Computation:** Already computed. Rendered in `SOPHeader.tsx:47`.

**Honest constraint:** This is the duration of one observed execution. Do not label it as "standard time" or "expected time" without multiple runs. For N=1, label it "Observed duration (1 recording)."

---

### 1.7 Error step count and error ratio (P1)

**What it measures:** How many steps in this SOP are error-handling steps. High ratio indicates a fragile or difficult process.

**Field paths:** `SOP.qualityIndicators.errorStepCount`. Error ratio derivable as `errorStepCount / steps.length`.

**Computation:** Already computed in `computeQualityIndicators` (`contentEnricher.ts:870`). `workflowInsights.ts:447` surfaces an insight if error ratio >= 20% for processes with 10+ steps.

---

### 1.8 Instruction type distribution (P2)

**What it measures:** Within the SOP's instructions, how many are `action` vs `wait` vs `verify` vs `note`. Provides a quality signal: an SOP with mostly `verify` instructions is lighter on operator action; an SOP with many `wait` instructions has notable system-latency steps.

**Field path:** `SOPInstruction.instructionType` (type: `'action' | 'wait' | 'verify' | 'note'`, `types.ts:SOPInstruction`).

**Computation:** Not currently aggregated. Computable by iterating `SOP.steps[n].instructions` and counting by `instructionType`. No new engine work required — the field is populated by `classifyInstructionType` in `contentEnricher.ts:823`.

---

### 1.9 Sensitive data step count (P2)

**What it measures:** How many SOP steps involve redacted or sensitive fields. Relevant for compliance-adjacent communication without fabricating compliance claims.

**Field paths:** `StepDefinition.hasSensitiveEvents` (type: `boolean`, `types.ts:StepDefinition`). At instruction level: `SOPInstruction.isSensitive` and `SOPInstruction.redacted`.

**Computation:** Already computed. `workflowInsights.ts:465` generates an insight when sensitive steps are present.

**Honest constraint:** This field reports that sensitive fields were observed and redacted. It does NOT certify GDPR compliance, HIPAA compliance, or any regulatory standard. Do not use it to generate compliance badges.

---

## 2. The "Living SOP" — Alignment and Drift Metrics

These metrics are computable only when the intelligence-engine has been run against multiple recordings of the same workflow. They are the most powerful SOP quality signals Ledgerium can produce, and they are unique to the platform's observe-from-behavior architecture.

### 2.1 SOP alignment score (P0 when N ≥ 2 runs)

**What it measures:** How well the documented SOP matches actual observed execution across N recorded runs. Score of 0.92 means 92% of runs follow the SOP's documented step sequence; score of 0.40 means the SOP is substantially out of sync with how the process is actually performed.

**Engine:** `analyzeSopAlignment` in `packages/intelligence-engine/src/sopAlignmentEngine.ts:83`.

**Output type:** `SOPAlignmentResult`:
- `alignmentScore` (0–1): weighted blend of bigram-Jaccard similarity across run path signatures (60% weight) and structural similarity to dominant variant (40% weight), minus undocumented-step and unused-step penalties.
- `alignmentLevel`: `'high' | 'moderate' | 'low' | 'critical'` (thresholds: high ≥ 0.8, moderate ≥ 0.6, low ≥ 0.4, critical < 0.4).
- `alignedRunCount` and `totalRunCount`: how many runs cleared the 0.6 similarity threshold.
- `undocumentedSteps`: step category types observed in ≥ 20% of runs but absent from the SOP.
- `unusedDocumentedSteps`: SOP steps observed in < 20% of runs (SOP documents things that rarely happen).
- `driftIndicators`: structured list of `missing_step`, `extra_step`, `reordered`, `frequency_mismatch` findings with severity.

**Living SOP display format:** "92% aligned with the last 20 runs" or "Step 4 (error_handling) appears in 80% of runs but is undocumented." The `computedAt` field on `SOPAlignmentResult` provides the date the alignment was last computed.

**What is already computed vs needs surfacing:** The engine function is fully implemented. The output is not currently surfaced in the SOP view components (`SOPExecutionMode.tsx`, `SOPHeader.tsx`). Surfacing requires: passing the `SOPAlignmentResult` to the SOP view as a prop, adding an alignment chip to `SOPHeader`, and adding a drift detail section to the intelligence mode (`SOPIntelligenceMode.tsx`).

**Honest constraint:** Alignment requires at least 2 runs of the same workflow (same `activityName` or same workflow entity). For N=1, this metric must not be shown — display "Record this workflow again to see alignment data." The `sopAlignmentEngine.ts:91` already returns `alignmentScore: 0` and `alignmentLevel: 'critical'` when `runs.length === 0`. The frontend must check `totalRunCount >= 2` before rendering alignment UI.

---

### 2.2 Documentation drift score (P0 when N ≥ 2 runs)

**What it measures:** The inverse of alignment — how much the SOP has drifted from observed reality. A score of 0 means the SOP is perfectly current. A score of 80 means the process has substantially changed since the SOP was written.

**Engine:** `computeDocumentationDriftScore` in `packages/intelligence-engine/src/standardizationScorer.ts:135`.

**Output type:** `DocumentationDriftScore`:
- `score` (0–100): `(1 - alignmentScore) * 100` from the `SOPAlignmentResult`.
- `level`: `'aligned' | 'minor_drift' | 'significant_drift' | 'outdated'` (thresholds: aligned ≤ 20, minor ≤ 40, significant ≤ 60, outdated > 60).
- `findings`: human-readable strings summarizing what drifted (e.g., "3 step types observed in real execution but not documented").
- `sopAlignment`: the underlying `SOPAlignmentResult` for drill-down.
- `computedAt`: ISO timestamp of when drift was computed.

**Living SOP display example:** "Minor drift detected — step 4 drifted on 2026-06-10" (where the date is `computedAt` formatted). The `findings` array provides the bullets.

**What is already computed vs needs surfacing:** Fully implemented, not yet surfaced in SOP view. The `DocumentationDriftScore.findings` strings are already formatted for human display and can be rendered directly. The `computedAt` timestamp enables "last checked" display.

**Honest constraint:** Same N ≥ 2 gate as alignment. Do not show a "drift score" for single-run SOPs. The function handles null sopAlignment gracefully (returns `score: 0, level: 'aligned', findings: ['No SOP available for comparison.']`) — the frontend must distinguish this "no data" case from a genuinely aligned SOP.

---

### 2.3 Standardization score (P1 when N ≥ 3 runs)

**What it measures:** How consistently the process is executed across all recorded runs. Measures dominant path adherence, sequence stability, variant consolidation, and timing consistency. This is a property of the process group, not of the SOP itself — but it contextualizes SOP quality: a low standardization score means the SOP is trying to document an inconsistently performed process.

**Engine:** `computeStandardizationScore` in `packages/intelligence-engine/src/standardizationScorer.ts:82`.

**Output type:** `StandardizationScore`:
- `score` (0–100): weighted blend of `dominantPathAdherence` (35%), `sequenceStability` (30%), `variantConsolidation` (20%), `timingConsistency` (15%).
- `level`: `'excellent' | 'good' | 'moderate' | 'poor'` (thresholds: excellent ≥ 80, good ≥ 60, moderate ≥ 40, poor < 40).
- `factors`: object with the four contributing factor values (0–1 each).
- `evidenceRunIds`: the run IDs used to compute this score.

**Inputs required:** `VariantSet` (from `detectVariants`), `VarianceReport` (from `analyzeVariance`), `ProcessMetrics`. These are computed by the intelligence-engine pipeline and stored in `ProcessDefinition.intelligenceJson` (plumbed by `metrics-input-adapter.ts`).

**Display label:** "Process standardization: 72/100 (Good) — based on 15 runs." The `factors` breakdown enables a tooltip or detail view showing which dimension is weakest.

---

### 2.4 Variant coverage (P1 when N ≥ 2 runs)

**What it measures:** Whether the SOP covers the observed execution variants. If 30% of runs follow a different path than the SOP documents, variant coverage is incomplete.

**Fields available from `SOPAlignmentResult`:**
- `alignedRunCount / totalRunCount`: the fraction of runs that align with the SOP.
- `undocumentedSteps`: step types present in runs but absent from the SOP — these are the uncovered variant characteristics.
- `structuralSimilarity`: Jaccard similarity between the SOP's step-category sequence and the dominant variant's path signature.

**Computation:** Derivable from the `SOPAlignmentResult` already produced by `analyzeSopAlignment`. Variant coverage = `alignedRunCount / totalRunCount`. Uncovered step types = `undocumentedSteps` filtered to `frequency >= 0.3`.

**Display:** "SOP covers 14 of 20 runs (70%). 6 runs include an error-handling step not in the SOP."

---

### 2.5 SOP freshness (P1)

**What it measures:** How old the SOP is relative to the most recent recording of the workflow. A SOP generated from a recording 90 days ago that has been re-recorded 5 times since is potentially stale.

**Fields available:**
- `SOP.generatedAt` (type: `string` ISO timestamp, `types.ts:SOP`): when the SOP was generated (set to `sessionJson.startedAt` in `sopBuilder.ts:178`).
- `ProcessRun.startedAt` (type: `string`): the most recent run's start time.

**Computation:** Not currently surfaced. Age = `Date.now() - Date.parse(SOP.generatedAt)` in days. "SOP last updated 47 days ago" or "Based on recording from 2026-04-28."

**Honest constraint:** `generatedAt` is the session start time of the recording that produced the SOP, not a manual update timestamp. For multi-run portfolio SOPs, this should be the most recent contributing run's timestamp, not the oldest. Label it accurately: "Based on recording from [date]" rather than "last updated."

---

## 3. SOP Usage and Adoption Instrumentation

All events follow the PII-free pattern established in `analytics.ts`. No step content, no user-entered values, no procedure text appears in event properties — only opaque IDs, numeric aggregates, and taxonomy labels.

### 3.1 Proposed event additions to `AnalyticsEvent` discriminated union

These events fill gaps not currently covered by the existing `sop_section_viewed` and `sop_usefulness_response` events already in `analytics.ts`.

**sop_viewed**
```
event: 'sop_viewed'
workflowId: string          // opaque ID, no content
stepCount: number           // aggregate
runCount: number            // 1 for single-run SOP, N for multi-run
hasAlignmentData: boolean   // whether alignment score is available (N >= 2)
hasDriftData: boolean       // whether drift score is available
averageConfidence: number   // SOP.qualityIndicators.averageConfidence
frictionCount: number       // SOP.qualityIndicators.frictionCount
sopMode: 'execution' | 'visual' | 'intelligence'  // which tab opened by default
```
Rationale: extends the existing `first_sop_viewed` and `sop_section_viewed` events to cover every SOP view. Pairs with `sop_section_viewed` (already instrumented) and `sop_usefulness_response` (already instrumented) for cohort analysis.

**sop_step_expanded**
```
event: 'sop_step_expanded'
workflowId: string
stepOrdinal: number        // which step (position only, no title or content)
stepCategory: string       // grouping_reason taxonomy label (e.g. 'fill_and_submit')
instructionCount: number   // how detailed is this step
hasHighFriction: boolean
elapsedMsSinceSopView: number  // time from sop_viewed to this expansion
```
Rationale: step expansion is the primary engagement signal in the execution SOP. High expansion rate on a step indicates operators are reading it carefully (complexity or uncertainty). Low expansion rate across all steps indicates the SOP is being skimmed or ignored.

**sop_step_checked** (completion checklist interaction)
```
event: 'sop_step_checked'
workflowId: string
stepOrdinal: number
allChecked: boolean   // whether this check completed the full checklist
elapsedMsSinceSopView: number
```
Rationale: checklist completion is the strongest engagement signal available — it means someone is executing the SOP in real time. `allChecked: true` events are the north-star engagement event for SOP usage.

**sop_mode_switched**
```
event: 'sop_mode_switched'
workflowId: string
fromMode: 'execution' | 'visual' | 'intelligence'
toMode: 'execution' | 'visual' | 'intelligence'
elapsedMsSinceSopView: number
```
Rationale: mode switching reveals whether operators use only the execution view or also explore intelligence and visual modes.

**sop_exported**
```
event: 'sop_exported'
workflowId: string
format: string          // 'markdown' | 'pdf' | 'json' (taxonomy only)
stepCount: number
runCount: number
```
Rationale: export is the highest-intent usage signal — the operator intends to use this SOP outside of Ledgerium. Currently `workflow_exported` exists but does not distinguish SOP from other export types.

**sop_alignment_viewed**
```
event: 'sop_alignment_viewed'
workflowId: string
alignmentScore: number    // 0-1, rounded to 2dp
alignmentLevel: string    // 'high' | 'moderate' | 'low' | 'critical'
totalRunCount: number
driftScore: number        // 0-100
driftLevel: string
```
Rationale: measures whether operators engage with the living-SOP metrics when they are shown. Low view rate = the alignment section is not discoverable or not understood.

**sop_drift_detail_expanded**
```
event: 'sop_drift_detail_expanded'
workflowId: string
driftLevel: string
findingCount: number   // how many drift findings are shown (not what they say)
```
Rationale: confirms whether drift findings are read. Pairs with `sop_alignment_viewed` to measure comprehension depth.

---

### 3.2 Funnel and success metrics

**Activation funnel (per-workflow):**
1. `sop_viewed` — operator lands on SOP
2. `sop_step_expanded` (at least 1) — operator engages with detail
3. `sop_step_checked` (at least 1) — operator uses SOP during execution
4. `sop_step_checked` with `allChecked: true` — operator completes the SOP as a guide
5. `sop_usefulness_response` with `response: 'yes_as_is'` or `'minor_edits'` — operator finds it useful

**North-star SOP success metric:** Checklist completion rate. Definition: among `sop_viewed` events for SOPs with ≥ 3 steps, what percentage result in at least one `sop_step_checked` event? A "world-class" SOP is one that operators actually use during execution, not one they viewed once.

**Secondary success metrics:**
- Export rate per SOP view (measures intent to use externally)
- Usefulness response rate (measures perceived quality)
- Mode distribution (execution vs intelligence tab usage)
- Average steps expanded per view (engagement depth)
- Alignment view rate when alignment data is available (measures living-SOP adoption)

**Cohort analysis dimension:** `runCount` on `sop_viewed` enables comparing single-run SOP engagement (N=1) against multi-run SOPs (N ≥ 5). Hypothesis: multi-run SOPs with high alignment scores will have higher checklist completion rates because operators trust them more.

---

## 4. Honesty Guardrails — What Must Not Be Shown

This section defines metrics that appear plausible for an SOP tool but are not computable from the data Ledgerium has. Showing them would be fabrication.

### 4.1 Do NOT show: compliance metrics

Ledgerium captures observed browser behavior. It does not verify that the process is compliant with any regulatory framework (ISO 9001, HIPAA, SOC 2, GDPR, OSHA, etc.). Showing a "compliance score" or "regulatory alignment" badge would be fabricated. The SOP documents what happened; it cannot certify what should happen under a regulatory standard.

**Rule:** No compliance scores, compliance badges, or regulatory alignment metrics may appear in the SOP view or analytics unless Ledgerium has explicitly evaluated the process against a machine-readable policy spec (which is not currently in scope).

### 4.2 Do NOT show: training completion

Ledgerium has no mechanism to track whether a human read the SOP, understood it, or passed a comprehension check. `sop_step_checked` tracks UI checkbox interactions, which is a reasonable engagement proxy but is not training completion. Do not label checklist completion as "trained" or "certified."

**Rule:** No training records, training completion rates, or certification metrics.

### 4.3 Do NOT show: accuracy or correctness scores

Confidence scores measure segmentation certainty (where step boundaries are), not procedural accuracy (whether the documented steps are correct or optimal). A SOP with 95% average confidence could still document an inefficient process. Labeling confidence as "accuracy" conflates two different concepts.

**Rule:** `SOPStep.confidence` must be labeled "segmentation confidence" or "evidence confidence," never "accuracy," "correctness," or "quality score."

### 4.4 Do NOT show: alignment or drift for single-run SOPs

The `sopAlignmentEngine` and `standardizationScorer` require multiple runs to produce meaningful output. With N=1, `analyzeSopAlignment` returns `alignmentScore: 0` and `alignmentLevel: 'critical'` regardless of actual quality — this is an artifact of insufficient data, not a signal that the SOP is critically misaligned. Displaying this to users would be misleading.

**Rule:** All alignment, drift, standardization, and variant coverage metrics must gate on `totalRunCount >= 2`. Below that threshold, display: "Record this workflow again to unlock alignment data." For `totalRunCount < 5`, add a data-sufficiency note ("Based on N runs — accuracy improves with more recordings").

**Single-run SOP required disclosure:** Any SOP derived from exactly one recording must display: "This SOP was generated from 1 recording. Record again to validate and improve accuracy."

### 4.5 Do NOT show: real-time execution tracking

Ledgerium SOPs are static documents generated from past recordings. The SOP checklist in `SOPExecutionMode.tsx` uses local React state — it does not track who checked what, when, or whether the execution matched the SOP. Do not surface checklist completion as an execution audit trail or compliance record.

### 4.6 Do NOT fabricate decision-point branches from title keywords

This guardrail is already enforced in `contentEnricher.ts:572` with an explicit comment: "Title-keyword-only inference is classified 'inferred' by the architecture review (Finding C-1) and must NOT produce a diamond or fabricated condition label." The measurement system must not undo this by tracking or displaying decision-point counts as if they represent observed branching behavior unless they were detected via the `submit → error_handling` or `data_entry → error_handling` observed patterns.

---

## 5. Prioritized SOP Metrics to Surface — P0 to P2

### P0 — Surface immediately (all data is available today)

| Metric | Source field | Current state | Action needed |
|--------|-------------|---------------|---------------|
| Evidence coverage per step | `SOPInstruction.sourceEventId` presence | Enforced by validator; not shown as a user metric | Add "evidence-backed" indicator to SOP header or step count chip |
| Average confidence | `SOP.qualityIndicators.averageConfidence` | Partially shown (per-step dot in execution mode; % in Process Overview section) | Promote to SOPHeader as a primary chip alongside step count |
| Completion status (Complete / Partial) | `SOP.qualityIndicators.isComplete` | Rendered in SOPHeader | Add mandatory disclosure text for Partial status |
| Friction count and type breakdown | `SOP.frictionSummary`, `SOP.qualityIndicators.frictionCount` | Friction count chip in SOPHeader; per-step banners in execution mode | Add friction severity breakdown (N high / N medium / N low) to header |
| Error step count | `SOP.qualityIndicators.errorStepCount` | Shown in intelligence mode insights | Add to SOPHeader chip row |
| SOP freshness / generatedAt | `SOP.generatedAt` | Not shown | Add "Based on recording from [date]" to provenance footer |
| N=1 single-run disclosure | `runCount` derived from context | Not shown | Add advisory banner when SOP is from 1 recording |

### P1 — Surface when N ≥ 2 runs (engines are implemented, surfacing is missing)

| Metric | Source field | Current state | Action needed |
|--------|-------------|---------------|---------------|
| SOP alignment score | `SOPAlignmentResult.alignmentScore`, `.alignmentLevel` | Engine fully implemented; not surfaced in SOP view | Add alignment chip to SOPHeader; add drift detail section to intelligence mode |
| Documentation drift score | `DocumentationDriftScore.score`, `.level`, `.findings` | Engine fully implemented; not surfaced | Render `findings` strings in intelligence mode; use `computedAt` as "last checked" |
| Aligned run count | `SOPAlignmentResult.alignedRunCount / totalRunCount` | Not surfaced | Add "Aligned with N of M runs" to alignment chip |
| Undocumented step list | `SOPAlignmentResult.undocumentedSteps` | Not surfaced | Show as drift finding cards in intelligence mode |
| Variant coverage | Derivable from `alignedRunCount / totalRunCount` | Not surfaced | Show as "SOP covers X% of observed runs" |
| Standardization score | `StandardizationScore.score`, `.level`, `.factors` | Computed in intelligence engine; not in SOP view | Add to intelligence mode as process-health context |
| Estimated duration with N context | `SOP.estimatedTime` + run count | estimatedTime shown without N context | Label as "avg of N recordings" when N > 1 |

### P2 — Instrumentation additions (require event taxonomy changes)

| Metric | Proposed event | What it enables |
|--------|---------------|-----------------|
| Step engagement depth | `sop_step_expanded` | Which steps operators read carefully; complexity vs clarity signals |
| Execution-time SOP use | `sop_step_checked` | Whether the SOP is used during live execution (north-star signal) |
| Mode preference | `sop_mode_switched` | Whether intelligence and visual modes are discoverable and useful |
| Export intent | `sop_exported` | Highest-intent usage; informs format prioritization |
| Living-SOP adoption | `sop_alignment_viewed` | Whether operators engage with alignment/drift data |
| Full SOP view instrumentation | `sop_viewed` (extended) | Replaces the weaker `sop_section_viewed` with a consistent session anchor |

---

## 6. Interpretation Guidance

**For the product team reviewing SOP quality:**

The two metrics that most reliably indicate a world-class SOP are (1) high alignment score (≥ 0.80) with ≥ 10 runs, meaning the SOP matches how the process is actually performed, and (2) checklist completion rate above 40%, meaning operators use the SOP during execution rather than just viewing it.

A SOP with 95% step confidence but 0.35 alignment score is a high-confidence description of an atypical run. A SOP with 78% step confidence but 0.88 alignment score across 25 runs is more trustworthy as an operational document.

**For operators viewing a SOP:**

The confidence dot on each step indicates how certain the system was about step boundaries — it does not indicate whether the procedure inside the step is correct. The "Based on N recordings" count is the most important quality signal: 1 recording means proceed with caution; 20 recordings with high alignment means proceed with confidence.

**For the engineering team instrumenting:**

The `N=1 gate` on alignment and drift is a hard rule. If `totalRunCount < 2`, do not render alignment UI at all — not even a disabled or empty state that implies the metric exists but is unavailable. The absence of the widget is the correct signal.
