-- Migration: 20260818010000_add_visitor_attribution
-- REVENUE_PLAN_20K attribution-join fix (docs/meta/REVENUE_PLAN_20K/analytics_analysis.md §2)
--
-- Closes two independent breaks that make "anonymous visitor → signup →
-- paying customer" unreconstructable today:
--
--   1. `visitorId` is stamped on every client analytics event but only ever
--      lands inside `analytics_events.properties`, an unindexed TEXT blob —
--      promoted here to a first-class, indexed column.
--   2. `trackServer()` (server-side analytics, used by every billing webhook
--      event) had no visitorId parameter at all — the money-side events
--      could never carry a visitor-level join key, even in principle.
--      `users.first_touch_visitor_id` is the pivot that closes this: set
--      once at signup (the moment an anonymous visitor becomes an
--      identified user), it lets server-side billing code — which has no
--      browser/localStorage access — resolve "which visitor became this
--      paying customer" without inventing an identifier.
--
-- Fully additive:
--   - Both new columns are nullable TEXT with no default — every
--     pre-existing row backfills implicitly to NULL, which the attribution
--     join correctly reads as "unknown, not fabricated" (no code before this
--     migration ever wrote either value).
--   - No table rebuild required (SQLite ADD COLUMN, matching the pattern of
--     20260818000000_add_billing_interval).
--   - `visitor_id` / `first_touch_visitor_id` are anonymous, randomly
--     generated UUIDs (see analytics.ts getOrCreateVisitorId()) — not PII,
--     and must never become PII.
--
-- Safe to apply against the live production DB (SQLite, schema.prisma:6).

ALTER TABLE "analytics_events" ADD COLUMN "visitor_id" TEXT;
CREATE INDEX "analytics_events_visitor_id_idx" ON "analytics_events"("visitor_id");

ALTER TABLE "users" ADD COLUMN "first_touch_visitor_id" TEXT;
CREATE INDEX "users_first_touch_visitor_id_idx" ON "users"("first_touch_visitor_id");
