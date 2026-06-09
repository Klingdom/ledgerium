/**
 * Seed the smoke-test database with ONE authenticated user.
 *
 * Run via global-setup-smoke.ts (execSync). Plain JS (no `@/` aliases, no app
 * modules) so it runs in the Playwright/node context without TS path-alias
 * resolution — mirrors e2e/seed-test-db.js but targets prisma/smoke.db, the
 * database the smoke webServer (`next start` on :3099) reads at runtime.
 *
 * The workflow itself is NOT seeded here — the authed smoke spec creates it via
 * POST /api/sample-workflow, which runs ensureSampleWorkflow server-side in full
 * app context (avoids importing the process engine into a node script).
 */
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

// Prisma resolves relative DATABASE_URL from the schema dir (prisma/), so the
// smoke webServer's `file:./smoke.db` resolves to prisma/smoke.db. Match it
// with an absolute path here.
const dbPath = path.resolve(__dirname, '..', '..', 'prisma', 'smoke.db');
const dbUrl = `file:${dbPath}`;

// MUST stay in sync with auth.smoke.setup.ts
const SMOKE_EMAIL = 'smoke@ledgerium.test';
const SMOKE_PASSWORD = 'SmokePass123!';

async function seed() {
  const db = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const passwordHash = await hash(SMOKE_PASSWORD, 12);
    await db.user.upsert({
      where: { email: SMOKE_EMAIL },
      update: {},
      create: {
        id: 'smoke-user-001',
        email: SMOKE_EMAIL,
        name: 'Smoke Test User',
        passwordHash,
        plan: 'growth',
        subscriptionStatus: 'active',
        isAdmin: false,
      },
    });
    console.log('[smoke] user seeded:', SMOKE_EMAIL, '->', dbPath);
  } finally {
    await db.$disconnect();
  }
}

seed().catch((e) => {
  console.error('[smoke] seed failed:', e);
  process.exit(1);
});
