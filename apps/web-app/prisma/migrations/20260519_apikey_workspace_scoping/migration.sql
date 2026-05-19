-- Migration: 20260519_apikey_workspace_scoping
-- Additive nullable columns only. Existing rows unaffected.
-- @iter 082 / TEAM-P02

-- Add workspace FK to api_keys table
ALTER TABLE "api_keys" ADD COLUMN "team_id" TEXT REFERENCES "teams"("id") ON DELETE SET NULL;
CREATE INDEX "api_keys_team_id_idx" ON "api_keys"("team_id");

-- Add acceptedBy FK to team_invites table
ALTER TABLE "team_invites" ADD COLUMN "accepted_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
