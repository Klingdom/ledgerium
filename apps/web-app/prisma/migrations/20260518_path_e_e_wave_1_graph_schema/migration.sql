-- Migration: path_e_e_wave_1_graph_schema
-- Iter 076 / PATHE-P01 — Path E foundation (DECISION_AWARE_WORKFLOW_VISION_REVIEW_001)
--
-- Ships:
--   1. 7 new tables (ProcessGraph + ProcessNode + ProcessEdge + DecisionPoint +
--      Condition + Variant + ProcessEvidenceReview) — graph schema + CEO
--      directive Appendix C Reviewed-Evidence Retention Policy.
--   2. 3 additive nullable fields on existing `workflows` table:
--      `variant_id`, `variant_fingerprint`, `process_graph_version_at_ingest`.
--   3. 1 additive index on workflows.variant_id.
--
-- All changes are additive — zero existing rows are mutated, zero existing
-- columns are altered. Backward-compat: existing Workflow consumers continue
-- to work unchanged.
--
-- Architectural decisions (per system-architect §A):
--   - Postgres + JSONB + adjacency-list tables (NOT graph DB). SQLite at dev
--     stores JSON as TEXT; application layer handles JSON round-trips via
--     `apps/web-app/src/lib/process-graph/adapters/parse-process-graph-json.ts`.
--   - Append-only versioned root: ProcessGraph (`graph_version` int +
--     `graph_schema_version` semver). Rows are NEVER mutated; new revisions
--     INSERT with incremented graph_version.
--   - BIGINT ms timestamps on retention-policy table (ProcessEvidenceReview)
--     for deterministic arithmetic without DATETIME timezone semantics.
--
-- @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md
-- @see docs/meta/DECISION_AWARE_WORKFLOW_VISION_REVIEW_001.md Appendix C (CEO directive)
-- @see apps/web-app/src/lib/process-graph/

-- ─── 1. Extend workflows with Path E pointer fields (additive only) ──────────

ALTER TABLE "workflows" ADD COLUMN "variant_id" TEXT;
ALTER TABLE "workflows" ADD COLUMN "variant_fingerprint" TEXT;
ALTER TABLE "workflows" ADD COLUMN "process_graph_version_at_ingest" TEXT;

CREATE INDEX "workflows_variant_id_idx" ON "workflows"("variant_id");

-- ─── 2. ProcessGraph (append-only versioned root) ────────────────────────────

CREATE TABLE "process_graphs" (
    "id"                   TEXT NOT NULL PRIMARY KEY,
    "workflow_id"          TEXT NOT NULL,
    "graph_version"        INTEGER NOT NULL DEFAULT 1,
    "graph_schema_version" TEXT NOT NULL DEFAULT '2.0',
    "run_count"            INTEGER NOT NULL DEFAULT 0,
    "computed_at_ms"       BIGINT NOT NULL,
    "is_inferred"          BOOLEAN NOT NULL DEFAULT false,
    "confidence_score"     REAL NOT NULL DEFAULT 0,
    "created_at"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           DATETIME NOT NULL,
    CONSTRAINT "process_graphs_workflow_id_fkey"
        FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "process_graphs_workflow_id_idx" ON "process_graphs"("workflow_id");
CREATE UNIQUE INDEX "process_graphs_workflow_version_unique"
    ON "process_graphs"("workflow_id", "graph_version");

-- ─── 3. ProcessNode ──────────────────────────────────────────────────────────

CREATE TABLE "process_nodes" (
    "id"                 TEXT NOT NULL PRIMARY KEY,
    "process_graph_id"   TEXT NOT NULL,
    "node_type"          TEXT NOT NULL,
    "raw_label"          TEXT NOT NULL,
    "normalized_label"   TEXT,
    "application_label"  TEXT,
    "route_template"     TEXT,
    "confidence_score"   REAL NOT NULL,
    "is_inferred"        BOOLEAN NOT NULL,
    "observation_count"  INTEGER NOT NULL,
    "raw_evidence_json"  TEXT NOT NULL DEFAULT '[]',
    "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "process_nodes_process_graph_id_fkey"
        FOREIGN KEY ("process_graph_id") REFERENCES "process_graphs" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "process_nodes_process_graph_id_idx"
    ON "process_nodes"("process_graph_id");

-- ─── 4. ProcessEdge ──────────────────────────────────────────────────────────

CREATE TABLE "process_edges" (
    "id"                 TEXT NOT NULL PRIMARY KEY,
    "process_graph_id"   TEXT NOT NULL,
    "from_node_id"       TEXT NOT NULL,
    "to_node_id"         TEXT NOT NULL,
    "edge_type"          TEXT NOT NULL,
    "run_frequency"      INTEGER NOT NULL,
    "run_frequency_pct"  REAL NOT NULL,
    "confidence_score"   REAL NOT NULL,
    "is_inferred"        BOOLEAN NOT NULL,
    "raw_evidence_json"  TEXT NOT NULL DEFAULT '[]',
    "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "process_edges_process_graph_id_fkey"
        FOREIGN KEY ("process_graph_id") REFERENCES "process_graphs" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "process_edges_process_graph_id_idx"
    ON "process_edges"("process_graph_id");
CREATE INDEX "process_edges_from_node_id_idx"
    ON "process_edges"("from_node_id");
CREATE INDEX "process_edges_to_node_id_idx"
    ON "process_edges"("to_node_id");

-- ─── 5. DecisionPoint ────────────────────────────────────────────────────────

CREATE TABLE "decision_points" (
    "id"                 TEXT NOT NULL PRIMARY KEY,
    "process_graph_id"   TEXT NOT NULL,
    "node_id"            TEXT NOT NULL,
    "decision_type"      TEXT NOT NULL,
    "confidence_score"   REAL NOT NULL,
    "is_inferred"        BOOLEAN NOT NULL,
    "raw_evidence_json"  TEXT NOT NULL DEFAULT '[]',
    "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "decision_points_process_graph_id_fkey"
        FOREIGN KEY ("process_graph_id") REFERENCES "process_graphs" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "decision_points_process_graph_id_idx"
    ON "decision_points"("process_graph_id");
CREATE INDEX "decision_points_node_id_idx"
    ON "decision_points"("node_id");

-- ─── 6. Condition ────────────────────────────────────────────────────────────

CREATE TABLE "conditions" (
    "id"                 TEXT NOT NULL PRIMARY KEY,
    "decision_point_id"  TEXT NOT NULL,
    "description"        TEXT NOT NULL,
    "condition_type"     TEXT NOT NULL,
    "confidence_score"   REAL NOT NULL,
    "is_inferred"        BOOLEAN NOT NULL,
    "raw_evidence_json"  TEXT NOT NULL DEFAULT '[]',
    "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conditions_decision_point_id_fkey"
        FOREIGN KEY ("decision_point_id") REFERENCES "decision_points" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "conditions_decision_point_id_idx"
    ON "conditions"("decision_point_id");

-- ─── 7. Variant ──────────────────────────────────────────────────────────────

CREATE TABLE "variants" (
    "id"                  TEXT NOT NULL PRIMARY KEY,
    "process_graph_id"    TEXT NOT NULL,
    "variant_hash"        TEXT NOT NULL,
    "variant_label"       TEXT NOT NULL,
    "run_count"           INTEGER NOT NULL,
    "run_frequency_pct"   REAL NOT NULL,
    "mean_duration_ms"    INTEGER,
    "step_count"          INTEGER NOT NULL,
    "node_sequence_json"  TEXT NOT NULL DEFAULT '[]',
    "raw_evidence_json"   TEXT NOT NULL DEFAULT '[]',
    "created_at"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "variants_process_graph_id_fkey"
        FOREIGN KEY ("process_graph_id") REFERENCES "process_graphs" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "variants_process_graph_id_idx" ON "variants"("process_graph_id");
CREATE INDEX "variants_variant_hash_idx"     ON "variants"("variant_hash");
CREATE UNIQUE INDEX "variants_graph_hash_unique"
    ON "variants"("process_graph_id", "variant_hash");

-- ─── 8. ProcessEvidenceReview (CEO directive Appendix C) ─────────────────────
--
-- Reviewed-Evidence Retention Policy storage.
-- BIGINT ms timestamps for deterministic arithmetic without DATETIME tz semantics.

CREATE TABLE "process_evidence_reviews" (
    "id"                   TEXT NOT NULL PRIMARY KEY,
    "evidence_pointer_id"  TEXT NOT NULL,
    "workflow_run_id"      TEXT NOT NULL,
    "step_index"           INTEGER NOT NULL,
    "reviewed_by"          TEXT NOT NULL,
    "reviewed_at_ms"       BIGINT NOT NULL,
    "review_action"        TEXT NOT NULL,
    "retention_until_ms"   BIGINT NOT NULL,
    "plan_tier_at_review"  TEXT NOT NULL,
    "created_at_ms"        BIGINT NOT NULL,
    CONSTRAINT "process_evidence_reviews_reviewed_by_fkey"
        FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "process_evidence_reviews_evidence_pointer_id_idx"
    ON "process_evidence_reviews"("evidence_pointer_id");
CREATE INDEX "process_evidence_reviews_retention_until_ms_idx"
    ON "process_evidence_reviews"("retention_until_ms");
CREATE INDEX "process_evidence_reviews_workflow_run_step_idx"
    ON "process_evidence_reviews"("workflow_run_id", "step_index");
