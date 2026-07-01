-- Composite indexes for the two hottest filtered query paths (DB health review 001).
-- workflows: dashboard filters by (user_id, status); team_members: routes filter by (team_id, status).
-- Additive and non-destructive.

CREATE INDEX IF NOT EXISTS "workflows_user_id_status_idx" ON "workflows"("user_id", "status");
CREATE INDEX IF NOT EXISTS "team_members_team_id_status_idx" ON "team_members"("team_id", "status");
