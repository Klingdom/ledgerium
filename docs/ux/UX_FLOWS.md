# UX Flows — Workflow Report Page (Redesign)

## Version
1.0 — April 2026

## Scope
Single workflow report page at `/workflows/[id]`. This replaces the current tab-based detail
view with a unified, single-scroll report surface. All data currently split across Report,
Insights, Interpretation, Intelligence, and Evidence tabs is consolidated into one vertically
progressive layout.

---

## Primary User Journey

### Entry Point
User clicks a workflow card on the dashboard or follows a shared link.

### User Goal
In 10 seconds: understand what the workflow does, whether it ran well, and what the top action is.
In 60 seconds: understand bottlenecks, friction, and automation opportunities.
In full reading: review step-by-step detail, evidence, and SOP.

### Completion State
User has identified at least one actionable finding and knows where to act on it.
Optional: user exports, shares, or opens an agent chat.

### Failure States
1. Artifact not found — report shows a partial-data graceful fallback per section (not a full error screen).
2. Workflow still processing — hero area shows a processing skeleton; sections below load independently.
3. No insights generated — section renders a "clean process" affirmation, not a blank panel.

---

## User Flow Narrative

```
Dashboard card click
  → Page loads (optimistic render of static header data from workflow record)
  → Hero section renders immediately (uses workflow.* fields, no artifact dependency)
  → Section 2 (Scores) renders when interpretation artifact resolves
  → Section 3 (Phase Timeline) renders when interpretation artifact resolves
  → Section 4 (Insights) renders when workflow_insights artifact resolves
  → Section 5 (Automation) renders when interpretation artifact resolves
  → Section 6 (Bottlenecks) renders when process_output artifact resolves
  → Section 7 (Steps) renders when process_output artifact resolves
  → Section 8 (Friction + Decisions) renders when interpretation artifact resolves
  → Section 9 (Variants) renders when process_map artifact resolves
  → Section 10 (Rework) renders when interpretation artifact resolves
  → Section 11 (SOP) renders when sop artifact resolves

User scrolls → sections progressively appear
User clicks insight card → expands inline to show evidence + suggestion + affected steps
User clicks "Automate this step" CTA → opens agent intelligence view (existing tab, scrolled into focus)
User clicks Export → downloads JSON or PDF
User clicks Share → generates share token, copies URL to clipboard
```

---

## Export Flow

Trigger: Export button in page header action bar.
Options presented in a compact dropdown (not a modal):
- Export Report (JSON)
- Export SOP (JSON)
- Export Full Workflow (JSON)
- Print / Save PDF (browser print dialog)

Each export triggers a file download and fires an analytics event.

---

## Share Flow

Trigger: Share button in page header action bar.
States:
1. Not shared — button shows "Share" with share icon
2. Sharing enabled — button shows "Shared" with green tint; "Copy link" appears as secondary button
3. Copied — brief "Copied!" confirmation, 2 seconds, auto-reverts

No modal needed. All state in the header bar.

---

## Empty / Loading States Per Section

Each section manages its own loading state independently.
A section-level skeleton is shown (matching the section's height) while its artifact loads.
If an artifact is entirely absent: the section collapses to zero height (not visible).
If an artifact returns no data for a section (e.g., zero insights): the section renders its
"clean" empty state message rather than hiding.

---

## Scroll Behavior

Page is one continuous scroll. No tab switching.
Sticky section navigation (right rail, 1280px+) lets users jump to any section.
At smaller widths the right rail collapses and a compact scroll-spy breadcrumb
appears at the top of the content column.
