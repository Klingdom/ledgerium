/**
 * Playwright global setup — runs ONCE before all tests.
 *
 * 1. Reconciles the schema of the EXISTING test database (`prisma db push`).
 *    The file is deliberately not deleted — see the note at step 1 below and
 *    row #228.
 * 2. Seeds test users via an external script, which clears every table in
 *    place before inserting.
 * 3. Ensures the storage-state directory exists.
 *
 * This header said "Creates a fresh test SQLite database / Runs Prisma
 * migrations" until loop 61. Not creating a fresh database is the entire
 * content of loop 59, and it runs `db push`, not migrations — the top of the
 * file contradicted the change made at the bottom of it for a full governance
 * cycle. Recorded rather than quietly corrected, because it is the second time
 * in two cycles that a correcting commit left the old rule standing in the
 * file it corrected.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const WEB_APP_DIR = path.resolve(__dirname, '..');

export default async function globalSetup() {
  // 1. The database file is deliberately NOT deleted (row #228, loop 59).
  //
  // It used to be. Playwright reuses an existing server locally
  // (`reuseExistingServer: !CI`), so deleting the file could strand a live
  // server holding it: that server kept serving a deleted inode, every login
  // failed silently — `auth.ts` returns null for a bad password and for this
  // alike — and the only visible symptom was a 60-second `waitForURL` timeout
  // in the auth setup, which then blocked the whole authenticated project.
  //
  // A guard tried to detect the stranded server by probing /api/health and
  // treating a 2s timeout as "nothing listening", which is the dangerous
  // reading: a server that is listening but BUSY — exactly the back-to-back
  // case — cannot answer in time. Replacing it with a TCP connect was tried at
  // loop 58 and rejected: Playwright's own webServer is already bound to 3098
  // by the time this runs, so no port check can distinguish it from a foreign
  // one. The guard is therefore gone along with the deletion that motivated it.
  //
  // `prisma db push` below reconciles the schema in place, and the seed script
  // clears every table before inserting, so the reset is complete without ever
  // unlinking. A stranded server keeps its handle and simply sees fresh data.
  // Deleting the -wal/-shm sidecars was its own hazard: removing them from
  // under a live connection is a documented way to corrupt a SQLite database.

  const env = {
    ...process.env,
    DATABASE_URL: 'file:./test.db',
  };

  // 2. Reconcile the schema in place.
  //
  // New consequence of not deleting the file (MR-035 §Q2c): this now runs
  // against a database a reused server may hold open. SQLite takes an
  // exclusive lock for a table rebuild, so an actively-querying server can
  // make this fail with SQLITE_BUSY. That is strictly better than what it
  // replaced — a loud failure here, instead of a silent one sixty seconds
  // later in the auth setup — but it is a real failure mode and is named so
  // the next person to see it knows it is expected rather than mysterious.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: WEB_APP_DIR,
    env,
    stdio: 'pipe',
  });

  // 3. Seed test users via script file
  execSync('node e2e/seed-test-db.js', {
    cwd: WEB_APP_DIR,
    env,
    stdio: 'inherit',
  });

  // 4. Create .auth directory for storage state
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
}
