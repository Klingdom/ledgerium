/**
 * Seed script for E2E test database.
 * Run via: node e2e/seed-test-db.js (from web-app root)
 *
 * Creates test users AND workflows in the test SQLite database.
 *
 * Uses an absolute path to match Prisma's schema-relative resolution.
 *
 * ── Workflow fixtures (row #195) ────────────────────────────────────────────
 *
 * `apps/web-app/src/lib/workflow-metrics.ts` computes `healthScore.overall`
 * and `opportunityTag` PURELY from { confidence, stepCount, durationMs,
 * toolsUsed.length } — there is no `ProcessDefinition` row for any seeded
 * workflow, so `computeVariation()` always takes the
 * `processDefinition === null` branch: `variationScore = 1 - confidence`.
 * None of these inputs depend on wall-clock time, so the computed tag/score
 * for a given row is identical on every run (no `Date.now()` drift risk).
 *
 * Five rows are seeded per user — one per `OpportunityTag` — with distinct,
 * verified-by-hand `healthScore.overall` values so the dashboard's
 * Health-Score sort has an unambiguous, non-tied order to observe:
 *
 *   tag         | confidence | stepCount | durationMs | toolsUsed | overall
 *   ------------|-----------:|----------:|-----------:|----------:|-------:
 *   automate    |       0.90 |        20 |     360000 |         3 |     95
 *   healthy     |       0.75 |        10 |     120000 |         1 |     83
 *   standardize |       0.30 |         5 |      60000 |         1 |     55
 *   optimize    |       0.60 |         8 |       5000 |         1 |     50
 *   monitor     |       0.20 |         0 |       null |         0 |     10
 *
 * Rule-by-rule input → outcome mapping (see workflow-metrics.ts §7.5/§7.6):
 *   - `automate` requires aiOpportunityScore>=60 AND toolsUsed.length>=2 AND
 *     overall>=40. High stepCount (20, >15 triggers the +20 "high step count"
 *     bonus) + mid-length durationMs (360000ms, inside the 30s-30min "ideal"
 *     speed band) + 3 tools drives aiOpportunityScore to 100 and speed to the
 *     max (30), so this row clears every clause.
 *   - `standardize` requires variationScore (= 1 - confidence) >= 0.67 AND
 *     overall>=40, with only 1 tool so it can never satisfy the `automate`
 *     tools>=2 clause first. confidence=0.30 -> variationScore=0.70.
 *   - `optimize` requires speed<15 AND overall>=40, with confidence=0.60
 *     (variationScore=0.40, below the 0.67 standardize threshold) and
 *     durationMs=5000 (below the 10s "adjacent" floor -> speed floors at 5).
 *   - `monitor` fires whenever overall<40 OR dataQuality<8; confidence=0.20 +
 *     stepCount=0 + durationMs=null drives every sub-score to its floor
 *     (overall=10), so this is the only row where none of automate /
 *     standardize / optimize can reach the overall>=40 gate first.
 *   - `healthy` is the positive fallthrough: confidence=0.75 keeps
 *     variationScore (0.25) and dataQuality (15) comfortably clear of every
 *     other rule's threshold, with durationMs=120000 (ideal speed band) and
 *     only 1 tool (blocks automate).
 *
 * Both the growth-plan user (health-score breakdown visible) and the
 * free-plan user (health-score breakdown gated) get an identical fixture set
 * so plan-gating tests and happy-path tests can rely on the same shapes.
 */

const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

// Prisma resolves relative URLs from the schema file location (prisma/).
// When overriding datasources, we must use an absolute path to avoid mismatch.
const dbPath = path.resolve(__dirname, '..', 'prisma', 'test.db');
const dbUrl = `file:${dbPath}`;

/**
 * Five deterministic workflow fixtures, one per OpportunityTag. `userId` is
 * injected by the caller so the same shapes can be seeded for multiple users.
 */
function workflowFixtures(userId, idPrefix) {
  // Fixed (non-relative) timestamps — never derived from Date.now() — so the
  // seed is byte-identical across runs regardless of when the suite executes.
  const baseCreatedAt = new Date('2026-01-05T09:00:00.000Z');

  return [
    {
      id: `${idPrefix}-automate`,
      userId,
      title: 'Invoice Approval Routing',
      description: 'High step count, mid-length duration, three tools — clears the automate gate.',
      toolsUsed: JSON.stringify(['Salesforce', 'Excel', 'Outlook']),
      durationMs: 360_000, // 6 min — inside [30s, 30min] ideal speed band -> speed=30
      stepCount: 20,       // >15 -> +20 aiOpportunityScore bonus; full standardization docPts
      confidence: 0.9,     // dataQuality=18, consistency=27, sopReadiness='ready'
      status: 'active',
      createdAt: new Date(baseCreatedAt.getTime() + 0 * 86_400_000),
    },
    {
      id: `${idPrefix}-standardize`,
      userId,
      title: 'Customer Onboarding Checklist',
      description: 'Low confidence drives variationScore above the 0.67 standardize threshold.',
      toolsUsed: JSON.stringify(['Email']),
      durationMs: 60_000, // 1 min — inside ideal speed band -> speed=30
      stepCount: 5,
      confidence: 0.3,    // variationScore = 1-0.3 = 0.70 >= 0.67
      status: 'active',
      createdAt: new Date(baseCreatedAt.getTime() + 1 * 86_400_000),
    },
    {
      id: `${idPrefix}-optimize`,
      userId,
      title: 'Ad Hoc Data Pull',
      description: 'Very short duration floors the speed sub-score below the optimize threshold.',
      toolsUsed: JSON.stringify(['Jira']),
      durationMs: 5_000, // 5 s — below the 10s adjacent-band floor -> speed=5 (<15)
      stepCount: 8,
      confidence: 0.6,   // variationScore=0.40 (below standardize's 0.67 threshold)
      status: 'active',
      createdAt: new Date(baseCreatedAt.getTime() + 2 * 86_400_000),
    },
    {
      id: `${idPrefix}-monitor`,
      userId,
      title: 'Legacy Ticket Triage',
      description: 'Every sub-score floors — overall stays below the 40-point gate other tags need.',
      toolsUsed: JSON.stringify([]),
      durationMs: null,  // no evidence -> speed=0
      stepCount: 0,      // not_ready sopReadiness, docPts=0
      confidence: 0.2,   // dataQuality=4, consistency=6 -> overall=10 (<40)
      status: 'active',
      createdAt: new Date(baseCreatedAt.getTime() + 3 * 86_400_000),
    },
    {
      id: `${idPrefix}-healthy`,
      userId,
      title: 'Weekly Status Report',
      description: 'Comfortably clears every threshold without tripping the automate/standardize/optimize gates.',
      toolsUsed: JSON.stringify(['Notion']),
      durationMs: 120_000, // 2 min — inside ideal speed band -> speed=30
      stepCount: 10,
      confidence: 0.75,    // variationScore=0.25, dataQuality=15 — clears monitor's dataQuality<8 gate
      status: 'active',
      createdAt: new Date(baseCreatedAt.getTime() + 4 * 86_400_000),
    },
  ];
}

async function seed() {
  const db = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    const passwordHash = await hash('TestPass123!', 12);

    // Create primary test user (growth plan — Starter+ equivalent; health
    // score breakdown ungated).
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

    // Create free-tier test user (row #195). subscriptionStatus 'none' and
    // no reverseTrial* fields set — a live reverse trial grants Solo-tier
    // entitlement via effectivePlanForUser() -> activeReverseTrialPlan()
    // (see apps/web-app/src/lib/reverse-trial.ts), which would defeat the
    // plan-gating tests by ungating the health-score breakdown. Leaving all
    // four reverseTrial* columns at their Prisma-default `null` keeps
    // isReverseTrialActive() false, so effectivePlanForUser() resolves to
    // the raw 'free' plan and hasFeature('free', 'healthScores') === false.
    await db.user.create({
      data: {
        id: 'e2e-test-free-001',
        email: 'free@ledgerium.test',
        name: 'E2E Free User',
        passwordHash,
        plan: 'free',
        subscriptionStatus: 'none',
        isAdmin: false,
      },
    });

    // Seed workflows for the growth user and the free user (row #195) — both
    // get the same five-tag fixture set so dashboard row-click / sort /
    // filter / kebab tests and plan-gating tests all have real rows to act
    // against.
    const growthWorkflows = workflowFixtures('e2e-test-user-001', 'e2e-wf-growth');
    const freeWorkflows = workflowFixtures('e2e-test-free-001', 'e2e-wf-free');

    for (const wf of [...growthWorkflows, ...freeWorkflows]) {
      await db.workflow.create({ data: wf });
    }

    console.log('[e2e] Test database seeded successfully');
  } finally {
    await db.$disconnect();
  }
}

seed().catch((e) => {
  console.error('[e2e] Seed failed:', e);
  process.exit(1);
});
