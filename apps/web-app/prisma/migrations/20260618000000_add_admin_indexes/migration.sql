-- Add indexes for Admin Operations Dashboard performance (Growth Intelligence Extension, Iter A)
-- Additive only; no column or data changes; SQLite + Postgres safe.

-- User.createdAt — used by newUsersTimeSeries range queries
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- User.updatedAt — used by mau30d proxy query (users with updatedAt >= now - 30d)
CREATE INDEX "users_updated_at_idx" ON "users"("updated_at");

-- Upload.uploadedAt — used by uploadsTimeSeries range queries
CREATE INDEX "uploads_uploaded_at_idx" ON "uploads"("uploaded_at");
