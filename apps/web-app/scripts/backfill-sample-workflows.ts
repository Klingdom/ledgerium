/**
 * backfill-sample-workflows.ts
 *
 * Ensures EVERY existing account has the built-in sample workflow
 * ("Create Purchase Order"). Idempotent — accounts that already have it are
 * skipped, so this is safe to re-run.
 *
 * New accounts get the sample automatically at signup
 * (see src/app/api/auth/signup/route.ts); this script covers accounts that
 * predate that behavior.
 *
 * Usage (inside the running container):
 *   docker exec -w /app/apps/web-app ledgerium-ai npx tsx scripts/backfill-sample-workflows.ts
 *
 * Requires DATABASE_URL (already set in the container environment).
 */
import { db } from '@/db';
import { ensureSampleWorkflow } from '@/lib/sample-workflow';

async function main(): Promise<void> {
  const users = await db.user.findMany({ select: { id: true, email: true } });
  console.log(`Backfilling sample workflow for ${users.length} account(s)...`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const result = await ensureSampleWorkflow(user.id);
    if (!result) {
      failed++;
      console.log(`  FAILED  ${user.email}`);
    } else if (result.created) {
      created++;
      console.log(`  created ${user.email}`);
    } else {
      skipped++;
    }
  }

  console.log(
    `\nDone. total=${users.length} created=${created} skipped(already had it)=${skipped} failed=${failed}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill error:', err);
    process.exit(1);
  });
