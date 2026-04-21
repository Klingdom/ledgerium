# COPY PACK — Process Intelligence Metrics Engine v1
**Artifact type:** Growth-Strategist deliverable (MR-005 D-4 specialist-invocation gate)
**Input spec:** `docs/features/dashboard-v3-metrics-engine/INPUT_SPEC.md`
**PRD reference:** `docs/prd/PRD_DASHBOARD_V2.md` §9
**Grounding code:** `apps/web-app/src/lib/workflow-metrics.ts`
**Review reference:** `docs/meta/DASHBOARD_V2_REVIEW_001.md` DV2-R08, DV2-R14
**Date:** 2026-04-21
**Status:** Draft — PM + UX sign-off required pre-implementation

---

## Section 1 — Voice and Tone Discipline

Ledgerium ships honest labels. Every string presented to a user must describe what the system *actually measured*, not what we wish it implied. This principle, established in PRD_DASHBOARD_V2 §9 and enforced in `workflow-metrics.ts` (see dimension-naming note at line 6–17), now extends to the full metrics engine.

**The five honest-label rules:**

1. No number without a unit. "4.2" is meaningless; "4.2 min" is a fact.
2. No score without a "what it means" sentence. A score of 73/100 is not self-explanatory. Every /100 score exposes its formula contributors in a tooltip or glossary link.
3. No ambiguous compound terms. "Performance" means nothing. "Median cycle time" means exactly one thing.
4. No marketing adjectives. "Powerful automation insights" is noise. "4 steps identified as automation candidates" is signal.
5. No jargon without a glossary anchor. "Conformance score" must link to a plain-language definition the first time it appears on any surface.

**Alignment with industry convention.** Enterprise buyers arrive with vocabulary shaped by Celonis, SAP Signavio, UiPath Process Mining, and IBM Process Mining. Where those platforms have established standard terms — cycle time, throughput time, first pass yield, variant, bottleneck, flow efficiency — Ledgerium uses them without modification. Deviation is permitted only when the industry term is demonstrably misleading for our specific computation. Every deviation is flagged AMBER or RED in Section 2 with a rationale and a proposed rename.

**Extending the v2 precedent (DV2-R14).** The six-string copy pass from DASHBOARD_V2_REVIEW_001 demonstrated the pattern: flag the string, state what it *currently* says, state what it *should* say, and why. Section 2 applies this pattern across the full ~90-metric taxonomy.

---

## Section 2 — Metric Taxonomy Copy

Tables are organized by INPUT_SPEC §5 layer. Each row states: `metric_key`, Short Label, Unit Display, Tooltip Description (≤20 words), Glossary Definition, Honest-Label Flag, and Industry Benchmark.

**Flag definitions:**
- **GREEN** — ship as-is; term is accurate and industry-aligned
- **AMBER** — rename proposed; current key is acceptable but label copy needs clarification
- **RED** — term is misleading or non-standard; replacement required before ship

---

### Layer 1: Operational Flow Metrics (INPUT_SPEC §5 Layer 1)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `cycle_time_ms` | Cycle Time | s or min (auto-scale) | Total elapsed time from workflow start to finish, including all waits and processing. | Cycle time = ended_at − started_at for a run. Includes active steps, wait states, and idle gaps. Industry standard; do not rename. | GREEN | Celonis: "Cycle Time"; SAP Signavio: "Cycle Time"; IBM: "Case Duration"; UiPath: "Case Duration" |
| `throughput_time_ms` | Throughput Time | s or min | Time a case spends in the process end-to-end, from first event to last. | Throughput time is the elapsed wall-clock duration of a case. Synonymous with cycle time in most contexts; Ledgerium uses both to match platform convention. See also: cycle_time_ms. | AMBER — label matches Celonis convention but "Cycle Time" and "Throughput Time" overlap in our model; tooltip must distinguish them or consolidate. Propose: expose only `cycle_time_ms` in UI; use `throughput_time_ms` as internal alias. | Celonis: "Throughput Time"; SAP Signavio: "Lead Time" |
| `processing_time_ms` | Active Time | s or min | Time spent on real work steps, excluding wait states and idle gaps. | Processing time = sum of step durations where is_wait_state = false. Represents the value-adding portion of cycle time. Also called "active time" in task-mining contexts. | AMBER — "processing_time_ms" is correct internally; label "Active Time" is clearer to non-analysts than "Processing Time". Propose: Short Label = "Active Time"; keep key. | Celonis: "Processing Time"; UiPath: "Working Time" |
| `wait_time_ms` | Wait Time | s or min | Time the workflow spent in wait states, queues, or idle gaps. | Wait time = cycle_time_ms − processing_time_ms. A high wait-to-cycle ratio indicates systemic bottlenecks or handoff delays. | GREEN | Celonis: "Waiting Time"; SAP Signavio: "Waiting Time" |
| `idle_time_ms` | Idle Time | s or min | Time with no recorded user actions, suggesting interruptions or context switching. | Idle time is measured from gaps between consecutive step timestamps exceeding a configured idle threshold. Distinct from wait states, which are explicit system-side queues. | AMBER — distinguish from wait_time_ms in UI copy; tooltip must clarify "no user actions recorded" not "system queue". | UiPath: "Idle Time" (task mining) |
| `touch_time_ms` | Touch Time | s or min | Time the user actively interacted with the workflow, excluding all idle and wait periods. | Touch time = sum of step durations where the user was actively performing an action (clicks, keystrokes, data entry). Useful for understanding labor content per run. | GREEN | UiPath: "Touch Time"; IBM: "Interaction Time" |
| `flow_efficiency_pct` | Flow Efficiency | % | Percentage of cycle time spent on active work rather than waiting. | Flow efficiency = processing_time_ms / cycle_time_ms × 100. A score of 100% means no wait time; typical manufacturing benchmarks are 5–30%. High is better. | GREEN | Celonis: "Flow Efficiency"; SAP Signavio: "Process Efficiency" |
| `completion_rate_pct` | Completion Rate | % | Percentage of started workflow runs that reached a completed end state. | Completion rate = completed_runs / total_runs × 100. Excludes abandoned, partial, and failed statuses. A drop in this metric signals new failure modes or process changes. | GREEN | Celonis: "Happy Path Rate" (variant), but "Completion Rate" is the direct equivalent; IBM: "Case Completion Rate" |
| `case_volume` | Run Volume | runs | Total number of recorded workflow executions in the selected time window. | Run volume = count of workflow_run rows with status ≠ deleted for a given workflow definition and time window. Also called "case volume" in process mining. | AMBER — "case_volume" is standard industry key; UI label "Run Volume" is more legible for Ledgerium users who record runs, not cases. Propose: label = "Run Volume", key stays. | Celonis: "Case Volume"; SAP Signavio: "Case Count" |
| `wip_count` | In Progress | runs | Number of workflow runs currently active and not yet completed or abandoned. | WIP (work-in-progress) count = runs with status = 'active' or equivalent open state at a point in time. A persistently high WIP may indicate bottlenecks or process failures that prevent completion. | AMBER — "wip_count" is correct; label "In Progress" is clearer than "WIP Count" on dashboard. | Celonis: "WIP"; IBM: "Cases in Progress" |
| `arrival_rate_per_day` | Daily Start Rate | runs/day | Average number of new workflow runs started per day in the selected period. | Arrival rate = total_runs / days_in_window. Useful for capacity planning. A spike in arrival rate without a corresponding rise in completion rate indicates growing backlog. | AMBER — propose label "Daily Start Rate" over "Arrival Rate" to avoid lean-manufacturing jargon. | Celonis: "Arrival Rate"; SAP Signavio: "Arrival Rate" |
| `completion_rate_per_day` | Daily Completion Rate | runs/day | Average number of workflow runs completed per day in the selected period. | Completion rate per day = completed_runs / days_in_window. Pair with arrival_rate_per_day to assess whether the process is keeping pace with demand. | GREEN | Celonis: "Throughput Rate" |

---

### Layer 2: Step Performance Metrics (INPUT_SPEC §5 Layer 2)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `avg_step_duration_ms` | Avg Step Time | s | Mean duration across all recorded steps in this workflow, for the selected runs. | Average step duration = sum of step.duration_ms / count of steps. Use alongside median and p90 to avoid distortion from outlier steps. | GREEN | UiPath: "Average Activity Duration"; Celonis: "Avg. Activity Duration" |
| `median_step_duration_ms` | Median Step Time | s | Midpoint step duration — 50% of steps are faster, 50% are slower. | Median step duration is the p50 value across all step.duration_ms values in the selected set. Robust to outliers; prefer over mean for skewed distributions. | GREEN | Celonis: "Median Activity Duration" |
| `step_wait_before_ms` | Pre-Step Wait | s or min | Average idle or queue time immediately before this step begins. | Step wait before = mean of transition_duration_ms on step_edge rows where to_step_id = this step. A high value identifies upstream handoff or queue delays. | AMBER — "step_wait_before_ms" is an internal key; label "Pre-Step Wait" is clearer than "Wait Before". | Celonis: "Waiting Time Before Activity" |
| `step_wait_after_ms` | Post-Step Wait | s or min | Average idle or queue time immediately after this step completes. | Step wait after = mean of transition_duration_ms on step_edge rows where from_step_id = this step. A high value identifies downstream handoff delays triggered by this step. | AMBER — propose label "Post-Step Wait". | Celonis: "Waiting Time After Activity" |
| `step_frequency` | Step Frequency | occurrences/run | Average number of times this step appears per workflow run. | Step frequency = count of step occurrences / count of runs containing at least one occurrence. A value > 1.0 signals repeated execution (potential loop or rework). | GREEN | Celonis: "Activity Frequency"; UiPath: "Activity Count per Case" |
| `step_presence_rate_pct` | Presence Rate | % | Percentage of runs that include this step at least once. | Step presence rate = runs containing step / total runs × 100. A presence rate < 100% on a nominally required step indicates variant drift or skipping behavior. | GREEN | Celonis: "Activity Occurrence Rate"; SAP Signavio: "Activity Frequency" |
| `step_error_rate_pct` | Step Error Rate | % | Percentage of step executions that were flagged as error events. | Step error rate = step executions with is_error_event = true / total executions × 100. High values indicate fragile steps needing remediation or additional error handling. | GREEN | Celonis: "Error Rate per Activity" |
| `step_rework_rate_pct` | Step Rework Rate | % | Percentage of step executions that were flagged as rework candidates. | Step rework rate = executions with is_rework_candidate = true / total executions × 100. Rework means the step was re-executed within the same run after the process had moved forward. | GREEN | Celonis: "Rework Activity Rate" |
| `step_skip_rate_pct` | Skip Rate | % | Percentage of runs where this step was expected but not recorded. | Step skip rate = runs where step was expected (per canonical path) but absent / runs where step was expected × 100. Requires a defined canonical path per workflow definition. | AMBER — skip rate is only meaningful with a canonical path defined. Tooltip must state this dependency. Propose: surface as "— (no canonical path)" when canonical_path_hash is null. | SAP Signavio: "Skip Rate" |
| `step_repeat_count_avg` | Avg Repeat Count | ×/run | Average number of times this step is repeated within a single run. | Step repeat count = count of step occurrences per run, averaged across all runs containing the step. A value of 1.0 = no repetition; values > 1.0 indicate loop or rework patterns. | AMBER — label "Avg Repeat Count" is clearer than "step_repeat_count_avg". | UiPath: "Average Repetitions per Case" |
| `is_bottleneck_step` | Bottleneck | flag | This step has above-average wait time and high frequency, indicating it constrains throughput. | A derived boolean flag. A step is classified as a bottleneck when step_wait_before_ms exceeds p90 for peer steps AND step_frequency is materially high AND delay_frequency_pct exceeds threshold. | GREEN | Celonis: "Bottleneck Activity" |
| `is_high_variance_step` | High Variance | flag | This step's duration varies significantly across runs, suggesting inconsistent execution. | A derived boolean flag. Set when coefficient of variation (stddev / mean) of step.duration_ms exceeds a configured threshold. High variance often signals user-to-user skill gap or unclear process definition. | GREEN | UiPath: "High Variance Activity" |
| `is_high_rework_step` | Rework Risk | flag | This step is frequently re-executed, suggesting an upstream trigger or structural error. | A derived boolean flag. Set when step_rework_rate_pct exceeds a configured threshold. Rework risk steps are prioritized in the opportunity engine. | GREEN | Celonis: "Rework Activity" |
| `is_automation_candidate_step` | Automation Candidate | flag | This step meets criteria for automation: repetitive, rule-based, low error, high frequency. | A derived boolean flag. Set when repetitiveness_score ≥ threshold AND rule_basedness_score ≥ threshold AND step_frequency ≥ threshold AND exception_rate ≤ threshold AND confidence_score ≥ threshold. | GREEN | UiPath: "Automation Candidate" |

---

### Layer 3: Variation and Conformance Metrics (INPUT_SPEC §5 Layer 3)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `variant_count` | Variant Count | variants | Number of distinct step sequences observed across all runs of this workflow. | Variant count = count of distinct variant_hash values for a workflow definition. A variant is a unique ordered sequence of steps. Higher count = more execution diversity, not necessarily a problem. | GREEN | Celonis: "Variant Count"; SAP Signavio: "Variant Count"; IBM: "Variant Count" |
| `top_variant_share_pct` | Top Path Share | % | Percentage of runs that follow the single most common step sequence. | Top variant share = runs in the most common variant / total runs × 100. A high share (e.g., > 70%) indicates a dominant, likely well-defined process. A low share signals fragmentation. | AMBER — "top_variant_share_pct" is clear; label "Top Path Share" is more legible to non-analysts than "Top Variant Share". | Celonis: "Most Common Path Share"; SAP Signavio: "Top Variant Frequency" |
| `happy_path_share_pct` | Happy Path Share | % | Percentage of runs following the designated canonical or most efficient approved path. | Happy path share = runs matching the canonical_path_hash / total runs × 100. Requires a defined canonical path. Returns null when canonical_path_hash is absent — render as "— (no path defined)". | AMBER — tooltip must clearly state this requires canonical path configuration. Without it the metric is misleading. | Celonis: "Happy Path Conformance"; SAP Signavio: "Happy Path Rate" |
| `deviation_rate_pct` | Deviation Rate | % | Percentage of runs that diverged from the canonical or expected process path. | Deviation rate = 100 − happy_path_share_pct. Computed only when canonical_path_hash is defined. High deviation may indicate training gaps, system issues, or legitimate exception handling. | AMBER — same dependency as happy_path_share_pct; tooltip must note canonical path requirement. | Celonis: "Deviation Rate"; IBM: "Non-Conformance Rate" |
| `loop_rate_pct` | Loop Rate | % | Percentage of runs containing at least one backward or repeated step sequence. | Loop rate = runs with at least one is_loop_edge = true / total runs × 100. Loops often indicate rework, correction cycles, or approval re-submissions. | GREEN | Celonis: "Loop Rate"; SAP Signavio: "Rework Rate" |
| `rework_rate_pct` | Rework Rate | % | Percentage of runs where at least one step was re-executed after the process moved forward. | Rework rate = runs with at least one repeated canonical step / total runs × 100. Formula per INPUT_SPEC §6: rework_rate_pct = runs_with_repeated_canonical_steps / total_runs × 100. Already live in v2 engine. | GREEN | Celonis: "Rework Rate"; UiPath: "Rework Rate"; IBM: "Rework Rate" |
| `path_length_avg` | Avg Path Length | steps | Average number of steps per run across the selected set of runs. | Path length average = mean of step_count per run. Compare with the canonical path's step count to quantify over-processing. A longer-than-canonical path suggests detour, rework, or injected steps. | GREEN | Celonis: "Average Case Length"; UiPath: "Average Path Length" |
| `path_length_stddev` | Path Length Spread | steps | Standard deviation of step count across runs — measures how consistently runs stay on-length. | Path length stddev = standard deviation of step_count per run. A high value indicates structurally inconsistent execution. Low stddev with high variant_count means similar-length paths via different steps. | AMBER — "path_length_stddev" is a mouthful; label "Path Length Spread" is more legible. Standard deviation is an internal statistic, not a user concept. | Celonis: "Std Dev. Path Length" |
| `step_injection_rate_pct` | Extra Step Rate | % | Percentage of runs containing steps not in the canonical path definition. | Step injection rate = runs with at least one injected (non-canonical) step / total runs × 100. Requires a canonical path. Injected steps may indicate workarounds, error recovery, or undocumented process branches. | AMBER — "step_injection_rate_pct" is precise; label "Extra Step Rate" is more legible. Keep key, rename label. | SAP Signavio: "Extra Activities Rate" |
| `conformance_score_0_100` | Conformance Score | /100 | How closely runs follow the defined process path, on a 0–100 scale. 100 = perfect conformance. | Conformance score combines happy_path_share, deviation_rate, step_injection_rate, and loop_rate into a single 0–100 index. Lower scores indicate significant divergence from the defined process. Requires canonical path to be meaningful. | GREEN | Celonis: "Conformance Score"; SAP Signavio: "Conformance Index"; IBM: "Conformance Rate" |
| `variant_entropy` | Path Entropy | bits (internal) or "Low/Medium/High" display | Measure of how evenly distributed runs are across all observed variants. A higher value means more fragmentation. | Variant entropy = Shannon entropy of the variant frequency distribution. High entropy means runs are spread thinly across many paths; low entropy means most runs cluster in a small number of variants. | RED — "variant_entropy" in bits is opaque to operations users. Propose: display as a normalized "Low/Medium/High" categorical label, not a raw entropy value. Keep key; change display format. | Celonis: "Variant Entropy" (internal); SAP Signavio: does not expose raw entropy |
| `standardization_score_0_100` | Standardization Score | /100 | How consistently this workflow follows a standard path, on a 0–100 scale. | Standardization score = 0.45 × top_variant_share + 0.35 × happy_path_share + 0.20 × (1 − normalized variant entropy). Already live as a Layer 9 composite; also computed at the definition level for conformance tracking. | GREEN | Celonis: "Standardization Score"; SAP Signavio: "Process Compliance Score" |
| `path_efficiency_pct` | Path Efficiency | % | Percentage of steps that contribute to the canonical outcome, excluding detours and injections. | Path efficiency = canonical steps completed / total steps executed × 100. Quantifies how much of user effort goes toward the intended outcome vs overhead or rework. | AMBER — distinguish from flow_efficiency_pct (which measures time, not steps). Tooltip must state "step-level, not time-based". | SAP Signavio: "Path Efficiency" |
| `path_similarity_avg` | Avg Path Similarity | % | Average structural similarity between run paths and the canonical path. | Path similarity = sequence similarity score (e.g., Levenshtein distance normalized to 0–100%) between a run's step sequence and the canonical path. Averaged across all runs. High similarity = high conformance even without a formal conformance score. | AMBER — "path_similarity_avg" is a research term. Propose label: "Avg Path Similarity" with tooltip clarifying it measures step-sequence match, not content match. | IBM: "Sequence Similarity" |

---

### Layer 4: Quality and Outcome Metrics (INPUT_SPEC §5 Layer 4)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `error_rate_pct` | Error Rate | % | Percentage of runs containing at least one step flagged as an error event. | Error rate = runs with at least one step where is_error_event = true / total runs × 100. An error event is a step that the recorder or normalization engine classified as an exception, failure, or user-reported error. | GREEN | Celonis: "Error Rate"; SAP Signavio: "Error Rate"; IBM: "Error Rate" |
| `exception_rate_pct` | Exception Rate | % | Percentage of runs that triggered an exception path — an unplanned branch outside normal flow. | Exception rate = runs where at least one exception_event was recorded / total runs × 100. Distinct from error_rate: exceptions are planned-for divergences (escalations, manual overrides); errors are unplanned. | AMBER — tooltip must clearly distinguish exceptions from errors; both terms are used in industry but with different meanings. | SAP Signavio: "Exception Rate"; IBM: "Exception Rate" |
| `failure_rate_pct` | Failure Rate | % | Percentage of runs that ended in a failed status without completing the intended outcome. | Failure rate = runs with status = 'failed' / total runs × 100. A failed run did not reach the completion state and cannot be retried without re-initiation. | GREEN | Celonis: "Failure Rate"; IBM: "Failure Rate" |
| `abandonment_rate_pct` | Abandonment Rate | % | Percentage of runs that were started but never completed or failed — left in an open state. | Abandonment rate = runs with status = 'abandoned' or 'partial' / total runs × 100. High abandonment may indicate UX friction, insufficient time allocation, or systemic interruption patterns. | GREEN | Celonis: "Abandonment Rate"; UiPath: "Drop-off Rate" |
| `sla_breach_rate_pct` | SLA Breach Rate | % | Percentage of runs that exceeded the configured SLA threshold for this workflow. | SLA breach rate = runs where cycle_time_ms > sla_threshold_ms / total runs × 100. Requires an SLA threshold configured per workflow definition or process group. Returns null when no SLA is configured. | GREEN | Celonis: "SLA Breach Rate"; SAP Signavio: "SLA Violation Rate"; IBM: "SLA Compliance Rate" (inverse) |
| `first_pass_yield_pct` | First Pass Yield | % | Percentage of runs completed correctly on the first attempt, with no errors or rework. | First pass yield = runs_with_no_error_and_no_rework / completed_runs × 100. A manufacturing-standard quality metric. High FPY means the process works correctly most of the time, without correction cycles. | GREEN | Celonis: "First Pass Yield"; IBM: "First Pass Yield" — industry standard term, do not rename |
| `rework_case_rate_pct` | Rework Case Rate | % | Percentage of completed runs that required at least one step to be re-executed. | Rework case rate = completed runs with at least one rework step / completed_runs × 100. Distinguishes from rework_rate_pct (which includes all runs, not just completions). Use both to understand rework in successful outcomes. | AMBER — distinguish from `rework_rate_pct` in UI; propose tooltip note "completed runs only". | Celonis: "Rework Rate (Completed)"; IBM: "Case Rework Rate" |
| `on_time_completion_pct` | On-Time Rate | % | Percentage of runs completed within the SLA or target duration threshold. | On-time completion = completed runs where cycle_time_ms ≤ sla_threshold_ms / completed_runs × 100. Inverse of sla_breach_rate_pct for completed cases only. Requires SLA threshold. | AMBER — duplicate with inverse of SLA breach rate; tooltip should clarify scope (completed runs only, requires SLA config). | Celonis: "On-Time Completion Rate"; SAP Signavio: "On-Time Delivery Rate" |
| `customer_impact_score` | Customer Impact | /100 | Estimated impact of process quality on the customer-facing outcome. Requires business metadata. | Customer impact score is an optional business-layer metric computed from external quality signals (NPS events, complaint rates, escalation flags) linked to run identifiers. Not computable without workspace-configured business metadata. | AMBER — RED risk if surfaced without business metadata. Propose: hide this metric entirely unless workspace has configured a customer_impact_signal. Surface as "Not configured" otherwise. | SAP Signavio: "Customer Impact Index" |
| `risk_event_rate` | Risk Event Rate | events/run | Average number of risk-flagged events per run, based on configured risk taxonomy. | Risk event rate = total risk events / total runs. A risk event is any step or transition classified under the workspace's configured risk taxonomy. Requires risk configuration. | AMBER — requires workspace configuration; must show "Not configured" when risk taxonomy is absent. | IBM: "Risk Event Rate" |
| `escalation_rate_pct` | Escalation Rate | % | Percentage of runs that triggered a manual escalation or supervisor handoff. | Escalation rate = runs with at least one escalation_event / total_runs × 100. Escalation events are identified by step taxonomy or explicit escalation tags in the event log. | GREEN | IBM: "Escalation Rate"; SAP Signavio: "Escalation Rate" |

---

### Layer 5: Human / Task Mining Behavior Metrics (INPUT_SPEC §5 Layer 5)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `clicks_per_run` | Clicks per Run | clicks | Average number of click actions recorded per run of this workflow. | Clicks per run = total click events / total runs. A proxy for interaction density. High values suggest heavy manual interaction; compare with automation_rate_pct for opportunity sizing. | GREEN | UiPath: "Clicks per Case"; IBM Task Mining: "Click Count per Case" |
| `actions_per_run` | Actions per Run | actions | Average total number of recorded user actions (clicks, keystrokes, navigation) per run. | Actions per run = total action events / total runs. Includes all recorded interaction types. Use to estimate manual effort density and compare across user cohorts. | GREEN | UiPath: "Actions per Case" |
| `avg_action_duration_ms` | Avg Action Time | ms or s | Average time spent on a single user action across all actions in the selected runs. | Average action duration = total action time / total action count. Very short values may indicate automated or macro-assisted steps; very long values indicate deliberation or data-heavy steps. | GREEN | UiPath: "Average Action Duration" |
| `system_count_per_run` | Systems Used | systems | Average number of distinct applications or systems accessed per run. | System count per run = mean of system_count across runs. A high value indicates a cross-system workflow with high integration overhead and significant application-switching cost. | GREEN | UiPath: "Applications per Case" |
| `application_switch_rate` | App Switch Rate | switches/run | Average number of application switches per run — each switch adds context-switching overhead. | Application switch rate = total application_switch_count / total runs. Frequent switching between systems is a primary automation opportunity indicator. High values alongside manual_effort_pct suggest integration automation ROI. | GREEN | UiPath: "Application Switches per Case"; IBM Task Mining: "Context Switch Rate" |
| `copy_paste_rate` | Copy-Paste Rate | % | Percentage of runs containing at least one copy-paste action between applications. | Copy-paste rate = runs with at least one detected copy-paste event / total runs × 100. A high rate is a leading indicator of missing system integration or manual data-bridging between tools. | GREEN | UiPath: "Copy-Paste Rate" |
| `data_entry_time_ms` | Data Entry Time | s or min | Total time per run spent on data entry steps (form fill, text input, structured input). | Data entry time = sum of step.duration_ms where is_data_entry = true, averaged across runs. A large share of cycle time consumed by data entry indicates an assisted data-entry automation opportunity. | GREEN | UiPath: "Data Entry Time per Case" |
| `lookup_time_ms` | Lookup Time | s or min | Total time per run spent searching or retrieving information from systems. | Lookup time = sum of step.duration_ms where is_lookup = true, averaged across runs. High lookup time combined with high step_frequency for lookup steps is an indicator for knowledge retrieval automation. | GREEN | UiPath: "Lookup Time per Case" |
| `navigation_overhead_pct` | Navigation Overhead | % | Percentage of active time spent navigating between screens, menus, or applications. | Navigation overhead = navigation_duration_ms / total_active_duration_ms × 100. Navigation is non-value-adding time. A high percentage suggests UI friction, poor application design, or consolidation opportunity. | GREEN | UiPath: "Navigation Overhead" |
| `manual_effort_pct` | Manual Effort | % | Percentage of active time spent on steps classified as manual (not automated). | Manual effort = manual_duration_ms / total_active_duration_ms × 100. The complement of automation_rate_pct. High manual effort combined with high repetitiveness scores identifies the strongest automation candidates. | GREEN | UiPath: "Manual Effort Percentage"; IBM: "Human Effort Rate" |
| `idle_bursts_count` | Idle Bursts | bursts/run | Average number of distinct idle periods per run, indicating interruptions or context gaps. | Idle bursts count = average number of idle gap events per run, where each gap exceeds the configured idle threshold. Multiple short bursts suggest fragmented work; one long burst may indicate an external dependency wait. | AMBER — "idle_bursts_count" is an internal name. Propose label "Idle Bursts" with tooltip explaining it counts distinct interruption events, not total idle time. | UiPath: "Interruption Count per Case" |
| `user_variance_score` | User Variance | /100 | How differently individual users execute this workflow compared to the group average. | User variance score = normalized spread of per-user median cycle time and error rate relative to the team mean. A high score (near 100) means some users take significantly longer or make more errors than others — a training or tool gap signal. | AMBER — "user_variance_score" needs an explicit "what it means" tooltip: high = large differences between users. No number without explanation. | UiPath: "User Variance Score"; IBM: "User Performance Spread" |
| `top_performer_delta_pct` | Best Performer Gap | % | Percentage difference in median cycle time between the fastest user and the team median. | Top performer delta = (team_median_cycle_time − top_performer_median_cycle_time) / team_median_cycle_time × 100. A large gap indicates the fastest user's approach may be worth documenting and standardizing. | AMBER — propose label "Best Performer Gap" over "Top Performer Delta" to avoid the word "delta" as UI copy. | UiPath: "Top Performer Gap" |
| `novice_vs_expert_delta_pct` | Skill Gap | % | Percentage difference in median cycle time between the slowest and fastest user cohorts. | Novice vs expert delta = (novice_cohort_median − expert_cohort_median) / expert_cohort_median × 100. Cohorts defined by run count (bottom vs top quartile). A large gap is a training prioritization signal. | AMBER — "novice_vs_expert_delta_pct" is an internal description. Propose label "Skill Gap" — direct and actionable. | IBM: "Experience Gap"; UiPath: "Skill Variance" |
| `team_variance_score` | Team Variance | /100 | How differently teams execute this workflow compared to each other. | Team variance score = normalized spread of per-team median cycle time and error rate relative to the portfolio mean. High values indicate department-level process differences worth investigating. Requires multi-team workspace configuration. | AMBER — same treatment as user_variance_score: must explain "high = large differences between teams" in tooltip. | UiPath: "Team Performance Variance" |

---

### Layer 6: Bottleneck and Constraint Metrics (INPUT_SPEC §5 Layer 6)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `bottleneck_impact_score` | Bottleneck Impact | /100 | How severely a bottleneck step is slowing this workflow, on a 0–100 scale. | Bottleneck impact score = normalized(wait_time_ms at bottleneck step) × normalized(step_frequency) × normalized(case_volume). A score near 100 means a high-frequency, high-volume step with extreme wait time. | GREEN | Celonis: "Bottleneck Impact Score" |
| `delay_frequency_pct` | Delay Frequency | % | Percentage of runs where a delay event (wait exceeding threshold) was observed. | Delay frequency = runs with at least one delay event / total runs × 100. A delay event is any step whose step_wait_before_ms exceeds the configured p90 threshold. | GREEN | Celonis: "Delay Rate"; IBM: "Delay Frequency" |
| `queue_time_ms` | Queue Time | s or min | Average time steps spend waiting to start after their predecessor completed. | Queue time = mean of step_wait_before_ms across all steps in the workflow. Distinct from idle_time_ms (user idle) — queue time is a system-side or handoff delay before the step can begin. | AMBER — distinguish from idle_time_ms and wait_time_ms in tooltip. All three are "waiting" to a user but mean different things. Tooltip must state "time waiting before a step starts". | Celonis: "Queue Time"; SAP Signavio: "Waiting Time" |
| `max_wait_step_id` | Longest Wait Step | step name | The specific step with the highest average wait time before execution begins. | Max wait step = the step_id (and its human_action_label) with the highest mean step_wait_before_ms value. This is the primary bottleneck identification output — the single step most constraining throughput. | AMBER — `max_wait_step_id` is an ID reference; UI must resolve to human_action_label. Label "Longest Wait Step" is precise. | Celonis: "Top Bottleneck Activity" |
| `critical_path_duration_ms` | Critical Path Time | s or min | Duration of the minimum-time path through the workflow — the fastest theoretically achievable run. | Critical path duration = sum of step durations along the longest-weighted dependency chain that determines the minimum cycle time. Based on step_edge graph analysis. | AMBER — "critical path" has a specific project-management meaning; tooltip must clarify it is the *minimum-time* path, not the slowest. | IBM: "Critical Path Duration"; SAP Signavio: "Critical Path" |
| `critical_path_share_pct` | Critical Path Share | % | Percentage of cycle time accounted for by steps on the critical path. | Critical path share = critical_path_duration_ms / cycle_time_ms × 100. A high value means there is little slack in the process — most of cycle time is on the minimum-time path, leaving limited room for parallel optimization. | GREEN | IBM: "Critical Path Share" |
| `throughput_loss_estimate_ms` | Throughput Loss | s or min | Estimated time lost per run due to bottleneck delays, relative to best-observed performance. | Throughput loss estimate = median_cycle_time_ms − best_observed_cycle_time_ms (p10 of completed runs). Measures the gap between typical performance and observed best-case. Not a theoretical maximum — derived from actual runs. | AMBER — tooltip must clarify this is observed-best-case comparison, not a theoretical floor. | Celonis: "Throughput Time Loss"; IBM: "Performance Gap" |
| `throughput_loss_estimate_usd` | Throughput Loss ($) | $ | Estimated dollar value of time lost per run to bottleneck delays. Requires labor cost configuration. | Throughput loss in USD = throughput_loss_estimate_ms × labor_cost_per_ms (from workspace configuration). Returns null when labor cost is not configured — render as "Configure labor cost to see this metric" not as zero. | RED — rendering $0 when not configured is misleading. Propose: surface as null with explicit "configure to unlock" copy, never as a computed zero. | Celonis: "Throughput Loss (USD)"; IBM: "Financial Loss Estimate" |

---

### Layer 7: Automation and AI Opportunity Metrics (INPUT_SPEC §5 Layer 7)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `automation_rate_pct` | Automation Rate | % | Percentage of steps currently executed by automated systems, not by a human user. | Automation rate = automated steps / total steps × 100. Based on is_automated = true step classification. An existing automation rate > 0 means partial automation is already present; this metric tracks its coverage. | GREEN | UiPath: "Automation Rate"; Celonis: "Automation Rate" |
| `manual_step_share_pct` | Manual Step Share | % | Percentage of total steps that require human execution. The complement of Automation Rate. | Manual step share = 100 − automation_rate_pct. Represents the remaining manual footprint. Use to quantify the automation opportunity ceiling for this workflow. | AMBER — redundant with automation_rate_pct; propose surfacing only one of the two in the primary picker, with the other derivable. Keep both in data model for flexibility. | UiPath: "Manual Activity Share" |
| `automation_candidate_count` | Candidate Steps | steps | Number of individual steps in this workflow identified as automation candidates. | Automation candidate count = count of steps where is_automation_candidate_step = true. Each candidate step is scored individually against the automation candidate rule (repetitiveness, rule-basedness, frequency, low exceptions). | GREEN | UiPath: "Automation Candidate Activities"; Celonis: "Candidate Activities" |
| `automation_feasibility_score_0_100` | Automation Feasibility | /100 | How automatable this workflow is overall, considering step types, exceptions, and data patterns. | Automation feasibility score combines automation_candidate_count, repetitiveness, rule_basedness, exception_rate, and structured input signals into a 0–100 score. Higher = more feasible to automate. | AMBER — "what it means" tooltip required: high score = high feasibility, low score = high exception risk or unstructured inputs prevent automation. | UiPath: "Automation Potential Score"; Celonis: "Automation Feasibility" |
| `automation_savings_time_ms` | Estimated Time Saved | s or min | Estimated time saved per run if automation candidates were fully automated. | Automation savings time = sum of step.duration_ms where is_automation_candidate_step = true × automation_success_rate_factor. An estimate, not a guarantee — assumes successful automation of identified candidates. | AMBER — label must always include "Estimated" to avoid over-claiming. | UiPath: "Estimated Time Saved per Case" |
| `automation_savings_usd` | Estimated $ Saved | $ | Estimated labor cost saved per run if automation candidates were fully automated. Requires labor cost configuration. | Automation savings USD = automation_savings_time_ms × labor_cost_per_ms. Null when labor cost is not configured. As with throughput_loss_estimate_usd, never render as $0 when unconfigured. | RED — same risk as throughput_loss_estimate_usd. Propose: "Configure labor cost to see this estimate" copy when null. Never render $0 as a value. | UiPath: "Estimated Cost Savings"; Celonis: "Automation ROI Estimate" |
| `ai_suitability_score_0_100` | AI Suitability | /100 | How well-suited this workflow is for AI-assisted execution, based on decision complexity and structure. | AI suitability score assesses whether AI (vs. rule-based RPA) is the right automation approach. Inputs: decision_complexity, unstructured data signals, exception frequency, knowledge retrieval demand. A high score favors agentic AI; a low score favors deterministic RPA. | AMBER — tooltip must explain that high AI suitability ≠ more automatable; it means *AI* is the right tool, not RPA. | UiPath: "AI Suitability Score" |
| `decision_complexity_score_0_100` | Decision Complexity | /100 | How complex the decision points in this workflow are, based on branch count and data requirements. | Decision complexity = normalized count of is_decision = true steps × branching factor × data-input requirements. High complexity workflows require AI or human judgment; low complexity workflows are RPA-suitable. | GREEN | UiPath: "Decision Complexity"; IBM: "Decision Complexity Score" |
| `repetitiveness_score_0_100` | Repetitiveness | /100 | How repetitive this workflow is across runs — a higher score means steps follow a predictable pattern. | Repetitiveness score = normalized (1 − variant_entropy) × top_variant_share × step_frequency consistency. High repetitiveness is the primary signal for rule-based automation suitability. | GREEN | UiPath: "Repetitiveness Score"; Celonis: "Process Repetitiveness" |
| `rule_basedness_score_0_100` | Rule-Basedness | /100 | How predictable the decision rules in this workflow are — a higher score means fewer judgment calls. | Rule-basedness score = normalized (low_decision_complexity × low_exception_rate × structured_input_rate). High rule-basedness means decisions follow deterministic rules rather than human judgment, making RPA or workflow automation straightforward. | GREEN | UiPath: "Rule-Basedness Score" |

---

### Layer 8: Financial Metrics (INPUT_SPEC §5 Layer 8)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `cost_per_run` | Cost per Run | $ | Estimated total cost of a single workflow run, including labor and overhead. | Cost per run = labor_cost_per_run + overhead_cost_per_run. Computed from labor_cost_per_ms × cycle_time_ms + configured overhead rate. Requires labor cost workspace configuration. | AMBER — "Configure labor cost to unlock" copy required when null. Never render $0. | Celonis: "Cost per Case"; SAP Signavio: "Cost per Case"; IBM: "Cost per Case" |
| `labor_cost_per_run` | Labor Cost / Run | $ | Estimated labor cost for a single run, based on active time and configured hourly rate. | Labor cost per run = processing_time_ms × labor_cost_per_ms. Excludes wait time and idle time — only charges for active human effort. Requires hourly rate configuration per team or workflow. | GREEN | Celonis: "Labor Cost per Case" |
| `labor_cost_per_step` | Labor Cost / Step | $ | Estimated labor cost for a single step, based on step duration and configured hourly rate. | Labor cost per step = step.duration_ms × labor_cost_per_ms. Useful for identifying which individual steps carry the highest labor cost. Sortable in step-level drill-down view. | GREEN | UiPath: "Labor Cost per Activity" |
| `cost_of_rework` | Rework Cost | $ | Estimated total labor cost wasted on steps that had to be re-executed within a run. | Cost of rework = rework_duration_ms × labor_cost_per_ms. Rework duration is the summed duration of all rework-flagged step executions. Excludes initial (productive) executions. | GREEN | Celonis: "Rework Cost"; IBM: "Cost of Poor Quality" |
| `cost_of_delay` | Delay Cost | $ | Estimated labor cost associated with queue and wait time in this workflow. | Cost of delay = wait_time_ms × labor_cost_per_ms (for staff waiting) + overhead_per_ms (for time-value of in-flight cases). A conservative estimate using only direct labor cost by default. | AMBER — tooltip must clarify this is a conservative estimate and does not include opportunity cost unless workspace configures it. | Celonis: "Delay Cost"; IBM: "Wait Time Cost" |
| `savings_opportunity_usd` | Savings Opportunity | $ | Estimated total annual savings if bottlenecks and automation candidates were addressed. | Savings opportunity = (throughput_loss_estimate_usd + automation_savings_usd) × annualization_factor (runs_per_year). A best-case estimate assuming full realization of identified opportunities. | AMBER — tooltip must clearly state "estimate" and "assumes full realization". Avoid surfacing as a guarantee. | Celonis: "Total Savings Potential"; UiPath: "Estimated Annual Savings" |
| `annualized_value_leakage_usd` | Value Leakage / Year | $ | Estimated annual cost of inefficiencies (rework, delays, failures) in this process. | Annualized value leakage = (cost_of_rework + cost_of_delay + failure_cost) × (runs_per_year). Represents money already being lost, not potential future savings. Distinct from savings_opportunity, which is forward-looking. | AMBER — "value leakage" is acceptable for executives (INPUT_SPEC §14.3 explicitly endorses it); tooltip must distinguish it from savings_opportunity. | SAP Signavio: "Value Leakage"; Celonis: "Financial Loss (Annualized)" |
| `automation_roi_pct` | Automation ROI | % | Estimated percentage return on automation investment, based on savings vs. implementation cost. | Automation ROI = (automation_savings_usd − estimated_automation_cost) / estimated_automation_cost × 100. Requires workspace configuration of automation implementation cost. Returns null without cost configuration. | AMBER — both inputs are estimates; tooltip must state "based on configured cost assumptions, not actuals". | UiPath: "Automation ROI"; Celonis: "Automation ROI %" |

---

### Layer 9: Composite Scores (INPUT_SPEC §5 Layer 9)

| metric_key | Short Label | Unit | Tooltip (≤20 words) | Glossary Definition | Flag | Industry Benchmark |
|---|---|---|---|---|---|---|
| `process_health_score_0_100` | Process Health | /100 | Overall process health on a 0–100 scale. 100 = efficient, high-quality, well-standardized. | Process health = 0.30 × efficiency + 0.25 × quality + 0.20 × standardization + 0.15 × SLA compliance + 0.10 × confidence. Weights are workspace-configurable. A score below 40 triggers the "Monitor" opportunity tag. | GREEN | Celonis: "Process Health Score"; SAP Signavio: "Process Health Index"; IBM: "Process KPI Score" |
| `efficiency_score_0_100` | Efficiency Score | /100 | How efficiently this workflow uses time — combining flow efficiency, cycle time, and throughput. | Efficiency score = normalized composite of flow_efficiency_pct, cycle_time target attainment, and throughput_loss_estimate. Higher is better. 100 = best-observed efficiency with zero throughput loss. | GREEN | Celonis: "Efficiency Score" |
| `quality_score_0_100` | Quality Score | /100 | Process quality: how often runs complete correctly on the first attempt, without errors or rework. | Quality score = normalized composite of first_pass_yield, error_rate (inverse), rework_rate (inverse), abandonment_rate (inverse). Higher is better. | GREEN | Celonis: "Quality Score"; IBM: "Process Quality Index" |
| `standardization_score_0_100` | Standardization Score | /100 | How consistently this process follows a defined path. 100 = all runs follow the same sequence. | Standardization score = 0.45 × top_variant_share + 0.35 × happy_path_share + 0.20 × (1 − normalized variant entropy). Already live in v2 engine at the workflow-definition level. | GREEN | Celonis: "Standardization Score"; SAP Signavio: "Compliance Score" |
| `automation_readiness_score_0_100` | Automation Readiness | /100 | How ready this workflow is for automation based on repetitiveness, structure, and volume. | Automation readiness = 0.30 × repetitiveness + 0.25 × rule_basedness + 0.20 × volume_score + 0.15 × low_exception_score + 0.10 × structured_input_score. Already live in v2 as a trigger for the 'Automate' opportunity tag. | GREEN | UiPath: "Automation Potential Score"; Celonis: "Automation Readiness" |
| `sop_readiness_score_0_100` | SOP Readiness | /100 | How ready this workflow is for SOP documentation based on standardization, confidence, and completion. | SOP readiness score = normalized composite of standardization_score, completion_rate, confidence_score, and path_length_consistency. A high score means the process is stable and well-understood enough to document. Already lives in v2 as a sub-pill on the Health Score column. | GREEN | SAP Signavio: "Documentation Readiness"; IBM: "Process Maturity (SOP)" |
| `maturity_score_0_100` | Maturity Score | /100 | Overall process maturity — combining standardization, efficiency, quality, and automation coverage. | Maturity score is a single composite representing how "mature" a process is across all dimensions: standardization (documented and followed), efficiency (minimal waste), quality (low error/rework), and automation (reducing manual effort). | AMBER — "maturity" is a loaded term in enterprise software (CMM levels etc.). Tooltip must clarify this is Ledgerium's own 0–100 composite, not a CMM or ISO maturity level. | SAP Signavio: "Process Maturity Score"; IBM: "BPM Maturity Index" |
| `risk_score_0_100` | Risk Score | /100 | Overall process risk level — higher score means more risk. 0 = minimal risk, 100 = critical risk. | Risk score = normalized composite of sla_breach_rate, failure_rate, abandonment_rate, error_rate, and risk_event_rate. Higher is worse — inverse of health score. A risk score above 60 should trigger immediate review. | AMBER — "higher is worse" is opposite to all other /100 scores in the engine. Tooltip must explicitly state "higher = more risk" to prevent misreading. Propose: consider inverting to "Safety Score" where higher = safer, to match scoring convention. | IBM: "Risk Index"; Celonis: "Risk Score" — most platforms keep higher = more risk for risk metrics; convention supports retaining, but tooltip is mandatory. |

---

## Section 3 — Category Label Copy

Category labels appear in the column picker, filter panels, and grouping headers. Engineering names (Layer 1 through Layer 9) are internal; these are user-facing.

| INPUT_SPEC Layer | User-Facing Category Name | Picker Description (1 sentence) |
|---|---|---|
| Layer 1: Operational flow metrics | Timing & Throughput | Volume, speed, and flow efficiency of completed runs. |
| Layer 2: Step performance metrics | Step Performance | Duration, errors, and rework rates at the individual step level. |
| Layer 3: Variation and conformance metrics | Variation & Conformance | How consistently runs follow a defined process path. |
| Layer 4: Quality and outcome metrics | Quality & Outcomes | Error rates, first-pass yield, SLA compliance, and abandonment. |
| Layer 5: Human/task mining behavior metrics | User Behavior | Clicks, application switching, data entry, and manual effort patterns. |
| Layer 6: Bottleneck and constraint metrics | Bottlenecks | Steps and transitions that constrain throughput or create delays. |
| Layer 7: Automation and AI opportunity metrics | Automation Opportunity | Metrics that quantify how much manual work can be automated. |
| Layer 8: Financial metrics | Cost & Value | Labor cost, rework cost, delay cost, and savings estimates. |
| Layer 9: Composite scores | Health Scores | Single 0–100 scores combining multiple metrics into a single verdict. |

---

## Section 4 — Column Picker UI Copy

### Search and navigation

| Element | Copy |
|---|---|
| Search placeholder | Search metrics... |
| Empty search results | No metrics match "{query}". Try a category filter or clear your search. |
| Category toggle: all | All |
| Category toggle: added | Added |
| Category toggle: available | Available |

### Tier labels

| Tier | Label | Sub-label |
|---|---|---|
| Tier A | Available now | Computed from your current recordings. |
| Tier B | Needs configuration | Requires labor cost, SLA thresholds, or canonical path setup. |
| Tier C | Coming soon | Planned for a future release. |

### General picker chrome

| Element | Copy |
|---|---|
| Picker panel title | Add Columns |
| Column count hint | {n} of {max} columns selected |
| Max columns warning | You've reached the column limit ({max}). Remove a column to add another. |
| Add button (on hover) | Add |
| Remove button (on hover) | Remove |
| Reset to defaults | Reset to defaults |
| Reset confirmation inline | Reset columns to the default view? This cannot be undone. [Reset] [Cancel] |

---

## Section 5 — Saved Views UI Copy

### Create view modal

| Element | Copy |
|---|---|
| Modal title | Save view |
| Name field label | View name |
| Name field placeholder | e.g., Finance team – automation candidates |
| Name required error | A view name is required. |
| Name too long error | View name must be 64 characters or fewer. |
| Save button | Save view |
| Cancel button | Cancel |

### View management

| Element | Copy |
|---|---|
| Default view badge | Default |
| Set as default action | Set as default |
| Default view confirmation (inline) | This view will open whenever you visit the dashboard. [Set as default] [Cancel] |
| Shared view badge | Shared |
| Share view action | Share view |
| Share view description | Anyone in your workspace can see and use this view. |
| Stop sharing action | Stop sharing |
| Stop sharing confirmation (inline) | This view will only be visible to you. Shared links will no longer work. [Stop sharing] [Cancel] |
| Delete view action | Delete view |
| Delete confirmation (inline, NOT window.confirm per DV2-R02 precedent) | Delete "{name}"? This cannot be undone. [Delete] [Cancel] |
| Delete default view blocked | You cannot delete your default view. Set another view as default first. |

---

## Section 6 — Empty, Low-Confidence, and Pre-Threshold State Copy

Each state corresponds to an INPUT_SPEC §9 confidence-drop trigger. The pattern follows the v2 precedent: state the fact, explain why, offer a next action.

### n = 0: No runs recorded

| Context | Copy |
|---|---|
| Primary label | No runs yet |
| Secondary | Record a run to see {metric_name}. |
| Tooltip detail | This metric requires at least one completed run. Start recording to populate it. |

### Too few runs for statistical reliability

| Context | Copy |
|---|---|
| Primary label | {value} (limited data) |
| Secondary | Based on {n} run{s}. Results may not be representative. |
| Tooltip detail | This metric is most reliable with 5 or more runs. Confidence will improve as more runs are recorded. |
| Threshold | Display "(limited data)" badge when evidence_count < 5. |

### Timestamp gaps detected

| Context | Copy |
|---|---|
| Primary label | {value} (timing gaps) |
| Secondary | Some timestamps are missing. Time-based metrics may be understated. |
| Tooltip detail | Gaps in the recorded timestamps were detected in {n} run{s}. This may cause cycle time or wait time to be underestimated. |

### Ambiguous step labeling

| Context | Copy |
|---|---|
| Primary label | {value} (low label confidence) |
| Secondary | Step labels in this workflow have low confidence. |
| Tooltip detail | Some steps could not be reliably classified. Metrics based on step type (data entry, lookup, rework) may be less accurate. Review step labels to improve accuracy. |

### Clustering uncertainty (definition assignment)

| Context | Copy |
|---|---|
| Primary label | {value} (definition uncertain) |
| Secondary | Runs are loosely clustered. Variant and conformance metrics may not be stable. |
| Tooltip detail | These runs were grouped into this workflow definition with moderate confidence. If the grouping looks wrong, you can reassign runs manually. |

### Missing end states

| Context | Copy |
|---|---|
| Primary label | Incomplete |
| Secondary | This run has no recorded end state. |
| Tooltip detail | A run without an end state cannot contribute to completion rate, cycle time, or quality metrics. It is counted as abandoned. |

### Incomplete sessions

| Context | Copy |
|---|---|
| Primary label | Partial |
| Secondary | This session was not fully captured. |
| Tooltip detail | The recording may have been interrupted. Metrics derived from this run are excluded from aggregate calculations where completeness is required. |

### Metric requires configuration (Tier B)

| Context | Copy |
|---|---|
| Primary label | Not configured |
| Secondary | {metric_name} requires {configuration_item} to be set up. |
| Tooltip detail | Go to workspace settings to configure {configuration_item}. Once set, this metric will compute automatically for all future runs. |
| Examples | "Cost per Run requires a labor cost rate to be configured." / "SLA Breach Rate requires an SLA threshold for this workflow." |

### No canonical path defined (conformance metrics)

| Context | Copy |
|---|---|
| Primary label | — |
| Tooltip detail | {metric_name} requires a canonical path to be defined for this workflow. |

---

## Section 7 — Upgrade CTA Integration

### Context: DV2-R08

DASHBOARD_V2_REVIEW_001 DV2-R08 flagged the existing upgrade CTA as conversion-void: feature-named ("Upgrade to see breakdown"), buried under hover+click, single touchpoint, no value proposition. The PRD §4 10%-lift target is unreachable under that copy.

The Metrics Engine is the strongest value proposition Ledgerium has for upgrade: it turns raw recordings into quantified financial and operational intelligence that free users cannot access. CTAs must lead with the outcome, not the feature.

### CTA Variant 1 — Bottleneck financial impact (recommended for column picker gated state)

> **See where time and money are being lost**
> Bottleneck Impact and Cost metrics show which step is slowing your process and what it costs per run.
> [Unlock with Starter]

**Placement:** Column picker — shown when a user selects a Tier B or gated metric (any Layer 8 financial metric, bottleneck_impact_score, throughput_loss_estimate_usd).

**Why it will perform best.** It names a specific, felt problem ("where time and money are being lost"), not a feature. It directly states the two metrics that answer that problem. The ask is immediate — the user already tried to add the column, so intent is confirmed. Loss framing (time and money lost) outperforms gain framing for process professionals who already feel the pain.

### CTA Variant 2 — Automation ROI (recommended for locked automation score tooltip)

> **Quantify your automation opportunity**
> Automation Readiness and Savings estimates show how much manual work can be automated — and what it's worth.
> [Unlock with Starter]

**Placement:** Health Score breakdown tooltip (Starter+ gated section) and Automation Readiness column locked state.

### CTA Variant 3 — Best-run benchmark (recommended for conformance/standardization locked state)

> **See how your best runs compare to the rest**
> Top Path Share and First Pass Yield reveal which variant is your gold standard — and how far the others fall short.
> [Unlock with Starter]

**Placement:** Variation & Conformance category empty/locked state in the column picker; workflow detail view locked section banner.

### CTA placement summary

| Placement | Variant | Trigger condition |
|---|---|---|
| Column picker — gated metric hover/click | Variant 1 | User attempts to add any Tier A/B metric gated by plan |
| Health Score breakdown tooltip (Starter+ gate) | Variant 2 | Free user expands health score drill-down |
| Automation Readiness column locked state | Variant 2 | Free user views workflow row with locked automation score |
| Variation & Conformance category locked banner | Variant 3 | Free user opens conformance category in picker |
| Executive portfolio view locked section | Variant 1 | Free user views portfolio-level financial summary |

### Measurable outcome

Track `upgrade_cta_click` with `source={placement_id}` per PRD §4. The five placements above replace the single `health_gate` source with five distinct experiment arms. Attribution split enables optimization without a full A/B framework.

---

## Section 8 — Workflow Detail View Copy

Per INPUT_SPEC §14.2.

### Page headers and section labels

| Element | Copy |
|---|---|
| Page title | {workflow_name} |
| Back link | ← Workflows |
| KPI strip section label | Key Metrics |
| Process path section label | Process Paths |
| Top variants sub-label | Top {n} variants · {pct}% of runs |
| Step duration section label | Step Duration |
| Chart x-axis (time) | Duration |
| Chart y-axis (steps) | Step |
| Bottleneck section label | Bottlenecks |
| Rework section label | Rework & Loops |
| User variance section label | User Performance |
| Automation section label | Automation Opportunities |
| Trend section label | Performance Over Time |
| Trend chart x-axis | Date |
| Trend chart y-axis | {metric_label} |
| No data state | Not enough runs to show this chart. |
| Drill-through CTA | View source runs → |
| Export CTA | Export data |

---

## Section 9 — Executive Portfolio View Copy

Per INPUT_SPEC §14.3. Language is C-level: outcomes, not mechanics.

| Element | Copy |
|---|---|
| Page title | Portfolio Overview |
| KPI: process groups | Process Groups |
| KPI: total runs | Total Runs |
| KPI: portfolio health | Portfolio Health |
| KPI: workflows at risk | Workflows at Risk |
| KPI: total savings opportunity | Total Savings Opportunity |
| Section: value leakage | Top Value Leakage |
| Value leakage sub-label | Processes losing the most time and labor cost to delays and rework. |
| Section: automation readiness | Automation Candidates |
| Automation sub-label | Workflows with the highest potential return from automation investment. |
| Section: SLA risk | SLA Risk |
| SLA risk sub-label | Workflows most likely to breach committed service levels. |
| Section: standardization heatmap | Standardization by Department |
| Heatmap sub-label | How consistently each department follows defined process paths. |
| Section: department comparison | Department Comparison |
| No data state | No workflows meet this criteria for the selected time window. |

---

## Section 10 — Alerting and Insight Copy

Per INPUT_SPEC §15.

### Cycle Time Regression

| Element | Copy |
|---|---|
| Insight card title | Cycle Time Increased |
| Body | Median cycle time for {workflow_name} increased by {pct}% this week compared to last. {run_count} runs recorded. |
| CTA | Review recent runs → |

### Rework Spike

| Element | Copy |
|---|---|
| Insight card title | Rework Rate Spike |
| Body | Rework rate in {workflow_name} rose to {pct}% — {stddev} above recent baseline. This may indicate a new error source or process change. |
| CTA | View rework steps → |

### Variant Explosion

| Element | Copy |
|---|---|
| Insight card title | Variant Count Increased |
| Body | {workflow_name} now has {n} distinct path variants, up from {prior_n}. Top path share dropped to {pct}%. |
| CTA | Review process paths → |

### SLA Breach Risk

| Element | Copy |
|---|---|
| Insight card title | SLA Breach Risk |
| Body | {pct}% of recent {workflow_name} runs exceeded the {sla_threshold} SLA. At this rate, the breach rate will exceed your configured alert threshold within {n} days. |
| CTA | View SLA breakdown → |

### Bottleneck Emergence

| Element | Copy |
|---|---|
| Insight card title | New Bottleneck Detected |
| Body | "{step_name}" has emerged as a bottleneck in {workflow_name}. Average wait time before this step is {wait_time}, up {pct}% from baseline. |
| CTA | View bottleneck details → |

### Automation Candidate Identified

| Element | Copy |
|---|---|
| Insight card title | Automation Opportunity |
| Body | {n} steps in {workflow_name} meet automation criteria. Estimated time saving: {time_saved}/run. |
| CTA | View candidate steps → |

### Standardization Drift

| Element | Copy |
|---|---|
| Insight card title | Process Drifting from Standard |
| Body | Top path share in {workflow_name} dropped to {pct}% — below your {threshold}% alert level. {n} new variants appeared in the last {window}. |
| CTA | Review process paths → |

### Team / User Performance Gap

| Element | Copy |
|---|---|
| Insight card title | Performance Gap Detected |
| Body | {workflow_name} shows a {pct}% difference in median cycle time between the fastest and slowest user. This may indicate a training opportunity. |
| CTA | View user performance → |

---

## Section 11 — Honest-Label Issues Identified

Full list of AMBER and RED flags for PM + system-architect review.

### RED flags (must resolve before ship)

| metric_key | Issue | Proposed Resolution |
|---|---|---|
| `throughput_loss_estimate_usd` | Renders as $0 when labor cost unconfigured — a false claim. | Return null; display "Configure labor cost to see this metric". Never render $0. |
| `automation_savings_usd` | Same risk: $0 when unconfigured. | Same fix as above. |
| `variant_entropy` | Raw entropy in bits is opaque to operations users. | Display as "Low / Medium / High" categorical; never expose raw float. |
| `risk_score_0_100` | Higher = more risk, opposite convention from all other /100 scores. Tooltip is insufficient mitigation — users will misread without an explicit reversal. | Consider renaming to "Process Risk Level" with a red-to-green scale that visually inverts, OR retain but force a "Higher = more risk" banner label in every render context. |

### AMBER flags (rename or tooltip required)

| metric_key | Current Key | Proposed Short Label | Rationale |
|---|---|---|---|
| `throughput_time_ms` | Throughput Time | (internal only) | Overlaps cycle_time_ms in our model; consolidate to one term for users. |
| `processing_time_ms` | Active Time | Clearer to non-analysts than "Processing Time". |
| `case_volume` | Run Volume | "Case" is process-mining jargon; "Run" matches our product language. |
| `wip_count` | In Progress | "WIP" is lean manufacturing jargon; "In Progress" is universally legible. |
| `arrival_rate_per_day` | Daily Start Rate | "Arrival rate" is queuing-theory jargon. |
| `top_variant_share_pct` | Top Path Share | "Variant" requires definition; "Path" is self-explanatory. |
| `path_length_stddev` | Path Length Spread | Standard deviation is a statistic, not a user concept. |
| `step_injection_rate_pct` | Extra Step Rate | "Injection" is technical; "Extra" is plain. |
| `automation_savings_time_ms` | Estimated Time Saved | Must include "Estimated" in label to avoid over-claiming. |
| `maturity_score_0_100` | Maturity Score | Must clarify in tooltip this is not CMM/ISO maturity. |
| `customer_impact_score` | Customer Impact | Must hide entirely when business metadata absent; never show $0 or 0/100 default. |

---

## Section 12 — Industry-Term Alignment

### Where Ledgerium aligns with industry convention

| Ledgerium Term | Industry Standard | Notes |
|---|---|---|
| Cycle Time | Celonis, SAP Signavio, IBM, UiPath all use "Cycle Time" | Align. Do not rename. |
| Flow Efficiency | Celonis, SAP Signavio | Direct match. |
| First Pass Yield | Celonis, IBM | Manufacturing standard; enterprise buyers recognize it. |
| Variant Count | Celonis, SAP Signavio, IBM | Universal in process mining. |
| Rework Rate | Celonis, UiPath, IBM | Universal. |
| Bottleneck Impact Score | Celonis | Near-match. |
| Automation Rate | UiPath, Celonis | Universal in task mining. |
| SLA Breach Rate | Celonis, SAP Signavio | Standard. |
| Conformance Score | Celonis, IBM, SAP Signavio | Standard conformance checking terminology. |

### Where Ledgerium deviates (with justification)

| Ledgerium Term | Industry Term | Justification |
|---|---|---|
| Run Volume (label) | Case Volume (Celonis, SAP) | Ledgerium users "record runs", not "process cases". Label aligns with product language. Key stays `case_volume` for API compatibility. |
| Active Time (label) | Processing Time (Celonis) | "Processing Time" implies a system process; "Active Time" is clearer for task-mining users who are the ones processing. |
| In Progress (label) | WIP (Celonis, lean) | WIP is jargon outside manufacturing/ops-heavy personas. |
| Skill Gap (label) | Novice vs Expert Delta (UiPath) | "Delta" and "novice/expert" are internal vocabulary; "Skill Gap" is the plain-language outcome. |
| Top Path Share (label) | Top Variant Share (Celonis, SAP) | "Variant" requires definition for non-analysts; "Path" is self-explanatory. |

---

## Section 13 — Sample Tooltip Pack for v1 MVP (Default Metric Pack)

Per INPUT_SPEC §19: 8 primary KPIs + 7 secondary = 15 metrics. Rendered as users see them.

### Primary KPIs

**Process Health — 73 /100**
> Overall process health, combining efficiency, quality, standardization, and SLA compliance. 73 means this workflow is performing above average but has room to improve. Click to see breakdown.

**Median Cycle Time — 4 min 12 s**
> Half of all runs finish faster than this; half take longer. Based on 24 completed runs in the last 30 days.

**Flow Efficiency — 62%**
> 62% of total run time is spent on active work. The remaining 38% is wait time, queues, or idle gaps.

**Run Volume — 24 runs**
> 24 workflow runs recorded in the last 30 days.

**Standardization Score — 81 /100**
> How consistently this workflow follows a standard path. 81 means most runs follow the same sequence. Based on 5 distinct variants; the most common path accounts for 78% of runs.

**Rework Rate — 14%**
> 14% of runs contained at least one step that had to be re-executed. Rework adds time and cost without adding value.

**Bottleneck Impact — 42 /100**
> A bottleneck step is slowing this workflow. Score 42 means moderate impact. The step "Submit approval request" accounts for most of the wait time.

**Automation Readiness — 68 /100**
> This workflow scores 68 on automation readiness. It is repetitive, mostly rule-based, and runs frequently — a strong candidate for automation pilot. 5 steps identified as automation candidates.

### Secondary drill-down

**Top Path Share — 78%**
> 78% of runs follow the most common step sequence. A high share means the process is well-defined; deviations are the exception, not the rule.

**Error Rate — 4%**
> 4% of runs contained at least one step flagged as an error event. Based on 24 runs.

**Abandonment Rate — 8%**
> 8% of started runs were abandoned before completion. Review these runs to identify where users are stopping.

**Manual Effort — 71%**
> 71% of active run time is spent on steps performed manually by a user. The remaining 29% is automated. Reducing manual effort is the primary path to cycle time reduction.

**App Switch Rate — 3.2 switches/run**
> Users switch between 3.2 applications on average per run. High switching is a signal of missing system integration or manual data-bridging.

**Cost per Run — $4.20** *(requires labor cost configuration)*
> Estimated labor cost for a single run, based on active time and your configured hourly rate of $35/hr. Does not include overhead or automation costs.

**Savings Opportunity — $22,000 / year** *(estimate)*
> If identified automation candidates were automated and bottleneck delays addressed, this workflow could save an estimated $22,000 per year. Based on your configured labor cost and current run volume.

---

## Section 14 — Glossary Page Skeleton

The glossary is an in-app surface (and/or docs page) that defines every metric and score. Each entry follows this template:

```
## {Short Label}

**Key:** `{metric_key}`
**Category:** {User-Facing Category Name}
**Unit:** {unit}
**Tier:** {A / B / C}

### What it measures
{One paragraph, plain language. No jargon without definition. No numbers without units.}

### Formula
{Formula from INPUT_SPEC §6, rendered in readable notation, not code syntax.}

### When it's useful
{One sentence on the workflow context where this metric is most actionable.}

### Related metrics
{2–3 linked metrics with brief "see also" notes.}

### What "high" means / What "low" means
{Explicit directional guidance. For scores: "higher is better" OR "higher means more risk". Never ambiguous.}
```

**Entry order:** Alphabetical within categories. Categories displayed in the picker order (Section 3).

**Linking pattern:** Every metric label in the UI, when rendered in a tooltip, should include a "Learn more →" link to the glossary anchor (`/glossary#{metric_key}`). This satisfies the "no jargon without glossary anchor" rule from Section 1 without cluttering primary copy.

---

## Section 15 — Localization Readiness

v1 ships en-US only. No localization work is in scope for the Metrics Engine launch. However, all user-visible strings in this pack must follow these rules to avoid blocking future translation:

### Rules

1. **No string concatenation with dynamic numbers.** Never construct a string like `"Based on " + n + " run" + (n === 1 ? "" : "s")`. Use ICU message format:
   `Based on {n, plural, one {# run} other {# runs}}`

2. **Plural forms must use ICU `plural`.** English has singular/plural; other languages have more forms. Template strings that embed a count must use ICU.

3. **Currency must use locale-aware formatting.** Never hard-code "$" prefix. Use `Intl.NumberFormat` with `style: 'currency', currency: 'USD'`. The currency code is workspace-configurable (INPUT_SPEC §16.1).

4. **Date and time formats must use `Intl.DateTimeFormat`.** Never hard-code "MM/DD/YYYY" or "30 days".

5. **Unit display must be keyed, not concatenated.** `"{value} min"` must be `"{value} {unit}"` where `unit` is a translation key, not a hard-coded string.

6. **Directional copy ("Higher is better") must be a keyed string**, not hard-coded, to allow culturally appropriate phrasing in future locales.

### v1 Deliverable

String keys must be defined in a flat JSON file (`en.json`) even if only en-US ships. Structure: `metrics.{metric_key}.label`, `metrics.{metric_key}.tooltip`, `metrics.{metric_key}.glossary`. Category labels: `categories.{category_key}.label`, `categories.{category_key}.description`. UI chrome: `picker.{element_key}`.

---

*End of COPY_PACK_METRICS.md*
