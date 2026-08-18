-- Migration: 20260818000000_add_billing_interval
-- REVENUE_PLAN_20K MRR-correctness fix (docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §1.2c)
--
-- Adds a nullable billing_interval column to both `users` and `teams` so the
-- admin-operations MRR calculation can distinguish monthly from annual
-- subscribers and normalize annual subscribers to their monthly-equivalent
-- contribution instead of the full monthly sticker price (~20% overstatement
-- per annual subscriber before this fix).
--
-- Fully additive:
--   - Both columns are nullable TEXT with no default — existing rows backfill
--     implicitly to NULL, which admin-operations/queries.ts treats as
--     "not annual" (falls back to the monthly price). This is the correct
--     interpretation for pre-existing rows: nothing before this migration
--     ever wrote a billing interval, so NULL correctly means "unknown,
--     assume monthly" rather than silently fabricating a value.
--   - No table rebuild required (SQLite supports ADD COLUMN for nullable
--     columns with no CHECK/FK/UNIQUE constraint directly).
--   - Values populated going forward are written by the Stripe webhook
--     handler (apps/web-app/src/app/api/billing/webhook/route.ts) from
--     Stripe's own `price.recurring.interval` field — see
--     apps/web-app/src/lib/stripe.ts intervalFromStripeSubscription().
--
-- Safe to apply against the live production DB (SQLite, schema.prisma:6)
-- with existing rows.

ALTER TABLE "users" ADD COLUMN "billing_interval" TEXT;
ALTER TABLE "teams" ADD COLUMN "billing_interval" TEXT;
