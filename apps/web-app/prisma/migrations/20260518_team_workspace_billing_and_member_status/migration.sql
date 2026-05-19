-- Migration: team_workspace_billing_and_member_status
-- Iter 081 / TEAM-P01 — Workspace schema foundation (TEAM_WORKSPACE_REVIEW_001)
--
-- Ships:
--   1. 2 additive nullable columns on `teams`:
--      `stripe_customer_id`, `stripe_subscription_id`
--   2. 3 additive columns on `team_members`:
--      `status` (NOT NULL DEFAULT 'active'), `deactivated_at`, `reactivation_deadline`
--   3. 1 additive nullable column on `team_invites`:
--      `revoked_at`
--   4. 1 compound unique index on `team_invites(team_id, email)`
--
-- All changes are additive — zero existing rows are mutated, zero existing
-- columns are altered, zero foreign key constraints are modified.
-- Backward-compat: all existing consumers of these tables continue to work
-- unchanged; new columns are either nullable or have a DEFAULT clause.
--
-- Production-safety notes:
--   - ALTER TABLE ... ADD COLUMN with DEFAULT is safe for SQLite and Postgres
--     without downtime (no full-table rewrite in modern SQLite/Postgres).
--   - `status NOT NULL DEFAULT 'active'` means all existing team_members rows
--     acquire status = 'active' atomically at migration time — no NULL gap.
--   - The compound unique index on team_invites(team_id, email) must be
--     applied AFTER confirming no duplicate (team_id, email) pairs exist in the
--     invites table. If duplicates exist, the CREATE UNIQUE INDEX will fail
--     safely (no partial application). Pre-migration check:
--       SELECT team_id, email, COUNT(*) AS cnt
--       FROM team_invites
--       GROUP BY team_id, email
--       HAVING cnt > 1;
--
-- @see docs/meta/TEAM_WORKSPACE_REVIEW_001.md
-- @see IMPROVEMENT_BACKLOG.md row #139 TEAM-P01

-- ─── 1. Team billing columns ─────────────────────────────────────────────────
--
-- Workspace-to-Stripe relationship. Separate from User.stripe_customer_id
-- and User.stripe_subscription_id which are preserved for solo subscribers.
-- Consumed by TEAM-P03 webhook handler.

ALTER TABLE "teams" ADD COLUMN "stripe_customer_id" TEXT;
ALTER TABLE "teams" ADD COLUMN "stripe_subscription_id" TEXT;

-- ─── 2. TeamMember soft-deactivate columns ───────────────────────────────────
--
-- Soft-deactivate state per D-05 Option A from TEAM_WORKSPACE_REVIEW_001.
-- `status` values: 'active' | 'deactivated' | 'pending'
-- Consumed by TEAM-P02 effective-plan derivation + TEAM-P03 downgrade cascade.
--
-- `deactivated_at` — timestamp when soft-deactivate fired; consumed by
--   TEAM-P03 webhook + TEAM-P07 plan-change banner.
-- `reactivation_deadline` — 30-day grace window per D-05; computed as
--   deactivated_at + 30 days; consumed by TEAM-P07 plan-change banner.

ALTER TABLE "team_members" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "team_members" ADD COLUMN "deactivated_at" DATETIME;
ALTER TABLE "team_members" ADD COLUMN "reactivation_deadline" DATETIME;

-- ─── 3. TeamInvite revocation column ─────────────────────────────────────────
--
-- Invite revocation timestamp. NULL means the invite is not revoked.
-- Consumed by TEAM-P02 invite-accept endpoint + TEAM-P07 acceptance landing.

ALTER TABLE "team_invites" ADD COLUMN "revoked_at" DATETIME;

-- ─── 4. TeamInvite compound unique index ─────────────────────────────────────
--
-- Enforces at-most-one pending invite per (team, email) pair.
-- Application layer enforces pending-only filter (SQLite lacks partial indexes;
-- Postgres production will add a partial index in a future optimization if
-- needed: CREATE UNIQUE INDEX ON team_invites(team_id, email)
-- WHERE accepted_at IS NULL AND revoked_at IS NULL).
--
-- NOTE: If existing data contains duplicate (team_id, email) pairs, this
-- statement will fail. Run the pre-migration check above before applying.

CREATE UNIQUE INDEX "team_invites_team_id_email_key"
    ON "team_invites"("team_id", "email");

-- ─── Migration safety: existing-user backfill assessment ─────────────────────
--
-- Risk (product-manager §K, TEAM_WORKSPACE_REVIEW_001):
--   Existing users with `plan IN ('team', 'growth')` who upgraded before the
--   workspace feature launched may not have a corresponding Team row. Such
--   users hold a personal subscription but no workspace billing relationship.
--
-- COORDINATOR INSTRUCTION: Do NOT include a backfill INSERT in this migration.
-- This migration is additive-only. Backfill is a separate runbook step.
--
-- Run BEFORE deploying this migration to production:
--
--   SELECT id, email, plan
--   FROM users
--   WHERE plan IN ('team', 'growth');
--
-- If zero rows returned: no backfill needed — proceed with migration deploy.
--
-- If non-zero rows exist: escalate to coordinator for a separate manual
-- backfill iteration (NOT TEAM-P01). The coordinator will create a runbook
-- entry covering: (a) create a Team row for each affected user, (b) insert
-- a TeamMember row linking the user as owner, (c) set the Team.plan to match
-- the user's existing plan, (d) update the Team.stripe_customer_id and
-- Team.stripe_subscription_id from the user's existing Stripe data.
--
-- Expected result for CEO Option B (waitlist gate active since iter 075):
--   Zero rows — no real team-plan subscribers exist yet in production.
--   This migration is safe to deploy without a backfill runbook.
