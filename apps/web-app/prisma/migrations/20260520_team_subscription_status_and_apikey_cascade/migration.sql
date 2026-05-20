-- Migration: 20260520_team_subscription_status_and_apikey_cascade
-- Iter 085 / TEAM-P03.7 — Pre-TEAM-P08 architectural fixes (P1 BLOCKERS)
-- TEAM_WORKSPACE_QUALITY_REVIEW_001 (backlog row #154)
--
-- Ships TWO additive/coordinated changes:
--   1. Team.subscription_status NOT NULL DEFAULT 'active'
--      — additive column; existing rows backfill to 'active' atomically.
--      — consumed by webhook handlers (customer.subscription.updated +
--        invoice.payment_failed team-first path) + future plan-change banner.
--      — 5-value closed union: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'.
--
--   2. api_keys.team_id FK ON DELETE behavior: SetNull → CASCADE
--      — SECURITY FIX: previously deleting a team would orphan API keys with
--        retained capability against a deleted workspace. The CASCADE flip
--        ensures workspace-scoped keys are revoked on workspace deletion.
--      — SQLite requires table rebuild for FK constraint change.
--      — Surfaced by system-architect §6 review of iter 082 TEAM-P02
--        ApiKey workspace-scoping.
--
-- All changes are safe to apply against production DB with existing rows.
-- Backward-compat: Team.subscription_status default='active' means all
-- pre-iter-085 Team rows are interpreted as 'active' subscribers (correct
-- semantics — only paid Team rows exist at this stage of the rollout).
--
-- @see docs/meta/TEAM_WORKSPACE_QUALITY_REVIEW_001.md
-- @see IMPROVEMENT_BACKLOG.md row #154 TEAM-P03.7

-- ─── 1. Team.subscription_status (additive) ──────────────────────────────────
--
-- Stripe-status mirror at the workspace grain. The webhook handler normalizes
-- Stripe's 7-value enum (active / trialing / past_due / canceled / unpaid /
-- incomplete / incomplete_expired) to our 5-value closed union by collapsing
-- incomplete + incomplete_expired → 'unpaid'.

ALTER TABLE "teams" ADD COLUMN "subscription_status" TEXT NOT NULL DEFAULT 'active';

-- ─── 2. api_keys.team_id FK behavior: SetNull → CASCADE ──────────────────────
--
-- SQLite does NOT support ALTER TABLE ... DROP/ADD CONSTRAINT directly.
-- Standard recipe per SQLite docs:
--   (a) PRAGMA foreign_keys=OFF (already off in migration context)
--   (b) CREATE TABLE api_keys_new with corrected FK
--   (c) INSERT INTO api_keys_new SELECT * FROM api_keys
--   (d) DROP TABLE api_keys
--   (e) ALTER TABLE api_keys_new RENAME TO api_keys
--   (f) Recreate any indexes that existed on api_keys
--
-- Columns + types must EXACTLY match the live table — copied verbatim from
-- the Prisma-generated schema state as of iter 082 + iter 084.

CREATE TABLE "api_keys_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Extension',
    "last_used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "team_id" TEXT,
    CONSTRAINT "api_keys_new_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "api_keys_new_team_id_fkey"
        FOREIGN KEY ("team_id") REFERENCES "teams"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "api_keys_new" (
    "id", "user_id", "key_hash", "prefix", "label",
    "last_used_at", "created_at", "team_id"
)
SELECT
    "id", "user_id", "key_hash", "prefix", "label",
    "last_used_at", "created_at", "team_id"
FROM "api_keys";

DROP TABLE "api_keys";
ALTER TABLE "api_keys_new" RENAME TO "api_keys";

-- Recreate indexes (key_hash unique + user_id + team_id).
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX "api_keys_team_id_idx" ON "api_keys"("team_id");

-- ─── Postgres-production note ────────────────────────────────────────────────
--
-- On Postgres production the equivalent (simpler, no table rebuild) is:
--
--   ALTER TABLE api_keys DROP CONSTRAINT api_keys_team_id_fkey;
--   ALTER TABLE api_keys ADD CONSTRAINT api_keys_team_id_fkey
--     FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
--
-- Prisma's `migrate deploy` against Postgres generates the Postgres form
-- automatically from `onDelete: Cascade` in schema.prisma. The SQLite form
-- above is only used by dev `db push`. Production migrations are deployed
-- via Prisma's Postgres provider in CI per existing runbook.
