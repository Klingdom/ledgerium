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

    // ── HOSTILE-DATA workflow (regression repro for the 2026-06-09 outage) ──────
    // A real `workflow_interpretation` artifact whose friction/rework items OMIT
    // `stepOrdinals` (the TS type marks it required) and whose `decisions` is null
    // instead of an array. The consolidated Report rendered f.stepOrdinals.length /
    // r.stepOrdinals.length → TypeError → "Application error" + unstyled page. The
    // seeded SAMPLE has no interpretation artifact, so the gate never hit this.
    // With the asArray() hardening this must now render WITHOUT a client exception.
    const HOSTILE_ID = 'smoke-hostile-001';
    await db.workflow.upsert({
      where: { id: HOSTILE_ID },
      update: {},
      create: {
        id: HOSTILE_ID,
        userId: 'smoke-user-001',
        title: 'Hostile Data (smoke regression)',
        toolsUsed: JSON.stringify(['SystemA', 'SystemB']),
        durationMs: 60_000,
        stepCount: 3,
        phaseCount: 1,
        confidence: 0.8,
        status: 'active',
        sessionId: 'smoke-hostile-session',
      },
    });
    const hostileInterpretation = {
      summary: 'Smoke hostile interpretation',
      processType: 'transaction',
      scores: { complexity: 2, friction: 3, linearity: 4, manualIntensity: 2 },
      phases: [],
      // friction item WITHOUT stepOrdinals (real AI output can omit it):
      friction: [
        { type: 'manual_lookup', description: 'Manual PO lookup', severity: 'medium', evidence: 'ev1' },
      ],
      decisions: null, // null, not an array
      // rework item WITHOUT stepOrdinals:
      rework: [
        { type: 'repeated_entry', description: 'Re-entered the amount', occurrences: 2, severity: 'low', evidence: 'ev2' },
      ],
      insights: null,
    };
    await db.workflowArtifact.deleteMany({ where: { workflowId: HOSTILE_ID } });
    await db.workflowArtifact.create({
      data: {
        workflowId: HOSTILE_ID,
        artifactType: 'workflow_interpretation',
        contentJson: JSON.stringify(hostileInterpretation),
      },
    });
    console.log('[smoke] hostile-data workflow seeded:', HOSTILE_ID);
  } finally {
    await db.$disconnect();
  }
}

seed().catch((e) => {
  console.error('[smoke] seed failed:', e);
  process.exit(1);
});
