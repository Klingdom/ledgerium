# Growth Dashboard Review
**Date:** 2026-06-12
**Agent:** growth-strategist
**Scope:** Define-phase — activation, information hierarchy, copy. No code changes.
**Files reviewed:** `apps/web-app/src/app/(app)/dashboard/page.tsx`, `components/dashboard-v2/{DashboardV2Shell,CommandHeader,InsightsStrip,WorkflowList,WorkflowRow}.tsx`, `apps/web-app/src/app/api/workflows/route.ts`

---

## 1. The single most important action per user segment

### (a) Brand-new user — 0 workflows

**The action that matters:** Install the extension and record the first process.

**Current state — not optimized.**

The v2 shell (`DashboardV2Shell`) renders the `empty` state as a plain-text row inside a `<table>` cell. The message is passive and product-mechanical:

> "No workflows recorded yet."
> "Record any digital process once — Ledgerium measures cycle time, identifies patterns, and surfaces where your team spends time."
> CTA: "Install extension to start →" — links to `EXTENSION_CONFIG.chromeStoreUrl` which is a placeholder Chrome Web Store URL (`/webstore/detail/ledgerium-ai/placeholder`).

Three problems:
1. The empty state renders inside the table, below the full filter bar, below the "Customize columns" button, and below the preset chip rail. A new user sees all of that chrome — columns, sort headers, filter affordances — for a product that has no content yet. The infrastructure signals complexity before the user has understood the value.
2. The primary CTA points at a placeholder URL. Clicking it fails silently.
3. The value description is functional ("measures cycle time, identifies patterns") but not outcome-connected. It tells users what Ledgerium does, not what they will have in 10 minutes.

**What to change:** Give the 0-workflow user a full-page activation moment — not a table row. Collapse all library chrome (filter bar, column picker, preset rail) until the first workflow exists. Surface a single directed call to action pointing at `/install`.

---

### (b) User with a few workflows (1–4)

**The action that matters:** Record more workflows of the same type to unlock health score comparison and pattern detection. The sparse-state notice (`WorkflowList.tsx:392-410`) already does this, but the signal is too small and the upgrade path is not visible.

**Current state — partially optimized.**

The sparse notice reads:
> "Your first workflow is recorded. Record 2 more to unlock health score comparison across your library."

This is honest and specific. The problem is placement: it renders as a small amber banner above the table, competing with filter chrome and column customization affordances. A user with 2 workflows has no health delta to look at, no insight chips firing, and a Portfolio Health score that has limited meaning. The page feels empty despite having content.

The v1 page (`page.tsx`) compounds this: it auto-seeds a sample workflow and fires `handleLoadVariantsDemo` with a developer-flavored "Variants demo" button visible in the header. New users with one real recording are primed with demo data that dilutes their sense of progress.

**What to change:** For 1–4 workflows, make the next-recording nudge the most prominent element on the page — above the table, not inside it. Suppress the variant-demo button from the user-facing header. Show a concrete "record your next workflow" CTA with a hint of what unlocks next.

---

### (c) Power user — 5+ workflows

**The action that matters:** Act on the top signal — review the highest-risk workflow or explore the AI-ready candidate.

**Current state — partially optimized.**

The v2 header (`CommandHeader.tsx`) shows Portfolio Health score, a period-over-period delta, and the top insight chip sentence. The v1 header shows an Org Health Score badge, a Top Risk link, a Top Opportunity link, and a strip of filter chips. In v2, that contextual guidance is reduced to a single top insight sentence below the page title.

For a power user, the page leads with "Workflows" (the page title `h1`) and a time-range selector. Those are navigation affordances, not action triggers. The health score is right-aligned and requires the user to parse a numeric band. The top insight — the most actionable signal — appears as a secondary line of small text below the title, easy to skip.

**What to change:** For 5+ workflows, the page should open with the single most important thing to do right now — surfaced as a named, clickable action, not a number in a corner. The Portfolio Health score is a good orientation signal but it should not be the primary hierarchy element. The top insight chip should be the hero element of the header when it exists.

---

## 2. Empty / sparse / first-run experience

### Empty state (v2 — `WorkflowList.tsx:519-541`)

**Current copy:**

```
No workflows recorded yet.

Record any digital process once — Ledgerium measures cycle time,
identifies patterns, and surfaces where your team spends time.

[Install extension to start →]
```

**Issues:**
- CTA href is `EXTENSION_CONFIG.chromeStoreUrl` = `https://chrome.google.com/webstore/detail/ledgerium-ai/placeholder`. This link does not work. It should route to `/install`.
- The body copy is feature-descriptive. It tells users the mechanism, not the outcome.
- The secondary CTA (upload) is absent from v2. The v1 empty state correctly offers two paths: record and upload. V2 offers only one.
- No step scaffolding — no sense of "you are at step 0 of 3."

**Recommended empty-state copy:**

Headline (replaces "No workflows recorded yet."):
```
Your process library is empty. Let's fill it.
```

Body (replaces the current description):
```
Record any digital process once — even something you do every day.
Ledgerium turns it into a measurable baseline with cycle time,
step count, and health score. No setup required.
```

Primary CTA (fix the link, make it a filled button):
```
[Get the Chrome extension →]
```
Routes to `/install` — not the Chrome Web Store placeholder.

Secondary CTA:
```
[Upload a workflow file]
```
Routes to `/upload` — preserve the upload path that v1 had and v2 dropped.

Step scaffold (below CTA — replaces the "Step 1 / Step 2 / Step 3" footer from v1, condensed):
```
Record → Analyze → Act
```

**Empty-state placement:** The empty state should fill the full content area without the filter bar, preset chip rail, and "Customize columns" button. Those are only meaningful once content exists. Suppress them when `workflowCount === 0`.

---

### Sparse state (v2 — `WorkflowList.tsx:392-410`)

**Current copy:**
```
Your first workflow is recorded. Record 2 more to unlock health score
comparison across your library.
```

This is good — honest, specific, outcome-connected. Keep the substance. Sharpen the action language:

**Recommended sparse-state copy (1 workflow):**
```
You have 1 workflow recorded. Add 2 more to unlock health score
comparison and pattern detection across your library.
```

**Recommended sparse-state copy (2 workflows):**
```
One more recording unlocks health score comparison. Any process works.
```

**Placement fix:** Move the sparse notice above the table header row, not between the filter bar and the table. It should be the first thing the user sees after the command header, not buried below filter chrome.

---

### First-run activation prompt in CommandHeader (v2 — `CommandHeader.tsx:146-153`)

**Current copy:**
```
Record your first workflow to see your Process Health Score
```

This is already clean and honest. Keep it. The only issue is that it is right-aligned and small. For the zero-workflow state, it should be more prominent — perhaps centered or co-located with the empty-state CTA rather than isolated in the header corner.

---

## 3. Information hierarchy

### What should be biggest / first

The single most valuable piece of information at a glance is: **what needs your attention right now**. For a user with a healthy library, that is the top positive signal — "everything looks good." For a user with problems, it is the highest-severity insight chip, concretely named.

Recommended hierarchy (top to bottom):

1. **Page title** — "Workflows" is fine. It is neutral and navigational. Keep it.
2. **The active signal** — the top insight chip rendered as a full-width callout sentence when severity is critical or warning. Not as a secondary line below the title. Something is either worth acting on or it is not. If it is, make it impossible to miss.
3. **Portfolio Health Score + delta** — orientation metric. Good in the current right-aligned position for a power user. For a new/sparse user it should be suppressed (already done in v2 for 0 workflows — extend this to the sparse state as well, since a score computed on 1–2 recordings is not statistically meaningful and may mislead).
4. **Time range selector** — currently top-right. Correct placement. Label it "Showing:" so users understand what it governs.
5. **Insight chip strip** — correctly placed below the header. The issue is that chips are dismissible but not persistent across sessions. A user who dismisses all chips will never see them again in that session. Consider whether that is the right behavior.
6. **Workflow table** — correct placement. The default sort (health_score ascending, worst first) is the right default for an active user. Consider making this explicit: "Sorted by needs attention."
7. **Preset chip rail and column picker** — currently placed above the table. These are power-user customization affordances. They are fine in this position for returning users but add friction for new users.

### What is currently buried

- **The top opportunity workflow** — the v1 page surfaced "Top Opportunity: [workflow name] — AI score N" as a link in the header strip. The v2 page does not surface this. An AI-eligible workflow with a score above 70 is actionable signal that should be visible without requiring the user to scan the table.
- **The sparse-state nudge** — buried between filter chrome and table headers.
- **The install-extension CTA in the empty state** — inside a table cell, below infrastructure that makes no sense without content.

### What is noise

- **The "Variants demo" button** in the v1 header: developer-facing, not user-facing. Users with real workflows have no reason to create a demo. Should be removed from the user-visible header.
- **"Operational command center · [date]"** in the v1 page subtitle: the date is suppressed in v2. The phrase "operational command center" is brand copy with no informational value. Removed in v2, which is correct.
- **"Process Intelligence" as the h1** in the v1 page: this is a product-internal category name, not what the user came to do. V2 uses "Workflows" which is more honest. Keep v2 approach.
- **The SOP readiness column** in the v1 table: SOP Readiness (`ready` / `partial` / `not_ready`) is a derivative signal that does not help the user decide what to do next. In the v2 default column pack this is not included, which is correct.
- **Multiple filter mechanisms simultaneously visible**: in v1, users see health filter, SOP filter, sort dropdown, tag filter, and portfolio sidebar all at once. This is too many controls. The v2 filter bar is better but still surfaces systems, opportunity, health status, and needs-attention as parallel filters. Consider progressive disclosure: one primary filter (needs attention toggle) and secondary filters behind a "More filters" affordance.

---

## 4. Copy pass

### Page title — CommandHeader (`CommandHeader.tsx:114`)

Current: `Workflows`
Recommended: `Workflows` — keep. It is honest, navigational, and matches what the page does.

---

### Time range selector — CommandHeader (`CommandHeader.tsx:58-63`)

Current options:
```
Last 7 days
Last 30 days
Last 90 days
All time
```

Current default: `All time` (changed from 30d in iter-067 per 8-of-8 agent convergence).

The options are clear. No change needed. However the `<select>` has its `<label>` text marked `sr-only`, so sighted users see a naked dropdown with no label. Recommend adding a visible label "Showing:" before the dropdown.

---

### Portfolio Health Score label — CommandHeader (`CommandHeader.tsx:164`)

Current: `PORTFOLIO HEALTH` (uppercase, tracking-wide)
Issue: "Portfolio" suggests group ownership. A solo user with no portfolios configured reads this as a foreign concept.
Recommended: `Process Health` — measures the health of your recorded processes, not your portfolio structure.

---

### Sort header labels — WorkflowList (`WorkflowList.tsx:422-484`)

Current column headers:
- `Workflow` (with sort)
- `Opportunity` (with sort)
- `Systems` (no sort)
- Generic column registry labels for custom columns
- `Health Score` (with sort)

These are reasonable. Specific improvements:

| Current | Recommended | Rationale |
|---|---|---|
| `Workflow` | `Workflow` | Keep. Clear. |
| `Opportunity` | `Opportunity` | Keep. Computed-signal language is correct. |
| `Systems` | `Systems` | Keep. |
| `Health Score` | `Health Score` | Keep. |
| (sort default annotation) | Add sub-label: "Needs attention first" | Makes the default sort intent legible without requiring the user to infer it. |

For the column registry labels (custom columns from the picker), no change to existing labels — the registry copy is already in computed-signal language per the growth-strategist consult at iter-056.

---

### Insight chip strip — InsightsStrip (`InsightsStrip.tsx`)

Chips are generated by `computeInsightChips()` in `workflow-metrics.ts`. The copy reviewed here is the chip label surface exposed to users. Based on the component structure and the `MDR-P02` copy-honesty work, chips should already use computed-signal language. Two principles to preserve:

1. Chip labels must reference only what was measured, not what Ledgerium infers beyond the data.
2. Count badges must reflect the actual workflow count matching the chip's filter key.

The current chip architecture is sound. No label changes proposed here without seeing the live chip values.

---

### Empty state — WorkflowList (`WorkflowList.tsx:519-541`)

Current:
```
No workflows recorded yet.

Record any digital process once — Ledgerium measures cycle time,
identifies patterns, and surfaces where your team spends time.

[Install extension to start →]
```

Recommended (exact strings):

Headline:
```
Your process library is empty. Let's fill it.
```

Body:
```
Record any digital process once — even something you do every day.
Ledgerium turns it into a measurable baseline with cycle time,
step count, and health score. No setup required.
```

Primary CTA (button, filled, routes to `/install`):
```
Get the Chrome extension →
```

Secondary CTA (button, outlined, routes to `/upload`):
```
Upload a workflow file
```

---

### Sparse state notice — WorkflowList (`WorkflowList.tsx:398-399`)

Current:
```
Your first workflow is recorded. Record 2 more to unlock health score
comparison across your library.
```

Recommended variants by count:

When `workflows.length === 1`:
```
You have 1 workflow recorded. Add 2 more to unlock health score
comparison and pattern detection across your library.
```

When `workflows.length === 2`:
```
One more recording unlocks health score comparison across your library.
```

These are specific, honest, and outcome-connected.

---

### No-results state — WorkflowList (`WorkflowList.tsx:549-561`)

Current:
```
No workflows match your filters.
[Clear filters]
```

Recommended:
```
No workflows match these filters.
[Clear filters]
```

Minor: "these filters" acknowledges that filters are currently active, which is slightly clearer than "your filters" (which could be misread as a saved preference).

---

### Error state — WorkflowList (`WorkflowList.tsx:500-516`)

Current:
```
Could not load workflows — check your connection and retry.
[Try again]
```

This is already clean. Keep it.

---

### Header in v1 EmptyDashboard (`page.tsx:2048-2053`)

Note: the v1 page (`?v2=0`) is the fallback. Most users see v2. However this copy surfaces during the soak period.

Current h2:
```
Your process intelligence center is empty
```

Recommended:
```
Your process library is empty. Let's fill it.
```

Current body:
```
Record a workflow with the browser extension, or upload a JSON file to generate
your first SOP and process map.
```

Recommended:
```
Record any digital process once. Ledgerium turns it into a measurable baseline —
cycle time, step count, health score — and generates a draft SOP automatically.
```

Step 1/2/3 footer in v1 (`page.tsx:2089-2105`):

Current:
- Step 1: Record — "Capture your real workflow"
- Step 2: Process — "Deterministic analysis"
- Step 3: Use — "SOP, process map, report"

Recommended:
- Step 1: Record — "Open the extension and record any process"
- Step 2: Analyze — "Ledgerium measures cycle time, steps, and patterns"
- Step 3: Act — "Get a health score, SOP, and automation suggestions"

"Deterministic analysis" is an internal engineering concept. Replace with user-facing outcome language.

---

## 5. Growth and activation improvements (6–10 items for the consolidated list)

These are concrete improvements that do not require feature-scope changes. They are placement, copy, and routing fixes.

**G-01. Fix the empty-state CTA route.**
`WorkflowList.tsx:531` links `href={EXTENSION_CONFIG.chromeStoreUrl}` which is the placeholder Chrome Web Store URL. This link fails in production. Change to `href="/install"` which routes to the dedicated install page already built at `apps/web-app/src/app/(public)/install/page.tsx`. This is the single highest-priority fix — an empty-state CTA that goes nowhere is a full activation block.

**G-02. Restore the upload CTA to the v2 empty state.**
V2 dropped the `/upload` secondary path that v1 had. Users who want to upload a JSON file have no path from the empty state in v2. Add `[Upload a workflow file]` as a secondary CTA below the primary install CTA. Routes to `/upload`. Zero feature work required.

**G-03. Add a "record your next workflow" nudge in the sparse state that opens the extension.**
The sparse notice tells users to record more but does not give them a shortcut. Add a link that routes to `/install` (or opens the extension if it is already installed, using an extension-detection mechanism already present via `ExtensionStatusToast`). A user who is already on the dashboard and has 1 recording should be able to click one thing to open the recorder.

**G-04. Surface the top opportunity workflow as a named link in the command header when `aiOpportunityScore >= 70`.**
Currently this signal exists only in v1 (`page.tsx:836-847`). V2 dropped it. A user with a workflow that scores 70+ for AI automation opportunity has a specific, high-value action available to them. Surface it in the CommandHeader next to the top insight sentence: "Top AI candidate: [workflow name] — score 72. Review →". This is read from `allWorkflows` already loaded in `DashboardV2Shell`.

**G-05. Show a "what unlocks next" tooltip on the Portfolio Health Score for users below 3 workflows.**
When `workflowCount < 3`, the Portfolio Health Score is computed on too few recordings to be statistically meaningful. Rather than suppressing it entirely (which gives users no feedback), show it with a tooltip: "Score improves as you record more workflows. Add 2 more for reliable comparison." This turns a potentially confusing metric into an activation signal.

**G-06. Add a "Your library is healthy" positive confirmation when no chips are active and health score is >= 80.**
Currently `InsightsStrip` renders nothing when there are no chips. A healthy library is a good outcome and deserves acknowledgement. Display a single green positive chip: "All workflows healthy — no action needed." This closes the loop for users who have improved their score and reduces the "what is wrong with this page" confusion when the strip is blank.

**G-07. Rename "Customize columns" to "Columns" and move it into the filter bar row.**
The current label "Customize columns" is 16 characters of verb-noun copy for a button that opens a picker. It is right-aligned above the table in its own row with a full bottom border, making it look like a section header. Use a shorter label "Columns ↕" and place it inline with the filter bar controls. This reduces visual noise and makes the control easier to find.

**G-08. Show a "Share" prompt after a user records their 5th workflow.**
After a user's 5th recording, they have enough data to have a meaningful library. Show a dismissible banner: "You have 5 workflows recorded. Share your process library with your team. [Invite teammates →]". This is the natural share moment — they have demonstrated the product works for them. Routes to `/settings/team` or `/invite`.

**G-09. Make the default sort annotation explicit.**
The table defaults to `health_score ascending` (worst first). This is the right default for an active user. However users do not know this without inspecting the sort state. Add a small sub-label under the table header: "Sorted by: Needs attention first". Users who want a different sort can click the column header. This removes ambiguity about why a poor-health workflow appears at the top.

**G-10. Add a first-run tooltip on the health score column header.**
On the first time a user sees the health score column (detectable via `lastViewedAt === null` on the row data), show a one-time tooltip on hover: "Health Score combines execution consistency, data completeness, and variation across runs. Higher is better." This replaces the implicit knowledge requirement with in-context education. Dismiss on any interaction.

---

## 6. What NOT to do — honesty invariant guardrails

The following patterns are tempting from a growth perspective but violate Ledgerium's honesty invariant ("every output traceable to source events") or risk eroding user trust.

**Do not fabricate health score improvement copy.**
Do not display "Your health score improved!" unless the delta is computed from two distinct recording windows with sufficient N in both. The current delta computation (`portfolioHealthScoreDelta`) correctly returns `null` when prior-period data is insufficient. Never show a positive delta message when the delta is null — do not substitute "No prior data" with "Getting started..." or other copy that implies upward movement.

**Do not show AI opportunity scores as guarantees.**
The `aiOpportunityScore` field (0–100) is a computed signal, not a prediction of savings. Do not frame it as "Save X hours per week by automating this process." The score tells you where automation may be applicable based on observed patterns. The copy should say "automation candidate" or "eligible for AI automation review," never "will save time" or "guaranteed ROI."

**Do not use streak mechanics as the primary engagement signal.**
The v1 codebase has a `StreakData` interface with `currentStreak`, `longestStreak`, and `milestones` from `/api/streaks`. Streaks are a gamification pattern that optimizes for frequency of recording, not quality of outcomes. For a process intelligence tool the meaningful outcome is having a stable, representative baseline — which may require 5 recordings of the same process, not 5 recordings of 5 different processes on consecutive days. Do not introduce streak badges or daily recording goals.

**Do not show "Optimization Potential: High" without linking to specific evidence.**
The v1 page surfaces "optimization opportunities" as a count badge and links to `/recommendations`. If that page does not have specific, evidence-backed recommendations (linked to actual recorded workflow data), the badge is vanity copy. Do not show a count unless the count reflects real, actionable items the user can click through to.

**Do not auto-seed demo data in the production empty state.**
The v1 auto-seed behavior (`hasSeedAttempted.current` + `handleLoadSample()`) fires automatically when `totalWorkflows === 0`. This means a new user's first dashboard view may show a sample workflow they did not record. This masks the true empty state and makes activation metrics unreliable. The sample workflow button should require an explicit user click, not fire automatically.

**Do not show "AI: 72" in the workflow row without explanation.**
The v1 `WorkflowRow` renders `AI: {w.aiOpportunityScore}` as a badge when `aiOpportunityScore >= 60`. Without context, users do not know what "AI: 72" means, what scale it is on, or what to do with it. This is not copy — it is a number floating in a row with no label. Add a tooltip or remove the badge from the row in favor of the insight chip system, which provides the count with filterable context.

**Do not conflate "Org Health Score" with a meaningful organizational benchmark.**
The v1 page computes `orgHealthScore` from `avgConfidence`, `sopReady` count, `avgMaturity`, and `needsReview` count using a manual weighted formula. This composite is not defined in `ARCHITECTURE_METRICS_ENGINE.md` as a tracked metric. It is a dashboard artifact. Do not label it "Org Health" — that implies cross-org benchmarking. The v2 "Portfolio Health Score" (backed by `computePortfolioHealthScore` in `workflow-metrics.ts`) is the traceable equivalent. Use v2. Do not reintroduce the v1 composite.

---

## Summary of highest-priority items

| Priority | Item | File | Type |
|---|---|---|---|
| P0 | Fix empty-state CTA from placeholder Chrome Store URL to `/install` | `WorkflowList.tsx:531` | Bug / routing |
| P0 | Restore `/upload` secondary CTA to v2 empty state | `WorkflowList.tsx:519-541` | Copy / routing |
| P1 | Rewrite empty-state headline and body copy (exact strings in §4) | `WorkflowList.tsx:523-529` | Copy |
| P1 | Move sparse-state notice above table header, not inside table | `WorkflowList.tsx:392-410` | Placement |
| P1 | Surface top opportunity workflow as named link in CommandHeader | `CommandHeader.tsx` | New element |
| P2 | Rename "Portfolio Health" label to "Process Health" | `CommandHeader.tsx:164` | Copy |
| P2 | Add visible "Showing:" label to time-range selector | `CommandHeader.tsx:127-143` | Copy |
| P2 | Add "Sorted by: Needs attention first" annotation under table header | `WorkflowList.tsx:416` | Copy |
| P2 | Add positive "All workflows healthy" chip when no chips and score >= 80 | `InsightsStrip.tsx` | New state |
| P3 | Rename "Customize columns" button to "Columns" | `DashboardV2Shell.tsx:633` | Copy |
