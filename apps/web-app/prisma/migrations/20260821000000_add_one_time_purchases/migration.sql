-- Migration: 20260821000000_add_one_time_purchases
-- CEO directive: "Get creative and setup stripe for all monetized use
-- cases. Get the different online product sales working."
--
-- Adds `one_time_purchases`, a durable record of `mode: 'payment'` Checkout
-- Session completions, consumed by
-- apps/web-app/src/app/api/billing/webhook/route.ts (checkout.session.completed,
-- mode:'payment' branch). This is a brand-new, independent table — it does
-- not touch `users`, `teams`, `webhook_events`, or `stripe_disputes`, and no
-- one-time purchase writes to `users.plan` or any entitlement field.
--
-- `id` is the Stripe Checkout Session id (a natural key, same pattern as
-- `webhook_events`/`stripe_disputes`), so the webhook handler can safely
-- upsert on it as a second layer of duplicate-safety alongside the existing
-- WebhookEvent idempotency claim.
--
-- Fully additive: brand-new table, no ALTER on any existing table, no
-- FK/CHECK/UNIQUE constraint beyond the primary key. Safe to apply against
-- the live production DB (SQLite, schema.prisma:6) with existing rows.

CREATE TABLE "one_time_purchases" (
    "id"                       TEXT NOT NULL PRIMARY KEY,
    "user_id"                  TEXT NOT NULL,
    "sku"                      TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "amount_total"             INTEGER NOT NULL,
    "currency"                 TEXT NOT NULL,
    "payment_status"           TEXT NOT NULL,
    "created_at"               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               DATETIME NOT NULL
);

CREATE INDEX "one_time_purchases_user_id_idx" ON "one_time_purchases"("user_id");
CREATE INDEX "one_time_purchases_sku_idx" ON "one_time_purchases"("sku");
