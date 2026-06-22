-- Migration: add_workflow_baseline
-- Tier 3 — saved baseline snapshots for before/after ROI comparison.
--
-- Adds the `workflow_baselines` table: a frozen "before" snapshot of a workflow's
-- comparison metrics at a point in time. Lets a user mark a baseline, improve the
-- process (more runs accumulate), then compare the saved baseline against the live
-- workflow. Append-only by convention. Additive only — no existing tables or
-- columns are modified. onDelete: Cascade with both workflows and users.

CREATE TABLE "workflow_baselines" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "workflow_id"    TEXT NOT NULL,
    "user_id"        TEXT NOT NULL,
    "label"          TEXT,
    "avg_time_ms"    INTEGER,
    "runs"           INTEGER,
    "step_count"     INTEGER,
    "system_count"   INTEGER NOT NULL DEFAULT 0,
    "health_overall" REAL NOT NULL DEFAULT 0,
    "health_gated"   BOOLEAN NOT NULL DEFAULT false,
    "captured_at"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_baselines_workflow_id_fkey"
        FOREIGN KEY ("workflow_id") REFERENCES "workflows" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workflow_baselines_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "workflow_baselines_user_id_idx" ON "workflow_baselines"("user_id");
CREATE INDEX "workflow_baselines_workflow_id_idx" ON "workflow_baselines"("workflow_id");
