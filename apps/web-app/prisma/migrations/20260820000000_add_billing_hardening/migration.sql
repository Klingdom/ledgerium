-- Migration: 20260820000000_add_billing_hardening
-- CEO directive: "Get Stripe working across all possible monetized use cases."
--
-- Adds the schema surface for three independent billing-correctness fixes,
-- all consumed by apps/web-app/src/app/api/billing/webhook/route.ts:
--
--   1. Webhook delivery idempotency (P0-1). `webhook_events` is a dedup
--      ledger keyed on Stripe's own event.id — the PRIMARY KEY uniqueness
--      constraint IS the atomic "claim" mechanism the handler uses to detect
--      and skip duplicate deliveries of the same event.
--
--   2. SCA / 3-D Secure visibility (P0-2). `users.pending_invoice_url` and
--      `teams.pending_invoice_url` hold the Stripe-hosted invoice URL when
--      an `invoice.payment_action_required` event fires, so the customer can
--      complete card-issuer authentication. Deliberately a separate nullable
--      column rather than a new `subscription_status` value — see the
--      schema.prisma doc comment on `User.pendingInvoiceUrl` for why.
--
--   3. Out-of-order webhook delivery guard. `users.last_subscription_event_at`
--      and `teams.last_subscription_event_at` store the *Stripe event's own*
--      `created` timestamp from the most recently APPLIED
--      customer.subscription.updated/.deleted event, so a stale, later-
--      arriving delivery of an older event can be detected and skipped
--      instead of clobbering newer subscription state.
--
--   4. Dispute visibility (P1-1). `stripe_disputes` is a durable,
--      admin-queryable record of `charge.dispute.created` /
--      `charge.dispute.closed` events. Polymorphic user_id/team_id (no FK,
--      matching the existing `group_relationships` pattern) so a dispute is
--      always recorded even when the owning customer cannot be resolved.
--
-- Fully additive:
--   - All 4 new/altered columns on `users` and `teams` are nullable TEXT/
--     DATETIME with no default — every pre-existing row backfills implicitly
--     to NULL, which the application layer treats as "no pending action" /
--     "no prior event recorded" (never a fabricated value).
--   - `webhook_events` and `stripe_disputes` are brand-new tables.
--   - No table rebuild required (SQLite ADD COLUMN for nullable columns with
--     no CHECK/FK/UNIQUE constraint; matches the pattern of
--     20260818000000_add_billing_interval and 20260818010000_add_visitor_attribution).
--
-- Safe to apply against the live production DB (SQLite, schema.prisma:6)
-- with existing rows.

ALTER TABLE "users" ADD COLUMN "pending_invoice_url" TEXT;
ALTER TABLE "users" ADD COLUMN "last_subscription_event_at" DATETIME;

ALTER TABLE "teams" ADD COLUMN "pending_invoice_url" TEXT;
ALTER TABLE "teams" ADD COLUMN "last_subscription_event_at" DATETIME;

CREATE TABLE "webhook_events" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "type"        TEXT NOT NULL,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "webhook_events_type_idx" ON "webhook_events"("type");
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events"("received_at");

CREATE TABLE "stripe_disputes" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "charge_id"  TEXT NOT NULL,
    "user_id"    TEXT,
    "team_id"    TEXT,
    "amount"     INTEGER NOT NULL,
    "currency"   TEXT NOT NULL,
    "reason"     TEXT NOT NULL,
    "status"     TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

CREATE INDEX "stripe_disputes_user_id_idx" ON "stripe_disputes"("user_id");
CREATE INDEX "stripe_disputes_team_id_idx" ON "stripe_disputes"("team_id");
CREATE INDEX "stripe_disputes_status_idx" ON "stripe_disputes"("status");
