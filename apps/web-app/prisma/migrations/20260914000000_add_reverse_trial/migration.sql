-- Migration: 20260914000000_add_reverse_trial
-- CEO directive: "implement the reverse trial."
--
-- Adds the schema surface for the reverse trial (TRIAL_REVIEW_001): full paid
-- features granted at SIGNUP, rolling down to the permanent free tier when the
-- window closes.
--
-- WHY FOUR COLUMNS AND NOT TWO
--
--   reverse_trial_plan      ─┐ ENTITLEMENT. Read by lib/reverse-trial.ts and
--   reverse_trial_ends_at   ─┘ merged into effectivePlanForUser().
--
--   reverse_trial_started_at ─┐ MEASUREMENT. Write-once outcome markers.
--   reverse_trial_converted_at ┘
--
-- The measurement pair exists because trial→paid conversion was previously
-- impossible to compute. Stripe's own trial dates were read into local
-- variables in the webhook handler and discarded, and `subscription_status` is
-- a single mutable column overwritten on every webhook event — so a trial that
-- lapsed is indistinguishable from a long-tenure customer who churned. Adding
-- them later would mean no cohort data for every account created in between,
-- which is exactly the window we most need to learn from.
--
-- SAFETY
--
-- Purely additive. All four columns are NULLABLE with no default and no
-- backfill, so:
--   * every existing row is untouched and reads as "never had a reverse trial"
--     — correct, because they did not;
--   * NULL plan + NULL ends_at is the explicit "no trial" state that
--     isReverseTrialActive() returns false for, so no existing user gains or
--     loses any entitlement from this migration;
--   * it is reversible by dropping the columns, with no data reconstruction.
--
-- Deliberately NOT backfilled onto existing users: granting a retroactive
-- trial window to accounts that never had one would silently upgrade live
-- users, and dating it from the migration would fabricate a start date that
-- never happened. Existing users reach paid plans through checkout, as before.

ALTER TABLE "users" ADD COLUMN "reverse_trial_plan" TEXT;
ALTER TABLE "users" ADD COLUMN "reverse_trial_started_at" DATETIME;
ALTER TABLE "users" ADD COLUMN "reverse_trial_ends_at" DATETIME;
ALTER TABLE "users" ADD COLUMN "reverse_trial_converted_at" DATETIME;

-- Supports the cohort query "of trials that ended in window X, what share
-- converted?" without a full table scan. Partial index: rows with no trial are
-- the majority today and are never part of a trial cohort.
CREATE INDEX "users_reverse_trial_ends_at_idx"
  ON "users" ("reverse_trial_ends_at")
  WHERE "reverse_trial_ends_at" IS NOT NULL;
