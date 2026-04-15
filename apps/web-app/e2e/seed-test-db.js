/**
 * Seed script for E2E test database.
 * Run via: node e2e/seed-test-db.js (from web-app root)
 *
 * Creates test users in the test SQLite database.
 * Uses an absolute path to match Prisma's schema-relative resolution.
 */

const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

// Prisma resolves relative URLs from the schema file location (prisma/).
// When overriding datasources, we must use an absolute path to avoid mismatch.
const dbPath = path.resolve(__dirname, '..', 'prisma', 'test.db');
const dbUrl = `file:${dbPath}`;

async function seed() {
  const db = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    const passwordHash = await hash('TestPass123!', 12);

    // Create primary test user
    await db.user.create({
      data: {
        id: 'e2e-test-user-001',
        email: 'e2e@ledgerium.test',
        name: 'E2E Test User',
        passwordHash,
        plan: 'growth',
        subscriptionStatus: 'active',
        isAdmin: false,
      },
    });

    // Create admin test user
    await db.user.create({
      data: {
        id: 'e2e-test-admin-001',
        email: 'admin@ledgerium.test',
        name: 'E2E Admin',
        passwordHash,
        plan: 'growth',
        subscriptionStatus: 'active',
        isAdmin: true,
      },
    });

    console.log('[e2e] Test database seeded successfully');
  } finally {
    await db.$disconnect();
  }
}

seed().catch((e) => {
  console.error('[e2e] Seed failed:', e);
  process.exit(1);
});
