# Snapshot-Table Architecture Decision (Path C R+1 + R+3)

**Status:** Decision (ADR). Architect-owned. Pre-build hard prerequisite.
**Owner:** `system-architect` (iter 055, MR-013-promoted backlog row #86 / DV2-R12)
**Scope:** `metric_fact` (Path C R+1) and `process_run_snapshot` (Path C R+3) only.
**Supersedes audit recommendation:** DV2-R12 audit Option C (`workflow_health_snapshot`) is **adopted in spirit and refined in shape** — see §3.
**Out of scope:** `metric_rollup_daily`, `score_fact`, `opportunity_fact` (covered by `ARCHITECTURE_METRICS_ENGINE.md` §11; their patterns inherit from this ADR).

---

## 1. Context

Path C R+1 introduces persistent step-level data plus a `metric_fact` warehouse table; R+3 introduces per-run materialization plus a `process_run_snapshot` table. Both must commit to one denormalization pattern BEFORE migrations ship — divergent ad-hoc choices across R+1 and R+3 would force a re-migration in Phase 2.

Constraints driving the decision:

- **Ledgerium immutability-first principle** (CLAUDE.md core): raw input is immutable; derived outputs append, never mutate-in-place.
- **Determinism + traceability** (CLAUDE.md): every output traceable to source events; same inputs → byte-identical outputs.
- **`ARCHITECTURE_METRICS_ENGINE.md` §6 four-tier materialization** already specifies on-ingest BullMQ writes for `metric_facts` plus on-demand fallback for novel filter combinations — that pattern is reused here.
- **Phase 1 single-tenant scale** (<10k runs/workspace, <100k steps): Postgres same-instance is sufficient; no separate OLAP warehouse.

---

## 2. Decisions (per table)

### 2.1 `metric_fact` (R+1)

**(a) Write-through-cache vs derived-on-read — DECISION: WRITE-THROUGH on ingest + on-demand fallback.**
On every `processSessionFull` ingest, BullMQ `metrics-materialize` writes one `metric_fact` row per (metric_key × entity × window × `filter_hash='_default'`). Novel `filter_hash` values requested by `/api/metrics/query` (R+4) at runtime are computed on-demand (≤2s budget) and the result is appended as a new `metric_fact` row. Read paths NEVER recompute — they always resolve through `metric_fact` plus Redis cache.

**(b) Snapshot key shape — DECISION:** primary key `id UUID`; uniqueness on `(metric_key, entity_type, entity_id, window_start, window_end, filter_hash, metric_version)`. Indexed for R+4 query patterns.

```sql
metric_fact (
  id                    UUID PRIMARY KEY,
  metric_key            TEXT NOT NULL,
  entity_type           TEXT NOT NULL,           -- 'workflow_run' | 'process_definition' | 'workspace'
  entity_id             TEXT NOT NULL,
  window_start          TIMESTAMPTZ NOT NULL,
  window_end            TIMESTAMPTZ NOT NULL,
  filter_hash           CHAR(64) NOT NULL,       -- sha256 of canonicalized filter object; '_default' sentinel for unfiltered
  value_numeric         DOUBLE PRECISION,
  value_text            TEXT,
  metric_version        TEXT NOT NULL,           -- semver, e.g. 'process_health_score@2.0.0'
  computed_at           TIMESTAMPTZ NOT NULL,
  lineage_ref           JSONB NOT NULL,
  UNIQUE (metric_key, entity_type, entity_id, window_start, window_end, filter_hash, metric_version)
)
```
Justification: R+4's `/api/metrics/query` is keyed exactly by this tuple; uniqueness prevents duplicate writes from concurrent BullMQ workers; `metric_version` in the key enables parallel-run during major version bumps (per `ARCHITECTURE_METRICS_ENGINE.md` §13).

**(c) Recompute trigger — DECISION: append-only, never mutate.** New row written when (i) new run ingested in entity scope, (ii) novel `filter_hash` requested at query time, (iii) `metric_version` bumps. Stale rows are NOT overwritten — read path selects `MAX(computed_at) WHERE metric_version = current`. Older rows remain for traceability and version-divergence analysis (immutability-first).

**(d) Backfill — DECISION: eager-batch on R+1 deploy.** Single `prisma db seed`-style script iterates existing `Workflow` rows (current count <10k per architecture §11) and synthesizes one `metric_fact` row per (default metric × default window × `_default` filter). Runs synchronously inside the deploy window; aborts cleanly on failure (additive table, no rollback risk). Lazy-on-read rejected because R+4's query budget assumes existing rows.

### 2.2 `process_run_snapshot` (R+3)

**(a) Write-through-cache vs derived-on-read — DECISION: WRITE-THROUGH only, no on-demand fallback.**
Per-run snapshots are deterministic over the run's terminal state — no filter combinatorics, no on-demand variation. Snapshot row written exactly once at ingest, immediately after `workflow_run` row commits. Different from `metric_fact` because there is no `filter_hash` dimension to drive on-demand misses.

**(b) Snapshot key shape — DECISION:** primary key `id UUID`; uniqueness on `(workflow_run_id, snapshot_version)`.

```sql
process_run_snapshot (
  id                    UUID PRIMARY KEY,
  workflow_run_id       UUID NOT NULL REFERENCES workflow_run(id) ON DELETE CASCADE,
  snapshot_version      TEXT NOT NULL,           -- semver of snapshot schema
  health_score          DOUBLE PRECISION,
  variation_score       DOUBLE PRECISION,
  duration_ms           BIGINT,
  step_count            INT,
  variant_hash          TEXT,
  opportunity_tag       TEXT,
  metrics_json          JSONB NOT NULL,          -- full WorkflowMetricsOutput shape, pinned at compute time
  computed_at           TIMESTAMPTZ NOT NULL,
  UNIQUE (workflow_run_id, snapshot_version)
)
```
Justification: keyed by run (not by `(workflow_id, captured_at)` as the audit's Option C proposed) because R+3 introduces `workflow_run` as the authoritative grain — one workflow may have many runs. The DV2-R12 audit predates the R+1 run-grain decision; this ADR refines accordingly.

**(c) Recompute trigger — DECISION: append-only on ingest + on `snapshot_version` bump.** Never mutated in place. A run's terminal state is itself immutable (Ledgerium principle), so a snapshot of that state is also immutable. Re-derivations under a new `snapshot_version` append a parallel row; queries select `MAX(computed_at) WHERE snapshot_version = current`.

**(d) Backfill — DECISION: eager-batch on R+3 deploy.** Single script iterates all existing `workflow_run` rows (created in R+1 backfill) and writes one snapshot per run at the current `snapshot_version`. Bounded data volume; synchronous; deterministic.

---

## 3. Reconciliation with audit's Option C

The audit's `workflow_health_snapshot(workflow_id, captured_at, health_score, variation_score)` is **adopted in pattern** (nightly-or-better materialization, immutability-aligned, append-only) but **refined in shape**:

- Grain: `workflow_run_id` not `workflow_id` (R+1 introduces run-grain).
- Versioning: explicit `snapshot_version` column for parallel-run during bumps.
- Field set: extended beyond `health_score + variation_score` to a `metrics_json` blob plus the four hot scalars used in dashboard sort/filter (matches WDC-P02 column-customization requirements).
- Cadence: written on-ingest, not nightly — Phase 1 ingest volume is low enough that on-ingest dominates, and on-ingest writes preserve <10s ingest-to-dashboard freshness from `MEASUREMENT_PLAN_METRICS_ENGINE.md`.

The audit's rejection of Options A (per-request) and B (separate route) stands.

---

## 4. Consequences

**Positive:** single denormalization pattern across R+1 + R+3; immutability-first preserved; deterministic read path (no formula execution at request time); R+4 query routes have stable contract; Phase 2 columnar-store migration target is clean (entire `metric_fact` + `process_run_snapshot` move atomically).

**Negative / accepted:** `metric_fact` row count grows linearly with novel filter combinations — mitigated by Redis 5-min TTL plus `filter_hash` index; retention policy deferred to Phase 2 per `ARCHITECTURE_METRICS_ENGINE.md` §11. Eager backfill at R+1 deploy adds one synchronous deploy-window step (acceptable at <10k runs).

**Rejected alternatives:** derived-on-read everywhere (violates 500ms cached / 2s uncached SLO); mutate-in-place updates (violates immutability + breaks version-divergence analysis); audit's Option A/B (already rejected at audit).

---

## 5. Surfaced blocker

**None.** The decision surfaces no previously-unknown blocker. DEP-08 (variant hash version pin) remains the highest-leverage open risk per PRD_REVISED §15 R-1, but it is not new and is correctly tracked there. R+1 implementation may proceed on this ADR plus resolution of the 5 pre-R+1 PRD-blocking questions enumerated in MR-013 §17.
