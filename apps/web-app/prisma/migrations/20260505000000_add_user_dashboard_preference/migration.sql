-- Migration: add_user_dashboard_preference
-- Path D D+3 (iter-059) — WDC-P04 versioned column-config persistence schema
--
-- Adds the `user_dashboard_preferences` table for server-of-truth storage of
-- per-user workflow-dashboard column visibility, ordering, active filters, and
-- saved views.
--
-- Design decisions:
--   - 1:1 with users (userId UNIQUE) — one preference document per user;
--     savedViews live inside the JSON payload (not as separate rows) for Phase 1.
--   - schemaVersion mirrors payload.schemaVersion for DB-side migration queries
--     without JSON parsing (e.g. "WHERE schema_version < 2").
--   - payload is TEXT (SQLite; Prisma maps String to TEXT on SQLite).
--     Application layer handles JSON.stringify / JSON.parse via persistence.ts adapters.
--   - onDelete: Cascade — preferences are deleted when the user is deleted.
--   - Additive only: no existing tables or columns are modified.
--
-- @see docs/features/dashboard-v3-metrics-engine/PERSISTENCE_SCHEMA.md
-- @see apps/web-app/src/lib/dashboard-columns/persistence.ts

-- CreateTable
CREATE TABLE "user_dashboard_preferences" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "user_id"        TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "payload"        TEXT NOT NULL,
    "created_at"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     DATETIME NOT NULL,
    CONSTRAINT "user_dashboard_preferences_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex: enforce 1:1 user relationship
CREATE UNIQUE INDEX "user_dashboard_preferences_user_id_key"
    ON "user_dashboard_preferences"("user_id");
