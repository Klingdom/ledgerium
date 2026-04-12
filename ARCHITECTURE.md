# Ledgerium AI -- Architecture

## 1. System Overview

Ledgerium AI is a deterministic, evidence-linked process intelligence platform.
It captures real browser workflow activity via a Chrome extension, transforms
raw events through a layered pipeline, and produces structured process maps,
SOPs, and portfolio-level analytics. Every output traces back to source events.

**Core data flow:**

```
Browser interaction (user actions in Chrome)
  -> Capture layer        (content scripts in extension)
  -> Normalization layer  (raw events -> canonical events)
  -> Policy layer         (redaction, blocking, sensitivity)
  -> Segmentation layer   (canonical events -> derived steps)
  -> Process engine       (steps -> process runs, maps, SOPs)
  -> Intelligence engine  (multi-run analytics, variants, drift)
  -> Web platform         (storage, collaboration, portfolio views)
```

The system operates in two modes:
- **Extension-local:** Capture, normalize, segment, and export entirely
  within the browser extension. No backend required.
- **Platform mode:** Extension uploads session bundles to the web app for
  persistent storage, multi-run analysis, team collaboration, and
  portfolio intelligence.

---

## 2. Architecture Principles

These are enforced across all components:

- **Immutability first** -- Raw events are append-only and never mutated.
  Canonical events and policy logs are append-only. Bundle artifacts are
  write-once with SHA-256 integrity hashes.
- **Deterministic pipelines** -- Same input always produces identical output.
  The batch segmenter is a pure function. No random values, no Date.now(),
  no external state in processing paths.
- **Explicit contracts** -- All data boundaries use Zod schemas. Message
  types are defined as typed constants. Schema versions are literal types.
- **Traceability** -- Every derived step carries `evidence_refs` (source
  event IDs), `boundary_reason`, `grouping_reason`, and `confidence` score.
  Every redaction produces a transparency event.
- **Fail loudly** -- Export fails visibly if session is malformed. Invalid
  state transitions throw. Unknown raw event types produce warnings.

---

## 3. Component Map

### Applications (`apps/`)

| App | Tech | Role |
|-----|------|------|
| `extension-app` | Chrome MV3, React, Vite, TypeScript | Primary capture tool. Side panel UI with recorder state machine, live step feed, review/export. Runs normalization, segmentation, and process engine locally. Consolidated from extension-v2 (2026-04-12). |
| `web-app` | Next.js 14, React, Prisma, NextAuth, Tailwind | Platform UI. Workflow storage, process definitions, portfolio analytics, team collaboration, billing (Stripe), sharing. |

### Packages (`packages/`)

| Package | Role | Key Exports |
|---------|------|-------------|
| `shared-types` | Common TypeScript types and contracts | `RecorderState`, `SessionMeta`, `VALID_TRANSITIONS`, `MSG` constants, `LiveStep`, `SessionBundle`, `BundleManifest`, `ExtensionSettings` |
| `schema-events` | Canonical event schema with Zod validators | `RawCaptureEventSchema`, `CanonicalEventSchema`, `SCHEMA_VERSION`, type guards (`isNavigationEvent`, etc.) |
| `policy-engine` | Privacy, redaction, and sensitivity rules | `applyPolicy`, `classifySensitivity`, `PolicyConfig`, `DEFAULT_POLICY`, `SENSITIVE_SELECTOR_PATTERNS` |
| `normalization-engine` | Raw-to-canonical event transformation | `normalizeEvent`, `normalizeSession`, `RAW_TO_CANONICAL_TYPE`, URL normalization utilities |
| `segmentation-engine` | Deterministic step derivation from canonical events | `segmentEvents` (batch), `StreamingSegmenter` (live), `DerivedStep`, boundary/grouping rules, confidence scoring |
| `process-engine` | Process run construction, map/SOP generation, workflow analysis | `processSession`, step analysis, content enrichment, template system (BPMN, swimlane, SIPOC maps; operator, enterprise, decision SOPs), workflow insights, workflow interpretation |
| `intelligence-engine` | Multi-run portfolio intelligence | Metrics, timestudy, variance, variant detection, bottleneck detection, drift detection, SOP alignment, standardization scoring, recommendation engine, process grouping (families, fingerprinting, component detection, scoring) |

### Dependency Graph

```
shared-types        (no internal deps)
schema-events       (no internal deps, uses Zod)
policy-engine       (no internal deps)
normalization-engine -> schema-events, policy-engine
segmentation-engine  (standalone, types inlined)
process-engine       (standalone)
intelligence-engine  (standalone)

extension-app -> shared-types, schema-events, policy-engine,
                 normalization-engine, segmentation-engine, process-engine
web-app       -> process-engine, intelligence-engine
```

---

## 4. Data Flow

### 4.1 Capture (Extension Content Scripts)

Content scripts observe DOM events (clicks, inputs, navigation, form
submissions, focus/blur, tab activation). Each interaction produces a
`RawCaptureEvent` with a UUID, session-relative `t_ms`, wall-clock
`t_wall`, and target metadata. Sensitive inputs (password, hidden) are
blocked at capture -- labels and selectors are omitted, not just redacted.

Raw events flow via `RAW_EVENT_CAPTURED` message to the background
service worker.

### 4.2 Normalization (Background Service Worker)

The normalizer:
1. Applies pre-normalization deduplication (rapid clicks within 300ms,
   superseded focus events, net-zero focus/blur pairs)
2. Maps raw event types to canonical types via a fixed mapping table
3. Applies policy engine rules (domain blocking, sensitivity detection)
4. Produces `CanonicalEvent` objects with normalization provenance metadata
5. Emits `system.redaction_applied` or `system.capture_blocked`
   transparency events when policy rules fire
6. Writes policy log entries for every redaction/block

### 4.3 Segmentation (Background Service Worker)

Two modes, both producing identical output for the same input:

**Streaming mode** (during recording): `StreamingSegmenter` processes
events one at a time, maintaining a provisional step that updates in
real-time and emitting finalized steps when boundary triggers fire.

**Batch mode** (on stop): `segmentEvents` pure function processes the
complete event array. Used for bundle building.

Step boundary triggers: form submission, navigation/domain change, idle
gap (45s), user annotation, session stop.

Grouping classification (strict evaluation order): annotation,
fill-and-submit, click-then-navigate, repeated-click-dedup, single-action.

Each step gets a deterministic ID (`{sessionId}-step-{ordinal}`),
confidence score, boundary reason, grouping reason, and source event IDs.

### 4.4 Process Engine (Extension or Web App)

`processSession` transforms segmentation output into:
- **ProcessRun**: structured run with metadata
- **ProcessMap**: nodes (step signatures) and edges (transitions)
- **SOP**: numbered instructions derived from the dominant path

Supports multiple template types: BPMN, swimlane, SIPOC process maps;
operator, enterprise, decision SOPs. Content enrichment infers business
objectives, friction points, decision points, and quality indicators.

### 4.5 Bundle Export (Extension)

On session stop, the extension builds a five-file session bundle:
- `session.json` -- session metadata, versions, pause intervals
- `normalized_events.json` -- complete canonical event log
- `derived_steps.json` -- finalized steps with evidence refs
- `policy_log.json` -- every redaction/block event
- `manifest.json` -- SHA-256 file hashes, export timestamp, versions

### 4.6 Upload and Platform Processing (Web App)

Extension uploads bundles to `POST /api/upload`. The web app:
1. Validates and stores the raw JSON
2. Runs process-engine to produce ProcessOutput artifacts
3. Stores artifacts as WorkflowArtifact records
4. Groups workflows into ProcessDefinitions via path signature matching
5. Runs intelligence-engine for portfolio analytics when definitions
   have multiple runs

### 4.7 Intelligence Layer (Web App)

For process definitions with multiple workflow runs:
- Metrics: volume, timing, completion rate
- Timestudy: per-step duration statistics
- Variance: duration and step count variance, sequence stability
- Variants: path variant detection with frequency and similarity
- Bottlenecks: high-duration and high-variance steps
- Drift: structural, timing, and exception rate drift over time
- Process grouping: families, exact groups, fingerprinting, component
  reuse scoring, automation opportunity scoring

---

## 5. Tech Stack (Confirmed from Code)

| Layer | Technology |
|-------|------------|
| Extension runtime | Chrome MV3 (Manifest V3) |
| Extension build | Vite + @crxjs/vite-plugin |
| Extension UI | React 18 + TypeScript + Tailwind CSS |
| Web app framework | Next.js 14 (App Router) |
| Web app UI | React 18 + Tailwind CSS + Lucide icons + React Flow (@xyflow/react) |
| Auth | NextAuth v5 (credentials provider, bcryptjs) |
| Database | SQLite via Prisma ORM |
| Validation | Zod |
| Billing | Stripe |
| Analytics | PostHog (client-side) + internal AnalyticsEvent table |
| Container | Docker (node:20-alpine, multi-stage build) |
| Orchestration | Docker Compose |
| Monorepo | pnpm workspaces |
| Testing | Vitest |
| Language | TypeScript (strict mode) |

**Note:** The project plan references PostgreSQL, Redis/BullMQ, and S3
as future infrastructure. The current implementation uses SQLite for
simplicity. No queue system or object storage is implemented yet.

---

## 6. Data Model

### 6.1 Event Schemas (packages/schema-events)

**RawCaptureEvent** -- Low-level browser event captured by content scripts.
Key fields: `raw_event_id` (UUID), `session_id`, `t_ms` (monotonic),
`t_wall` (ISO 8601), `event_type` (enum of 15 types), target metadata,
`is_sensitive_target`, `schema_version` (literal `'1.0.0'`).

**CanonicalEvent** -- Normalized, versioned event. Input to all downstream
engines. Key fields: `event_id` (UUID, fresh), `schema_version`, `session_id`,
`t_ms`, `t_wall`, `event_type` (dot-notation taxonomy, 30+ types),
`actor_type` (human/system/recorder), `page_context`, `target_summary`,
`normalization_meta` (source event ID, rule version, redaction state).

### 6.2 Segmentation Types (packages/segmentation-engine)

**DerivedStep** -- Atomic unit of work. Fields: `step_id`, `session_id`,
`ordinal`, `title`, `status` (provisional/finalized), `boundary_reason`,
`grouping_reason`, `confidence` (0-1), `source_event_ids`, timing fields,
`page_context`.

### 6.3 Session Types (packages/shared-types)

**SessionMeta** -- Recording session metadata: `sessionId`, `activityName`,
timing, `state` (RecorderState enum), `pauseIntervals`, version strings.

**SessionBundle** -- Five-file export: `sessionJson`, `normalizedEvents`,
`derivedSteps`, `policyLog`, `manifest`.

**BundleManifest** -- Integrity record: session ID, export timestamp,
version strings, SHA-256 file hashes.

### 6.4 Platform Database (apps/web-app/prisma/schema.prisma)

Database: SQLite. All tables use UUID primary keys and timestamps.

| Table | Purpose |
|-------|---------|
| `users` | User accounts with plan, subscription status, Stripe IDs |
| `api_keys` | SHA-256 hashed API keys for extension auth |
| `uploads` | Raw JSON file records with validation status |
| `workflows` | Individual workflow runs with metadata, status, share tokens |
| `workflow_artifacts` | Stored outputs (process maps, SOPs, source bundles) |
| `tags` / `workflow_tags` | User-defined tagging system |
| `process_definitions` | Exact process groups -- clustered workflow runs by path signature |
| `process_families` | Broad categories connecting related process groups |
| `process_variant_records` | Distinct execution paths within a process group |
| `canonical_components` | Reusable step patterns detected across workflows |
| `group_relationships` | Polymorphic edges between families, groups, variants, workflows |
| `process_insights` | Generated insights (bottlenecks, loops, drift, anomalies) |
| `analytics_events` | Product analytics tracking |
| `teams` / `team_members` / `team_invites` | Team collaboration |
| `workflow_shares` | Per-workflow sharing (user or team, viewer or editor) |

---

## 7. Infrastructure

### Current (MVP)

- **Runtime:** Single Docker container (node:20-alpine) running Next.js
- **Database:** SQLite file stored in a Docker volume (`ledgerium-data`)
- **File storage:** Local filesystem (`/app/data/uploads/`)
- **Auth:** NextAuth v5 with credentials provider (email + bcrypt password)
- **Deployment:** Docker Compose with health check endpoint (`/api/health`)
- **Extension:** Separate build artifact, not containerized

### Planned (from project plan, not yet implemented)

- PostgreSQL replacing SQLite
- Redis + BullMQ for async job processing
- S3-compatible object storage for immutable artifacts
- OAuth2 (Google) as additional auth provider
- Row-level security at database layer

---

## 8. Security Model

### Authentication
- Web app: NextAuth v5 with credentials (bcrypt-hashed passwords)
- Extension-to-platform: API key auth (SHA-256 hashed, prefix stored for display)
- Session tokens managed by NextAuth

### Privacy (Policy Engine)
- **Hardcoded defaults** (cannot be overridden in current phase):
  `captureTextInputValues: false`, `captureScreenshots: false`,
  `captureDomSnapshots: false`
- **Domain controls:** Configurable blocked and allowed domain lists
- **Sensitive target detection:** Password fields, payment fields,
  government IDs, API keys -- detected by input type, selector patterns,
  and label text
- **Capture-layer blocking:** Sensitive inputs never have labels or
  selectors in raw events (blocked before normalization)
- **Transparency requirement:** Every redaction/block produces both a
  canonical system event and a policy log entry. Redaction is never silent.

### Sensitivity Classes
`password`, `payment`, `pii`, `health`, `government_id`, `hr`, `legal`,
`api_key`, `custom`

### Data Sensitivity Zones
- Raw events: in-memory only during extension session (not persisted to
  chrome.storage)
- Session metadata: persisted to chrome.storage.local
- Uploaded bundles: stored as files on server filesystem
- All artifact content: stored as JSON text in SQLite

### Access Control
- User-scoped data: all queries filter by `userId`
- Team roles: owner, admin, member, viewer
- Workflow sharing: per-workflow with user or team scope, viewer or editor
  permission
- Admin bootstrap endpoint exists (`/api/admin/bootstrap`)

---

## 9. API Surface (Web App)

All endpoints are Next.js App Router API routes under `/api/`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/auth/signup` | POST | User registration |
| `/api/upload` | POST | Session bundle upload from extension |
| `/api/sync` | POST | Sync endpoint (extension) |
| `/api/workflows` | GET/POST | List/create workflows |
| `/api/workflows/[id]` | GET/PATCH/DELETE | Workflow CRUD |
| `/api/workflows/[id]/analyze` | POST | Trigger process analysis |
| `/api/workflows/[id]/share` | POST | Share a workflow |
| `/api/workflows/[id]/export-markdown` | GET | Export as Markdown |
| `/api/process-definitions` | GET | List process definitions |
| `/api/insights/[id]` | GET | Retrieve process insights |
| `/api/keys` | GET/POST/DELETE | API key management |
| `/api/teams` | GET/POST | Team CRUD |
| `/api/teams/[id]/members` | GET/POST/DELETE | Team member management |
| `/api/teams/[id]/invite` | POST | Send team invite |
| `/api/teams/join` | POST | Accept team invite |
| `/api/tags` | GET/POST | Tag management |
| `/api/tags/[id]` | PATCH/DELETE | Tag CRUD |
| `/api/share/[token]` | GET | Public share access |
| `/api/billing/checkout` | POST | Stripe checkout |
| `/api/billing/portal` | POST | Stripe customer portal |
| `/api/billing/webhook` | POST | Stripe webhook handler |
| `/api/account` | GET/PATCH | User account management |
| `/api/analytics` | GET | Analytics dashboard data |
| `/api/analytics/events` | POST | Track analytics events |
| `/api/health` | GET | Container health check |
| `/api/sample-workflow` | POST | Generate sample workflow |
| `/api/admin/bootstrap` | POST | Admin bootstrap |
| `/api/streaks` | GET | User engagement streaks |

---

## 10. Known Constraints and Limitations

1. **SQLite in production** -- Current deployment uses SQLite. This limits
   concurrent write throughput and prevents row-level security at the
   database layer. Migration to PostgreSQL is planned.

2. **No async job queue** -- All processing (normalization, segmentation,
   process engine, intelligence) runs synchronously in request handlers.
   Long-running analysis on large bundles may time out. BullMQ + Redis
   is planned but not implemented.

3. **No object storage** -- Uploaded files and artifacts are stored on
   local filesystem. Not suitable for horizontal scaling. S3 migration
   is planned.

4. **Extension session persistence** -- Raw events, canonical events,
   and policy log entries are held in memory only. If the service worker
   is terminated mid-session, event data is lost. Session metadata
   (state, timestamps) is persisted to chrome.storage.local.

5. **Duplicate logic** -- Some processing logic exists in both the
   extension background scripts and the shared packages. Known issue
   tracked for consolidation.

6. **No E2E tests** -- Playwright E2E tests are specified but not yet
   implemented.

7. **Streaming/batch sync** -- The streaming segmenter and batch
   segmenter are separate implementations that must stay in sync.
   This is a tested invariant but relies on discipline rather than
   shared code.

8. **Single-tenant database** -- User isolation is enforced at the
   application layer (`userId` filters), not at the database layer.

9. **No AI layer** -- The AI-assist layer (Claude API integration) is
   planned for Phase 5 but not implemented. The system is fully
   functional without it.

10. **Renderer outputs** -- Process map and SOP renderers exist in
    process-engine with multiple template types. The deterministic SVG
    renderer mentioned in the project plan uses React Flow for
    interactive rendering rather than static SVG generation.
