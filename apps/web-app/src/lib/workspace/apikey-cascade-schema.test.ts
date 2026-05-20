/**
 * Structural tests for ApiKey workspace-FK cascade behavior (iter 085 / TEAM-P03.7 Sub-task 3).
 *
 * SECURITY: deleting a Team must REVOKE its workspace-scoped API keys, not
 * orphan them. Pre-iter-085 the FK was ON DELETE SetNull which would leave
 * keys with retained capability against a deleted workspace.
 *
 * These tests verify the change at two layers:
 *   1. Prisma schema.prisma declares onDelete: Cascade
 *   2. Migration SQL creates api_keys_team_id_fkey with ON DELETE CASCADE
 *
 * Full integration test requires a live SQLite DB with Prisma client; this
 * file does structural verification via filesystem reads to avoid the
 * Prisma client + temp-DB setup overhead.
 *
 * @iter 085 / TEAM-P03.7 Sub-task 3
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is .../apps/web-app/src/lib/workspace
const SCHEMA_PATH = resolve(__dirname, '..', '..', '..', 'prisma', 'schema.prisma');
const MIGRATION_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'prisma',
  'migrations',
  '20260520_team_subscription_status_and_apikey_cascade',
  'migration.sql',
);

describe('Sub-task 3: ApiKey.teamId ON DELETE CASCADE (iter 085)', () => {
  it('schema.prisma declares onDelete: Cascade on ApiKey.team relation', () => {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    // Locate the ApiKey model
    const apiKeyMatch = schema.match(/model ApiKey \{[\s\S]+?\n\}/);
    expect(apiKeyMatch).not.toBeNull();
    const apiKeyBlock = apiKeyMatch![0];

    // The team relation must declare onDelete: Cascade
    expect(apiKeyBlock).toMatch(/team\s+Team\?\s+@relation\([^)]*onDelete:\s*Cascade/);
    // And MUST NOT declare onDelete: SetNull anymore
    expect(apiKeyBlock).not.toMatch(/team\s+Team\?\s+@relation\([^)]*onDelete:\s*SetNull/);
  });

  it('migration SQL creates api_keys with ON DELETE CASCADE for team_id', () => {
    const migration = readFileSync(MIGRATION_PATH, 'utf-8');
    // The migration creates a new api_keys_new table with the corrected FK
    expect(migration).toMatch(/CREATE TABLE "api_keys_new"/);
    expect(migration).toMatch(
      /FOREIGN KEY \("team_id"\) REFERENCES "teams"\("id"\)[\s\S]*?ON DELETE CASCADE/i,
    );
    // The table rebuild copies data + renames
    expect(migration).toMatch(/INSERT INTO "api_keys_new"/);
    expect(migration).toMatch(/DROP TABLE "api_keys"/);
    expect(migration).toMatch(/ALTER TABLE "api_keys_new" RENAME TO "api_keys"/);
  });

  it('migration recreates the team_id index on the renamed table', () => {
    const migration = readFileSync(MIGRATION_PATH, 'utf-8');
    expect(migration).toMatch(/CREATE INDEX "api_keys_team_id_idx" ON "api_keys"\("team_id"\)/);
  });

  it('migration recreates the user_id index on the renamed table', () => {
    const migration = readFileSync(MIGRATION_PATH, 'utf-8');
    expect(migration).toMatch(/CREATE INDEX "api_keys_user_id_idx" ON "api_keys"\("user_id"\)/);
  });

  it('migration recreates the unique index on key_hash', () => {
    const migration = readFileSync(MIGRATION_PATH, 'utf-8');
    expect(migration).toMatch(/CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"\("key_hash"\)/);
  });
});

describe('Sub-task 1: Team.subscription_status migration (iter 085)', () => {
  it('migration adds subscription_status column with default active', () => {
    const migration = readFileSync(MIGRATION_PATH, 'utf-8');
    expect(migration).toMatch(
      /ALTER TABLE "teams" ADD COLUMN "subscription_status" TEXT NOT NULL DEFAULT 'active'/,
    );
  });

  it('schema.prisma declares Team.subscriptionStatus with default "active"', () => {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    const teamMatch = schema.match(/model Team \{[\s\S]+?\n\}/);
    expect(teamMatch).not.toBeNull();
    const teamBlock = teamMatch![0];
    expect(teamBlock).toMatch(/subscriptionStatus\s+String\s+@default\("active"\)/);
  });
});
