# UX Flows — Admin Operations Dashboard

**Feature:** Admin Operations Dashboard
**Route:** `/admin/operations`
**Audience:** CEO (primary), future ops/support team
**Status:** MVP
**UX Agent:** ux-designer
**Date:** 2026-05-16

---

## §1 Information Architecture

### Route choice: `/admin/operations`

`/admin/operations` is preferred over `/admin/metrics`. "Operations" signals a dashboard that covers the full health of a running service — users, recordings, system state, memory. "Metrics" implies measurement and analytics, which is PostHog's job. The route also leaves `/admin/metrics` available for a future product-analytics view without a rename.

### Page structure (top to bottom)

1. **Sticky admin header** — page title ("Admin Operations"), last-refresh timestamp, manual refresh button, auto-refresh toggle, time-range selector (affects charts only)
2. **Top-line KPI tile strip** — 6 tiles: Total Users / MAU / Total Recordings / Activation Rate / Node RSS / Error Events (24h)
3. **Section grid** — five full-width section cards stacked vertically, each self-contained:
   - User Volume
   - Recording Volume
   - Workflow Volume
   - System Health
   - Memory and Process
4. **Page footer** — "Admin view · Internal only · Queries run against live DB"

### Sidebar

Suppress the existing app sidebar on this route. The admin page is a distinct operational context, not a peer of the user-facing workflow library. Full-width layout maximises chart and table real estate. Navigation back to the product uses the Ledgerium wordmark in the admin header (links to `/dashboard`).

---

## §2 Wireframe Spec

### 2.1 Full-page structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [◀ Ledgerium]   Admin Operations          [↻ Refresh] [Auto: Off ▾]   │
│                                              Updated 42s ago  [30d ▾]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────┐│
│  │  Users   │ │   MAU    │ │Recordings│ │Activation│ │Node RSS│ │Errs││
│  │   247    │ │   89     │ │  1 241   │ │  63.2%   │ │ 187 MB │ │ 12 ││
│  │ +14 / 7d │ │          │ │ +38 / 7d │ │          │ │        │ │/24h││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ └────┘│
│                                                                         │
│  ┌─ User Volume ─────────────────────────────────────────────────────┐ │
│  │  [daily signup chart — 30d sparkline area chart]                  │ │
│  │                                                                   │ │
│  │  Plan distribution:                                               │ │
│  │  Free ████████████████████ 187 (75.7%)                           │ │
│  │  Starter ████ 32 (13.0%)                                         │ │
│  │  Team ██ 18 (7.3%)                                               │ │
│  │  Growth █ 6 (2.4%)                                               │ │
│  │  Enterprise · 4 (1.6%)                                           │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ Recording Volume ────────────────────────────────────────────────┐ │
│  │  [daily upload chart — 30d area chart]                            │ │
│  │                                                                   │ │
│  │  Validation status (last 30d):  Valid 891 · Pending 47 · Invalid 8│ │
│  │                                                                   │ │
│  │  Top uploaders:                                                   │ │
│  │  user@example.com          214 uploads                            │ │
│  │  another@example.com        98 uploads                            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│  ... (Workflow Volume / System Health / Memory sections follow)         │
│                                                                         │
│  Admin view · Internal only · Queries run against live DB              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Workflow Volume section

```
┌─ Workflow Volume ──────────────────────────────────────────────────────┐
│  Total active: 412     Last 7d: +22     Last 30d: +91                  │
│                                                                        │
│  Processed rate (has ProcessDefinition):  74.3%  ██████████████░░░░░  │
│  Missing step count (data quality):       18 workflows                 │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.3 System Health section

```
┌─ System Health ────────────────────────────────────────────────────────┐
│  Analytics events (24h): 4 812       Error events (24h): 12           │
│  Upload invalid rate (30d): 0.8%                                       │
│                                                                        │
│  Table row counts:                                                     │
│  users 247  ·  uploads 1241  ·  workflows 412  ·                       │
│  analytics_events 48120  ·  process_definitions 306  ·                 │
│  workflow_artifacts 89                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Memory and Process section

```
┌─ Memory and Process ───────────────────────────────────────────────────┐
│  Node RSS: 187 MB                                                      │
│  Heap used: 112 MB  /  Heap total: 156 MB                              │
│  Heap bar: ████████████████░░░░░░░░  72%                               │
│                                                                        │
│  DB file size: 428 MB  (SQLite PRAGMA · snapshot at page load)         │
│  Snapshot at: 2026-05-16 14:33:07 UTC                                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## §3 Component Inventory

| Component | Props | Notes |
|-----------|-------|-------|
| `KpiTile` | `label`, `value`, `unit?`, `delta?` (e.g. "+14 / 7d"), `accent?: boolean` | Accent mint applied to 1–2 tiles only (Recordings recommended per design assessment Move 1) |
| `SectionCard` | `title`, `children`, `isLoading?`, `error?` | All sections always-visible in MVP; no collapse |
| `AdminAreaChart` | `data`, `xKey`, `yKey`, `formatX?`, `formatY?`, `label` | Recharts `AreaChart` wrapper; accessible label on `<figure>` |
| `PlanDistributionBar` | `byPlan: Record<string, number>` | Horizontal segmented bar with per-tier label + count + percent |
| `LeaderboardTable` | `rows: {email, count}[]`, `metricLabel` | Top-N; click row = no-op with "Detail view coming soon" tooltip |
| `MemoryGauge` | `usedBytes`, `totalBytes` | Simple filled bar; no radial gauge (operational tool) |
| `ValidationBreakdown` | `valid`, `pending`, `invalid` | Three labeled counts + three-segment bar |
| `TableRowCounts` | `counts: {table, rows}[]` | Flat labeled list; no chart |
| `EmptyState` | `section`, `message` | Per-section fallback text |
| `LoadingSkeleton` | `rows?`, `variant: 'tile' \| 'chart' \| 'list'` | Animated pulse placeholder matching final layout |
| `RefreshControl` | `onRefresh`, `lastRefreshAt`, `isLoading`, `autoRefreshInterval?` | Header-mounted; shows elapsed since last refresh |
| `AdminHeader` | `title`, children (houses RefreshControl) | Sticky; suppresses sidebar |

---

## §4 Interaction Patterns

**Manual refresh.** The `[↻ Refresh]` button in the sticky header triggers a full re-fetch of `/api/admin/operations`. While fetching, the button shows a spinner and is disabled. The timestamp ("Updated Xs ago") updates on completion. If the fetch fails, the existing data stays visible and an inline error banner appears beneath the header.

**Auto-refresh toggle.** A dropdown adjacent to the refresh button: Off / 30s / 60s. Default: Off. When active, a subtle pulsing indicator appears on the refresh button. Selection persists in `localStorage` for the session. Auto-refresh fires on a client-side interval; it does NOT use server-sent events or WebSocket.

**Time-range selector.** Dropdown: 7d / 30d / 90d. Default: 30d. Affects only the time-series area charts (User Volume daily signups, Recording Volume daily uploads). Does NOT affect the top-line KPI tiles (those always show all-time totals or fixed-window values as labeled). Changing the range re-fetches chart data only; the rest of the page does not re-render.

**Chart hover.** Hovering a data point on an `AdminAreaChart` shows a tooltip: exact value + formatted date. Tooltip dismisses on mouse-out. Keyboard users can focus the chart region; arrow keys move between data points (Recharts default keyboard behavior).

**Leaderboard row click.** Clicking a top-uploader row does nothing functional in MVP. The cursor remains `default`. A `title` attribute on the row reads "User detail view — coming in a future release" so the interaction intent is communicated without an error state.

**Section always-visible.** No section collapse in MVP. All five sections render on page load. Sections are separated by a 24px gap. No horizontal tabs or accordion.

---

## §5 Empty States and Error States

| Situation | Display |
|-----------|---------|
| Zero users | KpiTile shows "0"; User Volume section body shows "No users yet — sign-up data will appear here." |
| Zero recordings | Recording section body shows "No recordings yet." |
| Zero workflows | Workflow section shows counts as 0; processed rate shows "—" |
| Memory metrics unavailable | Memory section shows "Memory metrics unavailable — requires a running Node process." |
| DB size unavailable (non-SQLite or Postgres) | DB size widget shows "N/A — Postgres: use pg_database_size" |
| API error (network or 500) | Full-page inline banner beneath the sticky header: "Failed to load admin data — [Retry]". Existing stale data (if any) remains visible with an amber "Data may be stale" badge on each section card |
| Partial section error | If the API returns data for some sections but not others, sections with errors show `EmptyState` with "Failed to load — retry" and a retry button that re-fetches only that section's data |

---

## §6 Visual Hierarchy

**Top-line tiles.** Largest numerical typeface on the page (`text-[28px] font-semibold tabular-nums`). Labels at `text-[11px] text-[var(--content-tertiary)]`. Deltas ("+14 / 7d") at `text-[12px] text-[var(--content-secondary)]`. One tile (Recordings or MAU) uses `color: var(--accent)` (`#20f2a6`) for the primary number per design assessment Move 1. All other tiles use `color: var(--content-primary)`.

**Section titles.** `text-[14px] font-medium text-[var(--content-secondary)]`. Visually secondary to tiles. Section cards use `background: var(--surface-secondary)` to lift them one step above the page background (`var(--surface-primary)`).

**Chart areas.** Occupy the most visual real-estate within each section card. Chart fill uses a low-opacity `var(--brand-400)` area fill (matching existing dashboard patterns). Chart line at full `var(--brand-400)`.

**Leaderboard and counts.** `text-[13px] text-[var(--content-primary)]` for values; `text-[12px] text-[var(--content-secondary)]` for labels. No emphasis — these are reference data, not alerts.

**Footer.** `text-[11px] text-[var(--content-tertiary)]`. Minimal presence; no interaction.

---

## §7 Accessibility

- All `AdminAreaChart` components render inside a `<figure>` with `aria-label="[Section name] chart — [time range]"` and a linked `<figcaption>` containing a plain-text data summary (e.g., "62 signups over the last 30 days").
- Color is never the only indicator. The validation breakdown (Valid / Pending / Invalid) uses icon prefixes (check / clock / x) in addition to segment color.
- Error states use both an amber/red background AND an icon AND text label.
- `aria-live="polite"` on the refresh control region announces "Data updated" after a successful re-fetch.
- Tab order: sticky header controls → KPI tiles (focusable) → section 1 chart → section 1 list rows → section 2 chart → ... → footer.
- Leaderboard rows are `<tr>` elements in a `<table>` with `scope="col"` headers. They are natively keyboard-navigable.
- The auto-refresh toggle is a `<select>` element, not a custom control.

---

## §8 Mobile and Responsive

**Desktop (≥1024px).** Primary target. Tiles in a 6-column flex row. Charts full-width within section cards.

**Tablet (768–1023px).** Tiles wrap to 3 columns × 2 rows. Charts remain full-width. Leaderboard scrollable.

**Phone (<768px).** A full-width banner appears at the top of the page: "Open on a desktop browser for the best view of the admin dashboard." All sections still render below it — the dashboard is accessible but not optimised. Tiles stack to 2-column grid. No further mobile-specific layout work is in scope for MVP.

---

## §9 Loading and Skeleton States

Show animated skeleton placeholders (`animate-pulse bg-[var(--surface-elevated)]`) while the single API call is in flight. Skeletons match the final layout exactly so the page does not shift on data arrival.

| Region | Skeleton |
|--------|---------|
| KPI tile strip | 6 rounded rectangles at tile dimensions |
| Section card title | 1 short bar |
| Chart area | Solid rectangle at chart height |
| Plan distribution | 5 horizontal bars of varying width |
| Leaderboard | 5 rows of two bars each |
| Memory gauge | Single bar + two short text bars |

No "Loading..." text. No spinner except on the manual Refresh button (where it replaces the ↻ icon).

---

## §10 Time-to-Paint Target

- First meaningful paint (sticky header + skeleton tiles visible): < 1 s
- Full page with real data: < 2 s (per PRD AC-7)
- Each section card is wrapped in a React Suspense boundary so sections with faster queries paint before sections with slower ones. The memory section (cheapest — `process.memoryUsage()` is synchronous) should paint first if the backend returns sections progressively; for MVP the single-endpoint design means all sections arrive together.
- Charts do not block page render. Chart data is passed as props; Recharts renders client-side after hydration.

---

## §11 Copy and Voice

Operational language only. Rules:

- Numbers are plain and labeled: "247 users" not "247 incredible users"
- Units are explicit and abbreviated: "187 MB" not "187 megabytes of precious memory"
- Time windows are shown on every figure that has one: "last 7 days", "last 30 days", "last 24 h", "snapshot at page load"
- No marketing adjectives. No exclamation points.
- Empty states are matter-of-fact: "No recordings yet." — not "Get started by installing the extension!"
- Error states are actionable: "Failed to load — retry" — not "Oops! Something went wrong."

---

## §12 Tile Color Logic

Exactly one tile uses `color: var(--accent)` (`#20f2a6`). Recommended: **Total Recordings** — it is the metric most directly correlated with the product working. The mint accent at 28px makes it the visual anchor of the tile strip without requiring a background or border treatment.

All other tiles use `color: var(--content-primary)` (white at full opacity). Delta values use `color: var(--content-secondary)`.

No tile uses a colored background. Colored backgrounds are reserved for alert states (amber for degraded, red for critical) that are not part of the MVP tile strip.

---

*UX Flows word count: ~1 490 words (body text, excluding wireframe ASCII and tables).*
