# Dashboard Column-Config Persistence Schema (Path D D+3)

**Status:** Decision (ADR). Backend-engineer-owned. Ships iter-059.
**Owner:** `backend-engineer` (iter 059, directed Mode 2 / backlog row #77 WDC-P04)
**Scope:** `UserDashboardPreference` Prisma model + `persistence.ts` adapter module.
**Prerequisite for:** D+4 picker UI (`DashboardV2Shell.tsx` customization layer).
**Blocked by D+2:** consumes `FilterSet` from `apps/web-app/src/lib/dashboard-columns/filters.ts` verbatim.

---

## 1. Context

The workflow-dashboard column picker (D+4) allows users to choose which columns
are visible, in what order, and with which filters active. Without a versioned
persistence contract, any future rename or removal of a `ColumnKey` entry would
produce silent data corruption for users who had saved that key. The audit
(WORKFLOW_DASHBOARD_CUSTOMIZATION_REVIEW_001 §6, WDC-P04) mandated:

- `schemaVersion` field on every stored preference document
- A migration function that handles every prior schema version deterministically
- Graceful degradation when a stored `ColumnKey` no longer exists in the registry
- Contract design BEFORE any picker code ships

This document is that contract.

Constraints:

- **Determinism** (CLAUDE.md core principle): migration function is a pure function — same input → same output; no `Date.now()`, no `Math.random()`, no I/O.
- **Immutability-first**: stored documents are never mutated in-place; a schema-version bump produces a new write, not an overwrite (Prisma model uses `updatedAt @updatedAt` to record the last write time for audit tracing, but the `schemaVersion` + `payload` fields are rewritten on migration, not merged).
- **Closed `ColumnKey` union**: compile-time exhaustiveness is enforced at the TypeScript level; stale string literals from an older schema version are caught at the application boundary (migration layer) rather than silently reaching the UI.

---

## 2. Wire Format

The JSON document stored in the `payload` column of `user_dashboard_preferences`:

```jsonc
{
  "schemaVersion": 1,
  "visibleColumns": ["workflow_title", "health_score", "run_count"],
  "columnOrder":   ["workflow_title", "health_score", "run_count"],
  "filters":       [],          // FilterSet from D+2 — array of ColumnFilter
  "savedViews":    []           // SavedView[] — see §4
}
```

### Field definitions

| Field | Type | Description |
|---|---|---|
| `schemaVersion` | `number` (integer) | Schema version of this document. Monotonically increasing. Current: `1`. |
| `visibleColumns` | `ColumnKey[]` | Ordered list of column keys the user has toggled on. Subset of the full registry. |
| `columnOrder` | `ColumnKey[]` | Full display order of visible columns. Must be a permutation of `visibleColumns`. Allows future drag-and-drop reordering. |
| `filters` | `FilterSet` | Array of `ColumnFilter` from D+2 (`filters.ts`). Persisted as-is; migrated as-is (filter references to stale columns are retained as-stored but will return `false` from `evaluateFilter` per the audit-honesty IFF invariant). |
| `savedViews` | `SavedView[]` | Named snapshots capturing a `(visibleColumns, columnOrder, filters)` triple. See §4. |

### Invariants

1. Every key in `visibleColumns` MUST be a member of `listColumnKeys()` at read-time. Keys that are not found are **silently dropped**; the migration function returns the dropped count in `droppedKeys`.
2. Every key in `columnOrder` MUST also be in `visibleColumns`. Keys in `columnOrder` that are not in (the cleaned) `visibleColumns` are also dropped.
3. `filters` is stored verbatim. Filter references to columns whose `ColumnKey` was removed from the registry will pass through migration intact but will return `false` from `evaluateFilter` at runtime (the existing D+2 audit-honesty guard). This is intentional: we preserve the user's filter intent and let the runtime guard handle unavailability, rather than silently deleting filter configuration during migration.

---

## 3. Migration Function Contract

```typescript
function migratePreferences(
  raw: unknown,
): { preferences: UserDashboardPreference; droppedKeys: ColumnKey[]; warnings: string[] }
```

**Pure function. Zero side effects. Zero I/O.**

Semantics:

| Input condition | Output |
|---|---|
| `null` / `undefined` | `getDefaultPreferences()` + empty `droppedKeys` + 1 warning: `"No preference document found; using defaults."` |
| Unparseable shape (non-object, missing required fields) | `getDefaultPreferences()` + empty `droppedKeys` + 1 warning describing the parse failure |
| `schemaVersion` absent or not a number | `getDefaultPreferences()` + empty `droppedKeys` + 1 warning |
| `schemaVersion > CURRENT_SCHEMA_VERSION` | `getDefaultPreferences()` + empty `droppedKeys` + 1 warning: `"Preferences from a newer client version; resetting to defaults."` |
| `schemaVersion < CURRENT_SCHEMA_VERSION` | Forward-migrate through each version gap (currently: no prior version exists; branch is a TypeScript `never`-guarded defensive block that returns defaults + warning) |
| `schemaVersion === CURRENT_SCHEMA_VERSION` | Validate all fields; drop unknown `ColumnKey`s; return cleaned preferences + `droppedKeys` list |

The migration function does NOT throw. All error paths return defaults.

### Adding a new schema version (future protocol)

1. Increment `CURRENT_SCHEMA_VERSION` in `persistence.ts`.
2. Add a `v${N-1}_to_v${N}` migration step inside `migratePreferences`.
3. Add a unit test in `persistence.test.ts` covering the forward migration.
4. The Prisma `schemaVersion` column on the `user_dashboard_preferences` table
   records the version AT WRITE TIME — the migration function updates it to
   `CURRENT_SCHEMA_VERSION` before writing back.

---

## 4. `SavedView` Shape

The `SavedView` type is a forward-compatibility stub. The D+5 preset-chips
iteration will add CRUD routes and UI; iter-059 ships the type and ensures it
round-trips through persistence without loss.

```typescript
interface SavedView {
  id:            string;      // caller-generated UUID or cuid; never generated here
  name:          string;      // user-chosen label (≤ 64 chars recommended)
  visibleColumns: ColumnKey[];
  columnOrder:    ColumnKey[];
  filters:        FilterSet;
  createdAt:      string;     // ISO-8601 string; caller-supplied, not generated here
}
```

**Determinism contract for `SavedView`:** `createdAt` is caller-supplied.
The persistence layer never calls `new Date()` or `Date.now()`. Callers (API
route at D+4, preset-chips at D+5) supply the timestamp.

---

## 5. Persistence Strategy

The audit specified a **hybrid** strategy:
- Server-of-truth: Prisma `user_dashboard_preferences` table (THIS ITERATION)
- localStorage write-through cache (DEFERRED to D+4 picker iteration)
- URL shareable-link override (DEFERRED to D+5 preset-chips iteration)

### 5.1 Server-of-truth (iter-059 ships this)

One row per user (enforced by `userId @unique`). The `payload` column stores
the JSON wire format defined in §2. The `schemaVersion` column mirrors the
`payload.schemaVersion` field for fast DB-side queries without parsing JSON.

Row lifecycle:
- **First read with no row** — `deserializePreferencesFromDb(null)` returns
  `getDefaultPreferences()` with no warnings; no row is written at read time.
  The D+4 picker writes the row on first explicit save.
- **Read with existing row** — `deserializePreferencesFromDb(row)` passes
  the stored JSON through `migratePreferences`. If `droppedKeys.length > 0`,
  the caller (D+4 API route) should write back the cleaned preferences AND
  surface the "N columns unavailable" notice in the UI.
- **Write** — `serializePreferencesForDb(prefs)` returns the `{ schemaVersion, payload }`
  pair for the Prisma upsert. Never mutates the input.

### 5.2 localStorage write-through cache (D+4)

Deferred. The D+4 picker iteration will add:
- A `localStorage.setItem('ldg_dashboard_prefs', JSON.stringify(payload))` write
  after each successful server PUT.
- A `localStorage.getItem` read on mount that hydrates optimistically while
  the server response is in-flight (stale-while-revalidate).
- The same `migratePreferences` function will be called on the localStorage
  blob to handle stale cached data from a prior deploy.

**Reason for deferral:** localStorage integration is UI-layer behavior; shipping
it before the picker UI component exists creates an untestable surface. The
server contract is sufficient to unblock D+4.

### 5.3 URL shareable-link override (D+5)

Deferred. The D+5 preset-chips iteration will add a `?view=<base64>` query
parameter that overrides the active `FilterSet` + visible columns without
modifying the persisted server-side preference. The `SavedView` stub type
shipped in iter-059 carries all the fields needed to serialize a shareable link.

---

## 6. Prisma Model

```prisma
model UserDashboardPreference {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  schemaVersion Int      @default(1)
  payload       String   // JSON stored as text (SQLite); mirrors §2 wire format
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("user_dashboard_preferences")
}
```

Note: the Prisma schema uses `provider = "sqlite"`. SQLite does not have a
native `Json` column type; Prisma maps `Json` to a `TEXT` column on SQLite.
The application layer is responsible for `JSON.parse` / `JSON.stringify`.
The `serialization adapter` in `persistence.ts` handles this transparently —
callers never see raw JSON strings.

**`schemaVersion` column rationale:** storing `schemaVersion` as a top-level
column (mirroring the value inside `payload`) allows future DB-level queries
like `WHERE schema_version < 2` to identify rows that need migration without
parsing JSON. The two values MUST be kept in sync by the write adapter; the
read adapter always uses the `schemaVersion` column to decide migration path.

---

## 7. Graceful Degradation (E2E Scenario 4)

Audit acceptance criterion: "E2E Scenario 4 — deprecated-column graceful
degradation MUST pass."

Scenario: a user has `visibleColumns: ['health_score', 'legacy_metric']` saved.
A deploy removes `'legacy_metric'` from the `ColumnKey` union (and therefore
from the registry). On next read:

1. `deserializePreferencesFromDb(row)` calls `migratePreferences(raw)`.
2. `migratePreferences` iterates `visibleColumns`, calls `getColumnByKey(key)`
   for each entry.
3. `'legacy_metric'` does not exist in the registry → added to `droppedKeys`.
4. `preferences.visibleColumns` is returned without `'legacy_metric'`.
5. `preferences.columnOrder` is similarly filtered.
6. Caller (D+4 API GET handler) receives `{ preferences, droppedKeys: ['legacy_metric'], warnings: [] }`.
7. D+4 UI surfaces: "1 saved column is no longer available and was removed."
8. The API handler writes back the cleaned preferences so subsequent reads
   return a clean document.

The TypeScript closed union means `'legacy_metric'` would not compile against
`ColumnKey` in new code — the graceful-degradation path handles runtime blobs
from the database that pre-date the compile-time union tightening.

---

## 8. Consequences

**Positive:**
- `migratePreferences` is a pure function — fully unit-testable without DB.
- Closed `ColumnKey` union enforces compile-time correctness on all new writes.
- Schema-versioned documents make future format changes safe and testable.
- Graceful degradation prevents user data loss on deploy; UI can display a
  meaningful "N columns unavailable" notice.
- `SavedView` stub unblocks D+5 without requiring CRUD routes at D+3.

**Negative / accepted:**
- localStorage write-through cache is not available at D+3; the first page load
  after login will always hit the server. Acceptable — D+4 picker adds the cache.
- `SavedView` CRUD (create, update, delete named views) is a D+5 responsibility;
  D+3 ships only the type and round-trip persistence.
- `payload` stored as `TEXT` on SQLite vs `JSONB` on Postgres — no server-side
  JSON query capability at this tier. Acceptable for Phase 1 (single-user
  preference document, not a query target).

**Deferred:**
- `/api/dashboard/preferences` GET/PUT routes — D+4 picker iteration.
- localStorage write-through cache — D+4 picker iteration.
- URL `?view=<base64>` shareable link — D+5 preset-chips iteration.
- `SavedView` CRUD routes — D+5 preset-chips iteration.

---

## 9. Surfaced Blocker

None. The D+4 picker iteration may proceed on this ADR.

The 5 pre-R+1 PRD-blocking questions from MR-013 §17 are Path C concerns and
do not gate Path D D+4. The `UserDashboardPreference` table is independent of
`metric_fact` and `process_run_snapshot`.

---

## 10. D+6 Default-Pack Composition (iter-063 / Path D complete)

**Status:** Locked by D+6 lock-tests in `registry.test.ts` Group F.
**Authority:** MR-014 §7.1 ASK-1 endorsement.

### Canonical 6-column default-pack

| Position | ColumnKey | Label | Rationale |
|---|---|---|---|
| 0 | `workflow_title` | Workflow | LOCKED-VISIBLE (iter-031 WDC §11) |
| 1 | `systems` | Systems | Tools/platform context |
| 2 | `opportunity_tag` | Opportunity | Automation-candidates signal |
| 3 | `health_score` | Health Score | LOCKED-VISIBLE (iter-031 WDC §11) |
| 4 | `last_run_at` | Last Run | Activity recency |
| 5 | `run_count` | Runs | Activity volume |

`workflow_title` and `health_score` are LOCKED columns — they render in fixed
positions (first and last-before-kebab) regardless of their position in
`getDefaultVisibleColumns()`. The remaining 4 columns render as the "dynamic"
middle cells between the two locked columns.

### Rationale (ASK-1)

"Ship initial default pack at 6 columns matching today's hard-coded rendering;
expand to 7+ columns post-Path-C-R+1 when more `available` accessors land;
preserves visual continuity with current dashboard while customization picker
rolls out." — MR-014 §7.1 ASK-1

### Expansion plan

When Path C R+1 lands, `pending-path-c-r1` columns (e.g., `cycle_time_mean_ms`,
`variant_count`, `completion_rate_pct`) flip to `availability: 'available'` with
non-null accessors. At that point the default-pack MAY expand to 7+ columns by
setting additional `defaultVisible: true` flags in registry.ts and updating the
Group F lock-tests to match the new canonical count and set.

### Semantic distinction: default-pack vs. presets

The default-pack (`defaultVisible: true`) is INITIAL STATE — the column
configuration a user sees before any customization action. It is NOT a preset
chip the user activates mid-session.

Preset chips (D+5, `presets.ts`) are USER-TRIGGERED switches to named
configurations. A "Reset to defaults" affordance (returning to the 6-column
default-pack) is not shipped with D+6 and can be added as a future ColumnPicker
drawer affordance without schema changes (it simply calls `setVisibleColumns(DEFAULT_VISIBLE_KEYS)`).

Coordinator option (b) chosen: default-pack logic remains in D+1
`getDefaultVisibleColumns()`; no "default_pack" preset chip added. Rationale:
keeps the preset rail at 10 chips; semantically cleaner (default ≠ preset);
"Reset" affordance is straightforward to add later without any registry or
persistence changes.
