# Analytics R-D Event Instrumentation — Workflow Report
**Feature:** Report Redesign — R-D (Print / PDF export + Report engagement)
**Date:** 2026-06-14
**Status:** Specification — no code shipped yet

---

## Preamble

This document defines the analytics instrumentation for Report engagement in the R-D iteration of the report redesign program. It is written to match the existing event taxonomy in `apps/web-app/src/lib/analytics.ts` exactly: snake_case event names, a discriminated-union variant per event, PII-free properties only, fired via the existing `track()` call.

The existing `workflow_exported` event already fires from `handleExport()` in `apps/web-app/src/app/(app)/workflows/[id]/page.tsx:283` when the "Report" (JSON), "SOP", or "JSON" export buttons are clicked. That event is preserved. The new events below add the missing report-specific signals.

Privacy posture: consistent with the existing `disable_session_recording: true` PostHog posture. No workflow content, step titles, section text, or evidence strings enter any event. `workflowId` is an opaque database ID — it carries no user-identifiable content. `runCount` is a numeric aggregate, not a session trace.

---

## 1. New Events for R-D

### 1.1 `report_viewed`

**When:** On mount of `WorkflowReportPage` (first meaningful render, i.e., when `workflow.id` is available). Fire once per page load — do not re-fire on tab switches.

**Why:** Establishes the denominator for every downstream report funnel metric. Without a view event we cannot compute export rate, section-view depth, or evidence engagement as rates.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID. |
| `runCount` | `number` | `intelligence?.metrics?.runCount ?? 1`. Distinguishes single-run vs multi-run report quality. |
| `sectionCount` | `number` | Count of `visibleSections` at render time. Tells us how much content was available. |
| `hasAgentIntelligence` | `boolean` | Whether the AI intelligence layer rendered (Automation / Agents / Skills / Integrations / Roadmap sections). |

**Where:** `WorkflowReportPage` component, inside a `useEffect(() => { ... }, [])` whose dep array includes `workflow.id` — fires exactly once per mount. Do not fire on the server.

---

### 1.2 `report_print_clicked`

**When:** User clicks any "Print / Save as PDF" button on the report page. `window.print()` triggers the browser's print dialog; the user may then save as PDF or send to a printer.

**Why:** Print / Save as PDF is the primary stakeholder sharing mechanism for a formatted report. Export rate for this path is the leading indicator for "the report is being used as a communication artifact." This is distinct from the existing JSON data export.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID. |
| `location` | `'report_page_header' \| 'report_page_footer'` | Where the print button lives. Useful if we add a footer CTA later. |

**Where:** The onClick handler of the Print / Save as PDF button (to be added to the report page header actions row at `apps/web-app/src/app/(app)/workflows/[id]/page.tsx`). Fire before calling `window.print()` so the event reaches the buffer before the print dialog steals focus.

---

### 1.3 `report_data_export_clicked`

**When:** User clicks the existing "Report" download button (the JSON data export). This is already tracked by `workflow_exported` with `format: 'report'`, but that event does not distinguish which page surface triggered the export or whether it happened from the Report tab specifically.

**Decision:** Do NOT replace `workflow_exported`. Instead, fire `report_data_export_clicked` as an additional, report-surface-specific event. This preserves backward compatibility with the existing `workflow_exported` funnel and adds report-tab attribution.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID. |
| `format` | `'json'` | Currently only JSON. Extend the union if CSV or BPMN export is added to the report surface later. |

**Where:** The onClick handler of the JSON export button when the active tab is the Report tab, in parallel with the existing `handleExport('report')` call.

---

### 1.4 `report_section_viewed`

**When:** A report section scrolls into the scroll-spy viewport for the first time during the current page load. Fired at most once per `sectionId` per page load — use a `Set<string>` ref to dedup.

**Why:** This is the primary signal for "which parts of the report do users actually read." The scroll-spy `useScrollSpy` hook already tracks the active section via `IntersectionObserver` in `apps/web-app/src/hooks/useScrollSpy.ts`. The same mechanism can emit analytics events on first-entry. Section view depth (how far down the report the user scrolls) is one of the three post-ship quality metrics defined in Section 4.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID. |
| `sectionId` | `string` | One of the 23 `SECTION_IDS` values (`'rpt-verdict'`, `'rpt-scorecard'`, `'rpt-insight-cards'`, etc.). Use the existing string constant directly. |
| `sectionLabel` | `string` | The human-readable label from `SECTION_LABELS` (e.g., `'Key Actions'`). Avoids the need to decode `sectionId` in the analytics warehouse. |
| `runCount` | `number` | `intelligence?.metrics?.runCount ?? 1`. Allows segmentation of "which sections do single-run users read vs multi-run users." |
| `elapsedMsSinceReportView` | `number` | `Date.now() - reportViewTimestampMs`. How long after `report_viewed` did this section come into view. Measures read-path pacing. |

**Where:** `WorkflowReportPage`, inside a `useEffect` that watches for `IntersectionObserver` entry events on section containers, or as an enhancement to `useScrollSpy` — whichever keeps the hook boundary clean. The scroll-spy hook already fires on entry; the analytics call is a side effect on the same entry callback.

**Honesty note:** A section entering the viewport does not guarantee the user read it. This event measures attention proximity, not comprehension. Name it `report_section_viewed` (established pattern: `sop_section_viewed` already uses the same naming convention in the taxonomy for the same reason).

---

### 1.5 `report_insight_card_expanded`

**When:** User expands an InsightActionCard in the Insights feed section (`rpt-insights`). The `InsightActionCard` component is used in `InsightsFeedSection`; expansion is a user-initiated interaction, not a scroll event — it is a stronger engagement signal than viewport entry.

**Why:** The Insights feed is the highest-value section for process owners who need actionable findings. Measuring which severity tiers and categories get expanded tells us whether the insight quality matches what users want to act on.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID. |
| `severity` | `'critical' \| 'high' \| 'medium' \| 'low' \| 'info'` | From `insight.severity`. PII-free — severity is a computed classification, not content. |
| `category` | `string` | From `insight.category` (e.g., `'time_analysis'`, `'rework'`, `'automation'`). PII-free — category is a taxonomy label. |
| `insightIndex` | `number` | Zero-based position in the current filtered list. Measures whether top-of-list cards dominate engagement. |

**Where:** `InsightActionCard` component (`apps/web-app/src/components/shared/InsightActionCard.tsx`), in the `onClick` handler for the expand/collapse toggle. The component receives `insight.severity` and `insight.category` already. Pass `workflowId` as a prop from the parent section or read it from a context if one exists.

**What NOT to track:** Do not include `insight.title`, `insight.description`, `insight.evidence`, or `insight.suggestion` in any event property. These fields contain derived content from the recorded workflow — step references, system names, and process descriptions — that must stay out of analytics per the existing PII posture.

---

### 1.6 `report_key_action_card_viewed`

**When:** An InsightCard in the Key Actions section (`rpt-insight-cards`) enters the viewport for the first time. These cards (`InsightCardsSection`) are the executive-summary layer — they appear near the top of the report and each represents a top-level recommendation (Automate, Standardize, Investigate, Address Bottleneck). Viewport entry is the right trigger here because these cards are above the fold on most screens and do not require explicit expansion.

**Why:** Key Actions cards are the "report headline" — if users do not read them, the report is not communicating its core value. Low view rate on Key Actions cards relative to `report_viewed` is evidence the section is visually buried or the content is not compelling.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID. |
| `cardType` | `string` | From `card.type` (e.g., `'automate'`, `'standardize'`, `'investigate'`, `'bottleneck'`). PII-free — this is a taxonomy classification from `deriveInsightCards`. |
| `cardIndex` | `number` | Zero-based position in the rendered card grid. |

**Where:** `InsightCardsSection` in `WorkflowReportPage.tsx`, using an `IntersectionObserver` per card (or a shared observer with entry.target matching). Dedup per `cardType + cardIndex` per page load.

**What NOT to track:** Do not include `card.title`, `card.finding`, `card.recommendation`, or `card.evidence.runIds`. These may contain derived content or run-scoped identifiers.

---

### 1.7 `report_evidence_anchor_viewed`

**When:** The Evidence anchor row within a Key Actions card (`InsightCardsSection`) enters the viewport. The evidence anchor (`div.mt-auto.border-t` block at lines 2237–2246 of `WorkflowReportPage.tsx`) is the bottom portion of each card that shows the run count and evidence label. It is visible only if the user scrolls the card into view AND the card is tall enough to require scrolling to reach the anchor, or the anchor is below the initial fold.

**Why:** The evidence layer is Ledgerium's primary differentiator — "findings backed by observed runs, not guesses." Whether users engage with evidence anchors tells us whether the deterministic evidence-linkage feature is visible and compelling, or invisible and ignored. This event is the primary measurement for the evidence-layer engagement question.

**Properties:**

| Property | Type | Notes |
|---|---|---|
| `workflowId` | `string` | Opaque workflow database ID. |
| `cardType` | `string` | From `card.type` — same as `report_key_action_card_viewed`. |
| `evidenceRunCount` | `number` | `card.evidence.runIds.length`. How many runs back the finding. NOT the run IDs themselves. |

**Where:** `InsightCardsSection`, using an `IntersectionObserver` on the evidence anchor `div` per card. Dedup per card per page load.

**What NOT to track:** Do not include `card.evidence.runIds` (these are run-level identifiers), `card.evidence.label` (may contain counts phrased with content references).

---

## 2. Funnel and Questions These Answer

### Primary funnel: Report → Export

```
report_viewed
  → report_section_viewed (rpt-verdict)       — did they read the lead?
  → report_section_viewed (rpt-insight-cards) — did they reach Key Actions?
  → report_key_action_card_viewed             — did they see the headline finding?
  → report_evidence_anchor_viewed             — did they see the evidence?
  → report_insight_card_expanded              — did they drill into insights?
  → report_print_clicked                      — did they export for stakeholders?
  → report_data_export_clicked                — did they export the data artifact?
```

### Questions the event set answers

**Q1 — Do users export reports?**
`report_print_clicked / report_viewed` = print export rate.
`report_data_export_clicked / report_viewed` = data export rate.
Segment by `runCount` (single-run vs multi-run) to understand whether report quality (more data sections visible) drives export behavior.

**Q2 — Which sections do users read?**
`report_section_viewed` grouped by `sectionId`, computed as `(unique users who viewed section N) / (unique users who fired report_viewed)`. Rank sections by reach. Identify the "drop-off" section — the section below which view rates fall sharply. This is the effective bottom of the report for the median user.

**Q3 — Does the evidence layer get engagement?**
`report_evidence_anchor_viewed / report_key_action_card_viewed` = evidence anchor reach rate per card type. If Key Actions cards are viewed but evidence anchors are not, the card layout is not driving users to the bottom of the card where evidence lives.

**Q4 — Do insight cards drive action?**
`report_insight_card_expanded / report_section_viewed (rpt-insights)` = insights section engagement rate. Segment by `severity` to see whether critical findings get more interaction than medium findings.

**Q5 — Is the report used as a communication artifact (shared or printed)?**
`report_print_clicked` raw count and rate. `share_link_created` (existing event) from the same session. If the print rate is low relative to `report_viewed`, the report is being consumed as a self-serve analysis tool rather than a stakeholder deliverable — that has implications for the R-D export experience.

### Success metrics for "the report is now one of the best pages"

These are the operational definitions. Baseline should be established at R-D ship from the first 14 days of data.

| Metric | Definition | Target (to validate at 30d) |
|---|---|---|
| Export rate (print) | `report_print_clicked / report_viewed` per user session | > 15% of report views result in print / PDF |
| Export rate (data) | `report_data_export_clicked / report_viewed` | > 8% of report views result in JSON export |
| Section depth p50 | Median number of distinct `report_section_viewed` events per `report_viewed` session | > 5 sections (users reading beyond the top scorecard band) |
| Evidence anchor reach | `report_evidence_anchor_viewed / report_key_action_card_viewed` for the same user session | > 50% of Key Actions card views reach the evidence anchor |
| Insights drill-through | `report_insight_card_expanded / report_section_viewed (rpt-insights)` | > 25% of Insights section views result in at least one card expansion |
| Time on report p50 | Derived from `elapsedMsSinceReportView` on the last `report_section_viewed` event per session (proxy for dwell time) | > 90s median dwell on report page |

---

## 3. Honesty and Privacy Guardrails

**Consistent with existing codebase posture (`disable_session_recording: true` in PostHog config):**

1. **No workflow content in events.** Step titles, section text, evidence strings, insight descriptions, recommendations, and run IDs never appear in event properties. Only opaque IDs, numeric aggregates, taxonomy labels, and structural classifications are permitted.

2. **`workflowId` is an opaque database UUID.** It identifies a record in the database, not a person. It cannot be reverse-engineered to reveal what the workflow was about.

3. **`runCount` is a count, not a trace.** Knowing that a workflow has been run 7 times reveals nothing about the workflow's content or the user's behavior within those runs.

4. **`sectionId` and `sectionLabel` are structural identifiers from a closed taxonomy.** They describe which part of the report the user looked at, not what the report said.

5. **`severity` and `category` are taxonomy labels from the insight classification system.** They are computed by deterministic engine rules and carry no user-identifiable information.

6. **`elapsedMsSinceReportView` is a relative timestamp.** It reveals how long after page load a section was reached, not when the user was active or what time it was.

7. **`evidenceRunCount` is a count of run IDs.** The run IDs themselves — which are database UUIDs that could theoretically be traced to sessions — are never included.

8. **Events fire client-side only** via the existing `track()` function. The server-side `trackServer()` path is not used for these report engagement events; they belong to the client-side engagement surface, consistent with `sop_section_viewed` and `workflow_row_clicked`.

9. **`insightIndex` and `cardIndex` are positional integers.** They carry no content.

---

## 4. Measuring Report Quality Post-Ship

The following four operational views should be available from the events defined above within 14 days of R-D ship:

### 4.1 Export Rate

**Query:** For each `report_viewed` session (group by `workflowId + sessionId`), was there a subsequent `report_print_clicked` or `report_data_export_clicked` in the same session?

**Segmentation:**
- `runCount = 1` vs `runCount >= 2` — does multi-run intelligence drive more exports?
- `hasAgentIntelligence = true` vs `false` — does the AI layer drive more exports?
- `userPlan` (auto-enriched by `setUserPlanForAnalytics`) — do Team/Growth users export more than Free users?

**Decision threshold:** If print export rate is below 10% at 30d, the print button is not discoverable or the report is not trusted enough to share. Investigate placement and the verdict / scorecard band quality.

### 4.2 Section-View Depth

**Query:** Per `report_viewed` session, list all distinct `sectionId` values from `report_section_viewed` events. Count the distinct section count and identify the deepest section reached by position in `SECTION_IDS` order.

**Output:** A ranked section reach table. Expected shape: `rpt-verdict` and `rpt-scorecard` near 100% (above the fold); sections below `rpt-distribution` dropping off. The median section depth tells us the effective report length for the average user.

**Decision threshold:** If > 50% of users never reach `rpt-insight-cards` (Key Actions), the report header is consuming too much vertical space and users are not scrolling to the substance. Redesign the header compression.

### 4.3 Time-on-Report (Proxy via Last Section Event)

**Query:** Per session, compute `max(elapsedMsSinceReportView)` across all `report_section_viewed` events. This is a lower-bound proxy for dwell time — the user was on the page for at least that long.

**Limitation:** This proxy understates dwell time if the user stops scrolling but keeps reading. It also overstates it if the user leaves the tab open and returns. Accept these limitations; it is directionally useful.

**Decision threshold:** Median proxy dwell < 45s suggests users are not reading the report — they are scanning the scorecard and leaving. If this coincides with low evidence anchor reach, the report is not landing as an analysis document.

### 4.4 Evidence Layer Engagement

**Query:** `report_evidence_anchor_viewed / report_key_action_card_viewed` per `cardType`. Compute separately for `automate`, `standardize`, `investigate`, and `bottleneck`.

**Decision threshold:** If evidence anchor reach is below 30% for `automate` cards (the highest-value finding), users are not registering that the recommendation is evidence-backed. This is a layout problem: the evidence anchor is visually demoted below the recommendation text and may be below the visible card area. Solution: move evidence anchor to the top of the card (below the badge) or increase card height.

---

## 5. Event Taxonomy Addition Block

The following block shows exactly how these events should be appended to the `AnalyticsEvent` discriminated union in `apps/web-app/src/lib/analytics.ts`, matching the existing format precisely. This is provided for handoff clarity — the frontend engineer implements, not this spec.

```
// ── Report engagement (R-D, 2026-06-14) ──────────────────────────────────────
| {
    event: 'report_viewed';
    workflowId: string;
    /** intelligence?.metrics?.runCount ?? 1 */
    runCount: number;
    /** Count of visibleSections at mount time. */
    sectionCount: number;
    /** Whether the AI intelligence layer produced any content. */
    hasAgentIntelligence: boolean;
  }
| {
    event: 'report_print_clicked';
    workflowId: string;
    location: 'report_page_header' | 'report_page_footer';
  }
| {
    event: 'report_data_export_clicked';
    workflowId: string;
    format: 'json';
  }
| {
    event: 'report_section_viewed';
    workflowId: string;
    /** One of the SECTION_IDS string constants. */
    sectionId: string;
    /** Human-readable label from SECTION_LABELS. */
    sectionLabel: string;
    runCount: number;
    /** Milliseconds since report_viewed fired. */
    elapsedMsSinceReportView: number;
  }
| {
    event: 'report_insight_card_expanded';
    workflowId: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    /** Taxonomy category string — no content. */
    category: string;
    /** Zero-based position in the current filtered list. */
    insightIndex: number;
  }
| {
    event: 'report_key_action_card_viewed';
    workflowId: string;
    /** InsightCard.type — taxonomy label, no content. */
    cardType: string;
    cardIndex: number;
  }
| {
    event: 'report_evidence_anchor_viewed';
    workflowId: string;
    cardType: string;
    /** Count of evidence run IDs backing the finding. NOT the IDs themselves. */
    evidenceRunCount: number;
  }
```

---

## 6. What is Deliberately NOT Tracked

The following were considered and rejected to maintain PII-free and noise-free discipline:

- **Section dwell time per section.** Not trackable reliably from scroll-spy without a departure event. `elapsedMsSinceReportView` on sequential section entries serves as a proxy.
- **Right-rail navigator click.** The right-rail nav (`RightRailNavigator`) links scroll the user to a section. The section entry fires `report_section_viewed` anyway — the click itself is redundant.
- **Scorecard tile hover.** Hover events are noisy and do not indicate intent. Track view via scroll-spy instead.
- **Step expansion in StepBreakdownSection.** Steps are expanded by `step.ordinal` — tracking this would require encoding a step position, which, combined with `workflowId`, could allow re-identification of the process. Omitted on privacy grounds.
- **Evidence run IDs.** Run IDs are database-level identifiers that trace to recorded sessions. They do not enter analytics events.
- **Insight title, description, evidence text, recommendation text.** All derived from workflow content. Omitted entirely.
- **Variant labels in VarianceVariantsSection.** These are derived from step titles (even when hashed) and carry content risk.
